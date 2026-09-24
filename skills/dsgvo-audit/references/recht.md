# Rechtsgrundlagen — Kurzreferenz

> **Stand: September 2026.** Rechtsprechung, DPF-Status einzelner Anbieter, Positivlisten und Gesetzesvorhaben bewegen sich — bei allem Zeitkritischen **WebSearch nutzen**, nicht aus dem Gedächtnis behaupten. Wenn dieses Dokument und eine aktuelle Quelle sich widersprechen, gewinnt die Quelle; dann hier nachziehen.

## Regel vs. Recht — wie du formulierst

Das Skill arbeitet mit **konservativen Deployment-Regeln** für Kundenseiten. Die sind teils strenger als das gesetzliche Minimum. Im Bericht gilt:

| Formulierung | Wann |
|---|---|
| „**rechtswidrig** / verstößt gegen …“ | Nur wenn Norm + Sachverhalt eindeutig sind (Fonts von Google vor Consent; Impressum fehlt; GA ohne Consent) |
| „**rechtlich angreifbar** / streitig“ | Grauzone mit Behördenmeinung oder Rechtsprechung in eine Richtung (reCAPTCHA auf 6(1)(f); Cookie-lose US-Analytics) |
| „**konservative Regel / Empfehlung**“ | Unsere Agentur-Regel, die über das Minimum hinausgeht (kein US-Dienst im Art.-9-Datenpfad; Turnstile statt reCAPTCHA) |

Ein 🔴 nach konservativer Regel bleibt 🔴 im Bericht — aber mit dem Zusatz, dass eine anwaltliche Freigabe eine Ausnahme tragen kann. So bleibt das Ampelsystem ehrlich und der Mandant entscheidungsfähig.

## Normen-Landkarte

| Norm | Regelt | Merksatz |
|---|---|---|
| **DSGVO** | Verarbeitung personenbezogener Daten | Braucht immer eine Rechtsgrundlage (Art. 6); Informationspflichten Art. 13 |
| **TDDDG** (seit 14.05.2024, ex-TTDSG) | Zugriff auf / Speicherung im Endgerät | § 25: Einwilligung für **alles** außer technisch unbedingt Erforderlichem — unabhängig von Personenbezug. § 26 + EinwV (seit 01.04.2025): anerkannte Einwilligungsverwaltungsdienste (PIMS) — freiwillig, keine Pflicht |
| **DDG** (seit 14.05.2024, ex-TMG) | Impressumspflicht | § 5 DDG; Bußgeld § 33 DDG bis 50.000 € |
| **BDSG** | Öffnungsklauseln | § 38: DSB-Pflicht; § 26: Beschäftigtendaten; § 22: Art.-9-Verarbeitung |
| **MStV** | Redaktionelle Inhalte | § 18 Abs. 2: inhaltlich Verantwortlicher |
| **UWG** | Werbung, Irreführung | § 7 Abs. 2 **Nr. 2**: E-Mail-Werbung nur mit Einwilligung (Nummerierung seit 28.05.2022 — alte Quellen sagen Nr. 3); § 5: Irreführung (z. B. toter OS-Plattform-Link) |
| **VSBG** | Verbraucherschlichtung | § 36: Hinweis, ob Teilnahme; Ausnahme ≤ 10 Beschäftigte (§ 36 Abs. 3) |
| **StGB** | Berufsgeheimnis | § 203: Ärzte, Pflege, Anwälte — Dienstleistereinbindung nur nach Abs. 3 |
| **KI-VO (AI Act)** | KI-Systeme | Art. 50: Transparenz — Chatbot als KI kennzeichnen, KI-generierte Inhalte kennzeichnen; **gilt seit 02.08.2026** (Digital Omnibus Juni 2026 hat nur die maschinenlesbare Kennzeichnung für Anbieter auf 02.12.2026 verschoben) |
| **BFSG** | Barrierefreiheit | Seit 28.06.2025 für B2C-E-Commerce/-Dienste; nicht Datenschutz, aber „ist die Seite rechtlich okay“ → erwähnen |

**Zweistufigkeit merken**: § 25 TDDDG regelt das *Setzen/Lesen* auf dem Gerät → Einwilligung. Die DSGVO regelt die *anschließende Verarbeitung* → eigene Rechtsgrundlage. Berechtigtes Interesse heilt § 25 nicht.

**Weggefallen**: Die EU-OS-Plattform (ec.europa.eu/consumers/odr) wurde zum **20.07.2025** abgeschaltet (VO (EU) 2024/3228). Die Verlinkungspflicht (Art. 14 ODR-VO) ist entfallen; ein weiterhin vorhandener Link ist irreführend (§ 5 UWG) und wird abgemahnt → **entfernen**, nicht fordern.

