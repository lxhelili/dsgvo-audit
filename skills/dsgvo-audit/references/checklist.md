# Prüfkatalog — Website & Web-App Datenschutz (DE)

Jeden Abschnitt durchgehen. Pro Punkt 🔴/🟠/🟡/🟢/⚪️ mit einzeiliger Begründung und Fundstelle (Datei:Zeile oder Scan-Phase). (R) = konservative Regel, im Bericht so kennzeichnen.

## 1. Impressum (§ 5 DDG, ex-§ 5 TMG)
- [ ] Erreichbar von jeder Seite, max. 2 Klicks, als „Impressum“ bezeichnet (nicht in AGB/Kontakt versteckt)
- [ ] Name + Rechtsform + ladungsfähige Anschrift (kein Postfach)
- [ ] Vertretungsberechtigte(r) bei juristischen Personen
- [ ] Telefon + E-Mail (E-Mail Pflicht; reines Kontaktformular reicht nicht)
- [ ] Handelsregister + Registernummer + Registergericht
- [ ] USt-IdNr. (§ 27a UStG) sofern vorhanden
- [ ] Bei Heilberufen/reglementierten Berufen: Kammer, gesetzl. Berufsbezeichnung + Verleihungsstaat, Berufsordnung + Fundstelle/Link
- [ ] Aufsichtsbehörde bei erlaubnispflichtigen Tätigkeiten (z. B. Pflegedienst, Makler § 34c GewO)
- [ ] § 18 Abs. 2 MStV: inhaltlich Verantwortlicher bei journalistisch-redaktionellen Inhalten (Blog!)
- [ ] **Kein** Link mehr auf die OS-Plattform (ec.europa.eu/consumers/odr) — seit 20.07.2025 abgeschaltet; ein Link ist irreführend (§ 5 UWG) → 🟠
- [ ] Hinweis Verbraucherschlichtung (§ 36 VSBG): Teilnahme ja/nein + ggf. Stelle; entfällt bei ≤ 10 Beschäftigten (§ 36 Abs. 3), schadet aber nicht
- [ ] Keine „Haftung für Links“-Textbausteine, die Rechte einschränken sollen (unschädlich, aber Signal für Copy-Paste)
- [ ] Bei mehreren Sprachversionen: Impressum in jeder Sprache erreichbar

## 2. Datenschutzerklärung — Art. 13 Pflichtangaben
- [ ] Von jeder Seite verlinkt, separate URL, ohne Consent erreichbar, Banner verdeckt sie nicht
- [ ] Verantwortlicher inkl. Kontaktdaten (Art. 13(1)(a))
- [ ] DSB-Kontaktdaten, falls bestellt (Art. 13(1)(b))
- [ ] Je Verarbeitung: Zweck **und** Rechtsgrundlage (Art. 13(1)(c)) — nicht pauschal
- [ ] Bei Art. 6(1)(f): das konkrete berechtigte Interesse benannt (Art. 13(1)(d))
- [ ] Empfänger/Kategorien (Art. 13(1)(e)) — **alle Hops** aus der Datenfluss-Tabelle: Hoster, Mailer, DB, CDN, Error-Tracking, KI-API, CRM
- [ ] Drittlandtransfer + Mechanismus + Verweis auf Garantien (Art. 13(1)(f), 44 ff.) — DPF nur mit geprüfter Zertifizierung der Entität
- [ ] Speicherdauer oder Kriterien (Art. 13(2)(a)) — konkret, nicht „solange erforderlich“
- [ ] Betroffenenrechte: Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, **Widerspruch (Art. 21, drucktechnisch hervorgehoben)**
- [ ] Widerrufsrecht für Einwilligungen (Art. 7(3)) mit *wie*
- [ ] Beschwerderecht bei einer Aufsichtsbehörde + zuständige Behörde benannt (Art. 77)
- [ ] Hinweis auf gesetzl./vertragl. Bereitstellungspflicht (Art. 13(2)(e))
- [ ] Automatisierte Entscheidungsfindung/Profiling (Art. 13(2)(f)) — auch bei Scoring/KI-Features
- [ ] Sprache: Deutsch, klar, verständlich (Art. 12(1)) — kein Juristendeutsch-Wall
- [ ] **Sprachversionen**: Site mit Sprachumschalter → DSE in jeder angebotenen Sprache (Art. 12(1)); Deutsch bleibt maßgeblich → sonst 🟠
- [ ] Beschreibt **nur** tatsächlich genutzte Dienste (Abgleich mit Phase-1-Evidenz + Scan „nach Akzeptieren“) — und **alle** genutzten
- [ ] Aktualisierungsdatum / Stand

