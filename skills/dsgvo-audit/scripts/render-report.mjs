#!/usr/bin/env node
// render-report.mjs — turns a Markdown deliverable (audit report, Datenschutzerklärung, Impressum, VVT, TOMs)
// into ONE self-contained HTML file for client delivery, and optionally a PDF.
//
// Why a custom renderer and not a Markdown library: the skill ships without runtime dependencies, and the
// output must follow the skill's own rule — no external fonts, scripts or stylesheets; system fonts only,
// everything inline. The subset implemented is exactly what the templates and the Phase-4 report use:
// headings, paragraphs, bold/italic/inline code, links, blockquotes, ordered/unordered lists (one nesting
// level), fenced code blocks, tables, horizontal rules, and the 🔴🟠🟡🟢⚪️ status glyphs (kept as text —
// they are the report's own vocabulary and print fine).
//
// Usage:
//   node scripts/render-report.mjs <file.md> [--out file.html] [--title "…"] [--pdf [file.pdf]] [--lang de|en]
//     --out    HTML path (default: <file>.html next to the input)
//     --title  <title> for the document (default: first H1, else the file name)
//     --pdf    also write a PDF via Playwright/Chromium (needs playwright — project-local or global);
//              without Playwright the HTML is still written and the PDF step reports exit 4
//     --lang   html lang attribute (default: de)
//
// Exit codes: 0 ok · 2 usage / input not found · 4 --pdf requested but Playwright unavailable or PDF failed
// (HTML was still written in that case).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve, basename } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes(name);
const input = argv.find((a) => !a.startsWith('--') && !['--out', '--title', '--pdf', '--lang'].includes(argv[argv.indexOf(a) - 1]));
if (!input) { console.error('Usage: node scripts/render-report.mjs <file.md> [--out file.html] [--title "…"] [--pdf [file.pdf]] [--lang de|en]'); process.exit(2); }
if (!existsSync(input)) { console.error(`not found: ${input}`); process.exit(2); }

const md = readFileSync(input, 'utf8');
const OUT = resolve(opt('--out', input.replace(/\.md$/i, '') + '.html'));
const LANG = opt('--lang', 'de');

// ---------- inline ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function inline(text) {
  // protect code spans first, then apply the rest, then restore
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => { codes.push(`<code>${c}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  // links: scheme allowlist — a deliverable must never carry a javascript:/data: URI, however it got into the Markdown
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
    const safe = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(href) ? href : '#';
    return `<a href="${safe}" rel="noopener noreferrer">${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
  return s;
}

// ---------- blocks ----------
const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9äöüß\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
export function render(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let i = 0;
  let title = null;
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    // fenced code
    let m;
    if ((m = line.match(/^```(\w*)/))) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${m[1] ? ` class="lang-${m[1]}"` : ''}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    // heading
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const level = m[1].length; const text = inline(m[2].trim()); const id = slug(m[2]);
      if (level === 1 && !title) title = m[2].replace(/[*_`]/g, '').trim();
      if (level === 2) toc.push({ id, text });
      out.push(`<h${level} id="${id}">${text}</h${level}>`);
      i++; continue;
    }
    // hr
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    // table
    if (isTableRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      out.push('<table><thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    // blockquote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${render(buf.join('\n')).html}</blockquote>`);
      continue;
    }
    // lists (one nesting level via 2+ leading spaces)
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        const text = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
        // continuation lines (indented, not a new item, not blank)
        let body = text; i++;
        while (i < lines.length && lines[i].trim() && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && /^\s{2,}/.test(lines[i])) body += ' ' + lines[i++].trim();
        const checkbox = body.match(/^\[( |x|X)\]\s+(.*)$/);
        const html = checkbox ? `<span class="box">${checkbox[1].trim() ? '☑' : '☐'}</span> ${inline(checkbox[2])}` : inline(body);
        if (indent >= 2 && items.length) (items[items.length - 1].children ||= []).push(html);
        else items.push({ html });
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((it) => `<li>${it.html}${it.children ? `<ul>${it.children.map((c) => `<li>${c}</li>`).join('')}</ul>` : ''}</li>`).join('') + `</${tag}>`);
      continue;
    }
    // paragraph (until blank line or block start)
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s+|\s*(-{3,}|\*{3,})\s*$)/.test(lines[i]) && !(isTableRow(lines[i]) && isSep(lines[i + 1] || ''))) buf.push(lines[i++]);
    if (buf.length) out.push(`<p>${buf.map((l) => inline(l)).join('<br>')}</p>`);
    else i++;
  }
  return { html: out.join('\n'), title, toc };
}

