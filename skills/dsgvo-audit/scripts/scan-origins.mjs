#!/usr/bin/env node
// scan-origins.mjs — runtime evidence for Phase 1 of the dsgvo-audit skill.
//
// Loads a URL in a fresh Chromium profile and records everything a static grep cannot see:
// every network request (origin, type, whether third-party), cookies (incl. those set via
// Set-Cookie headers of API/redirect responses), localStorage/sessionStorage — BEFORE any
// consent interaction, then again after clicking "Ablehnen", and optionally after "Akzeptieren".
// Also checks that Impressum and Datenschutz pages exist and are linked.
//
// Usage:
//   node scripts/scan-origins.mjs https://example.de [options]
//     --out <file.json>        write the full report as JSON (default: scan-<host>.json)
//     --reject "<regex>"       button text for reject (default covers DE/EN variants)
//     --accept "<regex>"       button text for accept (default covers DE/EN variants)
//     --no-accept              skip the accept phase
//     --wait <ms>              settle time after load/click (default 4000)
//     --strict                 exit 1 if non-essential third-party requests fire before consent
//     --headed                 show the browser (debugging)
//
// Exit codes: 0 ok · 1 --strict violation · 2 usage / playwright missing · 3 page could not be loaded
// (network error, DNS, proxy) — no verdict is printed in that case, so a failed scan never reads as a pass.
//
// Requirements: Node 18+ and `playwright` — project-local (npm i -D playwright && npx playwright install chromium)
// or global (npm i -g playwright); the script falls back to the global install automatically.
// Cowork cloud sandbox: playwright is preinstalled, but the sandbox network may not reach the target
// site. On exit code 3 run the scan locally (Claude Code, `npm run scan`) or use the fallbacks in SKILL.md.

import { writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

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
  console.error('Usage: node scripts/scan-origins.mjs <https://url> [--out file] [--strict] [--no-accept]');
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

// ---------- helpers ----------
const MULTI_TLD = new Set(['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'co.nz', 'co.jp', 'com.br', 'com.tr', 'co.za', 'com.mx']);
function registrable(host) {
  const p = host.toLowerCase().split('.');
  if (p.length >= 3 && MULTI_TLD.has(p.slice(-2).join('.'))) return p.slice(-3).join('.');
  return p.slice(-2).join('.');
}

// Known services — for labelling only; anything unknown is still reported as a foreign origin.
const SIGNATURES = [
  [/googletagmanager\.com/i, 'Google Tag Manager', 'tracking'],
  [/google-analytics\.com|analytics\.google\.com|\/g\/collect|\/collect\?v=2/i, 'Google Analytics', 'tracking'],
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/i, 'Google Fonts', 'asset'],
  [/maps\.googleapis\.com|maps\.gstatic\.com|google\.[a-z.]+\/maps/i, 'Google Maps', 'embed'],
  [/recaptcha|gstatic\.com\/recaptcha/i, 'Google reCAPTCHA', 'captcha'],
  [/doubleclick\.net|googleadservices|googlesyndication|google\.[a-z.]+\/pagead/i, 'Google Ads', 'tracking'],
  [/facebook\.net|facebook\.com\/tr|connect\.facebook/i, 'Meta Pixel / SDK', 'tracking'],
  [/instagram\.com|cdninstagram/i, 'Instagram', 'embed'],
  [/youtube\.com|ytimg\.com/i, 'YouTube', 'embed'],
  [/youtube-nocookie\.com/i, 'YouTube (nocookie)', 'embed'],
  [/vimeo\.com|vimeocdn/i, 'Vimeo', 'embed'],
  [/hotjar/i, 'Hotjar', 'tracking'],
  [/clarity\.ms/i, 'Microsoft Clarity', 'tracking'],
  [/linkedin\.com|licdn\.com/i, 'LinkedIn', 'tracking'],
  [/tiktok/i, 'TikTok', 'tracking'],
  [/calendly\.com/i, 'Calendly', 'embed'],
  [/typekit\.net|use\.typekit/i, 'Adobe Fonts', 'asset'],
  [/cdnjs\.cloudflare\.com|jsdelivr\.net|unpkg\.com/i, 'Public CDN', 'asset'],
  [/kit\.fontawesome|use\.fontawesome/i, 'Font Awesome CDN', 'asset'],
  [/challenges\.cloudflare\.com/i, 'Cloudflare Turnstile', 'captcha'],
  [/hcaptcha\.com/i, 'hCaptcha', 'captcha'],
  [/friendlycaptcha/i, 'Friendly Captcha', 'captcha'],
  [/sentry\.io|ingest\.[a-z.]*sentry/i, 'Sentry', 'monitoring'],
  [/posthog/i, 'PostHog', 'tracking'],
  [/plausible\.io/i, 'Plausible', 'tracking'],
  [/_vercel\/insights|vercel-insights|vitals\.vercel/i, 'Vercel Web Analytics', 'tracking'],
  [/_vercel\/speed-insights/i, 'Vercel Speed Insights', 'tracking'],
  [/usercentrics|cookiebot|consentmanager|cookiefirst|iubenda|klaro|onetrust|borlabs/i, 'CMP', 'cmp'],
  [/js\.stripe\.com|m\.stripe\.(com|network)/i, 'Stripe.js', 'payment'],
  [/paypal\.com|paypalobjects/i, 'PayPal', 'payment'],
  [/intercom|crisp\.chat|tawk\.to|hubspot|hs-scripts/i, 'Chat/CRM widget', 'tracking'],
  [/tile\.openstreetmap|openstreetmap\.org/i, 'OpenStreetMap tiles', 'embed'],
  [/trustpilot|provenexpert|google\.com\/reviews/i, 'Review widget', 'embed'],
  [/matomo|piwik/i, 'Matomo', 'tracking'],
];
function label(url) {
  for (const [re, name, kind] of SIGNATURES) if (re.test(url)) return { name, kind };
  return { name: 'unknown', kind: 'unknown' };
}

function summarizeRequests(reqs, pageReg) {
  const byOrigin = new Map();
  for (const r of reqs) {
    let host;
    try { host = new URL(r.url).hostname; } catch { continue; }
    const thirdParty = registrable(host) !== pageReg;
    if (!thirdParty) continue;
    const key = host;
    const e = byOrigin.get(key) || { origin: host, count: 0, types: new Set(), service: label(r.url).name, kind: label(r.url).kind, sample: r.url, setCookie: false };
    e.count++; e.types.add(r.type); if (r.setCookie) e.setCookie = true;
    byOrigin.set(key, e);
  }
  return [...byOrigin.values()].map((e) => ({ ...e, types: [...e.types] })).sort((a, b) => b.count - a.count);
}

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

// ---------- run ----------
const browser = await chromium.launch({ headless: !flag('--headed') });
const context = await browser.newContext({
  locale: 'de-DE', timezoneId: 'Europe/Berlin',
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 dsgvo-audit-scan',
});
const page = await context.newPage();
const pageHost = new URL(target).hostname;
const pageReg = registrable(pageHost);

let phase = 'pre-consent';
const requests = { 'pre-consent': [], 'after-reject': [], 'after-accept': [] };
const setCookieUrls = new Set();
context.on('request', (r) => requests[phase]?.push({ url: r.url(), type: r.resourceType(), setCookie: false }));
context.on('response', async (res) => {
  const hdrs = await res.headersArray().catch(() => []);
  if (hdrs.some((h) => h.name.toLowerCase() === 'set-cookie')) {
    setCookieUrls.add(res.url());
    const list = requests[phase]; const hit = list?.find((x) => x.url === res.url()); if (hit) hit.setCookie = true;
  }
});

const report = { target, scannedAt: new Date().toISOString(), phases: {}, pflichtseiten: {}, notes: [] };

try {
  const resp = await page.goto(target, { waitUntil: 'load', timeout: 45000 });
  report.httpStatus = resp?.status();
  if ([403, 429, 503].includes(report.httpStatus)) report.notes.push(`HTTP ${report.httpStatus} — möglicherweise Bot-Schutz/Challenge-Seite statt der eigentlichen Seite; Ergebnis mit Vorsicht lesen, ggf. mit --headed prüfen.`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(WAIT);
  // light scroll to trigger lazy embeds
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => {});
  await page.waitForTimeout(1000);
  report.phases['pre-consent'] = await snapshot(page, context, pageReg, requests['pre-consent']);

  // Pflichtseiten + footer links
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].map((a) => ({ text: (a.innerText || a.textContent || '').trim().slice(0, 40), href: a.href })));
  const impressumLink = links.find((l) => /impressum|imprint/i.test(l.text) || /impressum|imprint/i.test(l.href));
  const dseLink = links.find((l) => /datenschutz|privacy/i.test(l.text) || /datenschutz|privacy/i.test(l.href));
  const odrLink = links.find((l) => /ec\.europa\.eu\/consumers\/odr/i.test(l.href));
  report.pflichtseiten = { impressumLink: impressumLink || null, datenschutzLink: dseLink || null, odrLinkStillPresent: !!odrLink };
  for (const path of ['/impressum', '/datenschutz', '/datenschutzerklaerung', '/privacy', '/imprint']) {
    try {
      const r = await context.request.get(new URL(path, target).toString(), { maxRedirects: 3, timeout: 10000 });
      report.pflichtseiten[path] = r.status();
    } catch { report.pflichtseiten[path] = 'error'; }
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
  await browser.close();
}

// ---------- failed load → no verdict, distinct exit code ----------
if (report.httpStatus === undefined) {
  report.verdict = null;
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.error(`\n=== Runtime scan: ${target} ===`);
  console.error(`❌ Seite konnte nicht geladen werden: ${report.error || 'keine Antwort'}`);
  console.error('   Kein Befund. Netzwerk/Proxy/DNS prüfen — im Cowork-Sandbox ggf. den Scan lokal ausführen (Claude Code, npm run scan).');
  console.error(`JSON: ${OUT}`);
  process.exit(3);
}

// ---------- verdict + output ----------
const pre = report.phases['pre-consent'];
const preViolations = (pre?.thirdPartyOrigins || []).filter((o) => o.kind !== 'cmp');
const preCookies3p = (pre?.cookies || []).filter((c) => c.thirdParty);
report.verdict = {
  thirdPartyBeforeConsent: preViolations.map((o) => `${o.origin} (${o.service})`),
  thirdPartyCookiesBeforeConsent: preCookies3p.map((c) => `${c.name}@${c.domain}`),
  newOriginsAfterReject: (report.phases['after-reject']?.thirdPartyOrigins || []).filter((o) => o.kind !== 'cmp').map((o) => `${o.origin} (${o.service})`),
  odrLinkStillPresent: report.pflichtseiten.odrLinkStillPresent,
};
report.setCookieResponses = [...setCookieUrls];
writeFileSync(OUT, JSON.stringify(report, null, 2));

const line = (s = '') => console.log(s);
const ttl = (c) => (c.expiresDays === 'session' ? 'session' : `${c.expiresDays}d`);
line(`\n=== Runtime scan: ${target} (HTTP ${report.httpStatus ?? '?'}) ===`);
if (report.error) line(`⚠️  error: ${report.error}`);
line(`\n-- Vor Consent (${pre?.requestCount ?? 0} Requests) --`);
if (!preViolations.length) line('  ✅ keine Drittanbieter-Origins vor Consent (außer ggf. CMP)');
for (const o of pre?.thirdPartyOrigins || []) line(`  ${o.kind === 'cmp' ? '🟡' : '🔴'} ${o.origin}  → ${o.service}  [${o.types.join(',')}] ×${o.count}${o.setCookie ? '  (Set-Cookie!)' : ''}`);
line(`  Cookies: ${pre?.cookies?.length ? pre.cookies.map((c) => `${c.name}@${c.domain}${c.thirdParty ? ' (3rd)' : ''} ${ttl(c)}`).join('; ') : 'keine'}`);
line(`  localStorage: [${pre?.storage?.localStorage?.join(', ')}]  sessionStorage: [${pre?.storage?.sessionStorage?.join(', ')}]`);
const ar = report.phases['after-reject'];
line(`\n-- Nach "Ablehnen" (${ar?.clicked ? `Button: "${ar.clicked}"` : 'kein Reject-Button gefunden'}) --`);
if (ar?.clicked) {
  const v = report.verdict.newOriginsAfterReject;
  line(v.length ? v.map((x) => `  🔴 lädt trotz Ablehnen: ${x}`).join('\n') : '  ✅ keine neuen Drittanbieter-Requests nach Ablehnen');
  line(`  Cookies danach: ${ar.cookies?.map((c) => c.name).join(', ') || 'keine'}`);
}
const aa = report.phases['after-accept'];
if (aa) {
  line(`\n-- Nach "Akzeptieren" (${aa.clicked ? `Button: "${aa.clicked}"` : 'kein Accept-Button gefunden'}) --`);
  for (const o of aa.thirdPartyOrigins || []) line(`  • ${o.origin} → ${o.service} [${o.types.join(',')}]`);
  line(`  Cookies danach: ${aa.cookies?.map((c) => `${c.name}@${c.domain} ${ttl(c)}`).join('; ') || 'keine'}`);
}
line('\n-- Pflichtseiten --');
line(`  Impressum-Link: ${report.pflichtseiten.impressumLink ? '✅ ' + report.pflichtseiten.impressumLink.href : '🔴 nicht gefunden'}`);
line(`  Datenschutz-Link: ${report.pflichtseiten.datenschutzLink ? '✅ ' + report.pflichtseiten.datenschutzLink.href : '🔴 nicht gefunden'}`);
line(`  OS-Plattform-Link (seit 20.07.2025 abgeschaltet): ${report.pflichtseiten.odrLinkStillPresent ? '🟠 noch vorhanden → entfernen' : '✅ nicht vorhanden'}`);
for (const p of ['/impressum', '/datenschutz', '/datenschutzerklaerung', '/privacy', '/imprint']) if (report.pflichtseiten[p] !== undefined) line(`  ${p}: ${report.pflichtseiten[p]}`);
for (const n of report.notes) line(`\nℹ️  ${n}`);
line(`\nJSON: ${OUT}`);
line('Hinweis: Ein Scan sieht eine Seite, einen Zustand, einen Zeitpunkt. Unterseiten (Kontakt, Buchung, Checkout) separat scannen.');

if (flag('--strict') && (preViolations.length || report.verdict.newOriginsAfterReject.length)) process.exit(1);
