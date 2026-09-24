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
}
{
  const r = await grade('--report', join(FIX, 'good-report.md'), '--expect-no', 'Google Fonts');
  check(r.code === 1 && /❌ --expect-no \/Google Fonts\//.test(r.out), '--expect-no fails when the pattern is present');
}
process.exit(status);
