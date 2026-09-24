// evidence.mjs — turns the JSON of the four evidence tools into one numbered list (E-01, E-02 …),
// so every finding in the report can point at the observation it rests on.
//
// Inputs are recognised by shape, not by file name:
//   scan  — scan-origins.mjs output (phases, verdict, optional pages)
//   har   — parse-har.mjs output (same shape, source: "har")
//   lint  — lint-origins.mjs output (dependencies, origins, storage, serverSide, config)
//   gtm   — parse-gtm.mjs output (container, tags)
//
// An entry records what a tool saw, never a verdict. Whether a finding built on it is
// "beobachtet", "abgeleitet" or "Mandantenangabe" is decided in the report (SKILL.md, Phase 4).

import { readFileSync } from 'node:fs';

export const SOURCE_LABEL = { scan: 'Runtime-Scan', har: 'HAR (Mandant)', lint: 'Code-Scan', gtm: 'GTM-Export' };

export function detectKind(data) {
  if (data && Array.isArray(data.tags) && 'container' in data) return 'gtm';
  if (data && Array.isArray(data.dependencies) && Array.isArray(data.origins)) return 'lint';
  if (data && data.phases && typeof data.phases === 'object') return data.source === 'har' ? 'har' : 'scan';
  return null;
}

export function loadInput(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const kind = detectKind(data);
  if (!kind) throw new Error(`${file}: not a scan, HAR, lint or GTM result`);
  return { file, kind, data };
}

const pathOf = (url) => { try { const u = new URL(url); return u.pathname + u.search; } catch { return url; } };
const PHASES = ['pre-consent', 'after-reject', 'after-accept'];
const PHASE_LABEL = { 'pre-consent': 'vor Consent', 'after-reject': 'nach Ablehnen', 'after-accept': 'nach Akzeptieren' };

// One page of a scan/HAR result → entries. Later phases only list what is new against pre-consent:
// "Hotjar after accept" is evidence, "GTM still there after accept" is not.
function pageEntries(r, source) {
  const out = [];
  const page = pathOf(r.target);
  const pre = r.phases?.['pre-consent'];
  const seenOrigins = new Set((pre?.thirdPartyOrigins || []).map((o) => o.origin));
  const seenCookies = new Set((pre?.cookies || []).map((c) => `${c.name}@${c.domain}`));
  const seenStorage = new Set([...(pre?.storage?.localStorage || []), ...(pre?.storage?.sessionStorage || [])]);
  for (const phase of PHASES) {
    const p = r.phases?.[phase];
    if (!p || (phase !== 'pre-consent' && !p.clicked && source !== 'har')) continue;
    const isPre = phase === 'pre-consent';
    for (const o of p.thirdPartyOrigins || []) {
      if (!isPre && seenOrigins.has(o.origin)) continue;
      out.push({ source, page, phase, type: 'origin', service: o.service, kind: o.kind, subject: o.origin,
        detail: `${o.origin} ${PHASE_LABEL[phase]} — ${o.count}× [${(o.types || []).join(',')}]${o.setCookie ? ', Set-Cookie' : ''}`, where: o.sample });
    }
    for (const c of p.cookies || []) {
      const key = `${c.name}@${c.domain}`;
      if (!isPre && seenCookies.has(key)) continue;
      out.push({ source, page, phase, type: 'cookie', service: c.thirdParty ? 'Drittanbieter-Cookie' : 'Erstanbieter-Cookie', kind: c.thirdParty ? 'cookie-3p' : 'cookie-1p', subject: key,
        detail: `Cookie ${key} ${PHASE_LABEL[phase]} — Laufzeit ${c.expiresDays === 'session' ? 'Session' : `${c.expiresDays} Tage`}`, where: page });
    }
    for (const area of ['localStorage', 'sessionStorage']) {
      for (const k of p.storage?.[area] || []) {
        if (!isPre && seenStorage.has(k)) continue;
        out.push({ source, page, phase, type: 'storage', service: area, kind: 'storage', subject: `${area}:${k}`,
          detail: `${area}-Schlüssel „${k}“ ${PHASE_LABEL[phase]}`, where: page });
      }
    }
  }
  const v = r.verdict || {};
  if (v.headerFindings?.length) out.push({ source, page, phase: null, type: 'headers', service: 'Security-Header', kind: 'hygiene', subject: 'headers', detail: v.headerFindings.join('; '), where: page });
  if (v.cookieAttributeIssues?.length) out.push({ source, page, phase: null, type: 'cookie-attributes', service: 'Cookie-Attribute', kind: 'hygiene', subject: 'cookie-attributes', detail: v.cookieAttributeIssues.join('; '), where: page });
  if (v.mixedContent?.length) out.push({ source, page, phase: null, type: 'mixed-content', service: 'Mixed Content', kind: 'hygiene', subject: 'mixed-content', detail: `${v.mixedContent.length} http://-Ressource(n), z. B. ${v.mixedContent[0]}`, where: page });
  for (const t of v.thirdPartyFormTargets || []) out.push({ source, page, phase: null, type: 'form-target', service: 'Formularziel', kind: 'form', subject: t, detail: `Formular sendet an ${t}`, where: page });
  if (v.odrLinkStillPresent) out.push({ source, page, phase: null, type: 'odr-link', service: 'OS-Plattform-Link', kind: 'legal', subject: 'odr', detail: 'Link auf ec.europa.eu/consumers/odr vorhanden (Plattform seit 20.07.2025 abgeschaltet)', where: page });
  return out;
}

