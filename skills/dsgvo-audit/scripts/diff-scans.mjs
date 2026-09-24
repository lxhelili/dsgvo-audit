#!/usr/bin/env node
// diff-scans.mjs — what changed between two runs of the same tool: new/removed third-party origins,
// cookies, storage keys, form targets (scanner/HAR), or new SDKs, origins, server-side recipients and
// regions (linter). For re-audits, maintenance retainers and CI: a new tracker, pixel or processor is
// caught the day it ships, not at the next full audit.
//
// Usage:
//   node scripts/diff-scans.mjs baseline.json current.json [--md] [--out diff.json] [--strict]
//
// Both files must come from the same tool (scan/HAR vs. scan/HAR, or lint vs. lint). Scanner pages are
// matched by path, so a baseline from production can be compared with a scan of a preview deployment; a page
// with no baseline counts as entirely new.
//
// Every added item is either
//   block  — a privacy regression: a third-party origin/cookie/storage key before consent or after
//            "Ablehnen", a new third-party form target, the OS-Plattform link back; in lint: a new
//            origin in a load context, a new tracking/AI SDK, a new server-side recipient, a non-EU region
//   review — needs a DSE / banner / AVV update but is not itself a violation (new service after accept,
//            new first-party cookie, new header finding …)
// Removed items are listed too: a service that is gone must also leave the Datenschutzerklärung.
//
// Exit codes: 0 ok · 1 --strict and at least one "block" · 2 usage error · 3 a scan without result

import { readFileSync, writeFileSync } from 'node:fs';
import { detectKind } from './lib/evidence.mjs';

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const out = outIdx >= 0 ? argv[outIdx + 1] : null;
const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
if (files.length !== 2) {
  console.error('Usage: node scripts/diff-scans.mjs baseline.json current.json [--md] [--out diff.json] [--strict]');
  process.exit(2);
}
let base, curr;
try { [base, curr] = files.map((f) => JSON.parse(readFileSync(f, 'utf8'))); } catch (e) { console.error(`❌ ${e.message}`); process.exit(2); }
const family = (k) => (k === 'har' ? 'scan' : k);
const [kb, kc] = [detectKind(base), detectKind(curr)].map(family);
if (!kb || kb !== kc || kb === 'gtm') {
  console.error(`❌ Beide Dateien müssen vom selben Tool stammen (Scan/HAR oder Lint) — erhalten: ${kb ?? '?'} / ${kc ?? '?'}`);
  process.exit(2);
}
for (const [f, d] of [[files[0], base], [files[1], curr]]) {
  if (kb === 'scan' && (d.verdict === null || d.httpStatus === undefined)) {
    console.error(`❌ ${f}: Scan ohne Ergebnis (Seite nicht geladen) — kein Vergleich möglich.`);
    process.exit(3);
  }
}

// ---------- flatten each result into keyed items ----------
const pathOf = (url) => { try { const u = new URL(url); return u.pathname + u.search; } catch { return url; } };
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return url; } };
const LOAD_KINDS = new Set(['asset', 'tracking', 'captcha', 'embed', 'booking']);
const RISKY_DEP = /tracking|analytics|AI|captcha|ads/i;

function scanItems(r) {
  const items = [];
  const pages = [r, ...Object.values(r.pages || {}).filter((p) => p && p.verdict !== null)];
  for (const p of pages) {
    const page = pathOf(p.target);
    for (const [phase, ph] of Object.entries(p.phases || {})) {
      const regression = phase === 'pre-consent' || phase === 'after-reject';
      for (const o of ph.thirdPartyOrigins || []) {
        items.push({ key: `${page}|${phase}|origin|${o.origin}`, page, phase, what: `${o.origin} (${o.service})`,
          severity: regression && o.kind !== 'cmp' ? 'block' : 'review' });
      }
      for (const c of ph.cookies || []) {
        items.push({ key: `${page}|${phase}|cookie|${c.name}@${c.domain}`, page, phase, what: `Cookie ${c.name}@${c.domain}${c.thirdParty ? ' (3rd)' : ''}`,
          severity: regression && c.thirdParty ? 'block' : 'review' });
      }
      for (const area of ['localStorage', 'sessionStorage']) {
        for (const k of ph.storage?.[area] || []) items.push({ key: `${page}|${phase}|${area}|${k}`, page, phase, what: `${area} „${k}“`, severity: 'review' });
      }
    }
    const v = p.verdict || {};
    for (const h of v.headerFindings || []) items.push({ key: `${page}|header|${h}`, page, phase: null, what: `Header: ${h}`, severity: 'review' });
    for (const t of v.thirdPartyFormTargets || []) items.push({ key: `${page}|form|${hostOf(t)}`, page, phase: null, what: `Formularziel ${hostOf(t)}`, severity: 'block' });
    if (v.odrLinkStillPresent) items.push({ key: `${page}|odr`, page, phase: null, what: 'OS-Plattform-Link', severity: 'block' });
  }
  return items;
}

