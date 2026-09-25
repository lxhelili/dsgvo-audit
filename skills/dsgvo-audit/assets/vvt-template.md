# Verzeichnis von Verarbeitungstätigkeiten (VVT) — Vorlage (Art. 30 Abs. 1 DSGVO)

**Anwendung**: Eine Tabelle pro Verarbeitungstätigkeit. Die Zeilen unten sind die typischen Tätigkeiten einer Website / Web-App — **jede Zeile der Datenfluss-Tabelle aus dem Audit (Berichtsabschnitt 3) wird hier eine Tätigkeit**; Tätigkeiten ohne Evidenz löschen. Jeden `[PLATZHALTER]` füllen. Das VVT ist ein internes Dokument (nicht veröffentlichen), wird der Aufsichtsbehörde auf Anfrage vorgelegt (Art. 30 Abs. 4) und bei jeder Änderung der Verarbeitung fortgeschrieben.

Die Ausnahme in Art. 30 Abs. 5 (< 250 Beschäftigte) greift **nicht**, sobald die Verarbeitung „nicht nur gelegentlich“ erfolgt — eine Website mit Kontaktformular oder Server-Logs verarbeitet regelmäßig. Praktisch braucht also jeder Website-Betreiber ein VVT; eine Seite reicht, null Seiten nicht.

Pflichtangaben je Tätigkeit (Art. 30 Abs. 1 lit. a–g): Verantwortlicher · Zwecke · Kategorien betroffener Personen · Kategorien personenbezogener Daten · Kategorien von Empfängern · Drittlandübermittlung + Garantien · Löschfristen · allgemeine Beschreibung der TOMs (Verweis auf `toms-template.md` genügt).

---

## Verzeichnis von Verarbeitungstätigkeiten

### Angaben zum Verantwortlichen (Art. 30 Abs. 1 lit. a)

| | |
|---|---|
| Verantwortlicher | [FIRMA, RECHTSFORM], [STRASSE HNR], [PLZ ORT] |
| Vertreten durch | [VERTRETUNGSBERECHTIGTE PERSON] |
| Kontakt | Telefon [TEL], E-Mail [E-MAIL] |
| Datenschutzbeauftragte(r) | [NAME, KONTAKT — oder: nicht bestellt; Begründung: < 20 Personen mit regelmäßiger automatisierter Verarbeitung, keine Kerntätigkeit nach Art. 37 Abs. 1 lit. b/c] |
| Vertreter in der EU (Art. 27) | [nur bei Verantwortlichem außerhalb der EU — sonst Zeile löschen] |
| Stand dieses Verzeichnisses | [DATUM] — geführt von [ROLLE/NAME], Überprüfung [jährlich / bei jeder Änderung] |

### Übersicht

| Nr. | Verarbeitungstätigkeit | Rechtsgrundlage | Empfänger (extern) | Drittland | Löschfrist |
|---|---|---|---|---|---|
| 1 | Bereitstellung der Website, Server-Logfiles | Art. 6(1)(f) | [HOSTER] | [nein / ja: MECHANISMUS] | [7 Tage] |
| 2 | Kontaktaufnahme (Formular, E-Mail) | Art. 6(1)(b)/(f) | [MAILER, POSTFACH-ANBIETER, DB] | [nein / ja] | [6 Monate] |
| 3 | Terminanfrage / Buchung | Art. 6(1)(b) [+ Art. 9(2)(a)/(h)] | [BUCHUNGSTOOL] | [nein / ja] | [X] |
| 4 | Reichweitenmessung | Art. 6(1)(f) [oder (a) + § 25 Abs. 1 TDDDG] | [ANALYTICS-ANBIETER] | [nein / ja] | [X] |
| 5 | Newsletter | Art. 6(1)(a), § 7 Abs. 2 Nr. 2 UWG | [VERSANDDIENST] | [nein / ja] | [bis Widerruf + Nachweis X] |
| 6 | Bewerbungen | § 26 Abs. 1 BDSG, Art. 6(1)(b) | [BEWERBERTOOL / POSTFACH] | [nein / ja] | [6 Monate nach Abschluss] |
| 7 | Nutzerkonto / Login | Art. 6(1)(b), (f) für Sicherheitslogs | [AUTH-ANBIETER, DB] | [nein / ja] | [bis Kontolöschung + X] |
| 8 | Zahlungsabwicklung | Art. 6(1)(b), (c) | [PAYMENT-ANBIETER] | [nein / ja] | [8 Jahre Buchungsbelege / 10 Jahre Bücher, § 147 AO] |
| 9 | KI-gestützte Funktion (Chat, Triage) | Art. 6(1)(b)/(f) | [LLM-ANBIETER] | [nein / ja] | [X] |
| 10 | Fehlerprotokollierung / Monitoring | Art. 6(1)(f) | [ERROR-TRACKING] | [nein / ja] | [X Tage] |
| 11 | Einwilligungsverwaltung (Consent-Protokoll) | Art. 6(1)(c) i. V. m. Art. 7(1) | [CMP-ANBIETER oder first-party] | [nein / ja] | [X Monate / Jahre] |