function scanEntries(data, source) {
  const out = pageEntries(data, source);
  for (const r of Object.values(data.pages || {})) if (r && r.verdict !== null) out.push(...pageEntries(r, source));
  return out;
}

function lintEntries(d) {
  const out = [];
  const source = 'lint';
  for (const dep of d.dependencies || []) out.push({ source, type: 'dependency', service: dep.name, kind: dep.class, subject: dep.name, detail: `Abhängigkeit ${dep.name}@${dep.version} (${dep.class})`, where: dep.file });
  for (const o of d.origins || []) {
    const h = o.hits?.[0] || {};
    const more = (o.hits?.length || 1) - 1;
    out.push({ source, type: 'origin', service: o.service, kind: o.kind, subject: o.origin,
      detail: `${o.origin} im Quellcode${h.loadContext ? ' (Ladekontext)' : ''}${h.gateHintInFile ? ', Consent-Hinweis in der Datei' : ', kein Consent-Gate in der Datei'}${more > 0 ? ` (+${more} weitere Stellen)` : ''}`,
      where: h.file ? `${h.file}:${h.line}` : '' });
  }
  for (const s of d.storage || []) out.push({ source, type: 'storage', service: s.api, kind: 'storage', subject: `${s.api}@${s.file}`, detail: `${s.api}-Zugriff im Code`, where: `${s.file}:${s.line}` });
  const serverSeen = new Set();
  for (const s of d.serverSide || []) {
    if (serverSeen.has(s.hit)) continue; serverSeen.add(s.hit);
    const n = (d.serverSide || []).filter((x) => x.hit === s.hit).length;
    out.push({ source, type: 'server', service: s.hit, kind: 'recipient', subject: s.hit, detail: `serverseitiger Empfänger „${s.hit}“${n > 1 ? ` (${n} Stellen)` : ''}`, where: `${s.file}:${s.line}` });
  }
  for (const r of d.config?.regions || []) if (r.nonEU) out.push({ source, type: 'region', service: 'Function-Region', kind: 'region', subject: r.region, detail: `Region ${r.region} außerhalb der EU`, where: r.file || '' });
  for (const l of d.odrLinks || []) out.push({ source, type: 'odr-link', service: 'OS-Plattform-Link', kind: 'legal', subject: 'odr', detail: 'Link auf ec.europa.eu/consumers/odr im Code', where: l });
  if (d.config?.envKeys?.length) out.push({ source, type: 'env-keys', service: 'Umgebungsvariablen', kind: 'config', subject: 'env', detail: `Schlüsselnamen: ${d.config.envKeys.join(', ')} (Werte nicht gelesen)`, where: '.env*' });
  return out;
}

function gtmEntries(d) {
  return (d.tags || []).filter((t) => !t.paused).map((t) => ({
    source: 'gtm', type: 'gtm-tag', service: t.type, kind: 'tag', subject: t.name, aliases: (t.origins || []).filter((o) => !o.includes('.')),
    detail: `Tag „${t.name}“ (${t.type}) — Trigger: ${(t.firing || []).join(', ') || '—'}; Consent: ${t.consentStatus}${t.origins?.length ? `; Origins: ${t.origins.join(', ')}` : ''}`,
    where: `${d.container} (${d.exportedAt || 'Export'})`,
  }));
}

export function buildEvidence(inputs) {
  const raw = [];
  for (const { kind, data } of inputs) {
    if (kind === 'scan' || kind === 'har') {
      if (data.verdict === null || data.httpStatus === undefined) continue; // failed scan is not evidence
      raw.push(...scanEntries(data, kind));
    } else if (kind === 'lint') raw.push(...lintEntries(data));
    else if (kind === 'gtm') raw.push(...gtmEntries(data));
  }
  const width = String(raw.length).length > 2 ? String(raw.length).length : 2;
  return raw.map((e, i) => ({ id: `E-${String(i + 1).padStart(width, '0')}`, ...e }));
}

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function evidenceMarkdown(entries) {
  const lines = ['| ID | Quelle | Dienst | Beobachtung | Fundstelle |', '|---|---|---|---|---|'];
  for (const e of entries) lines.push(`| ${e.id} | ${SOURCE_LABEL[e.source]}${e.page ? ` \`${cell(e.page)}\`` : ''} | ${cell(e.service)} | ${cell(e.detail)} | ${e.where ? `\`${cell(e.where)}\`` : '—'} |`);
  return lines.join('\n');
}