function lintItems(d) {
  const items = [];
  for (const dep of d.dependencies || []) items.push({ key: `dep|${dep.name}`, what: `SDK ${dep.name} (${dep.class})`, severity: RISKY_DEP.test(dep.class) ? 'block' : 'review' });
  for (const o of d.origins || []) {
    const inLoad = (o.hits || []).some((h) => h.loadContext && !h.gateHintInFile);
    items.push({ key: `origin|${o.origin}`, what: `${o.origin} (${o.service}) — ${o.hits?.[0]?.file ?? ''}`, severity: inLoad && LOAD_KINDS.has(o.kind) ? 'block' : 'review' });
  }
  for (const s of new Set((d.serverSide || []).map((x) => x.hit))) items.push({ key: `server|${s}`, what: `serverseitiger Empfänger ${s}`, severity: 'block' });
  for (const r of d.config?.regions || []) items.push({ key: `region|${r.region}`, what: `Region ${r.region}`, severity: r.nonEU ? 'block' : 'review' });
  for (const k of d.config?.envKeys || []) items.push({ key: `env|${k}`, what: `Env-Schlüssel ${k}`, severity: 'review' });
  if ((d.odrLinks || []).length) items.push({ key: 'odr', what: 'OS-Plattform-Link', severity: 'block' });
  // storage by file + API: line numbers shift on every edit and would drown the diff
  for (const s of new Set((d.storage || []).map((x) => `${x.api}|${x.file}`))) { const [api, file] = s.split('|'); items.push({ key: `storage|${s}`, what: `${api} in ${file}`, severity: 'review' }); }
  return items;
}

const flatten = kb === 'scan' ? scanItems : lintItems;
const mapOf = (items) => new Map(items.map((i) => [i.key, i]));
const [mb, mc] = [mapOf(flatten(base)), mapOf(flatten(curr))];
// A page only the current run scanned (e.g. a new route on the preview) has no baseline: everything on it is
// new, and a tracker there must still fail --strict. A page only the baseline scanned was not looked at this
// time — its items are not "removed", just unchecked.
const pagesOf = (m) => new Set([...m.values()].map((i) => i.page).filter(Boolean));
const [pb, pc] = [pagesOf(mb), pagesOf(mc)];
const added = [...mc.values()].filter((i) => !mb.has(i.key));
const removed = [...mb.values()].filter((i) => !mc.has(i.key) && (!i.page || pc.has(i.page)));
const result = {
  kind: kb,
  baseline: { file: files[0], at: base.recordedAt || base.scannedAt || null, target: base.target || base.dir || null },
  current: { file: files[1], at: curr.recordedAt || curr.scannedAt || null, target: curr.target || curr.dir || null },
  pagesOnlyInBaseline: [...pb].filter((p) => !pc.has(p)),
  pagesOnlyInCurrent: [...pc].filter((p) => !pb.has(p)),
  added, removed,
  blocking: added.filter((i) => i.severity === 'block').length,
};
if (out) writeFileSync(out, JSON.stringify(result, null, 2));

const PHASE = { 'pre-consent': 'vor Consent', 'after-reject': 'nach Ablehnen', 'after-accept': 'nach Akzeptieren' };
const where = (i) => [i.page, i.phase && PHASE[i.phase]].filter(Boolean).join(' · ');
if (argv.includes('--md')) {
  console.log(`**Vergleich** ${result.baseline.at?.slice(0, 10) ?? files[0]} → ${result.current.at?.slice(0, 10) ?? files[1]} (${kb === 'scan' ? 'Runtime-Scan' : 'Code-Scan'})\n`);
  if (!added.length && !removed.length) console.log('Keine Änderung.');
  else {
    console.log('| Änderung | Was | Wo | Bewertung |');
    console.log('|---|---|---|---|');
    for (const i of added) console.log(`| neu | ${i.what} | ${where(i) || '—'} | ${i.severity === 'block' ? '🔴 Regression' : '🟡 DSE/Banner/AVV prüfen'} |`);
    for (const i of removed) console.log(`| entfernt | ${i.what} | ${where(i) || '—'} | ℹ️ aus DSE/Banner/VVT streichen, falls nicht mehr genutzt |`);
  }
  if (result.pagesOnlyInBaseline.length || result.pagesOnlyInCurrent.length) console.log(`\n${result.pagesOnlyInCurrent.length ? `Ohne Baseline (alles darauf gilt als neu): ${result.pagesOnlyInCurrent.join(', ')}. ` : ''}${result.pagesOnlyInBaseline.length ? `Diesmal nicht gescannt: ${result.pagesOnlyInBaseline.join(', ')}.` : ''}`);
} else {
  console.log(`=== Diff ${kb === 'scan' ? 'Runtime-Scan' : 'Code-Scan'}: +${added.length} / −${removed.length} (${result.blocking} blockierend) ===`);
  for (const i of added) console.log(`  ${i.severity === 'block' ? '🔴' : '🟡'} + ${i.what}${where(i) ? `  [${where(i)}]` : ''}`);
  for (const i of removed) console.log(`  ℹ️  − ${i.what}${where(i) ? `  [${where(i)}]` : ''}`);
  if (!added.length && !removed.length) console.log('  ✅ keine Änderung');
  for (const p of result.pagesOnlyInBaseline) console.log(`  ⚠️  ${p} diesmal nicht gescannt — nicht geprüft`);
  for (const p of result.pagesOnlyInCurrent) console.log(`  ⚠️  ${p} ohne Baseline — alles darauf ist als neu gewertet`);
}
if (out) console.error(`JSON: ${out}`);
process.exit(argv.includes('--strict') && result.blocking > 0 ? 1 : 0);
