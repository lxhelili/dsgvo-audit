#!/usr/bin/env node
// summarize-evals.mjs — turns one evals/workspace/iteration-N/ into the committed results file.
//
// Reads, per eval and configuration (with_skill / without_skill / old_skill) — directly in <config>/ or,
// for repeat runs, in <config>/run-1/, run-2/ … (summed; time/tokens averaged; flaky expectations listed):
//   grading.json            LLM grader (skill-creator's agents/grader.md format: expectations[].passed)
//   grading-structure.json  deterministic grader (scripts/grade-report.mjs --json), optional
//   timing.json             { executor_duration_seconds, total_tokens }, optional
// and writes a Markdown summary: pass rates per eval and configuration, the delta, the deterministic
// grader's failures, every failed expectation with its evidence, and the graders' eval-design feedback.
//
// Usage: node scripts/summarize-evals.mjs evals/workspace/iteration-1 --out evals/results/1.1.0.md [--label "1.1.0 (unreleased)"]

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const dir = argv.find((a) => !a.startsWith('--') && !['--out', '--label'].includes(argv[argv.indexOf(a) - 1]));
if (!dir || !existsSync(dir)) { console.error('usage: summarize-evals.mjs <iteration-dir> [--out file.md] [--label text]'); process.exit(2); }
const OUT = opt('--out', null);
const LABEL = opt('--label', basename(dir));
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

function loadRun(p) {
  const g = readJson(join(p, 'grading.json'));
  if (!g) return null;
  const s = readJson(join(p, 'grading-structure.json'));
  return {
    name: basename(p),
    passed: g.summary?.passed ?? g.expectations.filter((x) => x.passed).length,
    total: g.summary?.total ?? g.expectations.length,
    expectations: g.expectations,
    det: s ? { passed: s.summary?.passed ?? s.expectations.filter((x) => x.passed).length, total: s.summary?.total ?? s.expectations.length, failed: s.expectations.filter((x) => !x.passed) } : null,
    timing: readJson(join(p, 'timing.json')),
    feedback: g.eval_feedback,
    claims: (g.claims || []).filter((x) => x.verified === false),
  };
}

// Several runs of one configuration: sum the pass counts, average time and tokens, and name the
// expectations that passed in some runs and failed in others — those are variance, not signal.
function aggregate(runs) {
  const multi = runs.length > 1;
  const tag = (r, t) => (multi ? `[${r.name}] ${t}` : t);
  const dets = runs.map((r) => r.det).filter(Boolean);
  const timed = runs.map((r) => r.timing).filter((t) => t?.executor_duration_seconds);
  const byText = new Map();
  for (const r of runs) for (const x of r.expectations) byText.set(x.text, [...(byText.get(x.text) || []), x.passed]);
  return {
    runs: runs.map((r) => ({ name: r.name, passed: r.passed, total: r.total })),
    passed: runs.reduce((a, r) => a + r.passed, 0),
    total: runs.reduce((a, r) => a + r.total, 0),
    failed: runs.flatMap((r) => r.expectations.filter((x) => !x.passed).map((x) => ({ ...x, text: tag(r, x.text) }))),
    flaky: multi ? [...byText.entries()].filter(([, v]) => v.some(Boolean) && !v.every(Boolean)).map(([text, v]) => ({ text, passes: v.filter(Boolean).length, runs: v.length })) : [],
    det: dets.length ? { passed: dets.reduce((a, d) => a + d.passed, 0), total: dets.reduce((a, d) => a + d.total, 0), failed: runs.flatMap((r) => (r.det?.failed || []).map((x) => ({ ...x, text: tag(r, x.text) }))) } : null,
    timing: timed.length ? { executor_duration_seconds: timed.reduce((a, t) => a + t.executor_duration_seconds, 0) / timed.length, total_tokens: timed.reduce((a, t) => a + (t.total_tokens || 0), 0) / timed.length } : null,
    feedback: runs.find((r) => r.feedback)?.feedback,
    claims: runs.flatMap((r) => r.claims),
  };
}

const evals = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory()).sort();
const CONFIGS = ['with_skill', 'old_skill', 'without_skill'];
const rows = [];
for (const e of evals) {
  const meta = readJson(join(dir, e, 'eval_metadata.json'));
  const row = { name: e, id: meta?.eval_id, configs: {} };
  for (const c of CONFIGS) {
    // repeat runs live in <config>/run-N/; a single run sits directly in <config>/
    const base = join(dir, e, c);
    const runDirs = existsSync(base) ? readdirSync(base).filter((n) => /^run-\d+$/.test(n)).sort().map((n) => join(base, n)) : [];
    const runs = (runDirs.length ? runDirs : [base]).map(loadRun).filter(Boolean);
    if (!runs.length) continue;
    row.configs[c] = aggregate(runs);
  }
  rows.push(row);
}
const present = CONFIGS.filter((c) => rows.some((r) => r.configs[c]));
const tot = (c) => rows.reduce((a, r) => (r.configs[c] ? { p: a.p + r.configs[c].passed, t: a.t + r.configs[c].total } : a), { p: 0, t: 0 });
const pct = (p, t) => (t ? `${Math.round((p / t) * 100)} %` : '—');
const fmt = (c) => (c ? `${c.passed}/${c.total}${c.runs?.length > 1 ? ` (${c.runs.map((r) => r.passed).join(' · ')})` : ''}` : '—');
const secs = (c) => (c?.timing?.executor_duration_seconds ? `${Math.round(c.timing.executor_duration_seconds)} s` : '—');
const toks = (c) => (c?.timing?.total_tokens ? `${Math.round(c.timing.total_tokens / 1000)}k` : '—');

