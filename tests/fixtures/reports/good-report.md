# Datenschutz-Audit — beispiel-agentur.de — 2026-09-24

## 1. Management Summary

- Gesamtstatus: 🔴 — zwei kritische Befunde blockieren den Go-live.
- Top-Risiken: GA4 lädt vor Consent; Google Fonts vom Google-CDN; Kontaktformular-Body landet in Logs und Sentry.
- Evidenzlevel: **Code-Scan (statisch), kein Runtime-Scan** — keine Live-URL vorhanden; CMP-Verhalten zur Laufzeit nicht geprüft.
- Aufwand gesamt: ca. 1 Tag Entwicklung + Vertragsarbeit (AVV Resend).

## 2. Kritische und hohe Befunde

### 🔴 K-01 Google Analytics 4 lädt vor jeder Einwilligung
**Befund:** `app/layout.tsx:12` bindet `gtag/js?id=G-EXAMPLE123` mit `strategy="afterInteractive"` ohne Consent-Gate ein.
**Rechtsgrundlage:** § 25 Abs. 1 TDDDG (Endgerätzugriff ohne Einwilligung); Art. 6 Abs. 1 lit. a DSGVO fehlt.
**Risiko:** Bußgeld § 28 TDDDG, Abmahnung, Schadensersatz (Kontrollverlust, BGH VI ZR 10/24).
**Maßnahme:** Script erst nach Consent rendern (Prinzip 1, `patterns.md`); Consent Mode v2 zusätzlich.
**Aufwand:** S

### 🔴 K-02 Google Fonts werden zur Laufzeit von Google geladen
**Befund:** `app/layout.tsx:9–10` `preconnect` + `<link href="https://fonts.googleapis.com/css2?family=Inter">`.
**Rechtsgrundlage:** Übermittlung der IP-Adresse ohne Rechtsgrundlage, Art. 6 Abs. 1 DSGVO; LG München I, 3 O 17493/20.
**Risiko:** Automatisiert erkennbares Abmahnmuster; Schadensersatz.
**Maßnahme:** `next/font/google` (Build-time) oder `.woff2` im Repo; `preconnect` entfernen; CSP `font-src 'self'`.
**Aufwand:** S

### 🟠 H-01 Formular-Body in Logs und Sentry
**Befund:** `app/api/contact/route.ts:9` `console.log('contact request', body)`; `:22` `Sentry.captureException(e, { extra: { body } })`.
**Rechtsgrundlage:** Art. 5 Abs. 1 lit. c, Art. 32 DSGVO; Sentry als Empfänger nicht in DSE.
**Risiko:** PII in Vercel-Logs (US-Region iad1) und bei Sentry; Löschkonzept greift dort nicht.
**Maßnahme:** Logging auf Metadaten reduzieren; `extra.body` entfernen; Sentry EU-DSN + `sendDefaultPii: false`.
**Aufwand:** S

## 3. Datenfluss-Übersicht

| Datum | Quelle | Verarbeitung | Empfänger | Region | Rechtsgrundlage | Vertrag | Speicherdauer |
|---|---|---|---|---|---|---|---|
| Name, E-Mail, Telefon, Nachricht, utm_source | `/kontakt` | Route Handler `POST /api/contact` | Resend (Mail), Sentry (Fehler), Vercel Logs | iad1 (US) / US / US | Art. 6 Abs. 1 lit. b | Resend ⚪️, Sentry ⚪️, Vercel ⚪️ | ⚪️ unbekannt |

## 4. Vollständige Prüftabelle

| Nr. | Prüfpunkt | Status | Fundstelle |
|---|---|---|---|
| 1.10 | Kein OS-Plattform-Link | 🟠 | `app/layout.tsx:27` — Link vorhanden → entfernen (§ 5 UWG) |
| 3.2 | Kein nicht-essenzieller Load vor Consent | 🔴 | K-01, K-02 |
| 10.3 | Server-Logs ohne PII | 🟠 | H-01 |

## 5. Drittanbieter & Auftragsverarbeiter

| Dienst | Zweck | Daten | Rechtsgrundlage | AVV | Drittland + Mechanismus | Consent nötig? |
|---|---|---|---|---|---|---|
| Google Analytics 4 | Reichweitenmessung | IP, Client-ID, Events | Art. 6 Abs. 1 lit. a | ⚪️ | US — DPF-Status der Entität prüfen | ja |
| Resend | Transaktionsmail | Formularinhalt | Art. 6 Abs. 1 lit. b | ⚪️ | US — DPA + DPF/SCC prüfen | nein |

## 6. Maßnahmenplan

- **Sofort** (Dev, S): K-01, K-02, OS-Plattform-Link entfernen.
- **Kurzfristig** (Dev + Mandant, M): H-01, `vercel.json` → `fra1`, AVVs Resend/Sentry/Vercel abschließen.
- **Mittelfristig** (Mandant, L): Löschkonzept für Kontaktanfragen.

## 7. Offene Fragen an den Mandanten

1. Sind AVV/DPA mit Resend, Sentry und Vercel abgeschlossen und abgelegt?
2. Wie lange werden Kontaktanfragen im Postfach aufbewahrt?

## 8. Rechtlicher Hinweis

> Dieses Dokument ist eine technisch-organisatorische Compliance-Prüfung und ersetzt keine Rechtsberatung im Sinne des RDG. Es wurde nicht von einer Rechtsanwältin / einem Rechtsanwalt oder einer/einem Datenschutzbeauftragten erstellt. Verbindliche rechtliche Bewertungen dürfen nur durch eine Rechtsanwältin/einen Rechtsanwalt bzw. die/den bestellten Datenschutzbeauftragte(n) erfolgen. Vor Veröffentlichung ist eine anwaltliche Freigabe empfohlen. Als „konservative Regel“ gekennzeichnete Befunde gehen über das gesetzliche Minimum hinaus; eine abweichende Entscheidung ist nach anwaltlicher Prüfung möglich.
