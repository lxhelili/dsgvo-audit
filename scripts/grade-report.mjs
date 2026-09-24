#!/usr/bin/env node
// grade-report.mjs — deterministic checks on what the skill produces.
//
// The LLM grader (skill-creator, agents/grader.md) judges the *substance* of an audit — did it find
// the GA4 tag, did it call Formspree a rule-based 🔴, did it ask instead of inventing a Kammer.
// This script covers the part that should never need judgment: structure, mandatory sentences,
// forbidden claims, leftover placeholders. It is cheap, runs in CI, and makes the LLM grader's
// job smaller. Both together are the eval; neither alone is.
//
// Usage:
//   node scripts/grade-report.mjs --report datenschutz-audit-example.de-2026-09-24.md
//   node scripts/grade-report.mjs --dse datenschutzerklaerung.md --impressum impressum.md
//   node scripts/grade-report.mjs --report r.md --expect "3 O 17493/20" --expect-no "Google Analytics"
//   node scripts/grade-report.mjs --report r.md --json grading.json      # skill-creator grading.json shape
//
//   --expect <regex>     must match somewhere in the graded files (repeatable)
//   --expect-no <regex>  must NOT match anywhere in the graded files (repeatable)
//   --json <file>        write { expectations: [{text, passed, evidence}], summary } for the eval viewer
//
// Exit 0 when every check passes, 1 otherwise, 2 on usage errors.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const takeAll = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));
const take = (name) => takeAll(name)[0];
const reportPath = take('--report');
const dsePath = take('--dse');
const impressumPath = take('--impressum');
const jsonOut = take('--json');
const expects = takeAll('--expect');
const expectNos = takeAll('--expect-no');

if (!reportPath && !dsePath && !impressumPath) {
  console.error('usage: grade-report.mjs [--report file.md] [--dse file.md] [--impressum file.md] [--expect re]... [--expect-no re]... [--json out.json]');
  process.exit(2);
}
for (const p of [reportPath, dsePath, impressumPath]) if (p && !existsSync(p)) { console.error(`not found: ${p}`); process.exit(2); }

const results = [];
const check = (text, passed, evidence = '') => results.push({ text, passed: !!passed, evidence });
const excerpt = (m) => (m ? `"${String(m).trim().slice(0, 80)}"` : 'no match');

