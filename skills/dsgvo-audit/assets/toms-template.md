# Technische und organisatorische Maßnahmen (TOMs) — Vorlage (Art. 32 DSGVO)

**Anwendung**: Internes Dokument; wird jedem AVV als Anlage beigefügt (Art. 28 Abs. 3 lit. c) und im VVT referenziert (Art. 30 Abs. 1 lit. g). Nur Maßnahmen aufnehmen, die **tatsächlich umgesetzt** sind — ein TOM-Dokument, das mehr verspricht als die Infrastruktur hält, ist bei einer Datenpanne schlimmer als ein kurzes ehrliches. Jeden `[PLATZHALTER]` füllen; Zeilen, die nicht zutreffen, streichen.

Zwei Arten von Einträgen:
- **(S)** = aus dem Audit **belegt** (Runtime-Scan: Security-Header, Cookie-Attribute, Mixed Content; Static Lint: Regionen, Secrets; Code: RLS, Hashing). Fundstelle eintragen.
- **(A)** = **Angabe des Verantwortlichen** (Zutrittskontrolle, Vertraulichkeitsverpflichtung, Backup-Tests) — im Audit erfragt, nicht geprüft. So kennzeichnen.

Die Gliederung folgt den Gewährleistungszielen aus Art. 32 Abs. 1 lit. b (Vertraulichkeit, Integrität, Verfügbarkeit, Belastbarkeit) plus dem Verfahren zur regelmäßigen Überprüfung (lit. d). Das ist die Struktur, die Aufsichtsbehörden und die meisten AVV-Anlagen erwarten.

---

## TOM-Dokumentation

| | |
|---|---|
| Verantwortlicher | [FIRMA, RECHTSFORM], [ANSCHRIFT] |
| Geltungsbereich | Website [DOMAIN] und die dahinterliegende Verarbeitung (Hosting, Backend, Datenbank, Mail, Dienstleister) |
| Risikoeinschätzung | [niedrig / mittel / hoch] — [Begründung: z. B. Kontaktdaten und Anfragen, keine Art.-9-Daten / Gesundheitsdaten im Buchungsformular → hoch] |
| Stand | [DATUM]; Überprüfung [jährlich] und nach jedem Sicherheitsvorfall |
| Verantwortlich für dieses Dokument | [ROLLE/NAME] |

### 1. Vertraulichkeit (Art. 32 Abs. 1 lit. b)

#### 1.1 Zutrittskontrolle — physischer Zugang zu Systemen

| Maßnahme | Status | Nachweis |
|---|---|---|
| Server stehen in zertifizierten Rechenzentren des Hosters ([HOSTER], [ISO 27001 / SOC 2], Standort [ORT]) | (A) | [Zertifikat/Link aus AVV-Anlage] |
| Büro: [Schließsystem, Besucherregelung, keine Server vor Ort] | (A) | — |

#### 1.2 Zugangskontrolle — Anmeldung an Systemen

| Maßnahme | Status | Nachweis |
|---|---|---|
| MFA für alle Admin-Zugänge (Hosting-Konsole, Datenbank-Dashboard, CMS-Admin, DNS, Mail-Postfach mit Kontaktanfragen) | (A) | [Liste der Konten, Datum der Prüfung] |
| Passwortrichtlinie: [Mindestlänge 12, Passwortmanager, keine geteilten Konten] | (A) | — |
| Nutzerpasswörter werden nur gehasht gespeichert ([bcrypt/argon2] über [AUTH-ANBIETER]) | (S) | [Datei/Anbieter-Doku] |
| Session-Cookies mit `httpOnly`, `secure`, `sameSite=[lax/strict]`; Lebensdauer [X] | (S) | Scan [DATUM], Cookie-Attribute |
| Service-/Admin-Keys (`service_role`, API-Keys) nur serverseitig, nie im Client-Bundle; in Env-Variablen, nicht im Repo | (S) | Lint [DATUM]: keine Secrets im Quelltext; `.env` in `.gitignore` |
| Offboarding: Zugänge ausscheidender Personen werden binnen [1 Werktag] entzogen | (A) | [Checkliste] |

#### 1.3 Zugriffskontrolle — Berechtigungen innerhalb der Systeme

