// processors.mjs — role and contract per detected service, for report section 5 and the AVV check.
//
// Keyed by the names signatures.mjs gives (scanner, HAR, linter origins) plus the dependency names and
// server-side hits of lint-origins.mjs. The verdict per service lives in references/services.md; this
// table only answers "which contract, where, what to file". It is deliberately generic — contract
// titles, DPF listing and sub-processor lists change, so every row is a pointer to verify, not a fact
// to copy into a client document unchecked.
//
// name:  display name when the matched key is a package or a lower-case hit ("@sentry/nextjs" → Sentry)
// role:  AV       = Auftragsverarbeiter, Art. 28 → AVV/DPA before go-live
//        Art. 26  = joint controllership → Vereinbarung nach Art. 26
//        eigener  = independent controller → name as Empfänger in the DSE, no AVV
//        vermeiden = no workable contract; self-host or replace
//        Library  = code dependency, not a recipient — find the actual host/provider behind it
//        klären   = depends on the provider or product; ask

export const PROCESSORS = [
  // Assets — no contract that makes vendor loading work; the answer is self-hosting
  { match: /^Google Fonts$/, role: 'vermeiden', region: 'US (Google)', contract: '— kein AVV; self-hosten', transfer: '—' },
  { match: /^Adobe Fonts$/, role: 'vermeiden', region: 'US (Adobe)', contract: '— self-hosten oder andere Schrift', transfer: '—' },
  { match: /^Public CDN$|^Font Awesome CDN$/, role: 'vermeiden', region: 'US/global', contract: '— kein AVV angeboten; per npm bundeln', transfer: '—' },
  { name: 'Fontsource (self-hosted)', match: /^@fontsource\//, role: 'Library', region: 'eigener Server', contract: '— self-hosted, kein Empfänger', transfer: '—' },

  // Google
  { match: /^Google Tag Manager$/, role: 'AV', region: 'US/IE (Google)', contract: 'Google Ads Data Processing Terms', transfer: 'DPF (Google LLC) prüfen' },
  { name: 'Google Analytics', match: /^Google Analytics$|^Google tag \(gtag\.js\)$|^Google Tag \(GA4\/Ads\)$|^GA4 (Configuration|Event)$|^react-ga4$|^react-gtm-module$|^@next\/third-parties$/, role: 'AV', region: 'US/IE (Google)', contract: 'Google Ads Data Processing Terms', transfer: 'DPF (Google LLC) prüfen' },
  { match: /^Google Ads( Conversion| Remarketing)?$|^Conversion Linker$|^Floodlight/, role: 'eigener', region: 'US/IE (Google)', contract: 'Controller-Bedingungen von Google (kein AVV)', transfer: 'DPF (Google LLC) prüfen' },
  { match: /^Google Maps$|^YouTube( \(nocookie\))?$|^Google reCAPTCHA$|^react-google-recaptcha$/, role: 'eigener', region: 'US/IE (Google)', contract: 'kein AVV angeboten; Einbindung ggf. Art. 26 (EuGH C-40/17)', transfer: 'DPF (Google LLC) prüfen' },
  { name: 'Firebase', match: /^firebase$/, role: 'AV', region: 'US-Konzern, Region wählbar', contract: 'Firebase/Google Cloud Data Processing Terms', transfer: 'EU-Region + DPF/SCC' },
  { name: 'Google Gemini API', match: /^@google\/generative-ai$|^generativelanguage$/, role: 'AV', region: 'US (Google)', contract: 'Gemini API — nur bezahlte Stufe mit Data Processing Terms; Training ausschließen', transfer: 'DPF/SCC prüfen' },

  // Social / ads pixels
  { match: /^Meta Pixel( \/ SDK)?$|^Instagram$/, role: 'Art. 26', region: 'US/IE (Meta)', contract: 'Vereinbarung nach Art. 26 (von Meta bereitgestellt) + Consent', transfer: 'DPF (Meta Platforms) prüfen' },
  { match: /^LinkedIn( Insight)?$|^TikTok$/, role: 'Art. 26', region: 'US/IE', contract: 'Vereinbarung nach Art. 26 beim Anbieter prüfen + Consent', transfer: 'DPF/SCC prüfen' },

  // Analytics / monitoring
  { match: /^Hotjar$/, role: 'AV', region: 'EU (MT), Unterauftragsverarbeiter prüfen', contract: 'DPA in den Nutzungsbedingungen', transfer: 'Drittland-Unterauftragsverarbeiter prüfen' },
  { name: 'Microsoft Clarity', match: /^Microsoft Clarity$|^@microsoft\/clarity$/, role: 'klären', region: 'US (Microsoft)', contract: 'Rolle laut Clarity-Bedingungen prüfen', transfer: 'DPF (Microsoft) prüfen' },
  { name: 'PostHog', match: /^PostHog$|^posthog-js$/, role: 'AV', region: 'EU-Cloud oder US — Instanz prüfen', contract: 'DPA', transfer: 'EU-Cloud: keiner; US: DPF/SCC' },
  { name: 'Mixpanel', match: /^mixpanel-browser$/, role: 'AV', region: 'US, EU-Residency wählbar', contract: 'DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'Segment', match: /^@segment\//, role: 'AV', region: 'US (Twilio)', contract: 'DPA', transfer: 'DPF/SCC prüfen' },
  { match: /^Plausible$/, role: 'AV', region: 'EU', contract: 'DPA', transfer: '—' },
  { match: /^Matomo$/, role: 'klären', region: 'self-hosted: eigener Server; Cloud: InnoCraft (NZ)', contract: 'self-hosted: kein Empfänger; Cloud: AVV', transfer: 'NZ: Angemessenheitsbeschluss' },
  { name: 'Vercel Web Analytics / Speed Insights', match: /^Vercel (Web Analytics|Speed Insights)$|^@vercel\/(analytics|speed-insights)$/, role: 'AV', region: 'US-Konzern', contract: 'Vercel DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'Sentry', match: /^Sentry$|^@sentry\//, role: 'AV', region: 'US oder EU-Region (DSN prüfen)', contract: 'Sentry DPA', transfer: 'EU-Region; sonst DPF/SCC' },

  // Captcha
  { name: 'Cloudflare Turnstile', match: /^Cloudflare Turnstile$|^@marsidev\/react-turnstile$/, role: 'AV', region: 'US-Konzern', contract: 'Cloudflare DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'hCaptcha', match: /^hCaptcha$|^@hcaptcha\//, role: 'klären', region: 'US', contract: 'Rolle/DPA beim Anbieter prüfen', transfer: 'DPF/SCC prüfen' },
  { match: /^Friendly Captcha$/, role: 'AV', region: 'DE/EU', contract: 'AVV', transfer: '—' },

  // Booking, forms, embeds
  { match: /^Calendly$/, role: 'AV', region: 'US', contract: 'DPA', transfer: 'DPF/SCC prüfen; Art. 9 → Regel 4' },
  { name: 'Cal.com', match: /^Cal\.com \(cloud\)$|^@calcom\//, role: 'AV', region: 'US (Cloud) / eigener Server (self-hosted)', contract: 'DPA (Cloud)', transfer: 'Cloud: DPF/SCC prüfen' },
  { match: /^Doctolib$/, role: 'AV', region: 'EU (FR/DE)', contract: 'AVV von Doctolib für die Termin-/Patientenverwaltung der Praxis; für das Patientenkonto ist Doctolib eigener Verantwortlicher (in DSE nennen)', transfer: '—' },
  { match: /^jameda$|^samedi$/, role: 'klären', region: 'DE', contract: 'Rolle (Verantwortlicher vs. AV) beim Anbieter nachlesen', transfer: '—' },
  { match: /^Hosted form service$/, role: 'AV', region: 'anbieterabhängig (Formspree/Google Forms US; Tally BE; Typeform ES)', contract: 'DPA', transfer: 'US: DPF/SCC; Art. 9 → Regel 4' },
  { match: /^Vimeo$/, role: 'eigener', region: 'US', contract: 'kein AVV für Embeds; Zwei-Klick', transfer: 'DPF/SCC prüfen' },
  { match: /^OpenStreetMap tiles$/, role: 'eigener', region: 'UK (OSMF)', contract: 'kein AVV; Tiles selbst hosten', transfer: 'UK: Angemessenheitsbeschluss' },
  { match: /^Review widget$/, role: 'klären', region: 'anbieterabhängig', contract: 'serverseitig cachen → kein Empfänger im Browser', transfer: 'anbieterabhängig' },
  { name: 'Chat-/CRM-Widget (HubSpot u. a.)', match: /^Chat\/CRM widget$|^@hubspot\/|^hubspot$/, role: 'AV', region: 'anbieterabhängig (HubSpot/Intercom US, Crisp FR)', contract: 'DPA', transfer: 'US: DPF/SCC' },

  // CMP, payment
  { name: 'Consent-Management-Plattform', match: /^CMP$/, role: 'AV', region: 'anbieterabhängig (Usercentrics/Cookiebot EU)', contract: 'AVV mit dem CMP-Anbieter', transfer: 'bei EU-Anbieter keiner' },
  { name: 'Stripe', match: /^Stripe\.js$|^@stripe\/|^stripe$/, role: 'eigener', region: 'IE/US (Stripe)', contract: 'Zahlungsabwicklung: eigener Verantwortlicher; Stripe DPA für AV-Anteile', transfer: 'DPF/SCC prüfen' },
  { name: 'PayPal', match: /^PayPal$|^@paypal\/|^paypal$/, role: 'eigener', region: 'LU (PayPal Europe)', contract: 'eigener Verantwortlicher — in DSE als Empfänger', transfer: 'Konzern-Transfers laut PayPal-DSE' },
  { name: 'Mollie', match: /^mollie$/, role: 'eigener', region: 'NL', contract: 'eigener Verantwortlicher (Zahlungsdienst)', transfer: '—' },

  // Server side: mail, DB, AI, automation
  { name: 'Resend', match: /^resend$/, role: 'AV', region: 'US, EU-Region wählbar', contract: 'Resend DPA', transfer: 'EU-Region; sonst DPF/SCC' },
  { name: 'Twilio / SendGrid', match: /^@sendgrid\/|^sendgrid$|^twilio$/, role: 'AV', region: 'US (Twilio)', contract: 'DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'Postmark', match: /^postmark$/, role: 'AV', region: 'US', contract: 'DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'Mailgun', match: /^mailgun$/, role: 'AV', region: 'US oder EU-Region', contract: 'DPA', transfer: 'EU-Region; sonst DPF/SCC' },
  { name: 'Brevo', match: /^brevo$/, role: 'AV', region: 'FR', contract: 'AVV', transfer: '—' },
  { name: 'Supabase', match: /^@supabase\/|^supabase$/, role: 'AV', region: 'US-Konzern, Projekt-Region wählbar', contract: 'Supabase DPA', transfer: 'EU-Region + DPF/SCC' },
  { name: 'OpenAI API', match: /^openai$/, role: 'AV', region: 'US, EU-Residency wählbar', contract: 'OpenAI DPA; API-Daten ohne Training (Bedingungen prüfen)', transfer: 'DPF/SCC prüfen' },
  { name: 'Anthropic API', match: /^@anthropic-ai\/sdk$|^anthropic$/, role: 'AV', region: 'US', contract: 'DPA über die kommerziellen Bedingungen', transfer: 'DPF/SCC prüfen' },
  { name: 'Mistral AI', match: /^mistral$/, role: 'AV', region: 'FR/EU', contract: 'DPA', transfer: '—' },
  { name: 'Groq / Replicate', match: /^groq$|^replicate$/, role: 'AV', region: 'US', contract: 'DPA beim Anbieter prüfen', transfer: 'DPF/SCC prüfen' },
  { name: 'Vercel AI SDK', match: /^@ai-sdk\//, role: 'Library', region: '—', contract: 'Library — tatsächlichen Modellanbieter ermitteln', transfer: '—' },
  { name: 'Pipedrive', match: /^pipedrive$/, role: 'AV', region: 'anbieterabhängig', contract: 'DPA', transfer: 'prüfen' },
  { name: 'Zapier', match: /^zapier$/, role: 'AV', region: 'US', contract: 'DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'Make', match: /^make\.com$/, role: 'AV', region: 'EU (CZ)', contract: 'DPA', transfer: '—' },
  { name: 'Slack', match: /^slack\.com\/api$|^hooks\.slack\.com$/, role: 'AV', region: 'US (Salesforce)', contract: 'DPA', transfer: 'DPF/SCC prüfen' },
  { name: 'Discord-Webhook', match: /^discord\.com\/api\/webhooks$/, role: 'klären', region: 'US (Discord)', contract: 'für Kundendaten ungeeignet — Rolle/DPA prüfen oder ersetzen', transfer: 'DPF/SCC prüfen' },
  { name: 'Webhook', match: /^webhook$/, role: 'klären', region: '—', contract: 'Empfänger des Webhooks ermitteln', transfer: '—' },

  // Libraries that are not recipients themselves
  { name: 'ORM (Prisma/Drizzle/Mongoose)', match: /^@prisma\/client$|^prisma$|^drizzle(-orm)?$|^mongoose$/, role: 'Library', region: '—', contract: 'Library — Datenbank-Hoster ermitteln (AV)', transfer: '—' },
  { name: 'Nodemailer', match: /^nodemailer$/, role: 'Library', region: '—', contract: 'Library — SMTP-Anbieter ermitteln (AV)', transfer: '—' },
  { name: 'Auth.js / NextAuth', match: /^next-auth$|^@auth\//, role: 'Library', region: '—', contract: 'Library — OAuth-Anbieter sind eigene Verantwortliche', transfer: '—' },
];

// Case-insensitive: the linter lower-cases server-side hits ("sentry"), signatures use display names ("Sentry").
export function lookup(name) {
  return PROCESSORS.find((p) => new RegExp(p.match.source, 'i').test(name)) || null;
}
