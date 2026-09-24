// signatures.mjs — one list of third-party origins, shared by the runtime scanner (scan-origins.mjs),
// the static linter (lint-origins.mjs), the HAR parser (parse-har.mjs) and the GTM parser (parse-gtm.mjs).
// Labelling only: anything that does not match is still reported as a foreign origin, never dropped.
//
// kind: tracking · asset · embed · captcha · monitoring · cmp · payment · booking · unknown
// The static linter treats asset/tracking/captcha/embed/booking matches in source as "loads before consent
// unless gated" — the verdict for each service lives in references/services.md, not here.

export const SIGNATURES = [
  [/googletagmanager\.com/i, 'Google Tag Manager', 'tracking'],
  [/google-analytics\.com|analytics\.google\.com|\/g\/collect|\/collect\?v=2/i, 'Google Analytics', 'tracking'],
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/i, 'Google Fonts', 'asset'],
  [/maps\.googleapis\.com|maps\.gstatic\.com|google\.[a-z.]+\/maps/i, 'Google Maps', 'embed'],
  [/recaptcha|gstatic\.com\/recaptcha/i, 'Google reCAPTCHA', 'captcha'],
  [/doubleclick\.net|googleadservices|googlesyndication|google\.[a-z.]+\/pagead/i, 'Google Ads', 'tracking'],
  [/facebook\.net|facebook\.com\/tr|connect\.facebook/i, 'Meta Pixel / SDK', 'tracking'],
  [/instagram\.com|cdninstagram/i, 'Instagram', 'embed'],
  [/youtube-nocookie\.com/i, 'YouTube (nocookie)', 'embed'],
  [/youtube\.com|ytimg\.com/i, 'YouTube', 'embed'],
  [/vimeo\.com|vimeocdn/i, 'Vimeo', 'embed'],
  [/hotjar/i, 'Hotjar', 'tracking'],
  [/clarity\.ms/i, 'Microsoft Clarity', 'tracking'],
  [/linkedin\.com|licdn\.com/i, 'LinkedIn', 'tracking'],
  [/tiktok/i, 'TikTok', 'tracking'],
  [/calendly\.com/i, 'Calendly', 'booking'],
  [/doctolib\.(de|fr|it)/i, 'Doctolib', 'booking'],
  [/jameda\.de/i, 'jameda', 'booking'],
  [/samedi\.de/i, 'samedi', 'booking'],
  [/cal\.com/i, 'Cal.com (cloud)', 'booking'],
  [/typekit\.net|use\.typekit/i, 'Adobe Fonts', 'asset'],
  [/cdnjs\.cloudflare\.com|jsdelivr\.net|unpkg\.com/i, 'Public CDN', 'asset'],
  [/kit\.fontawesome|use\.fontawesome/i, 'Font Awesome CDN', 'asset'],
  [/challenges\.cloudflare\.com/i, 'Cloudflare Turnstile', 'captcha'],
  [/hcaptcha\.com/i, 'hCaptcha', 'captcha'],
  [/friendlycaptcha/i, 'Friendly Captcha', 'captcha'],
  [/sentry\.io|ingest\.[a-z.]*sentry/i, 'Sentry', 'monitoring'],
  [/posthog/i, 'PostHog', 'tracking'],
  [/plausible\.io/i, 'Plausible', 'tracking'],
  [/_vercel\/insights|vercel-insights|vitals\.vercel/i, 'Vercel Web Analytics', 'tracking'],
  [/_vercel\/speed-insights/i, 'Vercel Speed Insights', 'tracking'],
  [/usercentrics|cookiebot|consentmanager|cookiefirst|iubenda|klaro|onetrust|borlabs/i, 'CMP', 'cmp'],
  [/js\.stripe\.com|m\.stripe\.(com|network)/i, 'Stripe.js', 'payment'],
  [/paypal\.com|paypalobjects/i, 'PayPal', 'payment'],
  [/intercom|crisp\.chat|tawk\.to|hubspot|hs-scripts/i, 'Chat/CRM widget', 'tracking'],
  [/tile\.openstreetmap|openstreetmap\.org/i, 'OpenStreetMap tiles', 'embed'],
  [/trustpilot|provenexpert|google\.com\/reviews/i, 'Review widget', 'embed'],
  [/matomo|piwik/i, 'Matomo', 'tracking'],
  [/formspree\.io|tally\.so|typeform\.com|docs\.google\.com\/forms/i, 'Hosted form service', 'embed'],
];