| Maßnahme | Status | Nachweis |
|---|---|---|
| Rollenkonzept: [ROLLE → Rechte]; Prinzip der minimalen Rechte | (A) | [Rollentabelle] |
| Datenbank: Row-Level-Security / Zugriffsrichtlinien auf jeder Tabelle mit personenbezogenen Daten; kein direkter Client-Zugriff ohne Policy | (S) | [Migrations-/Policy-Dateien] |
| Object Storage / Uploads: Buckets privat, Zugriff über signierte URLs mit Ablauf [X min] | (S) | [Konfiguration] |
| Admin-Dashboards nicht öffentlich erreichbar ([IP-Allowlist / SSO / Vercel Deployment Protection]) | (S/A) | — |
| Protokollierung administrativer Zugriffe [Anbieter-Audit-Log, Aufbewahrung X] | (A) | — |

#### 1.4 Trennungskontrolle

| Maßnahme | Status | Nachweis |
|---|---|---|
| Produktions-, Staging- und Entwicklungsumgebung getrennt; **keine Echtdaten in Staging/Preview** (Testdaten oder Anonymisierung) | (S/A) | [Env-Konfiguration] |
| Mandantentrennung: [pro Kunde eigenes Projekt / Schema / Tenant-ID mit Policy] | (S) | — |
| Preview-Deployments nicht indexierbar (`noindex`) und [passwortgeschützt] | (S) | Scan Preview-URL |

#### 1.5 Pseudonymisierung und Verschlüsselung (Art. 32 Abs. 1 lit. a)

| Maßnahme | Status | Nachweis |
|---|---|---|
| Transportverschlüsselung: TLS [1.2+/1.3] erzwungen, HSTS (`max-age ≥ 1 Jahr`, `includeSubDomains`), kein Mixed Content | (S) | Scan [DATUM]: Header + Mixed-Content-Prüfung |
| Verschlüsselung ruhender Daten: Datenbank [AES-256 beim Anbieter], Backups verschlüsselt, Storage verschlüsselt | (A) | [Anbieter-Doku] |
| IP-Adressen in Analytics/Logs [gekürzt / gehasht / nach X Tagen gelöscht] | (S/A) | [Konfiguration] |
| Prompt-Scrubbing vor KI-API: [E-Mail, Telefon, Namen entfernt, wo nicht nötig] | (S) | [Datei] |
| Fehlerprotokollierung: PII-Redaction aktiv, keine Request-Bodies, [Session-Replay aus / nur mit Einwilligung] | (S) | [Sentry-Konfiguration, Datei] |

### 2. Integrität (Art. 32 Abs. 1 lit. b)

#### 2.1 Weitergabekontrolle

| Maßnahme | Status | Nachweis |
|---|---|---|
| Jede Übermittlung an Dritte erfolgt nur an in VVT und DSE benannte Empfänger mit AVV / eigener Verantwortlichkeit | (S) | VVT, Datenfluss-Tabelle Audit [DATUM] |
| Keine Drittanbieter-Requests vor Einwilligung; Content-Security-Policy als technisches Netz (`default-src 'self'`, `font-src 'self'`, `connect-src` nur benannte Endpunkte) | (S) | Scan [DATUM]: CSP-Header, „vor Consent“ leer |
| Transaktions-Mails: Open-/Click-Tracking deaktiviert; Inhalt minimiert | (S/A) | [Mailer-Konfiguration] |
| Webhooks/Automatisierungen (Zapier, Make, Slack) nur mit AVV und minimalem Payload | (A) | — |
| Hosting-/Function-Regionen: [EU — fra1 / eu-central-1]; Edge/Middleware [global, in DSE benannt] | (S) | Lint [DATUM]: Regionen |

#### 2.2 Eingabekontrolle

| Maßnahme | Status | Nachweis |
|---|---|---|
| Serverseitige Validierung aller Formulareingaben; Rate-Limit [X/min]; Spam-Schutz [Honeypot + Zeitfalle / EU-Captcha] | (S) | [Handler-Datei] |
| Änderungen an personenbezogenen Daten sind nachvollziehbar ([updated_at, Audit-Log, Git-Historie für Konfiguration]) | (S/A) | — |
| Deployments nur über CI mit Review ([Branch-Schutz, Pflicht-Checks]) | (A) | [Repo-Einstellungen] |

### 3. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b, c)