## 3. Consent (§ 25 TDDDG + Art. 4 Nr. 11, 7 DSGVO)
- [ ] Vor Consent: **nur** technisch notwendige Cookies/Storage (§ 25 Abs. 2 Nr. 2 TDDDG) — Scanner „vor Consent“
- [ ] Kein nicht-essenzieller Script-, Font-, Pixel-, Map- oder Video-Load vor Consent — Scanner „vor Consent“
- [ ] **Runtime-Verifikation** durchgeführt (Scanner / Browser-Tools / HAR), nicht nur grep — Set-Cookie-Header von API/Redirect-Antworten, CMP-Verhalten, Lazy-Embeds
- [ ] Nach „Ablehnen“: keine neuen Drittanbieter-Requests — Scanner „nach Ablehnen“
- [ ] **GTM im Einsatz** → Container-Export (JSON) geprüft; Tags einzeln nach Consent-Trigger bewertet; ohne Export ⚪️
- [ ] „Alle ablehnen“ auf der ersten Ebene, gleich prominent, gleiche Klickzahl wie „Akzeptieren“
- [ ] Keine vorangekreuzten Kästchen (Planet49, EuGH C-673/17)
- [ ] Granular nach Zwecken (Statistik / Marketing / Externe Medien) — kein „alles oder nichts“
- [ ] Widerruf jederzeit, so einfach wie Erteilung (Art. 7(3)) — persistenter Link/Button; nach Widerruf keine neuen Loads
- [ ] Consent wird protokolliert (Zeit, Version, Zweck, Nachweis Art. 7(1)) — wo? Retention?
- [ ] Banner blockiert nicht Impressum/Datenschutz
- [ ] Keine Dark Patterns (Farbkontrast, Vorauswahl, Ermüdungs-Loop)
- [ ] Keine Cookie-Wall für essenzielle Inhalte
- [ ] CMP selbst first-party oder EU gehostet (kein US-CDN-Call vor Consent)
- [ ] Consent Mode / Consent-Signale korrekt verdrahtet, **zusätzlich** zum Load-Gating, nicht statt

## 4. Drittanbieter & Auftragsverarbeitung
- [ ] Vollständige Liste aller Origins, die der Browser kontaktiert (Scan „nach Akzeptieren“ + Unterseiten)
- [ ] Vollständige Liste aller serverseitigen Empfänger (Hop 4/5 aus `architecture.md`)
- [ ] AVV (Art. 28(3)) für **jeden** Auftragsverarbeiter unterschrieben und abgelegt — nicht „im Dashboard akzeptierbar“
- [ ] Unterauftragsverarbeiter bekannt und genehmigt
- [ ] Drittlandtransfer: DPF-Zertifizierung der konkreten Entität geprüft **oder** SCC + TIA; DPF-Status (Latombe-Rechtsmittel) im Bericht korrekt dargestellt
- [ ] Gemeinsame Verantwortlichkeit (Art. 26) geprüft — Meta Pixel, Facebook-Page-Insights, Social-Plugins
- [ ] Hosting-/DB-/Function-Region dokumentiert (Region-Pinning gesetzt? Edge/Middleware global?)

## 5. Datenfluss & Backend (aus `architecture.md`)
- [ ] Datenfluss-Tabelle für jede PII-Quelle erstellt (Formular, Login, Buchung, Upload, Chat)
- [ ] API-Handler / Server Actions: kein Logging von Request-Bodies mit PII; Rate-Limit; Validierung
- [ ] Hidden Fields / URL-Parameter mit PII oder Marketing-IDs benannt und begründet
- [ ] Datenbank: RLS/Zugriffsregeln auf jeder PII-Tabelle; Service-Keys nur serverseitig; Buckets privat
- [ ] Backups: Region + Retention; Löschung greift auch in Backups (oder Frist dokumentiert)
- [ ] Löschkonzept technisch umgesetzt (Cron/Function), nicht nur beschrieben
- [ ] Webhooks / Automatisierungen (Slack, Zapier, Make) als Empfänger erfasst
- [ ] Social Login: Scopes minimal, Anbieter als Empfänger, Alternative ohne Drittanbieter
- [ ] Staging/Preview ohne Prod-PII; Preview-Deployments geschützt, `noindex`
- [ ] CI/CD-Logs ohne Secrets/Env-Dumps; `.env` nicht im Repo
- [ ] Source Maps nicht öffentlich (Art. 32, 🟡)

