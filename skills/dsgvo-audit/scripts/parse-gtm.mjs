#!/usr/bin/env node
// parse-gtm.mjs — reads a Google Tag Manager container export (Admin → Export Container → JSON)
// and lists every tag with its type, firing triggers, consent settings and a first verdict.
//
// Why: a GTM container is a black box to grep and to the runtime scanner until its tags fire. The
// export is the only complete inventory. This script turns it into the table that section 3
// (Consent → "GTM im Einsatz") and section 5 (Drittanbieter) of the report need.
//
// Usage:
//   node scripts/parse-gtm.mjs GTM-XXXXXX_workspace.json [--out gtm.json] [--md]
//
// Verdict logic (per tag, static — the CMP wiring still has to be verified at runtime):
//   🔴  fires on All Pages / Initialization / Consent Initialization with no consent condition and
//       no Consent-Mode requirement → loads before consent
//   🟡  Consent-Mode requirement (NEEDS_CONSENT + types) or a trigger that looks consent-driven
//       (name contains consent / cookie / cmp / ucEvent…) → gated *if* the CMP actually sets the
//       signals; verify with scan-origins.mjs
//   🟢  neutral tag (Conversion Linker without cookies is still § 25 — so nothing is 🟢 here except
//       paused tags, which are ⚪️)
//   ⚪️  paused, or trigger unknown
//
// Exit codes: 0 ok · 2 usage / unreadable export

import { readFileSync, writeFileSync } from 'node:fs';
import { SIGNATURES } from './lib/signatures.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const file = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--out');
if (!file) { console.error('Usage: node scripts/parse-gtm.mjs <container-export.json> [--out gtm.json] [--md]'); process.exit(2); }
let doc;
try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2); }
const cv = doc.containerVersion || doc;
if (!cv.tag && !cv.trigger) { console.error('not a GTM container export (no containerVersion.tag / .trigger)'); process.exit(2); }

// Built-in trigger ids GTM does not list in the export
const BUILTIN_TRIGGERS = {
  2147479553: { name: 'All Pages', type: 'PAGEVIEW', builtin: true },
  2147479572: { name: 'Consent Initialization - All Pages', type: 'CONSENT_INIT', builtin: true },
  2147479573: { name: 'Initialization - All Pages', type: 'INIT', builtin: true },
};
const TAG_TYPES = {
  googtag: 'Google Tag (GA4/Ads)', gaawc: 'GA4 Configuration', gaawe: 'GA4 Event', ua: 'Universal Analytics (eingestellt)',
  awct: 'Google Ads Conversion', sp: 'Google Ads Remarketing', gclidw: 'Conversion Linker', flc: 'Floodlight Counter', fls: 'Floodlight Sales',
  html: 'Custom HTML', img: 'Custom Image (Pixel)', hjtc: 'Hotjar', bzi: 'LinkedIn Insight', pntr: 'Pinterest Tag', twitter_website_tag: 'X/Twitter Pixel',
  cegg: 'Crazy Egg', fbp: 'Meta Pixel', ms_uet: 'Microsoft Ads UET', clarity: 'Microsoft Clarity', mf: 'Mouseflow', crto: 'Criteo', adm: 'AdRoll', tdc: 'Trade Desk',
};
const templates = new Map((cv.customTemplate || []).map((t) => [t.templateId, t.name]));
function tagTypeName(t) {
  if (TAG_TYPES[t.type]) return TAG_TYPES[t.type];
  const m = t.type?.match(/^cvt_(\d+)_(\d+)$/);
  if (m) return `Template: ${templates.get(m[2]) || t.type}`;
  return t.type || 'unknown';
}
const triggers = new Map([...Object.entries(BUILTIN_TRIGGERS).map(([id, t]) => [String(id), t]), ...(cv.trigger || []).map((t) => [String(t.triggerId), { name: t.name, type: t.type, builtin: false }])]);
const param = (t, key) => (t.parameter || []).find((p) => p.key === key)?.value;
const CONSENT_TRIGGER = /consent|cookie|cmp|uc[_ ]?event|ucevent|klaro|borlabs|cookiebot|usercentrics|onetrust|einwilligung|zustimmung/i;