| Maßnahme | Status | Nachweis |
|---|---|---|
| Backups: [täglich], Aufbewahrung [X Tage], Speicherort [REGION — muss zur Drittlandbewertung passen], verschlüsselt | (A) | [Anbieter-Einstellung] |
| Wiederherstellung getestet am [DATUM]; RTO [X h], RPO [X h] | (A) | [Protokoll] |
| Schutz vor Überlast: [CDN/WAF, Rate-Limits, DDoS-Schutz des Hosters] | (S/A) | — |
| Monitoring/Alerting: [Uptime-Check, Error-Alerts] mit Verantwortlichem [ROLLE] | (A) | — |
| Abhängigkeiten aktuell: [Dependabot/Renovate, monatliche Updates, Playwright/Node-Versionen] | (S) | [Repo] |

### 4. Verfahren zur regelmäßigen Überprüfung, Bewertung und Evaluierung (Art. 32 Abs. 1 lit. d)

#### 4.1 Datenschutz-Management

| Maßnahme | Status | Nachweis |
|---|---|---|
| VVT geführt und bei Änderungen fortgeschrieben (Art. 30) | (A) | VVT vom [DATUM] |
| Datenschutz-Audit der Website [jährlich / vor jedem größeren Release] inkl. Runtime-Scan; letzter Bericht [DATUM] | (S) | Audit-Bericht |
| Automatisierter Consent-Gate in CI (`lint-origins --strict` je PR, `scan-origins --strict` je Preview) | (S) | [Workflow-Datei] |
| DSB [bestellt: NAME / nicht erforderlich, Begründung im VVT] | (A) | — |
| DSFA [durchgeführt am DATUM / geprüft und nicht erforderlich, Begründung] | (A) | [Dokument] |
| Mitarbeitende auf Vertraulichkeit verpflichtet (Art. 29, § 53 BDSG) und [jährlich] geschult; bei Heilberufen zusätzlich § 203 StGB | (A) | [Verpflichtungserklärungen] |

#### 4.2 Incident-Response-Management (Art. 33, 34)

| Maßnahme | Status | Nachweis |
|---|---|---|
| Meldeweg für Datenpannen definiert: [ROLLE] bewertet binnen [24 h], Meldung an Aufsichtsbehörde binnen 72 h (Art. 33), Benachrichtigung Betroffener bei hohem Risiko (Art. 34) | (A) | [Prozessbeschreibung] |
| Kontaktdaten der zuständigen Aufsichtsbehörde hinterlegt: [BEHÖRDE, MELDEFORMULAR-URL] | (A) | — |
| Dienstleister melden Vorfälle vertraglich [unverzüglich / binnen 24 h] (AVV-Klausel) | (A) | AVVs |

#### 4.3 Datenschutzfreundliche Voreinstellungen (Art. 25)

| Maßnahme | Status | Nachweis |
|---|---|---|
| Formulare erheben nur erforderliche Felder; keine Pflichtfelder über den Zweck hinaus | (S) | [Datei] |
| Consent-Banner: Ablehnen auf erster Ebene, keine Vorauswahl, Widerruf über persistenten Link | (S) | Scan [DATUM] |
| Löschkonzept technisch umgesetzt: [Cron/Edge-Function löscht Kontaktanfragen nach X Monaten, Logs nach Y Tagen] | (S) | [Datei/Job] |
| Fonts, Icons, Skripte vom eigenen Origin (kein Drittanbieter-Load vor Einwilligung) | (S) | Scan [DATUM] |

#### 4.4 Auftragskontrolle (Art. 28)

| Maßnahme | Status | Nachweis |
|---|---|---|
| Für jeden Auftragsverarbeiter liegt ein AVV vor; Liste mit Datum: [HOSTER DATUM, MAILER DATUM, DB DATUM, ANALYTICS DATUM, KI-API DATUM, CRM DATUM] | (A) | AVV-Ordner |
| Unterauftragsverarbeiter-Listen der Anbieter geprüft; Benachrichtigung bei Änderungen abonniert | (A) | — |
| Drittlandtransfers: Mechanismus je Anbieter dokumentiert (DPF-Listeneintrag geprüft am [DATUM] / SCC + TIA) | (A) | VVT |
| Regelmäßige Überprüfung der Dienstleister [jährlich]: DPA-Änderungen, Regionen, Zertifizierungen | (A) | — |

---

**Änderungshistorie**

| Datum | Änderung | Bearbeitet von |
|---|---|---|
| [DATUM] | Erstanlage nach Datenschutz-Audit vom [DATUM] | [NAME] |
