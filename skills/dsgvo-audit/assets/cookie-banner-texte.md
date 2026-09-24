# Cookie-Banner — Texte und Regeln (§ 25 TDDDG, Art. 4 Nr. 11, Art. 7 DSGVO)

**Anwendung**: Die Texte gehören in das CMP bzw. den eigenen Banner (Gating-Code: `references/patterns.md`). Nur Kategorien und Dienste aufnehmen, die der Scan „nach Akzeptieren“ tatsächlich zeigt — ein Banner, der Dienste nennt, die nicht existieren, ist so falsch wie eine DSE, die sie verschweigt. Wenn die Website **keine** einwilligungsbedürftigen Dienste hat: **kein Banner** (ein Banner ohne Zweck ist kein Plus, sondern Rauschen). Jeden `[PLATZHALTER]` füllen.

Die Kategorie-Schlüssel (`statistics`, `marketing`, `external`) entsprechen dem Consent-State aus `patterns.md`, damit Bannertext und Gating dieselbe Sprache sprechen.

---

## Regeln, die der Text erfüllen muss (Prüfliste vor dem Einbau)

| Regel | Norm / Quelle | Woran man es erkennt |
|---|---|---|
| Ablehnen auf der **ersten Ebene**, gleich prominent, gleiche Klickzahl wie Akzeptieren | Art. 7 Abs. 3 S. 4, Art. 4 Nr. 11 DSGVO; DSK OH Telemedien; EuGH C-673/17 | Zwei gleich gestaltete Buttons, kein grauer Textlink als „Ablehnen“ |
| Keine Vorauswahl nicht-notwendiger Kategorien | EuGH C-673/17 (Planet49), BGH I ZR 186/17 | Checkboxen Statistik/Marketing/Extern standardmäßig aus |
| Kein Cookie-Wall für wesentliche Inhalte; „Ablehnen“ lässt die Seite nutzbar | Art. 7 Abs. 4 (Koppelungsverbot) | Nach „Nur notwendige“ ist der Inhalt da |
| Zwecke granular, verständlich, ohne Fachjargon; Anbieter und Drittland benannt | Art. 13, Art. 7 Abs. 2, Erwägungsgrund 42 | Jede Kategorie erklärt in einem Satz, *was* passiert |
| Widerruf so einfach wie Erteilung, jederzeit erreichbar | Art. 7 Abs. 3 | Persistenter Link „Cookie-Einstellungen“ im Footer |
| Links auf Datenschutzerklärung und Impressum **aus dem Banner** heraus erreichbar, ohne Consent | § 5 DDG, Art. 13; Banner darf Pflichtseiten nicht verdecken | Links im Banner; Pflichtseiten selbst ohne Banner-Interaktion lesbar |
| Keine Dark Patterns: kein Countdown, keine irreführenden Farben („Ablehnen“ rot = Warnung), keine Nag-Loops, „Ablehnen“ nicht als „Weniger Datenschutz“ betitelt | Art. 5 Abs. 1 lit. a, EDSA Guidelines 03/2022 | Neutrale, gleichwertige Gestaltung |
| Erneute Abfrage nach Ablehnung frühestens nach [6–12 Monaten] oder bei neuer Kategorie | DSK OH Telemedien; Digital Omnibus (Vorschlag: 6 Monate) | Consent-State versioniert mit Zeitstempel |
| Banner-Text nennt, dass es um **Zugriff auf das Endgerät** und ggf. **Übermittlung in Drittländer** geht | § 25 Abs. 1 TDDDG, Art. 49 Abs. 1 lit. a (informierte Einwilligung in Transferrisiko) | Satz zu USA/Drittland, wenn zutreffend |
| CMP selbst vom eigenen Origin oder EU-Host, ohne Cookies vor Einwilligung außer dem Consent-Cookie | § 25 Abs. 2 Nr. 2 TDDDG | Scan „vor Consent“: nur CMP-Origin (EU) und Consent-Cookie |

---

## Ebene 1 — Banner

**Titel**: Datenschutz-Einstellungen

**Text** (Standard, mit Drittland):

