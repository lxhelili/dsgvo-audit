#!/usr/bin/env node
// scan-origins.mjs — runtime evidence for Phase 1 of the dsgvo-audit skill.
//
// Loads a URL in a fresh Chromium profile and records everything a static grep cannot see:
// every network request (origin, type, whether third-party), cookies (incl. those set via
// Set-Cookie headers of API/redirect responses), localStorage/sessionStorage — BEFORE any
// consent interaction, then again after clicking "Ablehnen", and optionally after "Akzeptieren".
// Also checks that Impressum and Datenschutz pages exist and are linked, the security headers of
// the document response, first-party cookie attributes, and mixed content.
//
// Usage:
//   node scripts/scan-origins.mjs https://example.de [options]
//     --out <file.json>        write the full report as JSON (default: scan-<host>.json)
//     --pages "/kontakt,/buchung"  scan these paths too (same three phases each); results under "pages"
//     --sitemap                read /sitemap.xml and scan its first --max-pages URLs too
//     --max-pages <n>          cap for --sitemap (default 10)
//     --reject "<regex>"       button text for reject (default covers DE/EN variants)
//     --accept "<regex>"       button text for accept (default covers DE/EN variants)
//     --no-accept              skip the accept phase
//     --wait <ms>              settle time after load/click (default 4000)
//     --strict                 exit 1 if non-essential third-party requests fire before consent
//                              or after reject — on any scanned page
//     --headed                 show the browser (debugging)
//
// Exit codes: 0 ok · 1 --strict violation · 2 usage / playwright missing · 3 page could not be loaded
// (network error, DNS, proxy) — no verdict is printed in that case, so a failed scan never reads as a pass.
//
// One scan is one page, one state, one moment. --pages/--sitemap run the same procedure per page in
// the same fresh profile order (each page starts a new context), so a consent given on one page is
// never carried to the next.
//
// Requirements: Node 18+ and `playwright` — project-local (npm i -D playwright && npx playwright install chromium)
// or global (npm i -g playwright); the script falls back to the global install automatically.
// Cowork cloud sandbox: playwright is preinstalled, but the sandbox network may not reach the target
// site. On exit code 3 run the scan locally (Claude Code, `npm run scan`) or use the fallbacks in SKILL.md.

import { writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { registrable, summarizeRequests, checkHeaders, checkCookieAttributes } from './lib/signatures.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  // ESM ignores NODE_PATH, so resolve a global install by hand
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const entry = join(globalRoot, 'playwright', 'index.mjs');
    if (!existsSync(entry)) throw new Error('no global playwright');
    ({ chromium } = await import(pathToFileURL(entry).href));
  } catch {
    console.error('playwright not found. Install: npm i -D playwright && npx playwright install chromium  (or npm i -g playwright)');
    process.exit(2);
  }
}

