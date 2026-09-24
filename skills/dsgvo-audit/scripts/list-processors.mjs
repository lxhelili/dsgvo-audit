#!/usr/bin/env node
// list-processors.mjs — every recipient the evidence shows, with role (Art. 28 / Art. 26 / eigener
// Verantwortlicher), contract, region and transfer mechanism, and the evidence IDs behind it.
// Its --md output is report section 5 (Drittanbieter & Auftragsverarbeiter) plus the AVV request list.
//
// Usage:
//   node scripts/list-processors.mjs scan.json lint.json [gtm.json] [--md] [--out processors.json]
//
// Pass the same files in the same order as to build-evidence.mjs — the E-IDs then match.
// Whether an AVV is actually signed is a client statement: the tool always leaves that column ⚪️.
//
// Exit codes: 0 ok · 2 usage error / unreadable input

import { writeFileSync } from 'node:fs';
import { loadInput, buildEvidence } from './lib/evidence.mjs';
import { PROCESSORS, lookup } from './lib/processors.mjs';
import { label } from './lib/signatures.mjs';

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const out = outIdx >= 0 ? argv[outIdx + 1] : null;
const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
if (!files.length) {
  console.error('Usage: node scripts/list-processors.mjs <scan|lint|gtm|har>.json ... [--md] [--out processors.json]');
  process.exit(2);
}
let inputs;
try { inputs = files.map(loadInput); } catch (e) { console.error(`❌ ${e.message}`); process.exit(2); }

const RECIPIENT_TYPES = new Set(['origin', 'dependency', 'server', 'gtm-tag', 'form-target']);
const groups = new Map(); // PROCESSORS index → { names, ids }
const unknown = new Map(); // name → ids

for (const e of buildEvidence(inputs)) {
  if (!RECIPIENT_TYPES.has(e.type)) continue;
  let names = [e.service, ...(e.aliases || [])];
  if (e.type === 'form-target') names = [label(e.subject).name];
  const hit = names.map((n) => ({ n, p: lookup(n) })).find((x) => x.p);
  if (hit) {
    const key = PROCESSORS.indexOf(hit.p);
    const g = groups.get(key) || { names: new Set(), ids: [] };
    g.names.add(hit.n); g.ids.push(e.id);
    groups.set(key, g);
  } else {
    const name = names.find((n) => n && n !== 'unknown') || e.subject;
    unknown.set(name, [...(unknown.get(name) || []), e.id]);
  }
}

const rows = [...groups.entries()].map(([i, g]) => {
  const { match, name, ...p } = PROCESSORS[i];
  return { names: name ? [name] : [...g.names], detectedAs: [...g.names], ...p, evidence: g.ids };
});
const recipients = rows.filter((r) => r.role !== 'Library');
const libraries = rows.filter((r) => r.role === 'Library');
const order = { AV: 0, 'Art. 26': 1, eigener: 2, 'klären': 3, vermeiden: 4 };
recipients.sort((a, b) => order[a.role] - order[b.role] || a.names[0].localeCompare(b.names[0]));
const result = { recipients, libraries, unknown: [...unknown.entries()].map(([name, evidence]) => ({ name, evidence })) };
if (out) writeFileSync(out, JSON.stringify(result, null, 2));

const ROLE_LABEL = { AV: 'Auftragsverarbeiter (Art. 28)', 'Art. 26': 'gemeinsam Verantwortliche (Art. 26)', eigener: 'eigener Verantwortlicher', 'klären': '⚪️ Rolle klären', vermeiden: '🔴 vermeiden' };
const CONTRACT_STATUS = { AV: '⚪️ Mandant', 'Art. 26': '⚪️ Mandant', eigener: 'entfällt (DSE nennen)', 'klären': '⚪️ Mandant', vermeiden: 'entfällt (self-hosten)' };
const ids = (list) => (list.length > 4 ? `${list.slice(0, 4).join(', ')} (+${list.length - 4})` : list.join(', '));
const cell = (s) => String(s).replace(/\|/g, '\\|');

if (argv.includes('--md')) {
  console.log('| Dienst | Rolle | Vertrag | Sitz / Region | Drittland-Mechanismus | Evidenz | Vertrag liegt vor? |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of recipients) console.log(`| ${cell(r.names.join(' / '))} | ${ROLE_LABEL[r.role]} | ${cell(r.contract)} | ${cell(r.region)} | ${cell(r.transfer)} | ${ids(r.evidence)} | ${CONTRACT_STATUS[r.role]} |`);
  for (const u of result.unknown) console.log(`| ${cell(u.name)} | ⚪️ Rolle klären | — | — | — | ${ids(u.evidence)} | ⚪️ Mandant |`);
  console.log('\n_Rolle, Vertrag und Region sind eine generische Zuordnung — vor Auslieferung beim Anbieter prüfen; DPF-Status nur über https://www.dataprivacyframework.gov/list für die konkrete Entität._');
  const av = recipients.filter((r) => r.role === 'AV');
  const jc = recipients.filter((r) => r.role === 'Art. 26');
  if (av.length || jc.length || result.unknown.length) {
    console.log('\n**Vor Go-live beim Mandanten anfordern:**\n');
    for (const r of av) console.log(`- [ ] AVV/DPA ${r.names[0]} — unterschrieben und abgelegt; Unterauftragsverarbeiter-Liste archiviert (${r.contract})`);
    for (const r of jc) console.log(`- [ ] Vereinbarung nach Art. 26 ${r.names[0]} — wesentlicher Inhalt in der DSE (Art. 26 Abs. 2)`);
    for (const u of result.unknown) console.log(`- [ ] ${u.name} — wer ist das, welche Daten, welche Rolle?`);
    if (av.length) {
      console.log('\nJeder AVV muss Art. 28 Abs. 3 abdecken: (a) Weisungsbindung inkl. Drittlandübermittlung · (b) Vertraulichkeit · (c) TOMs nach Art. 32 · (d) Unterauftragsverarbeiter nur mit Genehmigung und gleichen Pflichten (Abs. 2, 4) · (e) Unterstützung bei Betroffenenrechten · (f) Unterstützung bei Art. 32–36 · (g) Löschung/Rückgabe nach Vertragsende · (h) Nachweise und Überprüfungen.');
    }
  }
  if (libraries.length) console.log(`\n**Libraries ohne eigenen Empfänger** — der Empfänger dahinter fehlt noch in der Liste: ${libraries.map((l) => `${l.names.join('/')} (${l.contract.replace(/^Library — /, '')})`).join('; ')}.`);
} else {
  console.log(`=== Empfänger: ${recipients.length} zugeordnet, ${result.unknown.length} unbekannt, ${libraries.length} Libraries ===`);
  for (const r of recipients) console.log(`  ${r.role.padEnd(9)} ${r.names.join(' / ')} — ${r.contract} [${r.region}]  ${ids(r.evidence)}`);
  for (const u of result.unknown) console.log(`  ⚪️        ${u.name} — Rolle klären  ${ids(u.evidence)}`);
  for (const l of libraries) console.log(`  Library   ${l.names.join(' / ')} — ${l.contract}`);
}
if (out) console.error(`JSON: ${out}`);
