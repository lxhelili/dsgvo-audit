# Drittanbieter — Bewertung

> Implementierungsmuster (Gating, Self-Hosting, Region-Pinning, Header) stehen in `patterns.md`. Hier: pro Dienst das Urteil.
> **Regel bei Unklarheit**: Baut der Browser vor der Einwilligung eine Verbindung zu einem fremden Origin auf, ist es ein Befund — 🔴, wenn nicht-essenziell; 🟡 mit Begründung, wenn § 25 Abs. 2 Nr. 2 TDDDG trägt (CMP, Payment-Iframe im Checkout, eigene Assets über CDN mit AVV).

Spalten: **Consent (§ 25)** = braucht Endgerät-Einwilligung · **Basis** = DSGVO-Grundlage für die Verarbeitung · **Drittland** = Sitz/Verarbeitung · **Urteil** = Status + Empfehlung. (R) = konservative Regel, nicht Gesetz.

## Fonts, Assets, CDN

| Dienst | Consent | Basis | Drittland | Urteil |
|---|---|---|---|---|
| Google Fonts (CDN) | ja | 6(1)(a) | US | 🔴 **Self-hosten.** Consent wäre rechtlich möglich, praktisch unbrauchbar (niemand willigt für eine Schrift ein). LG München I 3 O 17493/20 |
| Adobe Fonts / Typekit | ja | 6(1)(a) | US | 🔴 Self-hosten oder ersetzen (Lizenz prüfen — Adobe Fonts erlaubt Self-Hosting meist nicht → andere Schrift) |
| Font Awesome Kit / cdnjs / jsDelivr / unpkg | ja | 6(1)(a) | US | 🔴 Self-hosten — gleiche Logik wie Google Fonts. `npm i` + bundlen |
| Eigene Assets über CDN (Cloudflare, Bunny, Fastly) | nein, wenn AVV | 6(1)(f) | je nach Anbieter | 🟡 AVV + EU-Region; als Empfänger in DSE nennen. Bunny (SI) 🟢 |

## Analytics & Tracking

| Dienst | Consent | Basis | Drittland | Urteil |
|---|---|---|---|---|
| Google Analytics 4 | **ja** | 6(1)(a) | US (DPF prüfen) | 🟠 Nur nach Consent; Consent Mode v2 korrekt verdrahtet; AVV (Google Ads Data Processing Terms) + DPF-Status; Datenaufbewahrung minimal; Server-Side-Tagging über EU-Endpoint prüfen. Kein „IP-Anonymisierung“-Schalter mehr — GA4 speichert IPs nicht, das ist aber keine Rechtsgrundlage. Alternative bevorzugen |
| Google Tag Manager | **ja** (lädt Drittcode) | 6(1)(a) | US | 🟠 GTM selbst ist „neutral“, aber Container-Load = Endgerätzugriff → nach Consent. **Container-Export anfordern** — sonst ⚪️ für alle Tags darin |
| Meta Pixel / CAPI | **ja** | 6(1)(a) + Art. 26 | US | 🔴 Gemeinsame Verantwortlichkeit, Vereinbarung nötig; hohes Risiko. CAPI (serverseitig) braucht **genauso** Consent |
| LinkedIn Insight / TikTok Pixel | **ja** | 6(1)(a) | US | 🔴 wie Meta |
| Hotjar / MS Clarity / FullStory | **ja** | 6(1)(a) | US/IL | 🔴 Session-Recording = hohes Risiko, DSFA-Kandidat, PII-Masking Pflicht |
| PostHog (EU Cloud) / Mixpanel | ja (Cookies/IDs) | 6(1)(a) | EU / US | 🟠 EU-Cloud + AVV; cookieless-Modus reduziert auf 🟡 |
| Matomo self-hosted (ohne Cookie, IP gekürzt) | **nein** möglich | 6(1)(f) | DE | 🟢 **Empfehlung für Kundenprojekte** |
| Plausible (EU) / Umami self-hosted / Pirsch (DE) | i. d. R. nein | 6(1)(f) | EU/DE | 🟢 cookiefrei, AVV verfügbar — Abwägung dokumentieren, in DSE nennen |
| Vercel Web Analytics / Speed Insights | § 25 nicht einschlägig (kein Cookie/Storage; serverseitiger Tages-Hash aus IP+UA) | 6(1)(f) | US-Konzern | 🟡 Verarbeitung durch US-Konzern → AVV (Vercel DPA) + DPF/SCC + DSE-Modul. (R) Konservativ: hinter Consent oder EU-Alternative |
| Cloudflare Web Analytics | nein | 6(1)(f) | US-Konzern | 🟡 wie Vercel |

## Captcha & Formulare