> Wir verwenden Cookies und ähnliche Technologien. Einige sind für den Betrieb der Website notwendig. Andere helfen uns, die Nutzung zu verstehen ([Statistik]) [, Werbung zu steuern ([Marketing])] [oder Inhalte Dritter wie [Videos / Karten] einzubinden ([Externe Medien])]. Dabei können Daten an [ANBIETER, z. B. Google] übertragen werden [, auch in die USA, wo kein dem EU-Recht gleichwertiges Datenschutzniveau garantiert ist]. Sie können Ihre Auswahl jederzeit unter „Cookie-Einstellungen“ im Fußbereich ändern oder widerrufen.
>
> [Datenschutzerklärung](/datenschutz) · [Impressum](/impressum)

**Text** (kurz, ohne Drittland — z. B. nur EU-Analytics mit Cookie):

> Wir verwenden neben technisch notwendigen Cookies eine Reichweitenmessung ([ANBIETER], Server in der EU), um unsere Website zu verbessern. Das geschieht nur mit Ihrer Einwilligung, die Sie jederzeit unter „Cookie-Einstellungen“ widerrufen können.
>
> [Datenschutzerklärung](/datenschutz) · [Impressum](/impressum)

**Buttons** (drei, gleichwertig gestaltet; Reihenfolge frei, Gewicht gleich):

| Schlüssel | Beschriftung | Verhalten |
|---|---|---|
| `accept-all` | **Alle akzeptieren** | Alle Kategorien = true, Banner schließt, Loader feuert |
| `reject-all` | **Nur notwendige** | Nur `necessary` = true; nichts wird nachgeladen; Banner schließt |
| `settings` | **Einstellungen** | Ebene 2 öffnet |

Nicht verwenden: „OK“, „Verstanden“, „Weiter“ (keine informierte Einwilligung); „Ablehnen“ als bloßer Textlink; ein Schließen-X, das als Akzeptieren zählt (X = Ablehnen oder gar nicht anbieten).

---

## Ebene 2 — Einstellungen

**Titel**: Cookie-Einstellungen

**Einleitung**:

> Hier können Sie festlegen, welche Kategorien Sie zulassen. Notwendige Technologien können nicht abgewählt werden, da die Website ohne sie nicht funktioniert. Ihre Auswahl speichern wir für [12 Monate] in einem Cookie auf Ihrem Gerät. Details zu jedem Dienst finden Sie in der [Datenschutzerklärung](/datenschutz).

**Buttons**: **Auswahl speichern** · **Alle akzeptieren** · **Nur notwendige** (wieder gleichwertig).

### Kategorie `necessary` — Notwendig (immer aktiv)

> Erforderlich für Grundfunktionen wie Seitennavigation, Sicherheit, [Login, Warenkorb] und das Speichern Ihrer Cookie-Auswahl. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG, Art. 6 Abs. 1 lit. f DSGVO.

| Name | Anbieter | Zweck | Laufzeit |
|---|---|---|---|
| `consent` | [DOMAIN] (wir) | Speichert Ihre Cookie-Auswahl | [12 Monate] |
| `[session]` | [DOMAIN] (wir) | Sitzung / Login | Sitzung |
| `[csrf]` | [DOMAIN] (wir) | Schutz vor Formular-Missbrauch | Sitzung |
| `[__cf_bm]` | [Cloudflare Inc., USA — AVV] | Bot-Schutz | 30 Minuten |

### Kategorie `statistics` — Statistik

> Hilft uns zu verstehen, wie Besucher die Website nutzen (aufgerufene Seiten, Verweildauer, Herkunft), um sie zu verbessern. Die Daten werden [pseudonymisiert / mit gekürzter IP] ausgewertet [und an [ANBIETER, LAND] übertragen]. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG.

| Name | Anbieter | Zweck | Laufzeit |
|---|---|---|---|
| `[_ga, _ga_XXXX]` | [Google Ireland Ltd., Irland; Übermittlung an Google LLC, USA (DPF)] | Besucher unterscheiden, Sitzungen zählen | [2 Jahre] |
| `[_hjSession…]` | [Hotjar Ltd., Malta] | Nutzungsanalyse, [Session-Aufzeichnung] | [30 Minuten – 1 Jahr] |

### Kategorie `marketing` — Marketing

