#!/usr/bin/env node
// parse-har.mjs — turns a HAR file (DevTools → Network → Export HAR) into the same JSON shape the
// runtime scanner writes, so a client-supplied recording can stand in when scan-origins.mjs cannot
// reach the site (fallback 3 in SKILL.md, Phase 1b).
//
// A HAR is what *one person* recorded in *one state*: the script cannot know whether the banner was
// touched. Say which state it was with --phase; default "pre-consent" (the recording started on a
// fresh profile before any click). If the client clicked Accept first, pass --phase after-accept.
//
// Usage:
//   node scripts/parse-har.mjs recording.har [--out scan.json] [--phase pre-consent|after-reject|after-accept] [--url https://site.de/]
//
// Exit codes: 0 ok · 2 usage / unreadable HAR

import { readFileSync, writeFileSync } from 'node:fs';
import { registrable, summarizeRequests, checkHeaders, checkCookieAttributes } from './lib/signatures.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const file = argv.find((a) => !a.startsWith('--') && !['--out', '--phase', '--url'].includes(argv[argv.indexOf(a) - 1]));
if (!file) { console.error('Usage: node scripts/parse-har.mjs <file.har> [--out scan.json] [--phase pre-consent] [--url https://…]'); process.exit(2); }
let har;
try { har = JSON.parse(readFileSync(file, 'utf8')).log; } catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2); }
if (!har?.entries) { console.error('not a HAR file (no log.entries)'); process.exit(2); }
const PHASE = opt('--phase', 'pre-consent');
if (!['pre-consent', 'after-reject', 'after-accept'].includes(PHASE)) { console.error('--phase must be pre-consent | after-reject | after-accept'); process.exit(2); }

const entries = har.entries;
const docEntry = entries.find((e) => /text\/html/i.test(e.response?.content?.mimeType || '') || e._resourceType === 'document') || entries[0];
const target = opt('--url', har.pages?.[0]?.title?.startsWith('http') ? har.pages[0].title : docEntry?.request?.url);
if (!target) { console.error('cannot determine the page URL — pass --url'); process.exit(2); }
const pageReg = registrable(new URL(target).hostname);
const isHttps = target.startsWith('https:');

const typeOf = (e) => e._resourceType || ({ 'text/html': 'document', 'text/css': 'stylesheet', 'application/javascript': 'script', 'text/javascript': 'script', 'font/woff2': 'font', 'image/png': 'image', 'image/jpeg': 'image', 'image/svg+xml': 'image' }[(e.response?.content?.mimeType || '').split(';')[0]] || 'other');
const hasSetCookie = (e) => (e.response?.headers || []).some((h) => h.name.toLowerCase() === 'set-cookie') || (e.response?.cookies || []).length > 0;
const reqs = entries.map((e) => ({ url: e.request.url, type: typeOf(e), setCookie: hasSetCookie(e) }));

// cookies: everything a response set (with attributes) — the HAR has no jar, so this is the closest
const cookieMap = new Map();
for (const e of entries) {
  let host; try { host = new URL(e.request.url).hostname; } catch { continue; }
  for (const c of e.response?.cookies || []) {
    const domain = (c.domain || host).replace(/^\./, '');
    cookieMap.set(`${c.name}@${domain}`, {
      name: c.name, domain, thirdParty: registrable(domain) !== pageReg,
      expiresDays: c.expires ? Math.round((new Date(c.expires) - Date.now()) / 864e5) : 'session',
      httpOnly: !!c.httpOnly, secure: !!c.secure, sameSite: c.sameSite || null,
    });
  }
}
const cookies = [...cookieMap.values()];
const setCookieResponses = entries.filter(hasSetCookie).map((e) => e.request.url);
const mixedContent = isHttps ? [...new Set(reqs.filter((r) => r.url.startsWith('http://')).map((r) => r.url))] : [];
const headers = checkHeaders(Object.fromEntries((docEntry?.response?.headers || []).map((h) => [h.name, h.value])), isHttps);

const snapshot = { thirdPartyOrigins: summarizeRequests(reqs, pageReg), cookies, storage: { localStorage: [], sessionStorage: [] }, requestCount: reqs.length, storageUnknown: true };
const violations = snapshot.thirdPartyOrigins.filter((o) => o.kind !== 'cmp');
const report = {
  target, source: 'har', harFile: file, recordedAt: har.pages?.[0]?.startedDateTime || entries[0]?.startedDateTime || null, scannedAt: new Date().toISOString(),
  httpStatus: docEntry?.response?.status ?? null, headers, phases: { [PHASE]: snapshot }, pflichtseiten: {}, setCookieResponses,
  notes: [
    `Quelle: HAR-Datei, Zustand laut Angabe "${PHASE}". Was vor/nach einem Banner-Klick passierte, kann die Datei selbst nicht belegen.`,
    'localStorage/sessionStorage sind in einer HAR nicht enthalten — Application-Tab-Screenshot anfordern oder Scanner nutzen.',
  ],
  verdict: {
    [PHASE === 'pre-consent' ? 'thirdPartyBeforeConsent' : PHASE === 'after-reject' ? 'newOriginsAfterReject' : 'thirdPartyAfterAccept']: violations.map((o) => `${o.origin} (${o.service})`),
    thirdPartyCookiesBeforeConsent: PHASE === 'pre-consent' ? cookies.filter((c) => c.thirdParty).map((c) => `${c.name}@${c.domain}`) : [],
    headerFindings: headers.findings, cookieAttributeIssues: checkCookieAttributes(cookies, isHttps), mixedContent,
  },
};
if (opt('--out')) writeFileSync(opt('--out'), JSON.stringify(report, null, 2));

const line = (s = '') => console.log(s);
line(`=== HAR: ${target} (${entries.length} Einträge, Zustand: ${PHASE}${report.recordedAt ? `, aufgezeichnet ${report.recordedAt}` : ''}) ===`);
line(`\n-- Drittanbieter-Origins (${snapshot.requestCount} Requests) --`);
if (!violations.length) line(`  ✅ keine Drittanbieter-Origins (außer ggf. CMP) im Zustand "${PHASE}"`);
for (const o of snapshot.thirdPartyOrigins) line(`  ${o.kind === 'cmp' ? '🟡' : PHASE === 'after-accept' ? '•' : '🔴'} ${o.origin}  → ${o.service}  [${o.types.join(',')}] ×${o.count}${o.setCookie ? '  (Set-Cookie!)' : ''}`);
line(`  Cookies (aus Set-Cookie): ${cookies.length ? cookies.map((c) => `${c.name}@${c.domain}${c.thirdParty ? ' (3rd)' : ''}`).join('; ') : 'keine'}`);
line('\n-- Technisch --');
for (const h of headers.findings) line(`  🟡 ${h}`);
for (const c of report.verdict.cookieAttributeIssues) line(`  🟡 Cookie-Attribute: ${c}`);
for (const m of mixedContent) line(`  🟠 Mixed Content: ${m}`);
if (!headers.findings.length && !report.verdict.cookieAttributeIssues.length && !mixedContent.length) line('  ✅ Security-Header vorhanden, Cookie-Attribute ok, kein Mixed Content');
for (const n of report.notes) line(`\nℹ️  ${n}`);
if (opt('--out')) line(`\nJSON: ${opt('--out')}`);