---

### Tätigkeit 1 — Bereitstellung der Website, Server-Logfiles

| Angabe | Inhalt |
|---|---|
| Zweck | Auslieferung der Website, Stabilität, Sicherheit (Abwehr von Angriffen, Fehleranalyse) |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse: technisch fehlerfreier und sicherer Betrieb |
| Betroffene Personen | Website-Besucher |
| Datenkategorien | IP-Adresse, Datum/Uhrzeit, aufgerufene Ressource, Referrer, User-Agent (Browser, OS), übertragene Datenmenge, HTTP-Status |
| Herkunft der Daten | Betroffene Person (Aufruf der Website) |
| Empfänger | [HOSTER, FIRMA, LAND] (Auftragsverarbeiter, AVV vom [DATUM]) [; CDN/Edge: ANBIETER, AVV] [; Log-Drain: ANBIETER, AVV] |
| Drittlandübermittlung | [keine / ANBIETER, LAND — Garantie: DPF-Zertifizierung der Entität (geprüft am DATUM) / SCC (Modul 2) + TIA] |
| Löschfrist | [7 Tage], danach Löschung bzw. Anonymisierung; bei Sicherheitsvorfällen längere Aufbewahrung im Einzelfall |
| TOMs | siehe TOM-Dokument, Abschnitte [Zugriffskontrolle, Verschlüsselung (TLS), Protokollierung] |
| Interne Zuständigkeit | [ROLLE] |

### Tätigkeit 2 — Kontaktaufnahme

| Angabe | Inhalt |
|---|---|
| Zweck | Bearbeitung von Anfragen über Kontaktformular und E-Mail |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO (vorvertraglich) bzw. lit. f (allgemeine Anfragen; Interesse: Beantwortung) [BEI GESUNDHEITSBEZUG: Art. 9 Abs. 2 lit. a DSGVO] |
| Betroffene Personen | Interessenten, Kunden, sonstige Anfragende |
| Datenkategorien | [FELDER exakt aus dem Code: Name, E-Mail, Nachricht; technisch: Zeitpunkt, ggf. IP] [; Hidden Fields: utm_source o. ä. → Marketingdaten] |
| Herkunft der Daten | Betroffene Person |
| Empfänger | [MAIL-VERSANDDIENST, LAND, AVV] · [POSTFACH-ANBIETER (M365/Workspace/eigener Mailserver), LAND, AVV] · [DB-ANBIETER, LAND, AVV] · [ERROR-TRACKING, falls Request-Body erfasst] |
| Drittlandübermittlung | [keine / je Empfänger: Mechanismus] |
| Löschfrist | [6 Monate] nach abschließender Bearbeitung, sofern keine Aufbewahrungspflicht (§ 147 AO, § 257 HGB bei Geschäftsbriefen: 6 Jahre) |
| TOMs | [TLS, Spam-Schutz (Honeypot/Rate-Limit), Zugriff nur ROLLEN, keine PII in Logs] |
| Interne Zuständigkeit | [ROLLE] |

### Tätigkeit 3 — Terminanfrage / Buchung