> Ermöglicht es, Ihnen auf anderen Websites relevante Werbung zu zeigen und den Erfolg unserer Kampagnen zu messen. Dazu werden Ihre Interaktionen [anbieterübergreifend] verknüpft [und an [ANBIETER, LAND] übertragen]. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG.

| Name | Anbieter | Zweck | Laufzeit |
|---|---|---|---|
| `[_fbp]` | [Meta Platforms Ireland Ltd., Irland; USA (DPF)] | Werbeerfolgsmessung, Zielgruppen | [3 Monate] |
| `[_gcl_au]` | [Google Ireland Ltd.; USA (DPF)] | Conversion-Messung | [3 Monate] |

### Kategorie `external` — Externe Medien

> Inhalte von Videoplattformen und Kartendiensten werden standardmäßig blockiert. Wenn Sie diese Kategorie zulassen [oder ein einzelnes Element per Klick laden], werden Daten (u. a. Ihre IP-Adresse) an den jeweiligen Anbieter übertragen [, auch in die USA]. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG.

| Dienst | Anbieter | Übertragene Daten | Hinweis |
|---|---|---|---|
| [YouTube] | [Google Ireland Ltd.; USA] | IP, Geräteinfos, ggf. Google-Konto-Zuordnung | Eingebunden über youtube-nocookie.com, erst nach Klick |
| [Google Maps] | [Google Ireland Ltd.; USA] | IP, Standortdaten bei Nutzung | Alternativ: statisches Kartenbild + Link |
| [Calendly] | [Calendly LLC, USA] | IP, Terminangaben | Erst nach Klick |

---

## Zwei-Klick-Platzhalter (je Embed)

Text auf dem Platzhalter, statt des Iframes:

> **[Video / Karte / Terminbuchung] von [ANBIETER]**
> Beim Laden werden Daten (u. a. Ihre IP-Adresse) an [ANBIETER, LAND] übertragen. [Datenschutzerklärung des Anbieters](URL).
> [Button: **Einmal laden**] [Checkbox: Externe Medien von [ANBIETER] immer laden]

Der Klick ist die Einwilligung für **dieses** Element (Art. 6 Abs. 1 lit. a); die Checkbox setzt zusätzlich `external` im Consent-State.

---

## Footer-Link und Widerruf

- Footer, auf jeder Seite, neben Impressum und Datenschutz: **Cookie-Einstellungen** → öffnet Ebene 2 mit dem aktuellen Stand.
- Nach einem Widerruf (Kategorie deaktiviert und gespeichert): Consent-Cookie aktualisiert, Cookies der Dienste löschen, soweit First-Party; bereits geladene Skripte lassen sich nicht entladen → Hinweis anzeigen:

> Ihre Einstellungen wurden gespeichert. Damit bereits geladene Dienste vollständig beendet werden, wird die Seite neu geladen.

---

## Englische Fassung (für mehrsprachige Seiten — vollständig übersetzen, nicht nur die Buttons)

**Title**: Privacy settings

> We use cookies and similar technologies. Some are necessary to run this website. Others help us understand how it is used (Statistics)[, control advertising (Marketing)][ or embed third-party content such as [videos / maps] (External media)]. Data may be transferred to [PROVIDER, e.g. Google][, including to the USA, where a level of data protection equivalent to EU law is not guaranteed]. You can change or withdraw your choice at any time under “Cookie settings” in the footer.
>
> [Privacy policy](/en/privacy) · [Legal notice](/en/legal-notice)

Buttons: **Accept all** · **Only necessary** · **Settings**. Level 2: **Save selection** · **Accept all** · **Only necessary**. Categories: Necessary · Statistics · Marketing · External media.

---

## Was der Scan danach zeigen muss

- **Vor Consent**: keine Drittanbieter-Origins außer [CMP-Host, EU]; nur der Consent-Cookie und technisch notwendige Cookies.
- **Nach „Nur notwendige“**: keine neuen Origins, keine neuen Cookies.
- **Nach „Alle akzeptieren“**: genau die Dienste, die in Ebene 2 stehen — nicht mehr, nicht weniger. Jeder zusätzliche Origin ist ein fehlender Eintrag im Banner **und** in der DSE.
