#!/usr/bin/env node
// validate.mjs — structural checks that run in CI and before every release.
// No dependencies. Exit 1 on the first hard failure list.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = join(ROOT, 'skills', 'dsgvo-audit');
const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------- SKILL.md frontmatter ----------
const skillMd = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');
const fm = skillMd.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) fail('SKILL.md: no YAML frontmatter');
const ALLOWED = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility']);
const topKeys = [...(fm?.[1] || '').matchAll(/^([a-zA-Z-]+):/gm)].map((m) => m[1]);
for (const k of topKeys) if (!ALLOWED.has(k)) fail(`SKILL.md: frontmatter key "${k}" not allowed (allowed: ${[...ALLOWED].join(', ')})`);
const name = fm?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
const description = fm?.[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
if (name !== 'dsgvo-audit') fail(`SKILL.md: name must be "dsgvo-audit" (got "${name}")`);
if (!description) fail('SKILL.md: description missing');
else if (description.length > 1024) fail(`SKILL.md: description is ${description.length} chars (max 1024)`);
else if (description.length > 980) warn(`SKILL.md: description is ${description.length} chars — under 1024, but any edit will overflow; trim it`);
else if (description.length < 200) warn(`SKILL.md: description is short (${description.length} chars) — triggering may suffer`);
const skillVersion = fm?.[1].match(/^\s+version:\s*"?([0-9.]+)"?/m)?.[1];
const lawStand = fm?.[1].match(/^\s+law-stand:\s*"?([0-9-]+)"?/m)?.[1];
if (!skillVersion) fail('SKILL.md: metadata.version missing');
if (!lawStand) warn('SKILL.md: metadata.law-stand missing');
else {
  // the legal references are a promise to the reader — nag when nobody has looked for a while
  const [ly, lm] = lawStand.split('-').map(Number);
  const now = new Date();
  const ageMonths = (now.getUTCFullYear() - ly) * 12 + (now.getUTCMonth() + 1 - lm);
  if (ageMonths > 4) warn(`SKILL.md: law-stand ${lawStand} is ${ageMonths} months old — re-verify references/recht.md and services.md (DPF status, § 25 TDDDG / Digital Omnibus, KI-VO deadlines, DSK guidance, court rulings), then bump with --law-stand`);
}

// ---------- law-watch: every row has a re-check date; overdue rows are a warning ----------
const lawWatch = join(SKILL_DIR, 'references', 'law-watch.md');
if (!existsSync(lawWatch)) warn('references/law-watch.md missing');
else {
  const today = new Date().toISOString().slice(0, 7);
  for (const row of readFileSync(lawWatch, 'utf8').split('\n').filter((l) => /^\| \*\*/.test(l))) {
    const cells = row.split('|').map((c) => c.trim());
    const point = cells[1].replace(/\*\*/g, ''); const due = cells[5];
    if (!/^\d{4}-\d{2}$/.test(due) && !/bei jedem Audit/.test(due)) fail(`law-watch.md: "${point}" has no YYYY-MM re-check date (got "${due}")`);
    else if (/^\d{4}-\d{2}$/.test(due) && due < today) warn(`law-watch.md: "${point}" was due for re-check ${due} — verify and update the row`);
  }
}

const bodyLines = skillMd.split('\n').length;
if (bodyLines > 500) warn(`SKILL.md is ${bodyLines} lines — the guideline is < 500; move detail into references/`);

// ---------- referenced files exist ----------
const refs = new Set([...skillMd.matchAll(/`((?:references|assets|scripts|agents)\/[A-Za-z0-9_./-]+)`/g)].map((m) => m[1]));
for (const r of refs) {
  const inSkill = join(SKILL_DIR, r);
  const inRepo = join(ROOT, r); // agents/ lives at the plugin root
  if (!existsSync(inSkill) && !existsSync(inRepo)) fail(`SKILL.md references "${r}" but it does not exist in the skill or at the repo root`);
}
for (const md of walk(join(SKILL_DIR, 'references'))) {
  const txt = readFileSync(md, 'utf8');
  for (const m of txt.matchAll(/`((?:references|assets|scripts)\/[A-Za-z0-9_./-]+)`/g)) {
    if (!existsSync(join(SKILL_DIR, m[1]))) fail(`${md.replace(ROOT + '/', '')} references "${m[1]}" which does not exist`);
  }
}

// ---------- no known regressions ----------
const allSkillText = walk(SKILL_DIR).filter((f) => f.endsWith('.md')).map((f) => [f, readFileSync(f, 'utf8')]);
for (const [f, txt] of allSkillText) {
  const rel = f.replace(ROOT + '/', '');
  if (/--include="\*\.\{/.test(txt)) fail(`${rel}: grep --include with brace pattern (matches nothing)`);
  if (/Nr\. 3 UWG/.test(txt)) fail(`${rel}: outdated "§ 7 Abs. 2 Nr. 3 UWG" (is Nr. 2 since 2022)`);
  if (/web_fetch|web_search/.test(txt)) fail(`${rel}: use tool names WebFetch/WebSearch`);
  if (/https?:\/\/ec\.europa\.eu\/consumers\/odr/.test(txt) && !/abgeschaltet|entfernen|remove/i.test(txt)) fail(`${rel}: OS-Plattform link present without removal note`);
}

// ---------- agent frontmatter ----------
const agentPath = join(ROOT, 'agents', 'dsgvo-auditor.md');
if (!existsSync(agentPath)) fail('agents/dsgvo-auditor.md missing');
else {
  const a = readFileSync(agentPath, 'utf8');
  const afm = a.match(/^---\n([\s\S]*?)\n---\n/)?.[1] || '';
  for (const k of ['name', 'description', 'tools']) if (!new RegExp(`^${k}:`, 'm').test(afm)) fail(`agent: frontmatter "${k}" missing`);
  if (!/\bSkill\b/.test(afm.match(/^tools:.*$/m)?.[0] || '')) fail('agent: "Skill" must be in tools so it can load the skill');
  if (/Fachanwalt für|externer Datenschutzbeauftragter/.test(a)) fail('agent: must not claim a protected legal role');
}

// ---------- plugin manifests + version sync ----------
const plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
const market = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
if (plugin.name !== 'dsgvo-audit') fail('plugin.json: name must be dsgvo-audit');
const entry = market.plugins?.find((p) => p.name === 'dsgvo-audit');
if (!entry) fail('marketplace.json: no plugin entry named dsgvo-audit');
const versions = { 'plugin.json': plugin.version, 'marketplace.json': entry?.version, 'package.json': pkg.version, 'SKILL.md metadata.version': skillVersion };
const distinct = new Set(Object.values(versions));
if (distinct.size !== 1) fail(`version mismatch: ${JSON.stringify(versions)} — run: npm run version:bump <x.y.z>`);
const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`## [${plugin.version}]`)) fail(`CHANGELOG.md has no "## [${plugin.version}]" section`);
for (const p of plugin.skills || []) if (!existsSync(join(ROOT, p, 'SKILL.md'))) fail(`plugin.json skills path "${p}" has no SKILL.md`);
for (const p of plugin.agents || []) if (!existsSync(join(ROOT, p))) fail(`plugin.json agents path "${p}" missing`);