const rows = [];
for (const t of cv.tag || []) {
  const firing = (t.firingTriggerId || []).map((id) => triggers.get(String(id)) || { name: `#${id}`, type: 'UNKNOWN' });
  const blocking = (t.blockingTriggerId || []).map((id) => triggers.get(String(id))?.name || `#${id}`);
  const cs = t.consentSettings || {};
  const consentStatus = cs.consentStatus || 'NOT_SET';
  const consentTypes = (cs.consentType?.list || []).map((x) => x.value);
  const html = t.type === 'html' ? param(t, 'html') || '' : '';
  const origins = [];
  for (const [re, name] of SIGNATURES) if (html && re.test(html)) origins.push(name);
  for (const m of html.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) if (!origins.includes(m[1])) origins.push(m[1]);
  const ids = [param(t, 'measurementId'), param(t, 'tagId'), param(t, 'conversionId'), param(t, 'trackingId'), param(t, 'hotjar_site_id')].filter(Boolean);

  const firesUnconditionally = firing.some((f) => f.builtin || /^(PAGEVIEW|DOM_READY|WINDOW_LOADED|INIT|CONSENT_INIT)$/.test(f.type)) && !firing.some((f) => CONSENT_TRIGGER.test(f.name));
  const consentTriggered = firing.some((f) => CONSENT_TRIGGER.test(f.name)) || blocking.some((b) => CONSENT_TRIGGER.test(b));
  const consentMode = consentStatus === 'NEEDS_CONSENT' && consentTypes.length > 0;
  let status, reason;
  if (t.paused) { status = '⚪️'; reason = 'pausiert — nicht aktiv, aber im Container; entfernen oder dokumentieren'; }
  else if (!firing.length) { status = '⚪️'; reason = 'kein Trigger — Tag feuert nicht'; }
  else if (consentTriggered && !firesUnconditionally) { status = '🟡'; reason = `feuert über consent-artigen Trigger (${firing.map((f) => f.name).join(', ')}) — CMP-Verdrahtung zur Laufzeit prüfen`; }
  else if (consentMode) { status = '🟡'; reason = `Consent-Mode-Bedingung (${consentTypes.join(', ')}) — greift nur, wenn das CMP die Defaults auf "denied" setzt; Laufzeit prüfen`; }
  else if (firesUnconditionally) { status = '🔴'; reason = `feuert auf ${firing.map((f) => f.name).join(', ')} ohne Consent-Bedingung → lädt vor Einwilligung (§ 25 Abs. 1 TDDDG)`; }
  else { status = '🟠'; reason = `Trigger ${firing.map((f) => `${f.name} [${f.type}]`).join(', ')} — Bedingung manuell prüfen`; }
  if (t.type === 'gclidw' && status !== '⚪️') reason += '; Conversion Linker setzt First-Party-Cookies (_gcl_*) → ebenfalls § 25';

  rows.push({ name: t.name, type: tagTypeName(t), rawType: t.type, ids, firing: firing.map((f) => f.name), blocking, consentStatus, consentTypes, origins, paused: !!t.paused, status, reason });
}
rows.sort((a, b) => ['🔴', '🟠', '🟡', '⚪️'].indexOf(a.status) - ['🔴', '🟠', '🟡', '⚪️'].indexOf(b.status));

const out = {
  file, container: cv.container?.publicId || doc.containerVersion?.container?.publicId || null, containerName: cv.container?.name || null,
  exportedAt: doc.exportTime || null, tags: rows,
  triggers: [...triggers.entries()].filter(([, t]) => !t.builtin).map(([id, t]) => ({ id, ...t })),
  summary: { total: rows.length, red: rows.filter((r) => r.status === '🔴').length, orange: rows.filter((r) => r.status === '🟠').length, yellow: rows.filter((r) => r.status === '🟡').length, paused: rows.filter((r) => r.paused).length },
};
if (opt('--out')) writeFileSync(opt('--out'), JSON.stringify(out, null, 2));

const line = (s = '') => console.log(s);
if (argv.includes('--md')) {
  line(`| Status | Tag | Typ | Trigger | Consent-Einstellung | Origins/IDs | Befund |`);
  line(`|---|---|---|---|---|---|---|`);
  for (const r of rows) line(`| ${r.status} | ${r.name} | ${r.type} | ${r.firing.join(', ') || '—'} | ${r.consentStatus}${r.consentTypes.length ? ` (${r.consentTypes.join(', ')})` : ''} | ${[...r.origins, ...r.ids].join(', ') || '—'} | ${r.reason} |`);
} else {
  line(`=== GTM-Container ${out.container || ''} ${out.containerName ? `(${out.containerName})` : ''} — ${rows.length} Tags, ${out.triggers.length} eigene Trigger ===`);
  for (const r of rows) {
    line(`\n${r.status} ${r.name}  [${r.type}${r.ids.length ? ` ${r.ids.join(', ')}` : ''}]`);
    line(`   Trigger: ${r.firing.join(', ') || '—'}${r.blocking.length ? `  | blockiert durch: ${r.blocking.join(', ')}` : ''}`);
    line(`   Consent: ${r.consentStatus}${r.consentTypes.length ? ` (${r.consentTypes.join(', ')})` : ''}${r.origins.length ? `  | lädt: ${r.origins.join(', ')}` : ''}`);
    line(`   → ${r.reason}`);
  }
  line(`\nSummary: 🔴 ${out.summary.red} · 🟠 ${out.summary.orange} · 🟡 ${out.summary.yellow} · ⚪️ ${out.summary.paused} pausiert`);
  if (opt('--out')) line(`JSON: ${opt('--out')}`);
  line('Hinweis: Statische Sicht auf den Container. Ob das CMP die Consent-Signale wirklich setzt, zeigt nur der Laufzeit-Scan — GTM selbst muss außerdem hinter dem Consent geladen werden (services.md).');
}
