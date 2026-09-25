# Löschkonzept — Vorlage (Art. 5 Abs. 1 lit. e, Art. 17, Art. 30 Abs. 1 lit. f DSGVO)

**Anwendung**: Aufbau nach DIN 66398 (Datenarten → Löschklassen → Regellöschfristen mit Startzeitpunkt → Umsetzung). Jede Zeile der Datenfluss-Übersicht aus dem Audit und jede Tätigkeit im VVT (`vvt-template.md`) braucht hier eine Datenart mit Frist. Zeilen ohne Evidenz löschen, jeden `[PLATZHALTER]` füllen. Internes Dokument, nicht veröffentlichen; die Fristen erscheinen in der Datenschutzerklärung (Art. 13 Abs. 2 lit. a) und im VVT (lit. f) — alle drei müssen übereinstimmen.

Gesetzliche Fristen (HGB, AO, BGB, AGG) ändern sich; die Spalte „Grundlage“ vor Auslieferung prüfen. Wo keine gesetzliche Frist besteht, ist die Frist eine **Abwägung** des Verantwortlichen — sie muss begründet sein, nicht nur kurz.

Umsetzungsstatus je Zeile: **(S)** = die Löschung ist im Code/Config nachgewiesen (Cron, TTL, Retention-Einstellung — mit Fundstelle), **(A)** = Angabe des Mandanten, **(—)** = nicht umgesetzt → Befund. Ein (A) nie zu (S) hochstufen.

---

## Löschkonzept

| | |
|---|---|
| Verantwortlicher | [FIRMA, RECHTSFORM] |
| Verantwortlich für das Löschkonzept | [NAME, FUNKTION] |
| Stand | [DATUM] |
| Nächste Überprüfung | [DATUM — spätestens jährlich und bei jeder neuen Verarbeitung] |

### 1. Löschklassen

| Klasse | Frist ab Startzeitpunkt | Typische Verwendung |
|---|---|---|
| L1 | sofort nach Zweckerreichung (≤ 24 h) | Honeypot-/Spam-Einsendungen, temporäre Uploads, Session-Daten |
| L2 | 7–14 Tage | Server-/Zugriffslogs, Fehler-Logs mit IP |
| L3 | 30–90 Tage | Monitoring (Sentry), Chat-/KI-Transkripte zur Qualitätsprüfung, Backups |
| L4 | 6 Monate | Kontaktanfragen ohne Folgegeschäft, Bewerbungen nach Absage |
| L5 | 3 Jahre nach Jahresende | Nachweise (Einwilligungen, Widerrufe) für die Verjährungsfrist (§ 195 BGB) |
| L6 | 6 Jahre nach Jahresende | Handels- und Geschäftsbriefe (§ 257 Abs. 1 Nr. 2, 3 HGB, § 147 AO) |
| L7 | 8 Jahre nach Jahresende | Buchungsbelege (§ 257 Abs. 1 Nr. 4 HGB, § 147 AO — seit 2025; Stand prüfen) |
| L8 | 10 Jahre | Bücher, Jahresabschlüsse (§ 257 HGB, § 147 AO); Patientenakte ab Behandlungsende (§ 630f Abs. 3 BGB) |

### 2. Datenarten und Fristen

