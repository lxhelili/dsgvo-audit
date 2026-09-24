#!/usr/bin/env node
// tools.test.mjs — the non-browser tools: static linter, GTM container parser, HAR parser.
// No playwright needed. Each tool runs as a child process against a fixture and the JSON is asserted.

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = join(ROOT, 'skills', 'dsgvo-audit', 'scripts');
const OUT = join(ROOT, 'dist-tools-test.json');
let status = 0;
const check = (cond, label) => { console.log(`  ${cond ? '✅' : '❌'} ${label}`); if (!cond) status = 1; };
const run = (script, args) => {
  let code = 0, stdout = '', stderr = '';
  try { stdout = execFileSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { code = e.status; stdout = String(e.stdout || ''); stderr = String(e.stderr || ''); }
  return { code, stdout, stderr, json: existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null };
};
const clean = () => { if (existsSync(OUT)) unlinkSync(OUT); };

// ---- lint-origins against tests/fixtures/repo ----
{
  clean();
  console.log('lint-origins.mjs against tests/fixtures/repo:');
  const r = run('lint-origins.mjs', [join(ROOT, 'tests', 'fixtures', 'repo'), '--out', OUT, '--strict']);
  const j = r.json;
  check(j !== null, 'JSON written');
  check(j.dependencies.some((d) => d.name === '@vercel/analytics'), 'dependency @vercel/analytics classified');
  check(j.dependencies.some((d) => d.name === 'openai' && /AI/.test(d.class)), 'dependency openai classified as AI');
  check(j.origins.some((o) => o.origin === 'fonts.googleapis.com' && o.service === 'Google Fonts'), 'fonts.googleapis.com found in index.html');
  check(j.origins.some((o) => o.origin === 'www.googletagmanager.com'), 'googletagmanager found in layout.tsx');
  check(j.storage.some((s) => s.api === 'localStorage'), 'localStorage access recorded');
  check(j.serverSide.some((s) => s.hit === 'resend'), 'server-side recipient resend found');
  check(j.config.envKeys.includes('NEXT_PUBLIC_GA_ID'), 'env key name recorded');
  check(!JSON.stringify(j).includes('sk-FIXTURE') && !r.stdout.includes('sk-FIXTURE'), 'env values never printed');
  check(j.verdict.staticViolations.some((v) => /Google Fonts/.test(v)), 'Google Fonts is a static violation');
  check(r.code === 1, `--strict exits 1 on violations (got ${r.code})`);
  const ev = run('lint-origins.mjs', [join(ROOT, 'evals', 'files', 'nextjs-ga-fonts'), '--out', OUT]);
  check(ev.json.verdict.odrLinkStillPresent === true && ev.json.odrLinks[0].startsWith('app/layout.tsx'), 'stale OS-Plattform link in an <a href> is its own finding, not an origin');
  check(!ev.json.origins.some((o) => o.origin === 'ec.europa.eu'), 'ec.europa.eu is not listed as a loaded origin');
  check(ev.json.config.regions.some((x) => x.region === 'iad1' && x.nonEU), 'vercel.json region iad1 flagged as non-EU');
  const pl = run('lint-origins.mjs', [join(ROOT, 'evals', 'files', 'astro-minimal'), '--out', OUT, '--strict']);
  check(pl.code === 0 && !pl.json.verdict.staticViolations.length && pl.json.verdict.notes.some((n) => /Plausible/.test(n)), 'ungated Plausible (cookieless EU, services.md 🟢) is a note, not a --strict violation');
}

// ---- parse-gtm against tests/fixtures/gtm-container.json ----
{
  clean();
  console.log('parse-gtm.mjs against tests/fixtures/gtm-container.json:');
  const r = run('parse-gtm.mjs', [join(ROOT, 'tests', 'fixtures', 'gtm-container.json'), '--out', OUT]);
  const j = r.json;
  check(r.code === 0 && j !== null, 'runs and writes JSON');
  const tag = (n) => j.tags.find((t) => t.name === n);
  check(tag('GA4 - Config')?.status === '🔴' && /All Pages/.test(tag('GA4 - Config').reason), 'GA4 on All Pages without consent condition is 🔴');
  check(tag('Meta Pixel (Custom HTML)')?.origins.includes('Meta Pixel / SDK'), 'Custom HTML is scanned for known origins (Meta)');
  check(tag('Hotjar')?.status === '🟡' && /Consent - Statistics/.test(tag('Hotjar').reason), 'consent-named trigger → 🟡 with runtime check note');
  check(tag('Ads Conversion - Lead')?.status === '🟡' && /ad_storage/.test(tag('Ads Conversion - Lead').reason), 'NEEDS_CONSENT + ad_storage → 🟡 Consent Mode note');
  check(tag('Old UA (paused)')?.status === '⚪️', 'paused tag is ⚪️');
  check(j.container === 'GTM-FIXTURE', 'container id read');
  check(j.tags[0].status === '🔴', 'output sorted 🔴 first');
  const md = run('parse-gtm.mjs', [join(ROOT, 'tests', 'fixtures', 'gtm-container.json'), '--md']);
  check(/^\| Status \| Tag/.test(md.stdout), '--md prints a markdown table');
  const bad = run('parse-gtm.mjs', [join(ROOT, 'package.json')]);
  check(bad.code === 2, 'non-GTM JSON exits 2');
}

// ---- parse-har against tests/fixtures/site.har ----
{
  clean();
  console.log('parse-har.mjs against tests/fixtures/site.har:');
  const r = run('parse-har.mjs', [join(ROOT, 'tests', 'fixtures', 'site.har'), '--out', OUT]);
  const j = r.json;
  check(r.code === 0 && j !== null, 'runs and writes JSON');
  check(j.target === 'https://example.de/', 'page URL taken from HAR pages[]');
  const pre = j.phases['pre-consent'];
  check(pre.thirdPartyOrigins.some((o) => o.origin === 'fonts.googleapis.com'), 'Google Fonts origin found');
  check(pre.thirdPartyOrigins.some((o) => /google-analytics/.test(o.origin) && o.setCookie), 'GA collect flagged with Set-Cookie');
  check(pre.thirdPartyOrigins.some((o) => o.kind === 'cmp'), 'Usercentrics labelled as CMP');
  check(j.verdict.thirdPartyBeforeConsent.length === 3 && !j.verdict.thirdPartyBeforeConsent.some((x) => /usercentrics/.test(x)), 'verdict excludes the CMP, keeps the three violations');
  check(j.verdict.thirdPartyCookiesBeforeConsent.includes('_ga@google-analytics.com'), 'third-party cookie _ga listed');
  check(j.verdict.headerFindings.some((h) => /HSTS/.test(h)), 'missing HSTS reported');
  check(j.verdict.cookieAttributeIssues.some((c) => /PHPSESSID/.test(c) && /httpOnly/.test(c)), 'PHPSESSID without httpOnly reported');
  check(j.verdict.mixedContent.includes('http://example.de/logo.png'), 'mixed content reported');
  check(j.notes.some((n) => /localStorage/.test(n)), 'says that storage is not in a HAR');
  const aa = run('parse-har.mjs', [join(ROOT, 'tests', 'fixtures', 'site.har'), '--out', OUT, '--phase', 'after-accept']);
  check(aa.json.phases['after-accept'] && aa.json.verdict.thirdPartyAfterAccept?.length === 3, '--phase after-accept files the origins under the inventory, not as violation');
}

// ---- render-report against the golden report and the templates ----
{
  clean();
  console.log('render-report.mjs against tests/fixtures/reports/good-report.md and assets/*.md:');
  const html = join(ROOT, 'dist-render-test.html');
  const pdf = join(ROOT, 'dist-render-test.pdf');
  const rm = (p) => { if (existsSync(p)) unlinkSync(p); };
  rm(html); rm(pdf);
  const r = run('render-report.mjs', [join(ROOT, 'tests', 'fixtures', 'reports', 'good-report.md'), '--out', html]);
  check(r.code === 0 && existsSync(html), 'HTML written');
  const h = existsSync(html) ? readFileSync(html, 'utf8') : '';
  check((h.match(/<h2 /g) || []).length === 8, 'eight H2 sections rendered');
  check((h.match(/<table>/g) || []).length === 3, 'three tables rendered');
  check(/<title>Datenschutz-Audit — beispiel-agentur\.de/.test(h), 'title taken from the H1');
  check(!/(src|href)="https?:\/\//.test(h.replace(/<code>[^<]*<\/code>/g, '')), 'no external src/href — the deliverable follows the skill\'s own rule');
  check(!/<link |<script/.test(h), 'no <link> or <script> tags at all');
  check(/<code>app\/layout\.tsx:12<\/code>/.test(h), 'inline code rendered');
  check(/&lt;link href=/.test(h), 'HTML inside code is escaped');
  check(/🔴 K-01/.test(h), 'status glyphs kept as text');
  check(/<nav class="toc"/.test(h) && /@media print/.test(h), 'TOC and print styles present');
  check(/Content-Security-Policy/.test(h), 'CSP meta tag present');
  const xss = join(ROOT, 'dist-render-test-xss.md');
  writeFileSync(xss, '# X\n\n[bad](javascript:alert(1)) [ok](https://example.de) [rel](/datenschutz)\n');
  run('render-report.mjs', [xss, '--out', html]);
  const hx = readFileSync(html, 'utf8');
  check(!/javascript:/.test(hx) && /href="https:\/\/example\.de"/.test(hx) && /href="\/datenschutz"/.test(hx), 'javascript: link neutralised, http(s) and relative links kept');
  rm(xss);
  for (const t of ['vvt-template.md', 'toms-template.md', 'cookie-banner-texte.md', 'privacy-policy-template.en.md', 'datenschutzerklaerung-template.md', 'impressum-template.md']) {
    const out = join(ROOT, 'dist-render-test.html');
    const rr = run('render-report.mjs', [join(ROOT, 'skills', 'dsgvo-audit', 'assets', t), '--out', out]);
    check(rr.code === 0 && readFileSync(out, 'utf8').includes('<h1'), `${t} renders`);
  }
  const p = run('render-report.mjs', [join(ROOT, 'tests', 'fixtures', 'reports', 'good-report.md'), '--out', html, '--pdf', pdf]);
  check(p.code === 0 && existsSync(pdf) && readFileSync(pdf).subarray(0, 4).toString() === '%PDF', `--pdf writes a PDF via Playwright (exit ${p.code})`);
  const missing = run('render-report.mjs', [join(ROOT, 'nope.md')]);
  check(missing.code === 2, 'missing input exits 2');
  rm(html); rm(pdf);
}

clean();
process.exit(status);