// Placeholders the templates use: [PLATZHALTER], [FIRMA, RECHTSFORM], [X TAGE], [E-MAIL] …
const PLACEHOLDER = /\[PLATZHALTER\]|\[[A-ZÄÖÜ][A-ZÄÖÜ0-9 ,./()+\-–]{2,}\]/;
const FORBIDDEN_CLAIMS = /abmahnsicher|100\s?%\s?(konform|DSGVO-konform|rechtssicher)|garantiert (konform|rechtssicher)|vollständig konform/i;
// A negated or quoted mention („keine ‚100 % konform'-Siegel", „nie ‚abmahnsicher' nennen") is the skill doing its job, not a claim.
function forbiddenClaim(text) {
  const re = new RegExp(FORBIDDEN_CLAIMS.source, FORBIDDEN_CLAIMS.flags.includes('g') ? FORBIDDEN_CLAIMS.flags : FORBIDDEN_CLAIMS.flags + 'g');
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/(kein|keine|keinen|nicht|nie|niemals|weder|„|"|‚|'|«|nennen wir|als)\s*[^\n]{0,25}$/i.test(before)) continue;
    return m[0];
  }
  return null;
}
// a link, not a mention: „kein Link auf ec.europa.eu/consumers/odr“ in a note is the skill doing its job
const ODR_LINK = /(https?:\/\/|\]\(|href=["']?)(www\.)?ec\.europa\.eu\/consumers\/odr/i;
// placeholders are checked in prose only — a regex like /[A-Z]{2}/ in a code sample is not a template leftover
const prose = (t) => t.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
const RDG = /RDG/;

// ---------------- report ----------------
if (reportPath) {
  const t = readFileSync(reportPath, 'utf8');
  const sections = [
    /management summary/i,
    /kritische (und|&) hohe befunde/i,
    /datenfluss-?übersicht/i,
    /vollständige prüftabelle/i,
    /drittanbieter (&|und) auftragsverarbeiter/i,
    /maßnahmenplan/i,
    /offene fragen/i,
    /rechtlicher hinweis/i,
  ];
  const headings = [...t.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1]);
  let cursor = 0, inOrder = true, missing = [];
  for (const re of sections) {
    const idx = headings.findIndex((h, i) => i >= cursor && re.test(h));
    if (idx === -1) { missing.push(re.source); inOrder = false; } else cursor = idx + 1;
  }
  check('Report has the eight Phase-4 sections as headings, in order', inOrder, missing.length ? `missing/out of order: ${missing.join(', ')}` : `${headings.length} headings`);

  const summary = t.split(/^#{1,4}\s+/m).find((s) => /^(\d+[.)]?\s*)?management summary/i.test(s)) || '';
  // the evidence level may sit in the report header (title block before section 1) instead of the summary bullets
  const preamble = t.split(/^#{1,4}\s+(?:\d+[.)]?\s*)?management summary/im)[0] || '';
  const evidenceScope = preamble.slice(-1500) + '\n' + summary;
  check('Management Summary carries an Ampel status', /[🔴🟠🟡🟢]/.test(summary), excerpt(summary.match(/[🔴🟠🟡🟢][^\n]{0,60}/)?.[0]));
  check('Management Summary states the evidence level (code / runtime scan / URL only / description only)',
    /evidenz|runtime-?scan|nur (url|beschreibung)|code(\s?\+\s?|\s+und\s+)runtime|kein(e)? (runtime|laufzeit)|laufzeit-?scan|statische(r|n)? scan/i.test(evidenceScope),
    excerpt(evidenceScope.match(/[^\n]*(evidenz|runtime|laufzeit|nur url|nur beschreibung)[^\n]*/i)?.[0]));

  // `u` flag: without it the character class matches UTF-16 code units, and 🟡/🟢 share a surrogate with 🔴/🟠
  const blocks = [...t.matchAll(/^#{2,4}\s+([🔴🟠])[^\n]*\n([\s\S]*?)(?=^#{1,4}\s|\n---|(?![\s\S]))/gmu)];
  const critical = blocks.length;
  const incomplete = blocks.filter(([, , body]) => !(/befund/i.test(body) && /rechtsgrundlage/i.test(body) && /risiko/i.test(body) && /maßnahme/i.test(body) && /aufwand/i.test(body)));
  check(`Every 🔴/🟠 finding block has Befund · Rechtsgrundlage · Risiko · Maßnahme · Aufwand (${critical} blocks)`, critical > 0 && incomplete.length === 0,
    critical === 0 ? 'no 🔴/🟠 finding headings found (### 🔴 K-01 …)' : incomplete.length ? `incomplete: ${incomplete.map((b) => b[0].split('\n')[0].trim()).join(' | ')}` : 'all complete');
  const uncited = blocks.filter(([, , body]) => !/Art\.\s?\d+|§\s?\d+/.test(body));
  check('Every 🔴/🟠 finding cites a norm (Art. … / § …)', critical > 0 && uncited.length === 0, uncited.length ? `uncited: ${uncited.map((b) => b[0].split('\n')[0].trim()).join(' | ')}` : 'all cited');
  // Evidence (v1.2): each 🔴/🟠 finding says which observation it rests on and how certain it is,
  // and every ID it cites exists in the Evidenzverzeichnis — a finding without a traceable source is an opinion.
  const EVIDENCE_ID = /\bE-\d{2,3}\b/g;
  const unevidenced = blocks.filter(([, , body]) => !(/evidenz/i.test(body) && /\bE-\d{2,3}\b/.test(body) && /beobachtet|abgeleitet|mandantenangabe/i.test(body)));
  check('Every 🔴/🟠 finding names its evidence (E-xx) and level (beobachtet · abgeleitet · Mandantenangabe)', critical > 0 && unevidenced.length === 0,
    unevidenced.length ? `without evidence line: ${unevidenced.map((b) => b[0].split('\n')[0].trim()).join(' | ')}` : 'all carry evidence');
  const regHeading = t.match(/^(#{2,4})\s+[^\n]*evidenzverzeichnis[^\n]*$/im);
  const registry = regHeading ? t.slice(regHeading.index + regHeading[0].length).split(new RegExp(`^#{1,${regHeading[1].length}}\\s`, 'm'))[0] : '';
  const defined = new Set([...registry.matchAll(/^\s*(?:\|\s*|[-*]\s*)\**(E-\d{2,3})\b/gm)].map((m) => m[1]));
  const cited = [...new Set(blocks.flatMap(([, , body]) => body.match(EVIDENCE_ID) || []))];
  const dangling = cited.filter((id) => !defined.has(id));
  check('Every evidence ID cited in a finding is listed in the Evidenzverzeichnis', critical === 0 || (!!regHeading && cited.length > 0 && dangling.length === 0),
    !regHeading ? 'no "Evidenzverzeichnis" heading' : dangling.length ? `not listed: ${dangling.join(', ')}` : `${cited.length} cited, ${defined.size} listed`);
  check('Effort scale used (Aufwand: S/M/L)', critical === 0 || /aufwand:?\**\s*\**\s*[SML]\b/i.test(t), excerpt(t.match(/aufwand[^\n]{0,30}/i)?.[0]));

  check('Report ends with the RDG disclaimer', RDG.test(t.slice(-2500)) && /rechtsberatung/i.test(t.slice(-2500)), excerpt(t.slice(-2500).match(/[^\n]*RDG[^\n]*/)?.[0]));
  { const m = forbiddenClaim(t); check('Report makes no forbidden claim (abmahnsicher, 100 % konform, garantiert …)', !m, excerpt(m)); }
  check('Report has no leftover template placeholder', !PLACEHOLDER.test(prose(t)), excerpt(prose(t).match(PLACEHOLDER)?.[0]));
  const addOdr = t.match(/os-plattform(-link)?[^\n]{0,80}(?<!nicht )(einfügen|ergänzen|hinzufügen|aufnehmen|verlinken)|(link|verlinkung)[^\n]{0,60}os-plattform[^\n]{0,60}(?<!nicht )(einfügen|ergänzen|hinzufügen|aufnehmen)|os-plattform[^\n]{0,80}(fehlt|muss verlinkt|ist pflicht)/i);
  check('Report does not recommend adding the OS-Plattform link', !addOdr, addOdr ? excerpt(addOdr[0]) : 'no "add the ODR link" wording');
}

// ---------------- Datenschutzerklärung ----------------
if (dsePath) {
  const t = readFileSync(dsePath, 'utf8');
  check('DSE has no leftover template placeholder', !PLACEHOLDER.test(prose(t)), excerpt(prose(t).match(PLACEHOLDER)?.[0]));
  check('DSE names the Verantwortlicher with an e-mail address', /verantwortlich/i.test(t) && /[\w.+-]+@[\w-]+\.[\w.-]+/.test(t), excerpt(t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]));
  check('DSE states Zweck and Rechtsgrundlage per processing (Art. 6 Abs. 1 lit. …)', (t.match(/Art\.\s?6\s?Abs\.\s?1\s?lit\.\s?[abcf]/g) || []).length >= 2, `${(t.match(/Art\.\s?6\s?Abs\.\s?1\s?lit\.\s?[abcf]/g) || []).length} legal-basis citations`);
  // the withdrawal right only matters where something rests on consent — a consent-free site (cookieless analytics on lit. f) need not list it
  // the legal bases only — § 25 TDDDG is often cited to say that nothing needs consent
  const consentBased = /Art\.\s?6\s?Abs\.\s?1\s?(S\.\s?1\s?)?lit\.\s?a|Art\.\s?9\s?Abs\.\s?2\s?lit\.\s?a/.test(t);
  const rights = ['15', '16', '17', '18', '20'].filter((n) => !new RegExp(`Art\\.\\s?${n}\\b`).test(t));
  const withdrawal = !consentBased || /Art\.\s?7\s?Abs\.\s?3/.test(t);
  check('DSE lists the Betroffenenrechte (Art. 15, 16, 17, 18, 20) and, where anything rests on consent, the withdrawal right (Art. 7 Abs. 3)', !rights.length && withdrawal,
    rights.length ? `missing: Art. ${rights.join(', ')}` : !withdrawal ? 'consent-based processing but no Art. 7 Abs. 3' : consentBased ? 'all present' : 'all present (no consent-based processing, Art. 7 Abs. 3 not required)');
  check('DSE highlights the Art. 21 Widerspruchsrecht (blockquote or bold)', /^>\s*[^\n]*(Art\.\s?21|Widerspruchsrecht)|\*\*[^\n]*(Art\.\s?21|Widerspruchsrecht)[^\n]*\*\*/m.test(t), excerpt(t.match(/^>[^\n]*Widerspruch[^\n]*/m)?.[0]));
  check('DSE names the Beschwerderecht and a supervisory authority', /Art\.\s?77|Beschwerderecht/.test(t) && /Aufsichtsbehörde|Landesbeauftragte|Datenschutzbeauftragte(r)? (des Landes|für)|LDI|BfDI|LfDI|BayLDA/i.test(t), excerpt(t.match(/[^\n]*(Landesbeauftragte|LDI|LfDI|BayLDA|BfDI)[^\n]*/)?.[0]));
  check('DSE states retention periods concretely (not only "solange erforderlich")', /speicherdauer|löschung|aufbewahr/i.test(t) && /\d+\s?(tage|monate|jahre|wochen)/i.test(t), excerpt(t.match(/\d+\s?(tage|monate|jahre|wochen)/i)?.[0]));
  check('DSE carries a Stand date', /stand[^\n]{0,40}(\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\d{4}-\d{2}-\d{2}|(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s\d{4})/i.test(t), excerpt(t.match(/stand[^\n]{0,50}/i)?.[0]));
  check('DSE has no OS-Plattform link', !ODR_LINK.test(t), 'no ec.europa.eu/consumers/odr');
  { const m = forbiddenClaim(t); check('DSE makes no forbidden claim', !m, excerpt(m)); }
}

// ---------------- Impressum ----------------
if (impressumPath) {
  const t = readFileSync(impressumPath, 'utf8');
  check('Impressum has no leftover template placeholder', !PLACEHOLDER.test(prose(t)), excerpt(prose(t).match(PLACEHOLDER)?.[0]));
  check('Impressum cites § 5 DDG, not the repealed TMG', /§\s?5\s?DDG/.test(t) && !/§\s?5\s?TMG/.test(t), excerpt(t.match(/§\s?5\s?(DDG|TMG)/)?.[0]));
  check('Impressum has an e-mail address and a phone number', /[\w.+-]+@[\w-]+\.[\w.-]+/.test(t) && /(\+49|0)[\d\s/()-]{6,}/.test(t), 'contact data present');
  check('Impressum has no OS-Plattform link', !ODR_LINK.test(t), 'no ec.europa.eu/consumers/odr');
  check('Impressum addresses § 36 VSBG (participation statement or ≤ 10 employees note)', /VSBG|Verbraucherschlichtung|Streitbeilegung/i.test(t), excerpt(t.match(/[^\n]*(VSBG|Verbraucherschlichtung)[^\n]*/i)?.[0]));
}

// ---------------- eval-specific expectations ----------------
const all = [reportPath, dsePath, impressumPath].filter(Boolean).map((p) => readFileSync(p, 'utf8')).join('\n\n');
for (const re of expects) { const m = all.match(new RegExp(re, 'im')); check(`--expect /${re}/ matches`, !!m, excerpt(m?.[0])); }
for (const re of expectNos) { const m = all.match(new RegExp(re, 'im')); check(`--expect-no /${re}/ does not match`, !m, excerpt(m?.[0])); }

// ---------------- output ----------------
for (const r of results) console.log(`  ${r.passed ? '✅' : '❌'} ${r.text}${r.passed ? '' : `\n     ↳ ${r.evidence}`}`);
const passed = results.filter((r) => r.passed).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ expectations: results, summary: { passed, failed: results.length - passed, total: results.length, pass_rate: results.length ? +(passed / results.length).toFixed(2) : 0 } }, null, 2));
  console.log(`JSON: ${jsonOut}`);
}
process.exit(passed === results.length ? 0 : 1);