| Angabe | Inhalt |
|---|---|
| Zweck | Vereinbarung und Durchführung von Terminen |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO [+ Art. 9 Abs. 2 lit. a bzw. lit. h DSGVO i. V. m. § 22 Abs. 1 Nr. 1 lit. b BDSG bei Gesundheitsbezug] |
| Betroffene Personen | Patienten / Kunden |
| Datenkategorien | [Name, Kontaktdaten, Wunschtermin, Anliegen/Behandlung (→ Art. 9!), Uploads] |
| Empfänger | [BUCHUNGSTOOL, FIRMA, LAND — Rolle: Auftragsverarbeiter (AVV) / eigener Verantwortlicher (Nutzerkonto beim Anbieter)] |
| Drittlandübermittlung | [keine / Mechanismus — bei Art. 9: konservative Regel: kein US-Dienst im Datenpfad] |
| Löschfrist | [X; Behandlungsdokumentation 10 Jahre § 630f Abs. 3 BGB] |
| TOMs | [Verschlüsselung ruhender Daten, Rollen, § 203 StGB-Verpflichtung der Dienstleister] |

### Tätigkeit 4 — Reichweitenmessung

| Angabe | Inhalt |
|---|---|
| Zweck | Statistische Auswertung der Nutzung, Optimierung des Angebots |
| Rechtsgrundlage | [cookielos, EU, keine Endgerätzugriffe: Art. 6 Abs. 1 lit. f — Interesse: Reichweitenanalyse / mit Cookies oder Fingerprinting: Art. 6 Abs. 1 lit. a DSGVO i. V. m. § 25 Abs. 1 TDDDG] |
| Betroffene Personen | Website-Besucher |
| Datenkategorien | [IP-Adresse (gekürzt/gehasht), Seitenaufrufe, Referrer, Gerätetyp, Land, Ereignisse — keine Event-Payloads mit Art.-9-Inhalt] |
| Empfänger | [ANBIETER, FIRMA, LAND, AVV/DPA vom DATUM] |
| Drittlandübermittlung | [keine / Mechanismus] |
| Löschfrist | [Rohdaten X Tage, Aggregate unbegrenzt anonym] |
| TOMs | [Einwilligungsgating, IP-Anonymisierung, Deaktivierung Replay] |

### Tätigkeit 5 — Newsletter

| Angabe | Inhalt |
|---|---|
| Zweck | Versand von Informationen und Werbung per E-Mail |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. a DSGVO, § 7 Abs. 2 Nr. 2 UWG; Nachweisprotokoll (Double-Opt-In): Art. 6 Abs. 1 lit. c/f |
| Betroffene Personen | Abonnenten |
| Datenkategorien | E-Mail [, Name]; Nachweis: IP + Zeitpunkt von Anmeldung und Bestätigung [; Öffnungs-/Klickdaten nur bei Einwilligung] |
| Empfänger | [VERSANDDIENST, FIRMA, LAND, AVV] |
| Drittlandübermittlung | [keine / Mechanismus] |
| Löschfrist | Bis Widerruf; Nachweisdaten [3 Jahre] nach Abmeldung (Verjährung § 195 BGB) |

### Tätigkeit 6 — Bewerbungen

| Angabe | Inhalt |
|---|---|
| Zweck | Durchführung des Bewerbungsverfahrens |
| Rechtsgrundlage | § 26 Abs. 1 BDSG, Art. 6 Abs. 1 lit. b DSGVO; besondere Kategorien: Art. 9 Abs. 2 lit. b i. V. m. § 26 Abs. 3 BDSG; Talentpool: Art. 6 Abs. 1 lit. a |
| Betroffene Personen | Bewerber |
| Datenkategorien | Stammdaten, Kontaktdaten, Lebenslauf, Zeugnisse, ggf. Schwerbehinderung (Art. 9) |
| Empfänger | [BEWERBERTOOL / POSTFACH, LAND, AVV]; intern: [ROLLEN] |
| Löschfrist | 6 Monate nach Abschluss (§ 15 Abs. 4 AGG, § 61b ArbGG), Talentpool [X] nach Einwilligung |

### Tätigkeit 7 — Nutzerkonto / Login