// ---------- evals ----------
const evalsPath = join(ROOT, 'evals', 'evals.json');
if (!existsSync(evalsPath)) warn('evals/evals.json missing — output evals cannot run');
else {
  let ev;
  try { ev = JSON.parse(readFileSync(evalsPath, 'utf8')); } catch (e) { fail(`evals/evals.json: invalid JSON (${e.message})`); }
  if (ev) {
    if (ev.skill_name !== 'dsgvo-audit') fail(`evals.json: skill_name must be "dsgvo-audit" (got "${ev.skill_name}")`);
    const ids = new Set();
    for (const e of ev.evals || []) {
      if (ids.has(e.id)) fail(`evals.json: duplicate eval id ${e.id}`); ids.add(e.id);
      if (!e.prompt || !e.expected_output) fail(`evals.json: eval ${e.id} needs prompt and expected_output`);
      if (!Array.isArray(e.expectations) || e.expectations.length < 3) fail(`evals.json: eval ${e.id} needs at least 3 expectations`);
      for (const f of e.files || []) if (!existsSync(join(ROOT, f))) fail(`evals.json: eval ${e.id} references missing file "${f}"`);
    }
    if ((ev.evals || []).length < 3) warn(`evals.json: only ${(ev.evals || []).length} evals — too few to notice a regression`);
  }
  const trig = join(ROOT, 'evals', 'trigger-evals.json');
  if (existsSync(trig)) {
    try {
      const t = JSON.parse(readFileSync(trig, 'utf8'));
      const neg = t.filter((q) => q.should_trigger === false).length;
      if (!t.every((q) => typeof q.query === 'string' && typeof q.should_trigger === 'boolean')) fail('trigger-evals.json: every item needs {query: string, should_trigger: boolean}');
      if (neg < 3) warn(`trigger-evals.json: only ${neg} negative queries — add more to protect the scope clause`);
    } catch (e) { fail(`evals/trigger-evals.json: invalid JSON (${e.message})`); }
  }
}

// ---------- scripts parse ----------
for (const f of [...walk(join(SKILL_DIR, 'scripts')), ...walk(join(ROOT, 'scripts'))].filter((f) => f.endsWith('.mjs') || f.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(`${f.replace(ROOT + '/', '')}: syntax error\n${e.stderr}`); }
}

// ---------- placeholders in templates are intentional; none in references ----------
for (const f of walk(join(SKILL_DIR, 'references'))) {
  if (/\[PLATZHALTER\]/.test(readFileSync(f, 'utf8'))) warn(`${f.replace(ROOT + '/', '')} contains [PLATZHALTER] — only templates should`);
}

// ---------- report ----------
for (const w of warnings) console.log(`⚠️  ${w}`);
for (const e of errors) console.log(`❌ ${e}`);
if (errors.length) { console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`✅ validate: ok (version ${plugin.version}, law-stand ${lawStand}, description ${description.length} chars, ${refs.size} referenced files)`);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
