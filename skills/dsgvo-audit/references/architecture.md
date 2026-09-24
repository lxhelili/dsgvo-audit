# Full-Stack-Datenfluss — Hop für Hop

Eine Website ist keine Seite, sondern eine Pipeline. Jedes personenbezogene Datum wird vom Browser bis zum letzten Empfänger verfolgt. Für **jeden Hop** festhalten: welche Daten · welches System · welche Region · Rechtsgrundlage · Vertrag (AVV / Joint Controller / eigener Verantwortlicher / keiner) · Speicherdauer · wer Zugriff hat.

Ergebnis ist die **Datenfluss-Tabelle** (Berichtsabschnitt 3):

| Datum | Quelle (Hop 0) | Verarbeitung (Hop 1–3) | Empfänger (Hop 4–5) | Region | Rechtsgrundlage | Vertrag | Speicherdauer |
|---|---|---|---|---|---|---|---|
| Name, E-Mail, Nachricht (Kontaktformular) | `/kontakt`, Client-Form | Server Action `sendContact` → Supabase `contact_requests` | Resend (Mail an Inhaber), Sentry (bei Fehler), Vercel Logs | fra1 / eu-central-1 / US (Resend) | 6(1)(b) | AVV Supabase ✅, Resend ⚪️, Sentry ✅ | 6 Monate (Cron) — Logs 30 Tage |

Ein Beispiel wie das zeigt sofort, warum „Kontaktformular“ vier Empfänger hat und warum die DSE alle vier nennen muss.

---

## Hop 0 — Browser

- Fremde Origins **vor** Consent (Scanner), Fonts, Icon-Kits, CDN, CMP-Host, `preconnect`/`dns-prefetch`
- Storage: Cookies (First-/Third-Party, Laufzeit), localStorage, sessionStorage, IndexedDB, Service-Worker-Cache
- Formulare: jedes Feld begründbar (Art. 5(1)(c))? **Hidden Fields** (UTM, `gclid`, Referrer, Fingerprint) = Marketing-Daten, die niemand erwähnt. File-Uploads (Lebenslauf, Befund, Ausweis!) = oft Art. 9 / hohes Risiko
- Client-SDKs mit eigenen Requests: Supabase anon key (direkter DB-Zugriff aus dem Browser → RLS ist die einzige Sicherung), Firebase, Stripe.js, Maps, Chat-Widgets
- Analytics-Events mit Payload: was steckt im Event (`booking_type: "Faltenbehandlung"` → Art. 9 an Google)
- URL-Parameter: Behandlung, Pflegegrad, Name in Query-Strings landen in Server-Logs, Referrern und Analytics

## Hop 1 — Edge / Middleware / CDN

- **Wo läuft es?** Vercel Edge Middleware, Cloudflare Workers, Netlify Edge = weltweit verteilt; `regions` in `vercel.json` gilt nur für Serverless Functions
- Was setzt die Middleware? A/B-Cookies, Geo-Cookies, Redirect-Cookies → § 25 TDDDG (technisch notwendig?)
- Geo-/IP-Header (`x-vercel-ip-country`, `cf-ipcountry`): genutzt? gespeichert?
- Bot-Schutz / WAF (Cloudflare, Vercel Firewall): Fingerprinting? Challenge-Cookies?
- CDN-Logs: Retention, IP-Speicherung, Log-Drains (Datadog, Axiom, Logtail = weiterer Auftragsverarbeiter, oft US)
- Image-Optimization (Vercel/Cloudinary/imgix): nutzergenerierte Bilder mit Metadaten (EXIF-GPS!) → durch Drittanbieter geschleust?

## Hop 2 — API Routes / Server Actions / Serverless

Jeder Handler, der PII entgegennimmt: was speichert er, was leitet er weiter, was **loggt** er?

- `console.log(req.body)` / Logging-Middleware mit Body = PII in Logs (🟠), oft mit Art. 9-Inhalt
- Validierung + Rate-Limit vorhanden (Art. 32)?
- Weiterleitung an Dritte: Mailer, CRM, Slack-Webhook („neue Anfrage von Max M., Pflegegrad 3“ in einen Slack-Kanal = Transfer an Salesforce/US), Zapier/Make, LLM-API
- Fehlerbehandlung: landet der Request-Body in Sentry (`sendDefaultPii`, Breadcrumbs, `extra`)?
- Region: Serverless-Region gepinnt? Cron-Jobs / Background-Functions in derselben Region?
- Auth: Session-Cookies (`httpOnly`, `secure`, `sameSite`), Token-Lebensdauer, Refresh-Token-Speicherung; **Social Login** → Anbieter als Empfänger, Scopes minimal

## Hop 3 — Datenbank / Storage

- Anbieter + Region; Verschlüsselung at rest; Backups (Region! Retention!) — ein EU-Projekt mit Backups in US ist ein Transfer
- Zugriffsschutz: RLS / Row-Level-Policies auf **jeder** PII-Tabelle; `service_role`-Keys nur serverseitig; Admin-Dashboards mit MFA
- Object Storage / Buckets: public? signierte URLs? Uploads mit PII (Bewerbungen, Befunde) verschlüsselt?
- Löschkonzept: Cron/Edge-Function, das Kontaktanfragen nach *X* Monaten löscht — existiert es, oder wächst die Tabelle seit 2023?
- Staging/Preview mit **Prod-Daten**: Art. 5(1)(e)/Art. 32 — Testdaten oder Anonymisierung
- Auth-Tabellen (`auth.users`, Firebase Auth): E-Mail, letzte IP, Login-Zeitpunkte → in DSE nennen

