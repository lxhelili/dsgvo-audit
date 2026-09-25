# Profil Gesundheit — Heilberufe, Pflege, Therapie, Ästhetik

> Laden, sobald die Website einem Heilberuf, einer Pflege- oder Therapieeinrichtung, einer Apotheke oder einer ästhetischen Praxis gehört — oder sobald ein Formular, eine Buchung oder ein Chat Gesundheitsbezug transportiert. Ergänzt `checklist.md` Abschnitt 8, ersetzt ihn nicht. Stand: 2026-09. Alles Zeitgebundene (DSK-Papiere, Positivlisten, Anbieterbedingungen) vor Auslieferung prüfen.

## 1. Wann ist es Art. 9?

Gesundheitsdaten sind alle Angaben, aus denen sich der körperliche oder geistige Gesundheitszustand ableiten lässt (Art. 4 Nr. 15, ErwG 35). Auf einer Praxis-Website reicht meist weniger, als man denkt:

| Eingabe | Art. 9? | Warum |
|---|---|---|
| Terminbuchung „Erstberatung“ bei einer Fachpraxis / ästhetischen Chirurgie | ja | Die Buchung selbst verrät die Behandlungsabsicht (EuGH C-184/20: auch mittelbar erschließbare Daten) |
| Auswahlfeld Behandlung, Symptom-/Beschwerdefeld, Medikamente, Vorerkrankungen | ja | unmittelbar |
| Foto-Upload „betroffene Stelle“ | ja, oft zusätzlich intim | unmittelbar |
| Rezeptbestellung, Überweisungswunsch, Pflegegrad, GdB | ja | unmittelbar |
| Allgemeine Kontaktanfrage an eine Hausarztpraxis ohne Inhalt | grenzwertig | Patientenstatus kann erschlossen werden → konservativ wie Art. 9 behandeln (R) |
| Bewerbung bei der Praxis | nein, außer Angaben zu Gesundheit/Schwerbehinderung | Beschäftigtendaten, § 26 BDSG |

## 2. Rechtsgrundlagen

- **Behandlungsanbahnung und -durchführung**: Art. 9 Abs. 2 lit. h i. V. m. § 22 Abs. 1 Nr. 1 lit. b BDSG — nur durch oder unter Verantwortung von Personen, die dem Berufsgeheimnis unterliegen (Art. 9 Abs. 3). Für die Terminanfrage über die Website trägt das, wenn sie tatsächlich der Behandlung dient.
- **Alles darüber hinaus** (Foto vorab, Anamnese online, Marketing, Bewertungsanfragen): ausdrückliche Einwilligung, Art. 9 Abs. 2 lit. a — eigene, nicht vorangekreuzte Checkbox, getrennt von der Kenntnisnahme der DSE, widerruflich (Art. 7 Abs. 3).
- **Datenminimierung** (Art. 5 Abs. 1 lit. c) ist hier der wirksamste Hebel: Anamnese, Medikamente und Fotos gehören in die Praxis, nicht in ein Web-Formular. Ein Formular ohne diese Felder braucht keine Art.-9-Einwilligung mehr.

## 3. Berufsgeheimnis (§ 203 StGB) — jeder Dienstleister, nicht nur der offensichtliche

Ärzte, Zahnärzte, Apotheker, Psychotherapeuten, Angehörige von Gesundheitsfachberufen mit staatlich geregelter Ausbildung (Pflege, Physio, Logopädie …) sind Berufsgeheimnisträger (§ 203 Abs. 1 Nr. 1, 2 StGB). Schon die Tatsache, dass jemand Patient ist, ist ein Geheimnis.

- § 203 Abs. 3 StGB erlaubt, Dienstleistern Geheimnisse zu offenbaren, soweit es für deren Tätigkeit erforderlich ist — **§ 203 Abs. 4 S. 2 Nr. 1 StGB** macht den Berufsgeheimnisträger strafbar, wenn er den Dienstleister nicht zur Geheimhaltung verpflichtet hat.
- Betroffen ist **jeder**, der Inhalte sehen kann: Website-Hoster, Formular-Backend, Mail-Postfach (M365/Google Workspace/Hoster-Mail), Buchungstool, Kalender-Sync, Praxis-IT, die Agentur mit Admin-Zugang.
- Im AVV: ausdrückliche Verpflichtung zur Verschwiegenheit mit Hinweis auf die Strafbarkeit, Unterauftragsverarbeiter entsprechend verpflichtet. Fehlt die Klausel → 🔴 (Gesetz), nicht (R).
- Die Agentur selbst: wer Admin-Zugriff auf Formulardaten oder Postfach hat, braucht dieselbe Verpflichtung.

## 4. Drittland

