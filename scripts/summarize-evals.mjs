#!/usr/bin/env node
// summarize-evals.mjs — turns one evals/workspace/iteration-N/ into the committed results file.
//
// Reads, per eval and configuration (with_skill / without_skill / old_skill):
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

const evals = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory()).sort();
const CONFIGS = ['with_skill', 'old_skill', 'without_skill'];
const rows = [];
for (const e of evals) {
  const meta = readJson(join(dir, e, 'eval_metadata.json'));
  const row = { name: e, id: meta?.eval_id, configs: {} };
  for (const c of CONFIGS) {
    const g = readJson(join(dir, e, c, 'grading.json'));
    if (!g) continue;
    const s = readJson(join(dir, e, c, 'grading-structure.json'));
    const t = readJson(join(dir, e, c, 'timing.json'));
    row.configs[c] = {
      passed: g.summary?.passed ?? g.expectations.filter((x) => x.passed).length,
      total: g.summary?.total ?? g.expectations.length,
      failed: g.expectations.filter((x) => !x.passed),
      det: s ? { passed: s.summary?.passed ?? s.expectations.filter((x) => x.passed).length, total: s.summary?.total ?? s.expectations.length, failed: s.expectations.filter((x) => !x.passed) } : null,
      timing: t,
      feedback: g.eval_feedback,
      claims: (g.claims || []).filter((x) => x.verified === false),
    };
  }
  rows.push(row);
}
const present = CONFIGS.filter((c) => rows.some((r) => r.configs[c]));
const tot = (c) => rows.reduce((a, r) => (r.configs[c] ? { p: a.p + r.configs[c].passed, t: a.t + r.configs[c].total } : a), { p: 0, t: 0 });
const pct = (p, t) => (t ? `${Math.round((p / t) * 100)} %` : '—');
const fmt = (c) => (c ? `${c.passed}/${c.total}` : '—');
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