export function label(url) {
  for (const [re, name, kind] of SIGNATURES) if (re.test(url)) return { name, kind };
  return { name: 'unknown', kind: 'unknown' };
}

const MULTI_TLD = new Set(['co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'co.nz', 'co.jp', 'com.br', 'com.tr', 'co.za', 'com.mx']);
export function registrable(host) {
  const p = host.toLowerCase().split('.');
  if (p.length >= 3 && MULTI_TLD.has(p.slice(-2).join('.'))) return p.slice(-3).join('.');
  return p.slice(-2).join('.');
}

// Same shape the scanner's snapshot() produces, so HAR and scanner results can be read by the same code.
export function summarizeRequests(reqs, pageReg) {
  const byOrigin = new Map();
  for (const r of reqs) {
    let host;
    try { host = new URL(r.url).hostname; } catch { continue; }
    if (registrable(host) === pageReg) continue;
    const l = label(r.url);
    const e = byOrigin.get(host) || { origin: host, count: 0, types: new Set(), service: l.name, kind: l.kind, sample: r.url, setCookie: false };
    e.count++; e.types.add(r.type); if (r.setCookie) e.setCookie = true;
    byOrigin.set(host, e);
  }
  return [...byOrigin.values()].map((e) => ({ ...e, types: [...e.types] })).sort((a, b) => b.count - a.count);
}

// Response headers the checklist (section 10) asks for. Missing ones are 🟡, never 🔴 — they are Art. 32
// hygiene, not a consent violation.
export const SECURITY_HEADERS = [
  ['strict-transport-security', 'HSTS fehlt (HTTPS nicht erzwungen)'],
  ['content-security-policy', 'CSP fehlt (mind. font-src \'self\' empfohlen)'],
  ['referrer-policy', 'Referrer-Policy fehlt (strict-origin-when-cross-origin o. strenger)'],
  ['x-content-type-options', 'X-Content-Type-Options fehlt (nosniff)'],
];

export function checkHeaders(headers, isHttps) {
  const h = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const findings = [];
  for (const [name, msg] of SECURITY_HEADERS) {
    if (name === 'strict-transport-security' && !isHttps) continue;
    if (!h[name]) findings.push(msg);
  }
  const rp = h['referrer-policy'];
  if (rp && /unsafe-url|no-referrer-when-downgrade|^origin$/i.test(rp)) findings.push(`Referrer-Policy "${rp}" gibt die volle URL an Dritte weiter`);
  return { present: Object.fromEntries(SECURITY_HEADERS.map(([n]) => [n, h[n] || null])), findings };
}

// Session-type cookies without httpOnly/secure/sameSite (checklist 10). Only first-party cookies —
// third-party ones are a consent question, not an attribute question.
export function checkCookieAttributes(cookies, isHttps) {
  const issues = [];
  for (const c of cookies || []) {
    if (c.thirdParty) continue;
    const missing = [];
    if (isHttps && !c.secure) missing.push('secure');
    if (!c.sameSite || /none/i.test(c.sameSite)) missing.push('sameSite');
    if (/sess|sid|auth|token|csrf|xsrf|login/i.test(c.name) && !c.httpOnly) missing.push('httpOnly');
    if (missing.length) issues.push(`${c.name}@${c.domain}: ${missing.join(', ')} fehlt`);
  }
  return issues;
}