**Nicht geltendes Recht (nicht anwenden)**: Der **Digital Omnibus** der Kommission (Vorschlag 19.11.2025 — u. a. Cookie-Regeln in die DSGVO als Art. 88a, Ein-Klick-Ablehnung, 6-Monats-Sperre, Browser-Signale) ist Stand September 2026 im Gesetzgebungsverfahren. Bis zur Verkündung gilt § 25 TDDDG unverändert. Vor jedem Audit kurz prüfen, ob sich das geändert hat.

## Art. 6(1) — Rechtsgrundlagen im Website-Kontext

| Buchstabe | Typische Anwendung | Fallstricke |
|---|---|---|
| (a) Einwilligung | Analytics, Marketing, Maps, YouTube, Newsletter, Chat-Widgets | Freiwillig, informiert, granular, widerrufbar, nachweisbar (Art. 7) |
| (b) Vertrag / vorvertraglich | Kontaktanfrage zu Leistung, Buchung, Account, Bestellung, Zahlung | Deckt kein Marketing, keine „Optimierung“ |
| (c) Rechtliche Verpflichtung | Aufbewahrung Rechnungen (§ 147 AO, § 257 HGB), DOI-Nachweis | Nur was das Gesetz verlangt |
| (d) Lebenswichtige Interessen | Praktisch nie | — |
| (e) Öffentliche Aufgabe | Nur öffentliche Stellen | — |
| (f) Berechtigtes Interesse | Betrieb/Sicherheit, Server-Logs, Spam-Schutz, Reichweitenmessung *ohne Endgerätzugriff*, Kontaktanfrage ohne Vertragsbezug, Fehler-Tracking | Interessenabwägung dokumentieren; Widerspruchsrecht Art. 21; deckt **keinen** Endgerätzugriff nach § 25 TDDDG. EuGH C-621/22 (KNLTB, 2024): auch rein kommerzielle Interessen können berechtigt sein — Abwägung bleibt Pflicht |

## Art. 9 — Besondere Kategorien

Gesundheitsdaten, Biometrie, Sexualleben, religiöse/politische/gewerkschaftliche Daten, Herkunft. Verarbeitung grundsätzlich verboten, Ausnahmen v. a.:
- **Art. 9(2)(a)** ausdrückliche Einwilligung — Regelfall für Website-Formulare
- **Art. 9(2)(h)** i. V. m. § 22 Abs. 1 Nr. 1 lit. b BDSG — Behandlung/Versorgung durch Fachpersonal unter Geheimhaltungspflicht

Praxisrelevanz: Terminanfrage bei einer Schönheitsklinik („Beratung Nasenkorrektur“), Pflegedienst-Anfrage („Pflegegrad 3, Beratungseinsatz § 37 Abs. 3 SGB XI“), Symptomfeld, Bewerbung mit Schwerbehinderungsvermerk, Chatbot-Eingabe „ich habe Diabetes“ — alles Art. 9. Folge: konservative Regel *kein US-Dienst im Datenpfad* (rechtlich: Transfer mit DPF/SCC + TIA + § 203 StGB-Absicherung nicht ausgeschlossen, aber selten den Aufwand wert), keine Behandlungsparameter in URLs/Analytics, TOMs verschärfen, DSFA prüfen, Löschkonzept.

## DSB-Pflicht (Art. 37 DSGVO, § 38 BDSG)
- ≥ **20 Personen** ständig mit automatisierter Verarbeitung beschäftigt → DSB Pflicht
- **Unabhängig von der Zahl**: Kerntätigkeit = umfangreiche Verarbeitung von Art.-9-Daten (Art. 37(1)(c)) oder umfangreiche regelmäßige systematische Überwachung (Art. 37(1)(b)); DSFA-pflichtige Verarbeitung (§ 38 Abs. 1 S. 2 BDSG)
- Einzelpraxis / kleiner Pflegedienst: ErwG 91 nennt den einzelnen Arzt ausdrücklich als *nicht* umfangreich — bei mehreren Behandlern, Pflegedienst mit Dokumentation, Online-Buchung: streitig → im Zweifel bestellen, das ist billiger als die Diskussion

## DSFA (Art. 35)
Nötig bei voraussichtlich hohem Risiko. Indizien: Art.-9-Daten in Umfang, Scoring/Profiling, systematische Überwachung, neue Technologien (auch KI-gestützte Auswertung, Chatbots mit Gesundheitsbezug, Session-Recording). **Positivlisten** der DSK / der Landesbehörden (z. B. LDI NRW) prüfen — WebSearch für die aktuelle Fassung.