const { html, title: h1, toc } = render(md);
const TITLE = opt('--title', h1 || basename(input, '.md'));
const stamp = new Date().toISOString().slice(0, 10);

const CSS = `
:root{--ink:#1a1a1a;--muted:#5f6368;--line:#d9d9d9;--bg:#fff;--soft:#f4f4f2;--accent:#0b57d0}
@media (prefers-color-scheme:dark){:root{--ink:#e8e8e6;--muted:#a0a39e;--line:#3a3a3a;--bg:#161616;--soft:#222}}
*{box-sizing:border-box}html{font-size:16px}
body{margin:0;background:var(--bg);color:var(--ink);font:1rem/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
main{max-width:52rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
h1{font-size:1.9rem;line-height:1.2;margin:0 0 .25rem}h2{font-size:1.4rem;margin:2.2rem 0 .6rem;padding-top:.6rem;border-top:1px solid var(--line)}
h3{font-size:1.12rem;margin:1.6rem 0 .4rem}h4{font-size:1rem;margin:1.2rem 0 .3rem}
p{margin:.5rem 0}a{color:var(--accent)}code{font:.9em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--soft);padding:.05em .3em;border-radius:3px}
pre{background:var(--soft);padding:.8rem 1rem;overflow:auto;border-radius:6px;font-size:.85rem;line-height:1.45}pre code{background:none;padding:0}
blockquote{margin:1rem 0;padding:.6rem 1rem;border-left:4px solid var(--accent);background:var(--soft)}
table{border-collapse:collapse;width:100%;margin:.8rem 0;font-size:.92rem}th,td{border:1px solid var(--line);padding:.4rem .55rem;vertical-align:top;text-align:left}th{background:var(--soft)}
ul,ol{padding-left:1.4rem}li{margin:.2rem 0}.box{font-size:1.05em}hr{border:0;border-top:1px solid var(--line);margin:1.8rem 0}
.meta{color:var(--muted);font-size:.9rem;margin-bottom:1.6rem}
nav.toc{background:var(--soft);padding:.8rem 1rem;border-radius:6px;font-size:.92rem;margin:1.2rem 0 2rem}nav.toc ol{margin:0;padding-left:1.2rem}
@media print{html{font-size:11pt}main{max-width:none;padding:0}h2{break-after:avoid}h3,h4{break-after:avoid}table,blockquote,pre{break-inside:avoid}tr{break-inside:avoid}a{color:inherit;text-decoration:none}nav.toc{display:none}@page{margin:18mm 16mm}}
`;

const doc = `<!doctype html>
<html lang="${LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${esc(TITLE)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${toc.length > 2 ? `<nav class="toc" aria-label="Inhalt"><ol>${toc.map((t) => `<li><a href="#${t.id}">${t.text}</a></li>`).join('')}</ol></nav>` : ''}
${html}
<p class="meta">${LANG === 'en' ? 'Rendered' : 'Erstellt'} ${stamp} · dsgvo-audit</p>
</main>
</body>
</html>
`;
writeFileSync(OUT, doc);
console.log(`HTML: ${OUT}`);

// ---------- optional PDF ----------
if (flag('--pdf')) {
  const pdfPath = resolve(opt('--pdf', OUT.replace(/\.html$/i, '.pdf')));
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    try {
      const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
      ({ chromium } = await import(pathToFileURL(`${globalRoot}/playwright/index.mjs`).href));
    } catch { console.error('PDF: playwright not found (npm i -D playwright && npx playwright install chromium). HTML was written.'); process.exit(4); }
  }
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(pathToFileURL(OUT).href, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' } });
    await browser.close();
    console.log(`PDF: ${pdfPath}`);
  } catch (e) { console.error(`PDF failed: ${e.message}. HTML was written.`); process.exit(4); }
}