const L = [];
L.push(`# Eval results — ${LABEL}`, '');
L.push(`Iteration directory: \`${dir}\` · ${rows.length} evals · configurations: ${present.join(', ')} · generated ${new Date().toISOString().slice(0, 10)}`, '');
L.push('## Pass rates (LLM grader, expectations from `evals/evals.json`)', '');
L.push(`| # | Eval | ${present.map((c) => c.replace('_', ' ')).join(' | ')} | Δ |`);
L.push(`|---|---|${present.map(() => '---').join('|')}|---|`);
for (const r of rows) {
  const w = r.configs.with_skill, b = r.configs.without_skill || r.configs.old_skill;
  const delta = w && b ? `${w.passed - b.passed >= 0 ? '+' : ''}${w.passed - b.passed}` : '—';
  L.push(`| ${r.id ?? ''} | ${r.name} | ${present.map((c) => fmt(r.configs[c])).join(' | ')} | ${delta} |`);
}
L.push(`| | **Total** | ${present.map((c) => { const t = tot(c); return `**${t.p}/${t.t}** (${pct(t.p, t.t)})`; }).join(' | ')} | ${(() => { const w = tot('with_skill'), b = tot('without_skill').t ? tot('without_skill') : tot('old_skill'); return b.t ? `${w.p - b.p >= 0 ? '+' : ''}${w.p - b.p}` : '—'; })()} |`);
L.push('');
L.push('## Deterministic grader (`scripts/grade-report.mjs`) on the produced files', '');
L.push(`| Eval | ${present.map((c) => c.replace('_', ' ')).join(' | ')} |`);
L.push(`|---|${present.map(() => '---').join('|')}|`);
for (const r of rows) L.push(`| ${r.name} | ${present.map((c) => (r.configs[c]?.det ? fmt(r.configs[c].det) : 'n/a')).join(' | ')} |`);
L.push('', '_n/a = the run produced no file the deterministic grader applies to (e.g. an intake-only answer, or a baseline without a report structure to check against)._', '');
L.push('## Cost', '');
L.push(`| Eval | ${present.map((c) => `${c.replace('_', ' ')} time · tokens`).join(' | ')} |`);
L.push(`|---|${present.map(() => '---').join('|')}|`);
for (const r of rows) L.push(`| ${r.name} | ${present.map((c) => `${secs(r.configs[c])} · ${toks(r.configs[c])}`).join(' | ')} |`);
L.push('');
{
  const flaky = rows.flatMap((r) => present.flatMap((c) => (r.configs[c]?.flaky || []).map((f) => `- ${r.name} (${c.replace('_', ' ')}): ${f.text} — passed ${f.passes}/${f.runs}`)));
  if (rows.some((r) => present.some((c) => r.configs[c]?.runs.length > 1))) {
    L.push('## Flaky expectations (passed in some runs, failed in others)', '', ...(flaky.length ? flaky : ['_none_']), '');
  }
}
L.push('## Failed expectations', '');
for (const r of rows) for (const c of present) {
  const cfg = r.configs[c]; if (!cfg) continue;
  if (cfg.failed.length) { L.push(`### ${r.name} — ${c.replace('_', ' ')}`, ''); for (const f of cfg.failed) L.push(`- **${f.text}**  \n  ${String(f.evidence || '').replace(/\n/g, ' ').slice(0, 400)}`); L.push(''); }
  if (cfg.det?.failed.length) { L.push(`_Deterministic grader, ${r.name} (${c.replace('_', ' ')}):_`, ''); for (const f of cfg.det.failed) L.push(`- ${f.text} — ${String(f.evidence || '').replace(/\n/g, ' ').slice(0, 200)}`); L.push(''); }
}
L.push('## Unverified claims flagged by the graders', '');
let any = false;
for (const r of rows) for (const c of present) for (const k of r.configs[c]?.claims || []) { any = true; L.push(`- ${r.name} (${c.replace('_', ' ')}): ${k.claim} — ${String(k.evidence || '').slice(0, 200)}`); }
if (!any) L.push('_none_');
L.push('', '## Eval-design feedback from the graders', '');
for (const r of rows) for (const c of present) {
  const fb = r.configs[c]?.feedback; if (!fb) continue;
  const items = (fb.suggestions || []).map((s) => `- ${s.assertion ? `**${s.assertion.slice(0, 90)}…** — ` : ''}${s.reason}`);
  if (items.length || fb.overall) { L.push(`### ${r.name} — ${c.replace('_', ' ')}`, '', ...items, fb.overall ? `\n_${fb.overall}_` : '', ''); }
}
L.push('## Analyst notes', '', '_Fill in after reading the tables: which expectations pass regardless of the skill (non-discriminating), which are flaky, where the skill costs tokens without buying accuracy, and what changed in the skill as a result of this run._', '');
const md = L.join('\n');
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, md); console.log(`written: ${OUT}`); } else console.log(md);
