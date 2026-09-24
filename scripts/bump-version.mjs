#!/usr/bin/env node
// bump-version.mjs — sets the same version everywhere and cuts the CHANGELOG release section.
// Usage: npm run version:bump -- 1.1.0
//        npm run version:bump -- 1.1.0 --law-stand 2026-11   (also updates the "Stand" in SKILL.md + recht.md)
//        npm run version:bump -- 1.0.2 --law-stand 2026-12 --allow-empty
//          (a "nothing changed, law re-verified" patch: the CHANGELOG gets a one-line note instead of your entries)
//
// The [Unreleased] entries are MOVED into the new section; the script refuses to cut a release
// from an empty [Unreleased] unless --allow-empty is given, so a release never ships with an empty section.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = 'skills/dsgvo-audit';
const REPO = 'https://github.com/lxhelili/dsgvo-audit';
const args = process.argv.slice(2);
const version = args.find((a) => /^\d+\.\d+\.\d+$/.test(a));
if (!version) { console.error('usage: npm run version:bump -- <x.y.z> [--law-stand YYYY-MM] [--allow-empty]'); process.exit(2); }
const lsIdx = args.indexOf('--law-stand');
const lawStand = lsIdx >= 0 ? args[lsIdx + 1] : null;
if (lawStand && !/^\d{4}-(0[1-9]|1[0-2])$/.test(lawStand)) { console.error(`--law-stand must be YYYY-MM (got "${lawStand}")`); process.exit(2); }
const allowEmpty = args.includes('--allow-empty');
const today = new Date().toISOString().slice(0, 10);

// ---------- CHANGELOG first: it is the only step that can refuse ----------
const clPath = join(ROOT, 'CHANGELOG.md');
let changelog = readFileSync(clPath, 'utf8');
if (changelog.includes(`## [${version}]`)) { console.error(`CHANGELOG.md already has a [${version}] section`); process.exit(1); }
const m = changelog.match(/^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## \[)/m);
if (!m) { console.error('CHANGELOG.md: no "## [Unreleased]" section followed by a release section'); process.exit(1); }
// keep only sub-sections that have at least one real bullet
const body = m[1].split(/^(?=### )/m).filter((part) => !part.startsWith('### ') || /^- \S/m.test(part)).join('');
const hasEntries = /^- \S/m.test(body);
if (!hasEntries && !allowEmpty) {
  console.error(`CHANGELOG.md: [Unreleased] has no entries. Add them, or pass --allow-empty for a law-stand-only release.`);
  process.exit(1);
}
const section = hasEntries
  ? `## [${version}] – ${today}\n\n${body.trim()}\n\n`
  : `## [${version}] – ${today}\n\n### Changed\n\n- Legal references re-verified${lawStand ? `; law stand moved to ${lawStand}` : ''}. No verdict changes.\n\n`;
const prevVersion = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
changelog = changelog.replace(m[0], `## [Unreleased]\n\n${section}`);
// link references at the bottom
changelog = changelog.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${REPO}/compare/v${version}...HEAD`);
const link = prevVersion ? `[${version}]: ${REPO}/compare/v${prevVersion}...v${version}` : `[${version}]: ${REPO}/releases/tag/v${version}`;
if (!changelog.includes(`[${version}]: `)) changelog = changelog.replace(/^(\[Unreleased\]: .*)$/m, `$1\n${link}`);
writeFileSync(clPath, changelog);
console.log(`✏️  CHANGELOG.md (${hasEntries ? 'moved [Unreleased] entries' : 'law-stand-only note'})`);

// ---------- version fields ----------
const edit = (rel, fn) => { const p = join(ROOT, rel); const before = readFileSync(p, 'utf8'); const after = fn(before); if (after !== before) { writeFileSync(p, after); console.log(`✏️  ${rel}`); } };
edit('.claude-plugin/plugin.json', (t) => t.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`));
edit('.claude-plugin/marketplace.json', (t) => t.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`));
edit('package.json', (t) => t.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`));
edit('package-lock.json', (t) => t.replace(/("name": "dsgvo-audit",\n\s*"version": ")[^"]+"/g, `$1${version}"`));
edit(`${SKILL}/SKILL.md`, (t) => {
  t = t.replace(/^(\s+version:\s*)"?[0-9.]+"?/m, `$1"${version}"`);
  if (lawStand) t = t.replace(/^(\s+law-stand:\s*)"?[0-9-]+"?/m, `$1"${lawStand}"`);
  return t;
});
if (lawStand) {
  const [y, mo] = lawStand.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  edit(`${SKILL}/references/recht.md`, (t) => t.replace(/\*\*Stand: [^*]+\*\*/, `**Stand: ${months[Number(mo) - 1]} ${y}.**`));
}
console.log(`\n✅ version ${version}${lawStand ? `, law-stand ${lawStand}` : ''}. Next:\n   npm test && git commit -am "release: v${version}" && git tag v${version} && git push && git push --tags`);
