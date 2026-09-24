#!/usr/bin/env node
// scanner.test.mjs — serves the fixture sites on a random port, runs scan-origins.mjs against them
// and asserts the verdicts. Needs playwright + chromium (npm i && npx playwright install chromium).
//
// Cases:
//   1. tests/fixtures/site            — the reference site: pre-consent violations, reject works, accept loads Hotjar
//   2. tests/fixtures/site-accept-order — "Nur notwendige akzeptieren" is listed BEFORE "Alle akzeptieren";
//                                        the accept phase must still click the accept-all button
//   3. unreachable URL                — exit code 3, no verdict, output never reads as a pass

import { createServer } from 'node:http';
import { readFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile); // async — the test server runs in this process, so the scanner must not block the event loop

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const SCANNER = join(ROOT, 'skills', 'dsgvo-audit', 'scripts', 'scan-origins.mjs');
const OUT = join(ROOT, 'dist-scan-test.json');

// One server, several fixture sites: /<site>/... maps to tests/fixtures/<site>/...; anything else
// (e.g. the scanner's own /impressum, /datenschutz probes) falls back to tests/fixtures/site/...
const server = createServer((req, res) => {
  const parts = req.url.split('?')[0].split('/').filter(Boolean);
  const resolve = (...segs) => { const p = join(FIXTURES, ...segs); return existsSync(p) && statSync(p).isDirectory() ? join(p, 'index.html') : p; };
  let p = resolve(...parts);
  if (!existsSync(p)) p = resolve('site', ...parts);
  if (!existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'content-type': extname(p) === '.html' || !extname(p) ? 'text/html; charset=utf-8' : 'text/plain' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

let status = 0;
const check = (cond, label) => { console.log(`  ${cond ? '✅' : '❌'} ${label}`); if (!cond) status = 1; };
const scan = (url, ...extra) => run(process.execPath, [SCANNER, url, '--out', OUT, '--wait', '1500', ...extra], { timeout: 120000 });
const readOut = () => JSON.parse(readFileSync(OUT, 'utf8'));

try {
  // ---- 1. reference site ----
  {
    const url = `${base}/site/index.html`;
    console.log(`scanner against ${url}:`);
    await scan(url);
    const r = readOut();
    const pre = r.verdict.thirdPartyBeforeConsent.join(' ');
    check(/fonts\.googleapis\.com/.test(pre), 'Google Fonts detected before consent');
    check(/googletagmanager\.com/.test(pre), 'GTM detected before consent');
    check(r.phases['after-reject']?.clicked, 'reject button found and clicked');
    check(r.verdict.newOriginsAfterReject.length === 0, 'no new origins after reject');
    check((r.phases['after-accept']?.thirdPartyOrigins || []).some((o) => /hotjar/.test(o.origin)), 'Hotjar appears only after accept');
    check((r.phases['after-accept']?.cookies || []).some((c) => c.name === '_hj'), 'cookie set after accept is recorded');
    check(r.pflichtseiten.odrLinkStillPresent === true, 'stale OS-Plattform link flagged');
    check(r.pflichtseiten.impressumLink && r.pflichtseiten.datenschutzLink, 'Impressum and Datenschutz links found');
    check(r.pflichtseiten['/impressum'] === 200 && r.pflichtseiten['/datenschutz'] === 200, 'Pflichtseiten reachable');
    check(r.phases['pre-consent'].storage.localStorage.includes('theme'), 'localStorage key recorded');
  }

  // ---- 2. reject-equivalent listed before accept-all ----
  {
    const url = `${base}/site-accept-order/index.html`;
    console.log(`scanner against ${url}:`);
    await scan(url);
    const r = readOut();
    check(/nur notwendige/i.test(r.phases['after-reject']?.clicked || ''), 'reject phase clicks "Nur notwendige akzeptieren"');
    check(/alle akzeptieren/i.test(r.phases['after-accept']?.clicked || ''), 'accept phase clicks "Alle akzeptieren", not the reject-equivalent');
    check((r.phases['after-accept']?.thirdPartyOrigins || []).some((o) => /hotjar/.test(o.origin)), 'after-accept inventory is complete (Hotjar present)');
  }

  // ---- 3. unreachable URL → exit 3, no verdict ----
  {
    const url = 'http://127.0.0.1:9/'; // discard port: connection refused
    console.log(`scanner against ${url} (unreachable):`);
    let code = 0, stdout = '', stderr = '';
    try { ({ stdout, stderr } = await scan(url)); } catch (e) { code = e.code; stdout = String(e.stdout || ''); stderr = String(e.stderr || ''); }
    check(code === 3, `exit code is 3 (got ${code})`);
    check(!/keine Drittanbieter-Origins/.test(stdout + stderr), 'no "keine Drittanbieter-Origins" line on a failed load');
    check(!/Impressum-Link: 🔴/.test(stdout + stderr), 'no Pflichtseiten verdict on a failed load');
    check(/konnte nicht geladen werden/.test(stderr), 'explains that the page could not be loaded');
    check(existsSync(OUT) && readOut().verdict === null, 'JSON written with verdict: null');
  }
} catch (e) {
  const msg = String(e.stderr || e.message);
  if (/playwright not found/.test(msg)) { console.log('  ⚠️  playwright not installed — skipping scanner test (npm i && npx playwright install chromium)'); }
  else { console.log('  ❌ scanner failed:\n' + msg); status = 1; }
} finally {
  server.close();
  if (existsSync(OUT)) unlinkSync(OUT);
}
process.exit(status);