| Dienst | Consent | Basis | Drittland | Urteil |
|---|---|---|---|---|
| Google reCAPTCHA v2/v3 | **ja** | 6(1)(a) — (f) von Behörden verneint | US | 🔴 Ersetzen. Fingerprinting + Google-Cookies vor jeder Nutzerhandlung |
| Cloudflare Turnstile | streitig — kein Cookie, aber Script + IP an US-Konzern | 6(1)(f) vertretbar | US-Konzern | 🟡 **Nicht „consent-frei per Zauber“**: AVV + DSE-Modul + Transfer benennen. (R) Erst Honeypot + Rate-Limit; Turnstile nur wenn nötig |
| hCaptcha | ja (Cookies) | 6(1)(a) | US | 🟠 Consent oder ersetzen |
| Friendly Captcha (EU-Endpoint) | nein | 6(1)(f) | DE/EU | 🟢 AVV abschließen, DSE-Modul |
| Formspree / Tally / Typeform / Google Forms | — (Formularziel) | 6(1)(b)/(f) | US | 🟠; **🔴 bei Art.-9-Inhalt** (R). Eigenes Backend bevorzugen |
| Calendly | **ja** (Embed) | 6(1)(a)/(b) | US | 🟠; **🔴 bei Heilberufen** (R) — Art. 9 im Terminbetreff. Alternative: Cal.com self-hosted / EU-Buchungstool |
| Doctolib (Widget/Link) | Widget: **ja** (lädt Script + iframe von doctolib.de); reiner Link: nein | 6(1)(b), Art. 9(2)(h) für die Behandlungsdaten | FR/DE (EU-Hosting, Doctolib GmbH Berlin) | 🟡 Als **Link/Button** einbinden, nicht als vorgeladenes Widget — dann kein Endgerätzugriff vor Klick. **Doppelrolle:** Für die Termin- und Patientenverwaltung der Praxis ist Doctolib **Auftragsverarbeiter** → AVV abschließen (Doctolib stellt einen bereit); für das Patientenkonto beim Anbieter ist Doctolib **eigener Verantwortlicher** → in der DSE als Empfänger mit Verweis auf dessen DSE nennen. Für Heilberufe die EU-Alternative zu Calendly |
| jameda / samedi / Timify (Terminbuchung) | Widget: ja; Link: nein | 6(1)(b), Art. 9 | DE/EU | 🟡 wie Doctolib: Link statt Widget; Rollenverteilung (Verantwortlicher vs. Auftragsverarbeiter) beim Anbieter nachlesen und in der DSE so benennen |

## Embeds & Widgets

| Dienst | Consent | Basis | Drittland | Urteil |
|---|---|---|---|---|
| Google Maps (Embed/JS) | **ja** | 6(1)(a) | US | 🟠 Zwei-Klick / Platzhalter. Alternative: statisches Bild + Link, OpenStreetMap mit **selbst gehosteten** Tiles (tile.openstreetmap.org ist auch ein Drittanbieter) |
| YouTube Embed | **ja** | 6(1)(a) | US | 🟠 `youtube-nocookie.com` **plus** Zwei-Klick-Platzhalter (nocookie allein lädt trotzdem von Google) |
| Vimeo | ja | 6(1)(a) | US | 🟠 Zwei-Klick; `dnt=1` |
| Instagram / Facebook Feed / TikTok Embed | **ja** | 6(1)(a) | US | 🟠 Zwei-Klick oder Screenshots + Link |
| Google Reviews / Trustpilot / ProvenExpert Widget | ja | 6(1)(a) | US/DK/DE | 🟡 Serverseitig cachen und als eigenes HTML ausliefern → dann kein Endgerätzugriff |
| Chat-Widgets (Intercom, Crisp, Tawk, HubSpot) | **ja** | 6(1)(a) | US/FR | 🟠 Erst nach Klick laden; WhatsApp-Link (kein Widget) ist unproblematisch |

## Hosting, Backend, Infrastruktur