// ---------- args ----------
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const flag = (name) => argv.includes(name);
const target = argv.find((a) => /^https?:\/\//.test(a));
if (!target) {
  console.error('Usage: node scripts/scan-origins.mjs <https://url> [--out file] [--pages "/a,/b"] [--sitemap] [--strict] [--no-accept]');
  process.exit(2);
}
const REJECT = new RegExp(opt('--reject', 'alle ablehnen|ablehnen|nur (technisch )?notwendige|nur essenzielle|nur erforderliche|reject all|reject|decline|only necessary|essential only'), 'i');
const ACCEPT = new RegExp(opt('--accept', 'alle akzeptieren|alle annehmen|allen? zustimmen|akzeptieren|zustimmen|einverstanden|accept all|accept|allow all|agree'), 'i');
// "Nur notwendige akzeptieren" also matches ACCEPT. So the accept phase first looks for an explicit
// accept-all button, then for any ACCEPT match that is not also a REJECT match — otherwise a banner
// that lists the reject-equivalent first makes the "after accept" inventory silently incomplete.
const ACCEPT_ALL = /alle akzeptieren|alle annehmen|allen? zustimmen|alles akzeptieren|accept all|allow all|agree to all/i;
const WAIT = Number(opt('--wait', 4000));
const OUT = opt('--out', `scan-${new URL(target).hostname}.json`);
const MAX_PAGES = Number(opt('--max-pages', 10));
const extraPaths = (opt('--pages', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

// ---------- helpers ----------
async function findAndClick(page, re, exclude = null) {
  for (const frame of page.frames()) {
    // role-based first (accessible name), then any clickable with matching text
    const candidates = [
      frame.getByRole('button', { name: re }),
      frame.getByRole('link', { name: re }),
      frame.locator('button, a, [role=button], input[type=button], input[type=submit]').filter({ hasText: re }),
    ];
    for (const loc of candidates) {
      try {
        const n = await loc.count();
        for (let i = 0; i < Math.min(n, 8); i++) {
          const el = loc.nth(i);
          if (!(await el.isVisible().catch(() => false))) continue;
          const raw = (await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label').catch(() => '')) || (await el.getAttribute('value').catch(() => '')) || '';
          const text = raw.trim().slice(0, 60);
          if (exclude && exclude.test(text)) continue;
          await el.click({ timeout: 3000 });
          return text || '(clicked)';
        }
      } catch { /* try next */ }
    }
  }
  return null;
}

// Accept phase: explicit "accept all" first, then any ACCEPT match that is not a REJECT match.
async function clickAccept(page) {
  return (await findAndClick(page, ACCEPT_ALL, REJECT)) ?? (await findAndClick(page, ACCEPT, REJECT));
}

async function snapshot(page, context, pageReg, phaseRequests) {
  const cookies = (await context.cookies()).map((c) => ({
    name: c.name, domain: c.domain, thirdParty: registrable(c.domain.replace(/^\./, '')) !== pageReg,
    expiresDays: c.expires > 0 ? Math.round((c.expires * 1000 - Date.now()) / 864e5) : 'session',
    httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite,
  }));
  const storage = await page.evaluate(() => {
    const safe = (s) => { try { return Object.keys(s); } catch { return []; } };
    return { localStorage: safe(window.localStorage), sessionStorage: safe(window.sessionStorage) };
  }).catch(() => ({ localStorage: [], sessionStorage: [] }));
  return { thirdPartyOrigins: summarizeRequests(phaseRequests, pageReg), cookies, storage, requestCount: phaseRequests.length };
}

// ---------- one page, three phases ----------
async function scanPage(browser, url, { pflichtseiten = false } = {}) {
  const context = await browser.newContext({
    locale: 'de-DE', timezoneId: 'Europe/Berlin',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 dsgvo-audit-scan',
  });
  const page = await context.newPage();
  const pageReg = registrable(new URL(url).hostname);
  const isHttps = url.startsWith('https:');

  let phase = 'pre-consent';
  const requests = { 'pre-consent': [], 'after-reject': [], 'after-accept': [] };
  const setCookieUrls = new Set();
  const mixedContent = new Set();
  context.on('request', (r) => {
    requests[phase]?.push({ url: r.url(), type: r.resourceType(), setCookie: false });
    if (isHttps && r.url().startsWith('http://')) mixedContent.add(r.url());
  });
  context.on('response', async (res) => {
    const hdrs = await res.headersArray().catch(() => []);
    if (hdrs.some((h) => h.name.toLowerCase() === 'set-cookie')) {
      setCookieUrls.add(res.url());
      const list = requests[phase]; const hit = list?.find((x) => x.url === res.url()); if (hit) hit.setCookie = true;
    }
  });

  const report = { target: url, scannedAt: new Date().toISOString(), phases: {}, pflichtseiten: {}, notes: [] };

  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    report.httpStatus = resp?.status();
    if ([403, 429, 503].includes(report.httpStatus)) report.notes.push(`HTTP ${report.httpStatus} — möglicherweise Bot-Schutz/Challenge-Seite statt der eigentlichen Seite; Ergebnis mit Vorsicht lesen, ggf. mit --headed prüfen.`);
    report.headers = checkHeaders(resp ? await resp.allHeaders().catch(() => ({})) : {}, isHttps);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(WAIT);
    // light scroll to trigger lazy embeds
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => {});
    await page.waitForTimeout(1000);
    report.phases['pre-consent'] = await snapshot(page, context, pageReg, requests['pre-consent']);

    // forms on this page: where do they post to? (a form target in a third country is checklist 6)
    report.forms = await page.evaluate(() =>
      [...document.querySelectorAll('form')].map((f) => ({
        action: f.action || '(same page / JS)', method: (f.method || 'get').toLowerCase(),
        fields: [...f.querySelectorAll('input,textarea,select')].map((i) => i.name || i.id || i.type).filter(Boolean).slice(0, 20),
        privacyNoteNearby: /datenschutz|privacy/i.test(f.innerText || ''),
      }))).catch(() => []);

    // Pflichtseiten + footer links (main page only — subpages share the footer)
    if (pflichtseiten) {
      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map((a) => ({ text: (a.innerText || a.textContent || '').trim().slice(0, 40), href: a.href })));
      const impressumLink = links.find((l) => /impressum|imprint/i.test(l.text) || /impressum|imprint/i.test(l.href));
      const dseLink = links.find((l) => /datenschutz|privacy/i.test(l.text) || /datenschutz|privacy/i.test(l.href));
      const odrLink = links.find((l) => /ec\.europa\.eu\/consumers\/odr/i.test(l.href));
      report.pflichtseiten = { impressumLink: impressumLink || null, datenschutzLink: dseLink || null, odrLinkStillPresent: !!odrLink };
      for (const path of ['/impressum', '/datenschutz', '/datenschutzerklaerung', '/privacy', '/imprint']) {
        try {
          const r = await context.request.get(new URL(path, url).toString(), { maxRedirects: 3, timeout: 10000 });
          report.pflichtseiten[path] = r.status();
        } catch { report.pflichtseiten[path] = 'error'; }
      }
    }

    // Reject
    phase = 'after-reject';
    const rejected = await findAndClick(page, REJECT);
    report.phases['after-reject'] = { clicked: rejected };
    if (rejected) {
      await page.waitForTimeout(WAIT);
      Object.assign(report.phases['after-reject'], await snapshot(page, context, pageReg, requests['after-reject']));
    } else {
      report.notes.push('No reject button matched on the first layer — either there is none (🟠 finding: reject not on first layer) or the CMP uses non-standard wording; pass --reject "<regex>".');
    }

    // Accept (to see the full service list for the DSE)
    if (!flag('--no-accept')) {
      phase = 'after-accept';
      await page.reload({ waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(1500);
      const accepted = await clickAccept(page);
      report.phases['after-accept'] = { clicked: accepted };
      if (accepted) {
        await page.waitForTimeout(WAIT);
        Object.assign(report.phases['after-accept'], await snapshot(page, context, pageReg, requests['after-accept']));
      }
    }
  } catch (e) {
    report.error = String(e?.message || e);
  } finally {
    await context.close().catch(() => {});
  }

  if (report.httpStatus === undefined) { report.verdict = null; return report; }

  const pre = report.phases['pre-consent'];
  const preViolations = (pre?.thirdPartyOrigins || []).filter((o) => o.kind !== 'cmp');
  const preCookies3p = (pre?.cookies || []).filter((c) => c.thirdParty);
  report.verdict = {
    thirdPartyBeforeConsent: preViolations.map((o) => `${o.origin} (${o.service})`),
    thirdPartyCookiesBeforeConsent: preCookies3p.map((c) => `${c.name}@${c.domain}`),
    newOriginsAfterReject: (report.phases['after-reject']?.thirdPartyOrigins || []).filter((o) => o.kind !== 'cmp').map((o) => `${o.origin} (${o.service})`),
    odrLinkStillPresent: report.pflichtseiten.odrLinkStillPresent,
    headerFindings: report.headers?.findings || [],
    cookieAttributeIssues: checkCookieAttributes(pre?.cookies, isHttps),
    mixedContent: [...mixedContent],
    thirdPartyFormTargets: (report.forms || []).filter((f) => { try { return registrable(new URL(f.action).hostname) !== pageReg; } catch { return false; } }).map((f) => f.action),
  };
  report.setCookieResponses = [...setCookieUrls];
  return report;
}

// ---------- run ----------
const browser = await chromium.launch({ headless: !flag('--headed') });
let report;
try {
  report = await scanPage(browser, target, { pflichtseiten: true });

  // additional pages: --pages and/or --sitemap
  if (report.verdict !== null) {
    const extra = extraPaths.map((p) => new URL(p, target).toString());
    if (flag('--sitemap')) {
      try {
        const res = await fetch(new URL('/sitemap.xml', target), { signal: AbortSignal.timeout(10000) });
        const xml = res.ok ? await res.text() : '';
        const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).filter((u) => u !== target && !/\.(xml|pdf|jpg|png|webp)$/i.test(u));
        extra.push(...locs.slice(0, MAX_PAGES));
        report.notes.push(locs.length ? `Sitemap: ${locs.length} URLs gefunden, ${Math.min(locs.length, MAX_PAGES)} gescannt (--max-pages).` : 'Sitemap: /sitemap.xml nicht gefunden oder leer.');
      } catch (e) { report.notes.push(`Sitemap konnte nicht gelesen werden: ${e.message}`); }
    }
    const seen = new Set([target]);
    if (extra.length) report.pages = {};
    for (const u of extra) {
      if (seen.has(u)) continue; seen.add(u);
      report.pages[u] = await scanPage(browser, u);
    }
  }
} finally {
  await browser.close();
}

// ---------- failed load → no verdict, distinct exit code ----------
if (report.verdict === null) {
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.error(`\n=== Runtime scan: ${target} ===`);
  console.error(`❌ Seite konnte nicht geladen werden: ${report.error || 'keine Antwort'}`);
  console.error('   Kein Befund. Netzwerk/Proxy/DNS prüfen — im Cowork-Sandbox ggf. den Scan lokal ausführen (Claude Code, npm run scan).');
  console.error(`JSON: ${OUT}`);
  process.exit(3);
}
writeFileSync(OUT, JSON.stringify(report, null, 2));

// ---------- output ----------
const line = (s = '') => console.log(s);
const ttl = (c) => (c.expiresDays === 'session' ? 'session' : `${c.expiresDays}d`);

function printPage(r, { full = true } = {}) {
  const pre = r.phases['pre-consent'];
  const preViolations = (pre?.thirdPartyOrigins || []).filter((o) => o.kind !== 'cmp');
  line(`\n=== Runtime scan: ${r.target} (HTTP ${r.httpStatus ?? '?'}) ===`);
  if (r.error) line(`⚠️  error: ${r.error}`);
  if (r.verdict === null) { line('  ❌ Seite konnte nicht geladen werden — kein Befund für diese Seite'); return; }
  line(`\n-- Vor Consent (${pre?.requestCount ?? 0} Requests) --`);
  if (!preViolations.length) line('  ✅ keine Drittanbieter-Origins vor Consent (außer ggf. CMP)');
  for (const o of pre?.thirdPartyOrigins || []) line(`  ${o.kind === 'cmp' ? '🟡' : '🔴'} ${o.origin}  → ${o.service}  [${o.types.join(',')}] ×${o.count}${o.setCookie ? '  (Set-Cookie!)' : ''}`);
  line(`  Cookies: ${pre?.cookies?.length ? pre.cookies.map((c) => `${c.name}@${c.domain}${c.thirdParty ? ' (3rd)' : ''} ${ttl(c)}`).join('; ') : 'keine'}`);
  line(`  localStorage: [${pre?.storage?.localStorage?.join(', ')}]  sessionStorage: [${pre?.storage?.sessionStorage?.join(', ')}]`);
  const ar = r.phases['after-reject'];
  line(`\n-- Nach "Ablehnen" (${ar?.clicked ? `Button: "${ar.clicked}"` : 'kein Reject-Button gefunden'}) --`);
  if (ar?.clicked) {
    const v = r.verdict.newOriginsAfterReject;
    line(v.length ? v.map((x) => `  🔴 lädt trotz Ablehnen: ${x}`).join('\n') : '  ✅ keine neuen Drittanbieter-Requests nach Ablehnen');
    line(`  Cookies danach: ${ar.cookies?.map((c) => c.name).join(', ') || 'keine'}`);
  }
  const aa = r.phases['after-accept'];
  if (aa) {
    line(`\n-- Nach "Akzeptieren" (${aa.clicked ? `Button: "${aa.clicked}"` : 'kein Accept-Button gefunden'}) --`);
    for (const o of aa.thirdPartyOrigins || []) line(`  • ${o.origin} → ${o.service} [${o.types.join(',')}]`);
    line(`  Cookies danach: ${aa.cookies?.map((c) => `${c.name}@${c.domain} ${ttl(c)}`).join('; ') || 'keine'}`);
  }
  if (r.forms?.length) {
    line('\n-- Formulare --');
    for (const f of r.forms) line(`  ${r.verdict.thirdPartyFormTargets.includes(f.action) ? '🟠' : '•'} ${f.method.toUpperCase()} ${f.action}  [${f.fields.join(', ')}]${f.privacyNoteNearby ? '' : '  (kein Datenschutzhinweis im Formular gefunden)'}`);
  }
  line('\n-- Technisch (Art. 32, Checkliste 10) --');
  for (const h of r.verdict.headerFindings) line(`  🟡 ${h}`);
  for (const c of r.verdict.cookieAttributeIssues) line(`  🟡 Cookie-Attribute: ${c}`);
  for (const m of r.verdict.mixedContent) line(`  🟠 Mixed Content: ${m}`);
  if (!r.verdict.headerFindings.length && !r.verdict.cookieAttributeIssues.length && !r.verdict.mixedContent.length) line('  ✅ Security-Header vorhanden, Cookie-Attribute ok, kein Mixed Content');
  if (full) {
    line('\n-- Pflichtseiten --');
    line(`  Impressum-Link: ${r.pflichtseiten.impressumLink ? '✅ ' + r.pflichtseiten.impressumLink.href : '🔴 nicht gefunden'}`);
    line(`  Datenschutz-Link: ${r.pflichtseiten.datenschutzLink ? '✅ ' + r.pflichtseiten.datenschutzLink.href : '🔴 nicht gefunden'}`);
    line(`  OS-Plattform-Link (seit 20.07.2025 abgeschaltet): ${r.pflichtseiten.odrLinkStillPresent ? '🟠 noch vorhanden → entfernen' : '✅ nicht vorhanden'}`);
    for (const p of ['/impressum', '/datenschutz', '/datenschutzerklaerung', '/privacy', '/imprint']) if (r.pflichtseiten[p] !== undefined) line(`  ${p}: ${r.pflichtseiten[p]}`);
  }
  for (const n of r.notes) line(`\nℹ️  ${n}`);
}

printPage(report);
for (const [, r] of Object.entries(report.pages || {})) printPage(r, { full: false });

line(`\nJSON: ${OUT}`);
const scanned = 1 + Object.keys(report.pages || {}).length;
line(scanned > 1
  ? `Hinweis: ${scanned} Seiten gescannt, jede in einem frischen Profil. Andere Unterseiten (Kontakt, Buchung, Checkout, Login) ggf. mit --pages ergänzen.`
  : 'Hinweis: Ein Scan sieht eine Seite, einen Zustand, einen Zeitpunkt. Unterseiten (Kontakt, Buchung, Checkout) separat scannen oder mit --pages "/kontakt,/buchung" anhängen.');

const all = [report, ...Object.values(report.pages || {})].filter((r) => r.verdict);
const violated = all.some((r) => r.verdict.thirdPartyBeforeConsent.length || r.verdict.newOriginsAfterReject.length);
if (flag('--strict') && violated) process.exit(1);