| Datenart | Quelle (Audit / VVT) | Klasse | Startzeitpunkt | Grundlage der Frist | Wo gespeichert (alle Hops) | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| Server-Logs (IP, User-Agent, URL, Zeit) | Hosting | L2 | Zugriff | Abwägung: Sicherheit/Fehleranalyse, [X TAGE] genügen | [HOSTER], Log-Drain [ANBIETER] | Log-Retention im Hoster-Panel / Drain-Einstellung | [S/A/—] |
| Kontaktanfragen (Name, E-Mail, Nachricht) | Kontaktformular | L4 | Eingang, bzw. Abschluss der Korrespondenz | Abwägung; bei Vertragsschluss → L6 | Postfach [ANBIETER], DB-Tabelle [TABELLE], Mailer-Logs [ANBIETER] | [CRON / MANUELL — FUNDSTELLE] | [S/A/—] |
| Terminanfragen (Gesundheitsbezug) ohne Behandlung | Buchung | L4 oder kürzer | Anfrage | Abwägung; mit Behandlung → Patientenakte L8 | [TOOL], Postfach | [UMSETZUNG] | [S/A/—] |
| Bewerbungen | Karriereseite | L4 | Absage | Fristen § 15 Abs. 4 AGG, § 61b ArbGG; längere Speicherung nur mit Einwilligung (Talentpool) | [ORT] | [UMSETZUNG] | [S/A/—] |
| Newsletter-Adresse | Anmeldung | bis Abmeldung | Abmeldung | Zweckwegfall | [NEWSLETTER-TOOL] | Abmeldelink / List-Unsubscribe | [S/A/—] |
| Einwilligungsnachweise (DOI-Log, Consent-Log) | Newsletter, CMP | L5 | Ende der Nutzung der Einwilligung | Nachweispflicht Art. 7 Abs. 1, Verjährung § 195 BGB | [CMP / TOOL] | [UMSETZUNG] | [S/A/—] |
| Nutzerkonto | Registrierung | L1 nach Kontolöschung | Löschantrag / Inaktivität [X MONATE] | Zweckwegfall; Rechnungsdaten → L7 | Auth [ANBIETER], DB, Mailer, Analytics | Delete-Flow im Code [FUNDSTELLE] | [S/A/—] |
| Bestellungen, Rechnungen | Shop / Zahlung | L7 | Ende des Kalenderjahrs | HGB/AO | [SHOP], [ZAHLUNGSDIENST] | Archiv, danach Löschung | [S/A/—] |
| Chat-/KI-Transkripte | KI-Funktion | L3 | Gesprächsende | Abwägung; ohne Zweck → nicht speichern | [DB], [LLM-ANBIETER — Retention laut DPA] | TTL / pg_cron [FUNDSTELLE] | [S/A/—] |
| Fehler-Monitoring | Sentry o. ä. | L3 | Ereignis | Abwägung | [ANBIETER, REGION] | Retention-Einstellung | [S/A/—] |
| Backups | Hosting / DB | L3 | Erstellung | Wiederherstellung; gelöschte Daten verschwinden erst mit dem Backup-Zyklus | [ORT, REGION] | Rotation [X TAGE] | [S/A/—] |

### 3. Umsetzung

- **Automatisch**: [Cron / Edge Function / DB-TTL / Retention-Einstellung je Anbieter — mit Fundstelle im Code oder Screenshot der Einstellung]
- **Manuell**: [wer, wie oft, wie dokumentiert]
- **Löschung in allen Hops**: Eine Löschung in der Datenbank reicht nicht, wenn dieselben Daten im Postfach, im Mailer-Log, im CRM, in Sentry oder im Backup liegen. Für jede Datenart die Spalte „Wo gespeichert“ vollständig abarbeiten (`references/architecture.md`, Hop 3–6).
- **Sperrung statt Löschung** (§ 35 Abs. 3 BDSG, Art. 18): wenn gesetzliche Aufbewahrung der Löschung entgegensteht — Zugriff einschränken, Zweck dokumentieren.
- **Löschanfragen (Art. 17)**: Eingang über [KANAL], Frist ein Monat (Art. 12 Abs. 3), Ausnahmen (Aufbewahrungspflicht) begründet mitteilen, Löschung bei Empfängern veranlassen (Art. 19).

### 4. Protokoll

| Datum | Datenart | Menge / Zeitraum | Ausgeführt von | Nachweis |
|---|---|---|---|---|
| [DATUM] | [DATENART] | [z. B. Anfragen vor DATUM] | [NAME / JOB] | [LOG / SCREENSHOT] |

---

*Hinweis: Diese Vorlage ist eine technisch-organisatorische Arbeitshilfe und ersetzt keine Rechtsberatung im Sinne des RDG. Gesetzliche Aufbewahrungsfristen sind vor Verwendung zu prüfen.*