## Hop 4 — Drittanbieter serverseitig (Auftragsverarbeiter & eigene Verantwortliche)

Für jeden: Zweck · Daten · Region · DPA/AVV unterschrieben und **abgelegt** · Unterauftragsverarbeiter-Liste geprüft · DPF-Status oder SCC · Retention beim Anbieter.

- **Transaktions-Mail** (Resend, Postmark, SES, SendGrid): Open-/Click-Tracking aus; Inhalt minimieren (kein Befund in der Bestätigungsmail an einen US-Mailer); EU-Region wo verfügbar
- **LLM-/KI-APIs** (OpenAI, Anthropic, Gemini, Mistral): eigenes Modul in `services.md` — DPA, kein Training, Retention, Region, Art. 22, Art. 50 KI-VO
- **CRM / Buchung / Kalender** (HubSpot, Pipedrive, Cal.com, Calendly, Google Calendar API): was wird synchronisiert, Löschung im CRM?
- **Webhooks / Automatisierung** (Zapier, Make, n8n Cloud): jeder Zwischenschritt ist ein weiterer Auftragsverarbeiter mit eigenem Transfer
- **Payment** (Stripe, PayPal, Mollie): für den Zahlungsvorgang eigene Verantwortliche — trotzdem nennen; Stripe.js erst auf Checkout-Seite
- **Google/Microsoft APIs** (Maps Geocoding serverseitig, Places, Graph, Drive): serverseitig heißt nicht „ohne Transfer“
- **Consent-Protokoll** beim CMP-Anbieter (Usercentrics, Cookiebot): auch das ist Verarbeitung — Retention prüfen

## Hop 5 — Observability, Ops, CI/CD

- **Error-Tracking** (Sentry, Bugsnag): PII-Scrubbing, EU-Region, Session-Replay nur mit Consent, Retention
- **Logs** (Vercel/Netlify/Cloud-Logs, Log-Drains): IP-Retention ≤ 7 Tage oder begründet; keine Bodies; Drain-Ziel = Auftragsverarbeiter
- **Server-Side Analytics** (Plausible, Umami, Matomo): trotzdem IP-Verarbeitung → 6(1)(f) dokumentieren, in DSE nennen
- **CI/CD** (GitHub Actions, GitLab CI, Vercel Build-Logs): Env-Dumps in Build-Logs? Secrets im Repo? `.env` committed?
- **Preview-Deployments**: öffentlich erreichbar? mit Prod-Daten? indexierbar (`robots`, `X-Robots-Tag: noindex`)? Vercel Deployment Protection an?
- **Source Maps** öffentlich ausgeliefert: kein Datenschutzverstoß per se, aber Art. 32 (offenbart interne Endpunkte, Logik) — 🟡 als Sicherheitsbefund
- **Uptime/Monitoring** (Better Stack, UptimeRobot): harmlos, aber als Empfänger nennen, wenn Requests mit Nutzerdaten geprüft werden

## Hop 6 — Menschen & Prozesse

- Wer hat Zugriff (Vercel-Team, Supabase-Dashboard, CMS-Admin, Mail-Postfach mit Kontaktanfragen)? MFA? Offboarding?
- Betroffenenanfragen: wer beantwortet Auskunft (Art. 15) in einem Monat — und kann er die Daten aus allen Hops finden?
- Löschung: greift sie in **allen** Hops (DB, Mailer-Logs, CRM, Sentry, Backups)?
- Datenpanne: 72-h-Prozess (Art. 33) bekannt? Wer meldet?
- VVT (Art. 30) und TOMs (Art. 32) — auch für eine kleine Website: eine Seite reicht, null Seiten nicht

---

## Handler finden — Framework-Hinweise

Generisch: Suche nach dem, was PII entgegennimmt (`req.body`, `formData`, `request.json()`, `$_POST`), und folge den Aufrufen nach außen (`fetch`, SDK-Clients, `send`, `insert`).

| Stack | Wo die Hops liegen |
|---|---|
| Next.js (App Router) | `app/**/route.ts`, `'use server'`-Funktionen, `middleware.ts`, `instrumentation.ts`, `next.config.*` (headers, images.remotePatterns) |
| Next.js (Pages) | `pages/api/**`, `getServerSideProps`, `middleware.ts` |
| Astro | `src/pages/api/**`, `src/middleware.ts`, Actions (`src/actions`), `astro.config.*` (adapter, integrations) |
| Nuxt | `server/api/**`, `server/middleware`, `nuxt.config.*` (modules) |
| SvelteKit | `+server.ts`, `+page.server.ts` (actions), `hooks.server.ts` |
| Angular (SSR) | `server.ts` (Express), sonst kein eigener Server → Backend separat auditieren |
| Remix / React Router | `loader`/`action` in Routes, `entry.server.tsx` |
| WordPress | Plugin-Liste (jedes Plugin = potenzieller Hop), `wp-config.php`, Contact-Form-Plugins (Speichern sie Einsendungen in der DB?) |
| PHP / Laravel | Controller, `routes/web.php`, Mail-Klassen, `config/services.php` |
| Supabase Edge Functions | `supabase/functions/**` — laufen standardmäßig in der **dem Nutzer nächsten** Region, nicht in der Projekt-Region; Region per `x-region`-Header festlegen, sonst als Transfer prüfen |
| Firebase Functions | `functions/**` — Region explizit setzen (`europe-west3`), Default ist `us-central1` |