Konservative Regel (R), siehe SKILL.md Regel 4: kein US-Dienst im Pfad von Gesundheitsdaten. Rechtlich möglich wäre es (DPF der konkreten Entität oder SCC + TIA, AVV, § 203-Verpflichtung, ggf. Einwilligung) — für eine Praxis rechtfertigt der Dokumentationsaufwand das selten. Bericht: 🔴 unter der Regel, mit dem Satz, dass eine anwaltliche Freigabe eine Ausnahme tragen kann.

## 5. Terminbuchung und Kommunikation

| Kanal | Bewertung |
|---|---|
| Doctolib / samedi / jameda als **Link** | 🟡 Kein Endgerätzugriff vor dem Klick. Rolle beim Anbieter nachlesen: Doctolib ist für die Praxisverwaltung Auftragsverarbeiter (AVV), für das Patientenkonto eigener Verantwortlicher (`services.md`) |
| dieselben als **Widget** vor Consent | 🔴 § 25 TDDDG |
| Calendly / Cal.com Cloud / Typeform / Formspree | 🔴 (R) US im Gesundheitspfad |
| Eigenes Formular-Backend beim EU-Hoster, Mail an Praxispostfach | 🟢 wenn Hoster und Postfach AVV + § 203-Verpflichtung haben und die Mail nur die nötigen Angaben enthält |
| E-Mail mit Befunden | Transportverschlüsselung ist Mindestmaß; bei hohem Risiko Inhaltsverschlüsselung — DSK-Orientierungshilfe zur E-Mail-Verschlüsselung (2021) lesen und Stand prüfen |
| WhatsApp / Messenger für Patientenkommunikation | 🔴 (R) — Metadaten an Meta, kein AVV für private Konten |
| Videosprechstunde | nur zertifizierter Videodienstanbieter (Anlage 31b BMV-Ä) — Zertifikat beim Mandanten anfordern |

## 6. DSFA, DSB, Aufbewahrung

- **DSFA (Art. 35)**: Umfangreiche Verarbeitung von Gesundheitsdaten steht auf den Muss-Listen der Aufsichtsbehörden. Die Einzelpraxis ist nach ErwG 91 in der Regel **nicht** umfangreich; MVZ, Klinik, Praxisketten, Plattformen, KI-Triage schon. Im Bericht: Schwellwertanalyse dokumentieren lassen, nicht pauschal „DSFA nötig“.
- **DSB**: § 38 BDSG ab 20 Personen mit regelmäßiger automatisierter Verarbeitung; unabhängig davon Art. 37 Abs. 1 lit. c bei umfangreicher Art.-9-Kerntätigkeit — für die Einzelpraxis nach ErwG 91 meist nein, für MVZ/Klinik meist ja. Begründung ins VVT. ErwG 91 im Bericht für DSFA **und** DSB nennen; eine offene DSFA-/DSB-Frage ist ⚪️ (Mandantenfrage), kein 🟠.
- **Aufbewahrung**: Patientenakte 10 Jahre nach Abschluss der Behandlung (§ 630f Abs. 3 BGB; Berufsordnungen entsprechend). Terminanfragen, aus denen keine Behandlung wird, fallen **nicht** darunter → kurze Frist im Löschkonzept (`assets/loeschkonzept-template.md`).

## 7. Impressum und Werbung

- Impressum: Kammer, gesetzliche Berufsbezeichnung + Verleihungsstaat, Berufsordnung mit Link (`impressum-template.md`, Modul Heilberufe). Nichts davon aus dem Ort ableiten — erfragen.
- Heilmittelwerbegesetz (flaggen, nicht auditieren): Vorher-Nachher-Bilder bei operativen plastisch-chirurgischen Eingriffen ohne medizinische Notwendigkeit sind unzulässig (§ 11 Abs. 1 S. 3 HWG); Werbung der Berufsordnung (z. B. § 27 MBO-Ä). Hinweis an Anwalt für Medizinrecht.
- Bewertungs-Widgets (Jameda, Google): Einbindung wie `services.md`; Antworten auf Bewertungen dürfen das Behandlungsverhältnis nicht bestätigen (§ 203).

## 8. Befunde, die bei Gesundheits-Websites fast immer auftauchen

1. Formular fragt Anamnese/Fotos ab → 🟠 Minimierung, 🔴 wenn an US-Dienst
2. Buchungs-Widget lädt vor Consent → 🔴 § 25 TDDDG
3. Kein Hinweis und keine Art.-9-Einwilligung am Formular → 🟠
4. Kein § 203-Nachweis für Hoster/Postfach/Agentur → 🔴
5. Behandlungsname in URL, Seitentitel-Tracking oder Analytics-Event (`/termin?behandlung=brustvergroesserung`) → 🔴 an Analytics, 🟠 in Server-Logs
6. Mail-Betreff mit Behandlung („Neue Anfrage: Nasenkorrektur“) an ein Postfach ohne § 203-Klausel → 🟠
