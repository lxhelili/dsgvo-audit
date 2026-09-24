#!/usr/bin/env node
// lint-origins.mjs — static evidence for Phase 1a of the dsgvo-audit skill, as one command.
//
// Walks a codebase and reports, without executing anything:
//   1. dependencies   — SDKs in package.json that imply a third party (analytics, fonts, captcha, AI, mailer, DB…)
//   2. origins        — third-party hosts referenced in source/markup/CSS (scripts, fonts, iframes, preconnect)
//   3. storage        — device access that § 25 TDDDG covers (cookies, localStorage, IndexedDB, fingerprinting)
//   4. server-side    — where PII may leave the app (mailers, DB, AI APIs, CRM, webhooks, payment)
//   5. config         — framework/hosting config files present, function regions, env key NAMES (never values)
//
// It is the grep block from SKILL.md made repeatable: same patterns, one JSON, an exit code for CI.
// Static evidence says what the code *can* load, not what it *does* load before consent — the runtime
// scanner (scan-origins.mjs) answers that. --strict therefore fails only on services that are 🔴 by
// their nature when present at all (fonts/CDN assets and reCAPTCHA loaded from the vendor), plus
// trackers that are referenced without any sign of a consent gate in the same file.
//
// Usage:
//   node scripts/lint-origins.mjs [dir] [--out lint.json] [--strict] [--own example.de]
//     --own <host>   treat this registrable domain as first-party (default: none; everything external counts)
//
// Exit codes: 0 ok · 1 --strict violation · 2 usage error

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';
import { label, registrable } from './lib/signatures.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes(name);
const dir = resolve(argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--out' && argv[argv.indexOf(a) - 1] !== '--own') || '.');
if (!existsSync(dir) || !statSync(dir).isDirectory()) { console.error(`not a directory: ${dir}`); process.exit(2); }
const OUT = opt('--out', null);
const OWN = opt('--own', null);

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.astro', 'dist', 'build', 'out', 'coverage', '.turbo', '.vercel', '.netlify', 'vendor', '.tokensave', '.remember', '.cache']);
const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.htm', '.astro', '.vue', '.svelte', '.php', '.css', '.scss', '.less', '.mdx', '.md', '.json', '.py', '.rb', '.liquid', '.twig', '.hbs', '.ejs', '.njk']);
const SERVER_HINT = /(^|\/)(app\/api|pages\/api|server|api|lib|functions|netlify|supabase|src\/actions|actions|routes|worker|workers|backend)(\/|$)|route\.(ts|js)$|\.server\.(ts|js)$|\.php$|\.py$|\.rb$/;

// ---------- patterns (kept in step with the SKILL.md grep block; tests/phase1.test.sh covers that block) ----------
const DEP_CLASSES = [
  [/^(@vercel\/analytics|@vercel\/speed-insights|react-ga4|react-gtm-module|@next\/third-parties|posthog-js|mixpanel-browser|@segment\/.+|@microsoft\/clarity|@hotjar\/.+|matomo-.+|plausible-tracker)$/, 'analytics/tracking'],
  [/^(@fontsource\/.+|@fontsource-variable\/.+)$/, 'fonts (self-hosted — ok)'],
  [/^(react-google-recaptcha|react-google-recaptcha-v3|@hcaptcha\/.+|@marsidev\/react-turnstile|friendly-challenge)$/, 'captcha'],
  [/^(@sentry\/.+|@bugsnag\/.+|@datadog\/.+|logrocket)$/, 'error tracking / monitoring'],
  [/^(openai|@anthropic-ai\/sdk|@google\/generative-ai|@google\/genai|@ai-sdk\/.+|ai|@mistralai\/.+|groq-sdk|replicate|cohere-ai|langchain|@langchain\/.+)$/, 'AI / LLM API'],
  [/^(resend|nodemailer|@sendgrid\/.+|postmark|mailgun.js|mailgun-js|@getbrevo\/.+|sib-api-v3-sdk|@mailchimp\/.+)$/, 'mailer'],
  [/^(@supabase\/.+|@prisma\/client|drizzle-orm|mongoose|firebase|firebase-admin|@neondatabase\/.+|@planetscale\/.+|@libsql\/.+|pg|mysql2)$/, 'database / BaaS'],
  [/^(next-auth|@auth\/.+|@clerk\/.+|@kinde-oss\/.+|@auth0\/.+|lucia|better-auth)$/, 'auth / social login'],
  [/^(@stripe\/.+|stripe|@paypal\/.+|@mollie\/.+)$/, 'payment'],
  [/^(@hubspot\/.+|@calcom\/.+|@calendly\/.+|@intercom\/.+|crisp-sdk-web)$/, 'CRM / booking / chat'],
  [/^(@googlemaps\/.+|google-map-react|@react-google-maps\/.+|leaflet|react-leaflet|mapbox-gl)$/, 'maps'],
  [/^(react-youtube|@vimeo\/player|lite-youtube-embed)$/, 'video embeds'],
];
const STORAGE_RE = /\b(localStorage|sessionStorage|document\.cookie|cookies\(\)|setCookie|Set-Cookie|indexedDB|fingerprint|navigator\.(hardwareConcurrency|deviceMemory)|canvas\.toDataURL)\b/g;
const SERVER_RE = /\b(resend|nodemailer|sendgrid|postmark|mailgun|brevo|supabase|prisma|drizzle|mongoose|firebase|openai|anthropic|generativelanguage|mistral|groq|replicate|hubspot|pipedrive|zapier|make\.com|hooks\.slack\.com|slack\.com\/api|discord\.com\/api\/webhooks|webhook|stripe|paypal|mollie|twilio|sentry)\b/gi;
const GATE_HINT = /consent|cookie[-_ ]?consent|usercentrics|cookiebot|klaro|borlabs|consentmanager|cmp|gtag\(['"]consent|hasConsent|onConsent|withConsent|ccm19|cookiefirst|iubenda|onetrust/i;
const URL_RE = /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[^\s"'`<>)\]]*)?/gi;
// the keyword may start the name (RESEND_API_KEY, SENTRY_DSN) or sit inside it (NEXT_PUBLIC_GA_ID)
const ENV_RE = /^(?=[A-Z])([A-Z0-9_]*?(?:GA|GTM|ANALYTICS|SENTRY|OPENAI|ANTHROPIC|GEMINI|GOOGLE|RESEND|POSTMARK|SENDGRID|MAILGUN|BREVO|MAILCHIMP|SUPABASE|DATABASE|FIREBASE|STRIPE|PAYPAL|MOLLIE|RECAPTCHA|HCAPTCHA|TURNSTILE|HUBSPOT|CALENDLY|POSTHOG|MIXPANEL|SLACK|ZAPIER|TWILIO|AWS|S3|CLOUDFLARE|VERCEL)[A-Z0-9_]*)=/;
const CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.ts', 'vercel.json', 'netlify.toml', 'wrangler.toml', 'astro.config.mjs', 'astro.config.ts', 'nuxt.config.ts', 'svelte.config.js', 'angular.json', 'middleware.ts', 'middleware.js', 'proxy.ts', 'supabase/config.toml', 'wp-config.php', 'composer.json', 'Gemfile', 'requirements.txt'];

// ---------- walk ----------
function walk(d, acc = []) {
  for (const n of readdirSync(d)) {
    if (SKIP_DIRS.has(n)) continue;
    const p = join(d, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (st.size < 2_000_000 && (SRC_EXT.has(extname(n)) || /^\.env/.test(n) || n === 'package.json')) acc.push(p);
  }
  return acc;
}
const files = walk(dir);
const rel = (p) => relative(dir, p) || '.';

const report = { dir, scannedAt: new Date().toISOString(), dependencies: [], origins: [], storage: [], serverSide: [], odrLinks: [], config: { files: [], regions: [], envKeys: [] }, notes: [] };

// 1. dependencies
for (const pj of files.filter((f) => f.endsWith('package.json') && !rel(f).includes('/'))) {
  let pkg; try { pkg = JSON.parse(readFileSync(pj, 'utf8')); } catch { continue; }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const [name, version] of Object.entries(deps)) {
    for (const [re, cls] of DEP_CLASSES) if (re.test(name)) report.dependencies.push({ name, version, class: cls, file: rel(pj) });
  }
}

// 2–4. source
const originMap = new Map();
for (const f of files) {
  const r = rel(f);
  if (/^\.env/.test(r.split('/').pop()) || r.endsWith('package.json') || r.endsWith('package-lock.json')) continue;
  let txt; try { txt = readFileSync(f, 'utf8'); } catch { continue; }
  if (/\0/.test(txt.slice(0, 512))) continue;
  const lines = txt.split('\n');
  const gated = GATE_HINT.test(txt);

  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(URL_RE)) {
      let host; try { host = new URL(m[0]).hostname; } catch { continue; }
      if (host === 'localhost' || host.endsWith('.local') || host === 'example.com' || host === 'example.de' || /^(www\.)?(w3\.org|schema\.org|json-schema\.org|github\.com|npmjs\.com|developer\.mozilla\.org)$/.test(host)) continue;
      if (OWN && registrable(host) === registrable(OWN)) continue;
      const l = label(m[0]);
      if (/ec\.europa\.eu\/consumers\/odr/i.test(m[0])) { report.odrLinks.push(`${r}:${i + 1}`); continue; } // stale OS-Plattform link: its own finding, not a load
      // an <a href> is navigation, not a load; href counts only for <link> (fonts, preconnect) and CSS imports
      const loadContext = /<(script|iframe|img|source|video|audio|embed|object)\b|<link\b|preconnect|dns-prefetch|@import|url\(|\.src\s*=|\bsrc=|loadScript|createElement\(['"](script|link|iframe)/i.test(ln);
      if (l.kind === 'unknown' && !loadContext) continue; // a URL in a comment or a link target is not a load
      const key = host;
      const e = originMap.get(key) || { origin: host, service: l.name, kind: l.kind, hits: [] };
      if (e.hits.length < 12) e.hits.push({ file: r, line: i + 1, loadContext, gateHintInFile: gated, snippet: ln.trim().slice(0, 140) });
      originMap.set(key, e);
    }
    for (const m of ln.matchAll(STORAGE_RE)) report.storage.push({ file: r, line: i + 1, api: m[1], snippet: ln.trim().slice(0, 140) });
    if (SERVER_HINT.test(r)) for (const m of ln.matchAll(SERVER_RE)) report.serverSide.push({ file: r, line: i + 1, hit: m[1].toLowerCase(), snippet: ln.trim().slice(0, 140) });
  });
}
report.origins = [...originMap.values()].sort((a, b) => (a.kind === 'unknown') - (b.kind === 'unknown') || a.origin.localeCompare(b.origin));
report.storage = dedupe(report.storage, (s) => `${s.file}:${s.line}:${s.api}`).slice(0, 200);
report.serverSide = dedupe(report.serverSide, (s) => `${s.file}:${s.line}:${s.hit}`).slice(0, 200);

// 5. config
for (const c of CONFIG_FILES) if (existsSync(join(dir, c))) report.config.files.push(c);
for (const c of ['vercel.json', 'netlify.toml', 'wrangler.toml']) {
  if (!existsSync(join(dir, c))) continue;
  const txt = readFileSync(join(dir, c), 'utf8');
  for (const m of txt.matchAll(/"?regions?"?\s*[:=]\s*\[?\s*"([a-z0-9-]+)"/gi)) report.config.regions.push({ file: c, region: m[1], nonEU: !/^(fra|cdg|arn|dub|lhr|ams|eu-|europe|weur|eeur)/i.test(m[1]) });
}
for (const f of files.filter((x) => /^\.env/.test(x.split('/').pop()))) {
  for (const ln of readFileSync(f, 'utf8').split('\n')) { const m = ln.match(ENV_RE); if (m) report.config.envKeys.push(m[1]); }
}
report.config.envKeys = [...new Set(report.config.envKeys)].sort();

// ---------- verdict ----------
const RED_WHEN_PRESENT = new Set(['Google Fonts', 'Adobe Fonts', 'Font Awesome CDN', 'Public CDN', 'Google reCAPTCHA']);
// Cookieless, EU-hosted reach measurement runs on Art. 6(1)(f) and does not touch the device (§ 25 TDDDG
// not engaged) — services.md rates it 🟢/🟡 without consent, so an ungated load is a note, not a violation.
// The runtime scan still has to confirm "no cookie, no storage"; and the IP does reach the vendor on load,
// which is why the note recommends a first-party proxy. Keep in step with services.md.
const COOKIELESS_EU = new Set(['Plausible', 'Umami', 'Pirsch', 'Fathom']);
const violations = [];
const notes = [];
for (const o of report.origins) {
  const loads = o.hits.some((h) => h.loadContext);
  if (!loads) continue;
  const gated = o.hits.some((h) => h.gateHintInFile);
  if (RED_WHEN_PRESENT.has(o.service)) violations.push(`${o.origin} (${o.service}) wird aus dem Quellcode geladen — self-hosten (${o.hits[0].file}:${o.hits[0].line})`);
  else if (COOKIELESS_EU.has(o.service)) notes.push(`${o.origin} (${o.service}) wird ohne Consent-Gate geladen (${o.hits[0].file}:${o.hits[0].line}) — cookielos/EU: Art. 6(1)(f) vertretbar (services.md), kein § 25 TDDDG; Laufzeit-Scan muss „kein Cookie, kein Storage“ bestätigen; DSE-Modul + DPA; Empfehlung: Script per First-Party-Proxy ausliefern`);
  else if (['tracking', 'embed', 'booking', 'captcha'].includes(o.kind) && !gated) violations.push(`${o.origin} (${o.service}) wird geladen, ohne dass in derselben Datei ein Consent-Gate erkennbar ist (${o.hits[0].file}:${o.hits[0].line}) — Laufzeit-Scan nötig`);
}
report.verdict = { staticViolations: violations, notes, odrLinkStillPresent: report.odrLinks.length > 0, nonEURegions: report.config.regions.filter((r) => r.nonEU).map((r) => `${r.file}: ${r.region}`) };
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));

// ---------- output ----------
const line = (s = '') => console.log(s);
line(`=== Static lint: ${dir} (${files.length} Dateien) ===`);
line('\n-- Dependencies mit Drittbezug --');
if (!report.dependencies.length) line('  (keine bekannten SDKs in package.json)');
for (const d of report.dependencies) line(`  • ${d.name}@${d.version}  → ${d.class}`);
line('\n-- Drittanbieter-Origins im Quellcode --');
if (!report.origins.length) line('  ✅ keine externen Origins in Lade-Kontexten gefunden');
for (const o of report.origins) {
  const mark = RED_WHEN_PRESENT.has(o.service) ? '🔴' : o.kind === 'unknown' ? '⚪️' : COOKIELESS_EU.has(o.service) || o.hits.some((h) => h.gateHintInFile) ? '🟡' : '🟠';
  line(`  ${mark} ${o.origin}  → ${o.service} [${o.kind}]  ${o.hits.slice(0, 3).map((h) => `${h.file}:${h.line}`).join(', ')}${o.hits.length > 3 ? ` (+${o.hits.length - 3})` : ''}`);
}
for (const n of notes) line(`  ℹ️  ${n}`);
line('\n-- Endgerätzugriff (§ 25 TDDDG) --');
if (!report.storage.length) line('  (nichts gefunden)');
for (const s of report.storage.slice(0, 30)) line(`  • ${s.api}  ${s.file}:${s.line}`);
if (report.storage.length > 30) line(`  … ${report.storage.length - 30} weitere im JSON`);
line('\n-- Serverseitige Empfänger (Handler, Mailer, DB, KI, CRM, Webhooks) --');
if (!report.serverSide.length) line('  (nichts gefunden — oder Handler liegen außerhalb der üblichen Ordner; SERVER_HINT im Script erweitern)');
const byHit = new Map(); for (const s of report.serverSide) (byHit.get(s.hit) || byHit.set(s.hit, []).get(s.hit)).push(`${s.file}:${s.line}`);
for (const [hit, locs] of byHit) line(`  • ${hit}  ${locs.slice(0, 4).join(', ')}${locs.length > 4 ? ` (+${locs.length - 4})` : ''}`);
line('\n-- Config --');
line(`  Dateien: ${report.config.files.join(', ') || 'keine bekannten'}`);
for (const r of report.config.regions) line(`  ${r.nonEU ? '🟠' : '✅'} Region ${r.region} (${r.file})${r.nonEU ? ' — Functions außerhalb der EU; fra1/EU-Region setzen' : ''}`);
line(`  Env-Keys (nur Namen): ${report.config.envKeys.join(', ') || 'keine'}`);
if (report.odrLinks.length) line(`\n  🟠 OS-Plattform-Link (ec.europa.eu/consumers/odr, seit 20.07.2025 abgeschaltet) noch im Code: ${report.odrLinks.slice(0, 3).join(', ')} → entfernen (§ 5 UWG)`);
if (violations.length) { line('\n-- Statische Verstöße --'); for (const v of violations) line(`  🔴 ${v}`); }
if (OUT) line(`\nJSON: ${OUT}`);
line('\nHinweis: Statische Evidenz zeigt, was der Code laden *kann*. Ob es vor Consent geschieht, zeigt nur der Laufzeit-Scan (scan-origins.mjs).');

if (flag('--strict') && violations.length) process.exit(1);

function dedupe(arr, key) { const seen = new Set(); return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); }
