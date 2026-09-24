#!/usr/bin/env node
// build-evidence.mjs — numbers every observation from the evidence tools (E-01, E-02 …) for the report's
// Evidenzverzeichnis, so each finding can say what it rests on.
//
// Usage:
//   node scripts/build-evidence.mjs scan.json lint.json [gtm.json] [har.json] [--md] [--out evidence.json]
//
// Inputs are recognised by shape (scan-origins / parse-har / lint-origins / parse-gtm output). Order of the
// arguments is the order of the IDs — same inputs, same IDs. A scan that did not load (exit 3) is skipped
// with a note: an empty result is not evidence.
// Client statements are not tool output — the report continues the numbering for them (Quelle: Mandant).
//
// Exit codes: 0 ok · 2 usage error / unreadable input

import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { loadInput, buildEvidence, evidenceMarkdown, SOURCE_LABEL } from './lib/evidence.mjs';

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const out = outIdx >= 0 ? argv[outIdx + 1] : null;
const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
if (!files.length) {
  console.error('Usage: node scripts/build-evidence.mjs <scan|lint|gtm|har>.json ... [--md] [--out evidence.json]');
  process.exit(2);
}

let inputs;
try { inputs = files.map(loadInput); } catch (e) { console.error(`❌ ${e.message}`); process.exit(2); }

const skipped = inputs.filter((i) => (i.kind === 'scan' || i.kind === 'har') && (i.data.verdict === null || i.data.httpStatus === undefined));
const entries = buildEvidence(inputs);
const result = {
  builtAt: new Date().toISOString(),
  inputs: inputs.map((i) => ({ file: basename(i.file), kind: i.kind, source: SOURCE_LABEL[i.kind], target: i.data.target || (i.data.dir ? basename(i.data.dir) : null) || i.data.container || null, at: i.data.recordedAt || i.data.scannedAt || i.data.exportedAt || null })),
  skipped: skipped.map((i) => basename(i.file)),
  entries,
};
if (out) writeFileSync(out, JSON.stringify(result, null, 2));

if (argv.includes('--md')) {
  console.log(evidenceMarkdown(entries));
  console.log(`\nQuellen: ${result.inputs.map((i) => `${i.source} ${i.target ?? ''}${i.at ? ` (${i.at.slice(0, 10)})` : ''}`.trim()).join(' · ')}`);
} else {
  console.log(`=== Evidenz: ${entries.length} Einträge aus ${inputs.length - skipped.length} Quelle(n) ===`);
  for (const e of entries) console.log(`  ${e.id}  [${SOURCE_LABEL[e.source]}] ${e.detail}${e.where ? `  → ${e.where}` : ''}`);
}
for (const f of skipped) console.error(`⚠️  ${f}: Scan ohne Ergebnis (Seite nicht geladen) — nicht als Evidenz verwendet.`);
if (out) console.error(`JSON: ${out}`);