| Dienst | Consent | Basis | Drittland | Urteil |
|---|---|---|---|---|
| Hetzner / IONOS / Strato / Keyweb / netcup | — | 6(1)(f) | DE | 🟢 AVV abschließen (Standard-AVV im Kundencenter) |
| Vercel / Netlify / Cloudflare Pages | — | 6(1)(f) | US-Konzern, EU-Region wählbar | 🟡 DPA abschließen, Region pinnen (`fra1`), Log-Retention + Log-Drains prüfen; Edge/Middleware läuft global — in DSE benennen |
| Supabase | — | 6(1)(b)/(f) | EU-Region wählbar | 🟡 EU-Region + DPA; RLS zwingend; `auth`-Logs (IP) benennen; Storage-Buckets nicht public |
| Firebase (Auth/Firestore/Hosting) | — (Analytics: ja) | 6(1)(b)/(f) | Google/US; EU-Region für Firestore wählbar | 🟠 Firebase Analytics **deaktivieren** oder Consent; DPA (Google Cloud); Auth-Daten gehen an Google → DSE |
| Neon / PlanetScale / Turso | — | 6(1)(b)/(f) | EU-Region wählbar | 🟡 EU-Region + DPA |
| Sentry | — (Replay: ja) | 6(1)(f) | EU-Region verfügbar | 🟡 EU-DSN, `sendDefaultPii: false`, Scrubbing, Session Replay nur mit Consent |
| Resend / Postmark / SendGrid / SES | — | 6(1)(b)/(f) | US, EU-Region teils | 🟡 DPA; EU-Region wo verfügbar; **Open-/Click-Tracking aus**; Inhalte minimieren (keine Art.-9-Daten in Mails an US-Mailer) |
| Brevo (FR) / CleverReach / Rapidmail (DE) | Newsletter: 6(1)(a) | — | EU/DE | 🟢 AVV + DOI |
| Mailchimp | Newsletter: 6(1)(a) | — | US | 🟠 Alternative EU-Anbieter |
| Stripe / PayPal / Mollie | — | 6(1)(b) | US / NL | 🟡 Zahlungsteil eigenverantwortlich (Stripe/PayPal als eigene Verantwortliche); Stripe.js erst auf Checkout laden; nennen |
| Cloudflare (Proxy/WAF/DNS) | — | 6(1)(f) | US-Konzern | 🟡 DPA + EU-Region; als Empfänger nennen |
| Zapier / Make / n8n Cloud | — | folgt dem Zweck | US / EU | 🟠 Zusätzlicher Auftragsverarbeiter mit Transfer — DPA oder n8n self-hosted |
| CRM (HubSpot, Pipedrive, eigenes) | Widget: ja; Sync: — | 6(1)(b)/(f) | US / EE / — | 🟡 DPA, Region, Löschkonzept; Marketing-Automation nur mit Einwilligung |
| **Microsoft 365 / Google Workspace** (Postfach, in das Formulare und Kontakt-Mails laufen) | — | 6(1)(b)/(f) | US-Konzern; EU-Datenresidenz wählbar (M365 EU Data Boundary, Workspace Data Regions) | 🟡 Der meistübersehene Auftragsverarbeiter: jede Formularanfrage endet hier. DPA (Microsoft DPA / Google Workspace DPA) + DPF-Status der Entität + EU-Region; als Empfänger in DSE nennen (Modul Kontaktaufnahme/Hosting); Löschkonzept fürs Postfach. **Art. 9** (Praxis-Anfragen): (R) nur mit EU-Residenz, § 203-Absicherung im Vertrag, sonst eigenes Mailsystem beim DE-Hoster |
| Social Login (Google, Apple, Microsoft, GitHub) | — | 6(1)(b) | US | 🟡 Scopes minimal; Anbieter als Empfänger + eigenes DSE-Modul; Alternative E-Mail-Login anbieten |

## KI / LLM-APIs (OpenAI, Anthropic, Google Gemini, Mistral, Groq, Azure OpenAI)

Ein LLM-Endpoint, der Nutzereingaben erhält, ist ein **Auftragsverarbeiter** — behandeln wie jeden anderen, plus KI-spezifische Punkte:

| Prüfpunkt | Was gilt |
|---|---|
| Vertrag | DPA/AVV mit dem Anbieter (API-Terms, nicht Consumer-Terms); **kein Training** auf Kundendaten; **Retention** (Zero-Data-Retention wo verfügbar, sonst Frist benennen) |
| Region / Transfer | US-Anbieter → DPF-Status der konkreten Entität prüfen oder SCC; EU-Endpunkte (Azure OpenAI EU, Mistral FR, Anthropic/OpenAI EU-Regionen soweit angeboten) bevorzugen |
| Rechtsgrundlage | 6(1)(b) wenn der Nutzer die KI-Funktion aktiv nutzt (Chat, Assistent); 6(1)(f) für Backend-Triage; 6(1)(a) wenn Eingaben über den Zweck hinaus genutzt werden |
| Art. 9 | Chat- und Formulareingaben mit Gesundheitsbezug → (R) kein US-LLM; Eingabemaske so gestalten, dass Nutzer nicht zu Gesundheitsangaben eingeladen werden |
| Art. 13 | Eigenes DSE-Modul: Anbieter, Zweck, welche Daten (Prompt, Kontext, Metadaten), Speicherdauer, Transfer |
| Art. 22 | Trifft die KI Entscheidungen mit Rechtswirkung (Bewerber-Vorauswahl, Kreditwürdigkeit, Terminvergabe nach Dringlichkeit)? → Art. 22 + menschliche Prüfung + DSE-Angabe zur Logik |
| Art. 50 KI-VO | Chatbot als KI kennzeichnen („Sie chatten mit einem KI-Assistenten“), seit 02.08.2026 Pflicht; KI-generierte Inhalte, die als echt wirken könnten, kennzeichnen |
| Minimierung | Prompt-Scrubbing (E-Mail, Telefon, Namen entfernen, wo nicht nötig); keine Rohdaten aus der DB in den Kontext |
| Logging | Prompt-/Response-Logs beim Anbieter **und** im eigenen Backend → Speicherdauer festlegen, nicht „unbegrenzt“ |
| DSFA | Bei Gesundheitsbezug, Profiling oder großem Umfang: Art. 35 prüfen — „neue Technologie“ ist ein Indiz |

Status-Faustregel: EU-Endpoint + DPA + kein Training + kurze Retention + Kennzeichnung → 🟢. US-Endpoint mit DPF + DPA → 🟡. Ohne DPA oder mit Training → 🔴.
