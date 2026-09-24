#!/usr/bin/env node
// package-skill.mjs — builds dist/dsgvo-audit.skill (a zip) for Claude.ai / Cowork users.
// The .skill contains the skill folder plus the agent definition (agents/ inside the skill),
// so people who don't use Claude Code plugins still get everything.
// Usage: npm run package   → dist/dsgvo-audit.skill and dist/dsgvo-audit-<version>.skill

import { mkdirSync, rmSync, cpSync, existsSync, readFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;
const DIST = join(ROOT, 'dist');
const STAGE = join(DIST, 'stage');
const NAME = 'dsgvo-audit';

// validate first — never ship a broken package
execFileSync(process.execPath, [join(ROOT, 'scripts', 'validate.mjs')], { stdio: 'inherit' });

rmSync(STAGE, { recursive: true, force: true });
mkdirSync(join(STAGE, NAME), { recursive: true });
cpSync(join(ROOT, 'skills', NAME), join(STAGE, NAME), { recursive: true });
mkdirSync(join(STAGE, NAME, 'agents'), { recursive: true });
copyFileSync(join(ROOT, 'agents', 'dsgvo-auditor.md'), join(STAGE, NAME, 'agents', 'dsgvo-auditor.md'));

const out = join(DIST, `${NAME}.skill`);
const outVersioned = join(DIST, `${NAME}-${version}.skill`);
for (const f of [out, outVersioned]) if (existsSync(f)) rmSync(f);

try {
  execFileSync('zip', ['-r', '-q', '-X', out, NAME, '-x', '*.DS_Store'], { cwd: STAGE, stdio: 'inherit' });
} catch {
  // fallback without the zip CLI
  execFileSync('python3', ['-c', `
import shutil,sys; shutil.make_archive(sys.argv[1][:-4], 'zip', sys.argv[2]); import os; os.rename(sys.argv[1][:-4]+'.zip', sys.argv[1])
`, out.replace(/\.skill$/, '.skill'), STAGE], { stdio: 'inherit' });
}
copyFileSync(out, outVersioned);
rmSync(STAGE, { recursive: true, force: true });
console.log(`📦 ${out}\n📦 ${outVersioned}`);