## 6. Formulare & Kommunikation
- [ ] Datenschutzhinweis am Formular + Link zur DSE
- [ ] Datenminimierung: jedes Pflichtfeld begründbar (Art. 5(1)(c))
- [ ] Kein Consent-Häkchen als Rechtsgrundlage, wo Art. 6(1)(b)/(f) trägt (kein „Zwangs-Consent“)
- [ ] Übertragung TLS; Formularziel nicht im Drittland ohne Grundlage
- [ ] Newsletter: Double-Opt-In, Protokoll, Abmelde-Link, § 7 Abs. 2 Nr. 2 UWG
- [ ] Transaktionsmails: kein Open-/Click-Tracking ohne Consent; Inhalt minimiert
- [ ] Bewerberdaten: Zweckbindung, Löschung 6 Monate nach Absage (§ 15 Abs. 4 AGG-Logik), separate Info
- [ ] Spam-Schutz ohne reCAPTCHA (Honeypot → Friendly Captcha → Turnstile mit AVV)
- [ ] Löschkonzept für Formulareingänge (Postfach! DB-Tabelle! CRM!)

## 7. KI-Funktionen (Chatbot, Formular-Triage, generierte Inhalte)
- [ ] LLM-Anbieter als Auftragsverarbeiter: DPA, kein Training, Retention, Region — siehe `services.md` KI-Modul
- [ ] Eigenes DSE-Modul für die KI-Funktion (Art. 13)
- [ ] Chatbot als KI gekennzeichnet (Art. 50 KI-VO, seit 02.08.2026) — sichtbar vor der ersten Nachricht
- [ ] Trifft die KI Entscheidungen mit Wirkung für Nutzer? → Art. 22, menschliche Prüfung, Logik in DSE
- [ ] Prompt-Scrubbing / Minimierung; keine Art.-9-Eingaben an US-LLM (R)
- [ ] Prompt-/Response-Logs mit Speicherdauer (Anbieter **und** eigenes Backend)
- [ ] DSFA geprüft bei Gesundheitsbezug, Profiling, Umfang

## 8. Besondere Kategorien (Art. 9) — Heilberufe, Pflege, Ästhetik, Bewerbungen
- [ ] Wird über Buchung/Anfrage/Symptomfeld/Upload/Chat Gesundheitsbezug übermittelt? → Art. 9
- [ ] Ausdrückliche Einwilligung (Art. 9(2)(a)) oder Art. 9(2)(h) + § 22 BDSG
- [ ] Keine US-Dienste im Datenpfad (R — Ausnahme nur mit anwaltlicher Freigabe: DPF + AVV + TIA + § 203-Absicherung)
- [ ] Keine Art.-9-Parameter in URLs, Analytics-Events, Mail-Betreffs, Slack-Webhooks
- [ ] DSFA (Art. 35) geprüft/durchgeführt — Positivliste der Aufsichtsbehörden
- [ ] DSB bestellt (Kerntätigkeit Art. 9 → Art. 37(1)(c)) oder begründet verneint
- [ ] § 203 StGB: Einbindung technischer Dienstleister nach § 203 Abs. 3 StGB abgesichert (Verpflichtung im AVV)
- [ ] Verschlüsselung at rest + Zugriffskonzept (Art. 32)

## 9. Organisatorisch (fragen, auch wenn nicht „Website“)
- [ ] Verzeichnis von Verarbeitungstätigkeiten (Art. 30)
- [ ] TOMs dokumentiert (Art. 32)
- [ ] Meldeprozess Datenpanne 72 h (Art. 33)
- [ ] Löschkonzept / Aufbewahrungsfristen (§ 147 AO, § 257 HGB vs. Art. 17)
- [ ] Verpflichtung auf Vertraulichkeit der Mitarbeitenden
- [ ] Prozess für Betroffenenanfragen (1 Monat, Art. 12(3)) — und Daten aus **allen** Hops auffindbar

## 10. Technisch
- [ ] HTTPS erzwungen, HSTS, kein Mixed Content
- [ ] Security-Header: CSP (mind. `font-src 'self'`), X-Content-Type-Options, Referrer-Policy (`strict-origin-when-cross-origin` o. strenger)
- [ ] Server-Logs: IP-Speicherdauer ≤ 7 Tage bzw. begründet, in DSE benannt; Log-Drains als Empfänger
- [ ] Keine IDs/Tokens in URLs, keine PII in Logs/Sentry (Scrubbing aktiv)
- [ ] Error-Tracking: PII-Redaction, EU-Region, Replay nur mit Consent
- [ ] Session-Cookies `httpOnly`, `secure`, `sameSite`
- [ ] `robots.txt`/Preview-Deployments: keine Testdaten mit Echt-PII öffentlich

## 11. Angrenzend — nur flaggen, nicht auditieren
- [ ] BFSG (seit 28.06.2025): B2C-Shop/-Dienstleistung → Barrierefreiheit erwähnen, an Spezialisten verweisen
- [ ] Shop: Widerrufsbelehrung, AGB, Preisangaben, Button-Lösung (§ 312j BGB)
- [ ] Irreführende Aussagen (§ 5 UWG): „100 % DSGVO-konform“-Siegel, toter OS-Link, erfundene Zertifikate