## Drittlandtransfer (Kap. V)
1. **Angemessenheitsbeschluss** — **EU-US Data Privacy Framework** (Beschluss vom 10.07.2023). Gilt **nur** für Unternehmen, die auf der DPF-Liste aktiv zertifiziert sind, und nur für die dort gelisteten Datenkategorien. → Immer die konkrete Entität auf der DPF-Liste prüfen (WebSearch „Data Privacy Framework list <Anbieter>“), nie annehmen. **Stand**: EuG hat die Klage Latombe (T-553/23) am **03.09.2025** abgewiesen; **Rechtsmittel zum EuGH eingelegt am 31.10.2025, anhängig**. Bis zu einer gegenteiligen Entscheidung ist der DPF gültig — im Bericht genau so schreiben, und dem Mandanten SCC als Fallback empfehlen.
2. Sonst: **SCC** (Durchführungsbeschluss (EU) 2021/914) + **Transfer Impact Assessment** + ggf. zusätzliche Maßnahmen (Verschlüsselung mit EU-seitigem Schlüssel).
3. Sonst: Art. 49 Ausnahmen — eng, nicht für regelmäßige Transfers.

Schrems II (EuGH C-311/18) bleibt der Maßstab für die TIA-Logik. Auch bei EU-Region eines US-Konzerns (Vercel `fra1`, Supabase `eu-central-1`, AWS Frankfurt) bleibt der Konzernzugriff (CLOUD Act) ein TIA-Thema — als Restrisiko benennen, nicht verschweigen.

## Leitentscheidungen, die du zitieren kannst
- **EuGH C-673/17 (Planet49, 2019)** — vorangekreuzte Kästchen ≠ Einwilligung
- **BGH I ZR 186/17 (Cookie-Einwilligung II, 28.05.2020)** — Umsetzung Planet49 in DE
- **EuGH C-311/18 (Schrems II, 2020)** — Privacy Shield gekippt, TIA-Pflicht
- **EuGH C-210/16 (Wirtschaftsakademie, 2018)** — gemeinsame Verantwortlichkeit bei Facebook-Fanpage
- **EuGH C-40/17 (Fashion ID, 2019)** — Like-Button: Betreiber mitverantwortlich für Erhebung/Übermittlung
- **LG München I, 3 O 17493/20 (20.01.2022)** — Google Fonts dynamisch = Rechtsverletzung, 100 € Schadensersatz. Die anschließende Massen-Abmahnwelle wurde von Gerichten überwiegend als rechtsmissbräuchlich eingestuft (automatisierte Crawler, kein echter Besuch) — der Verstoß selbst bleibt
- **EuGH C-300/21 (Österreichische Post, 2023)** — Schadensersatz braucht konkreten Schaden, aber keine Erheblichkeitsschwelle
- **BGH VI ZR 10/24 (18.11.2024, Facebook-Scraping)** — bloßer **Kontrollverlust** über Daten kann ein ersatzfähiger Schaden sein (Größenordnung ~100 €) — verschärft die Risikologik bei jedem unbefugten Datenabfluss
- **EuGH C-621/22 (KNLTB, 2024)** — kommerzielles Interesse kann berechtigtes Interesse sein
- **EuG T-553/23 (Latombe, 03.09.2025)** — DPF-Beschluss erstinstanzlich bestätigt; Rechtsmittel anhängig

## Bußgeldrahmen
- Art. 83(4): bis 10 Mio. € / 2 % weltweiter Jahresumsatz — u. a. Art. 28 (fehlende AVV), Art. 30, 32, 35
- Art. 83(5): bis 20 Mio. € / 4 % — Grundsätze (Art. 5), Rechtsgrundlage (Art. 6), Einwilligung (Art. 7), Art. 9, Betroffenenrechte, Drittlandtransfer
- § 28 TDDDG: bis 300.000 € für Verstöße gegen § 25
- § 33 DDG (Impressum): Ordnungswidrigkeit bis 50.000 € — **das reale Risiko ist die wettbewerbsrechtliche Abmahnung**

Für KMU-Websites ist das praktische Risiko selten die Behörde, sondern: Abmahnung durch Wettbewerber/Verbände, Schadensersatzklagen einzelner Nutzer (Kontrollverlust-Logik), und im Pflege-/Heilbereich der Reputationsschaden. Das so auch kommunizieren — nicht mit 20-Mio-Zahlen Angst machen, wenn ein paar hundert Euro Abmahnkosten plus Aufwand der realistische Fall sind.

## RDG-Hinweis (immer ans Ende jedes Deliverables)

> Dieses Dokument ist eine technisch-organisatorische Compliance-Prüfung und ersetzt keine Rechtsberatung im Sinne des RDG. Es wurde nicht von einer Rechtsanwältin / einem Rechtsanwalt oder einer/einem Datenschutzbeauftragten erstellt. Verbindliche rechtliche Bewertungen dürfen nur durch eine Rechtsanwältin/einen Rechtsanwalt bzw. die/den bestellten Datenschutzbeauftragte(n) erfolgen. Vor Veröffentlichung ist eine anwaltliche Freigabe empfohlen. Als „konservative Regel“ gekennzeichnete Befunde gehen über das gesetzliche Minimum hinaus; eine abweichende Entscheidung ist nach anwaltlicher Prüfung möglich.