| Angabe | Inhalt |
|---|---|
| Zweck | Bereitstellung eines Kontos und der damit verbundenen Funktionen; Kontosicherheit |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO; Sicherheits-Logs: lit. f (Missbrauchsschutz) |
| Betroffene Personen | Registrierte Nutzer |
| Datenkategorien | E-Mail, Name, Passwort (gehasht), Anmeldezeitpunkte, IP; [Social Login: Profil-ID, Name, E-Mail, Bild vom Anbieter] |
| Empfänger | [AUTH-ANBIETER, DB, LAND, AVV] [; Social-Login-Anbieter als eigener Verantwortlicher] |
| Löschfrist | Bis Kontolöschung + [30 Tage] Abwicklung; Sicherheits-Logs [X Tage] |

### Tätigkeit 8 — Zahlungsabwicklung

| Angabe | Inhalt |
|---|---|
| Zweck | Abwicklung von Zahlungen, Buchhaltung |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO; Aufbewahrung: lit. c (§ 147 AO, § 257 HGB) |
| Betroffene Personen | Kunden |
| Datenkategorien | Bei uns: Bestätigung, Betrag, Transaktions-ID, Rechnungsdaten; Zahlungsdaten selbst beim Anbieter |
| Empfänger | [ZAHLUNGSANBIETER, FIRMA, LAND] — eigener Verantwortlicher für den Zahlungsvorgang |
| Drittlandübermittlung | [Mechanismus des Anbieters] |
| Löschfrist | Rechnungen/Buchungsbelege 8 Jahre, Bücher und Jahresabschlüsse 10 Jahre, Geschäftsbriefe 6 Jahre — jeweils ab Ende des Kalenderjahres (§ 147 AO, § 257 HGB; Buchungsbelege seit 2025 8 statt 10 Jahre, Stand prüfen) |

### Tätigkeit 9 — KI-gestützte Funktion

| Angabe | Inhalt |
|---|---|
| Zweck | [Beantwortung von Nutzerfragen / Vorqualifizierung von Anfragen / …] |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO (vom Nutzer aktiv gewählte Funktion) [bzw. lit. f für Backend-Triage] |
| Betroffene Personen | Nutzer der Funktion |
| Datenkategorien | Eingaben, Gesprächsverlauf, Sitzungs-ID, Zeitpunkt; [Risiko: Nutzer geben Art.-9-Daten ein → Eingabemaske und Hinweis] |
| Empfänger | [LLM-ANBIETER, FIRMA, LAND — API-Terms/DPA vom DATUM, kein Training, Retention X, Region Y] |
| Drittlandübermittlung | [keine (EU-Endpunkt) / Mechanismus] |
| Löschfrist | Bei uns [X]; beim Anbieter [Zero Data Retention / X Tage] |
| Automatisierte Entscheidung (Art. 22) | [nein — Ergebnisse werden von Mitarbeitenden geprüft / ja: Logik, Tragweite, menschliche Überprüfung] |
| Kennzeichnung (Art. 50 KI-VO) | [Hinweistext im UI, Fundstelle] |

### Tätigkeit 10 — Fehlerprotokollierung / Monitoring

| Angabe | Inhalt |
|---|---|
| Zweck | Erkennung und Behebung von Fehlern, Stabilität |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO — Interesse: fehlerfreier Betrieb |
| Datenkategorien | Fehlermeldung, Stack-Trace, Browser/OS, URL, [IP gekürzt], **keine** Request-Bodies (Scrubbing aktiv) |
| Empfänger | [ERROR-TRACKING, FIRMA, LAND/REGION, AVV] |
| Löschfrist | [30 / 90 Tage] |

### Tätigkeit 11 — Einwilligungsverwaltung

| Angabe | Inhalt |
|---|---|
| Zweck | Einholung, Speicherung und Nachweis von Einwilligungen (Art. 7 Abs. 1) |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. c DSGVO i. V. m. Art. 7 Abs. 1; Speicherung auf dem Endgerät: § 25 Abs. 2 Nr. 2 TDDDG |
| Datenkategorien | Consent-Status je Zweck, Zeitpunkt, Version der Einwilligungstexte, [Consent-ID, gekürzte IP] |
| Empfänger | [CMP-ANBIETER, LAND, AVV / keine — first-party] |
| Löschfrist | [12 Monate] auf dem Endgerät; Protokoll [3 Jahre] (Nachweis, § 195 BGB) |

---

**Änderungshistorie**

| Datum | Änderung | Bearbeitet von |
|---|---|---|
| [DATUM] | Erstanlage nach Datenschutz-Audit vom [DATUM] | [NAME] |
