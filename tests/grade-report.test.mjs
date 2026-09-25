#!/usr/bin/env node
// grade-report.test.mjs — the deterministic grader must accept the golden report/DSE/Impressum
// fixtures and reject the deliberately broken report for the right reasons.

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRADER = join(ROOT, 'scripts', 'grade-report.mjs');
const FIX = join(ROOT, 'tests', 'fixtures', 'reports');

let status = 0;
const check = (cond, label) => { console.log(`  ${cond ? '✅' : '❌'} ${label}`); if (!cond) status = 1; };
const grade = async (...args) => {
  try { const r = await run(process.execPath, [GRADER, ...args]); return { code: 0, out: r.stdout }; }
  catch (e) { return { code: e.code, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

console.log('grade-report against golden fixtures:');
{
  const r = await grade('--report', join(FIX, 'good-report.md'), '--dse', join(FIX, 'good-dse.md'), '--impressum', join(FIX, 'good-impressum.md'),
    '--expect', '3 O 17493/20', '--expect-no', 'Google Analytics 4 ist konform');
  check(r.code === 0, `golden report + DSE + Impressum pass (exit ${r.code})`);
  check(!/❌/.test(r.out), 'no failed check in the golden run');
}
{
  const r = await grade('--report', join(FIX, 'bad-report.md'));
  check(r.code === 1, `broken report fails (exit ${r.code})`);
  check(/❌ Report has the eight Phase-4 sections/.test(r.out), 'missing sections detected');
  check(/❌ Every 🔴\/🟠 finding block has Befund/.test(r.out), 'incomplete finding block detected');
  check(/❌ Report ends with the RDG disclaimer/.test(r.out), 'missing RDG disclaimer detected');
  check(/❌ Report makes no forbidden claim/.test(r.out), '"abmahnsicher" detected');
  check(/❌ Report has no leftover template placeholder/.test(r.out), '[PLATZHALTER] detected');
  check(/❌ Report does not recommend adding the OS-Plattform link/.test(r.out), '"OS-Plattform-Link ergänzen" detected');
  check(/❌ Every 🔴\/🟠 finding names its evidence/.test(r.out), 'finding without evidence line detected');
}
{
  // Evidence IDs: a finding that cites an ID the Evidenzverzeichnis does not list, or drops its evidence line, fails.
  const { writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
  const tmp = join(ROOT, 'dist-grade-evidence-test.md');
  const golden = readFileSync(join(FIX, 'good-report.md'), 'utf8');
  writeFileSync(tmp, golden.replace('**Evidenz:** E-02 ·', '**Evidenz:** E-42 ·'));
  let r = await grade('--report', tmp);
  check(r.code === 1 && /❌ Every evidence ID cited[^\n]*\n\s*↳ not listed: E-42/.test(r.out), 'dangling evidence ID E-42 detected');
  writeFileSync(tmp, golden.replace(/\*\*Evidenz:\*\* E-03, E-05 · beobachtet[^\n]*\n/, ''));
  r = await grade('--report', tmp);
  check(r.code === 1 && /❌ Every 🔴\/🟠 finding names its evidence[^\n]*\n\s*↳ without evidence line: ### 🟠 H-01/.test(r.out), 'finding without evidence line detected by name');
  writeFileSync(tmp, golden.replace('### Evidenzverzeichnis', '### Quellen'));
  r = await grade('--report', tmp);
  check(r.code === 1 && /no "Evidenzverzeichnis" heading/.test(r.out), 'missing Evidenzverzeichnis detected');
  unlinkSync(tmp);
}
{
  const r = await grade('--report', join(FIX, 'good-report.md'), '--expect-no', 'Google Fonts');
  check(r.code === 1 && /❌ --expect-no \/Google Fonts\//.test(r.out), '--expect-no fails when the pattern is present');
}
{
  // Regression: 🟡/🟢 headings share a UTF-16 surrogate with 🔴/🟠 — without the `u` flag they were graded as critical blocks.
  // And a negated/quoted forbidden phrase („keine ‚100 % konform'-Siegel") is not a claim.
  const { writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
  const tmp = join(ROOT, 'dist-grade-test.md');
  const golden = readFileSync(join(FIX, 'good-report.md'), 'utf8');
  writeFileSync(tmp, golden.replace('## 3. Datenfluss-Übersicht', '### 🟡 M-01 Security-Header fehlen\n**Befund:** keine CSP.\n**Maßnahme:** setzen.\n\n## 3. Datenfluss-Übersicht')
    .replace('## 7. Offene Fragen', '| § 5 UWG | 🟢 | Keine „100 % DSGVO-konform“-Siegel im Codestand |\n\n## 7. Offene Fragen'));
  const r = await grade('--report', tmp);
  check(!/❌ Every 🔴\/🟠 finding block/.test(r.out), 'a 🟡 block without the five fields is not graded as a critical block (u flag)');
  check(!/❌ Report makes no forbidden claim/.test(r.out), 'a negated/quoted „100 % konform“ is not a forbidden claim');
  unlinkSync(tmp);
}
{
  // A clean report with no 🔴/🟠 block passes the finding checks only when section 2 says so in words
  const { writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
  const tmp = join(ROOT, 'dist-grade-test.md');
  const golden = readFileSync(join(FIX, 'good-report.md'), 'utf8');
  const s2 = golden.indexOf('## 2.'), s3 = golden.indexOf('## 3.');
  const stripped = golden.slice(0, s2) + '## 2. Kritische und hohe Befunde\n\n';
  writeFileSync(tmp, stripped + 'Keine kritischen oder hohen Befunde.\n\n' + golden.slice(s3));
  let r = await grade('--report', tmp);
  check(!/❌ Every 🔴\/🟠 finding (block|cites|names)/.test(r.out), 'no 🔴/🟠 block + „Keine kritischen … Befunde“ in section 2 passes the finding checks');
  writeFileSync(tmp, stripped + '| Befund | Stufe |\n|---|---|\n| GA vor Consent | 🔴 |\n\n' + golden.slice(s3));
  r = await grade('--report', tmp);
  check(/❌ Every 🔴\/🟠 finding block has Befund/.test(r.out), 'findings only as table rows (no declaration) still fail');
  unlinkSync(tmp);
}
{
  // Art. 7 Abs. 3 is required only where something rests on consent (a consent-free DSE on lit. f need not list it)
  const { writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
  const tmp = join(ROOT, 'dist-grade-dse-test.md');
  const dse = readFileSync(join(FIX, 'good-dse.md'), 'utf8').replace(/Art\.\s?7\s?Abs\.\s?3( DSGVO)?/g, 'Widerruf');
  writeFileSync(tmp, dse + '\n## Newsletter\n\nRechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).\n');
  let r = await grade('--dse', tmp);
  check(/❌ DSE lists the Betroffenenrechte[^\n]*\n\s*↳ consent-based processing but no Art\. 7 Abs\. 3/.test(r.out), 'consent-based DSE without Art. 7 Abs. 3 fails');
  writeFileSync(tmp, dse.replace(/Art\.\s?6\s?Abs\.\s?1\s?(S\.\s?1\s?)?lit\.\s?a/g, 'Art. 6 Abs. 1 lit. f').replace(/Art\.\s?9\s?Abs\.\s?2\s?lit\.\s?a/g, 'Art. 9 Abs. 2 lit. h').replace(/§\s?25\s?Abs\.\s?1\s?TDDDG/g, '§ 25 TDDDG'));
  r = await grade('--dse', tmp);
  check(!/❌ DSE lists the Betroffenenrechte/.test(r.out), 'consent-free DSE without Art. 7 Abs. 3 passes');
  unlinkSync(tmp);
}
{
  // false positives found in iteration 3: a regex in a code sample, a negated § 25 mention, an ODR mention that is not a link
  const { writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
  const tmp = join(ROOT, 'dist-grade-fp-test.md');
  writeFileSync(tmp, readFileSync(join(FIX, 'good-report.md'), 'utf8').replace('## 7. Offene Fragen', '```ts\ntext.replace(/[A-Z]{2}\\d{2}/g, "")\n```\n\n## 7. Offene Fragen'));
  let r = await grade('--report', tmp);
  check(!/❌ Report has no leftover template placeholder/.test(r.out), 'a regex inside a code block is not a template placeholder');
  const dse = readFileSync(join(FIX, 'good-dse.md'), 'utf8').replace(/Art\.\s?7\s?Abs\.\s?3( DSGVO)?/g, 'Widerruf');
  writeFileSync(tmp, dse + '\nDa wir keine einwilligungsbedürftigen Technologien im Sinne von § 25 Abs. 1 TDDDG einsetzen, gibt es kein Cookie-Banner.\n');
  r = await grade('--dse', tmp);
  check(!/❌ DSE lists the Betroffenenrechte/.test(r.out), 'a negated § 25 Abs. 1 TDDDG mention does not make the DSE consent-based');
  writeFileSync(tmp, readFileSync(join(FIX, 'good-report.md'), 'utf8').replace('## 5. Drittanbieter', '| 1.10 | Kein OS-Plattform-Link | ⚪️ | Inhalt fehlt (auf dieser Seite kein Link) |\n\n## 5. Drittanbieter'));
  r = await grade('--report', tmp);
  check(!/❌ Report does not recommend adding the OS-Plattform link/.test(r.out), 'a „Kein OS-Plattform-Link … fehlt“ checklist row is not advice to add the link');
  const imp = readFileSync(join(FIX, 'good-impressum.md'), 'utf8');
  writeFileSync(tmp, imp + '\n> Kein Link auf die EU-OS-Plattform (ec.europa.eu/consumers/odr) — seit 20.07.2025 abgeschaltet.\n');
  r = await grade('--impressum', tmp);
  check(!/❌ Impressum has no OS-Plattform link/.test(r.out), 'mentioning the ODR address in a "no link" note is not a link');
  writeFileSync(tmp, imp + '\n[OS-Plattform](https://ec.europa.eu/consumers/odr)\n');
  r = await grade('--impressum', tmp);
  check(/❌ Impressum has no OS-Plattform link/.test(r.out), 'an actual ODR link is still caught');
  unlinkSync(tmp);
}
process.exit(status);
