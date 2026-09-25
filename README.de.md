# dsgvo-audit

**Ein Claude-Skill, der Websites und Web-Apps auf deutsches Datenschutzrecht prüft — DSGVO, TDDDG (Cookie-Einwilligung) und DDG (Impressum) — und anschließend Datenschutzerklärung, Impressum und Consent-Gating schreibt oder korrigiert.**

[English version → README.md](README.md) · [Changelog](CHANGELOG.md) · [Mitwirken](CONTRIBUTING.de.md) · [So funktioniert es (interaktiv)](https://lxhelili.github.io/dsgvo-audit/de/) · Lizenz: MIT

Gebaut für Agenturen und Freelancer, die Kundenseiten in Deutschland ausliefern und die Compliance-Prüfung so ernst nehmen wollen wie ein Code-Review: erst Evidenz, jeder Befund mit Artikel oder Paragraph, und eine ehrliche Trennung zwischen *was das Gesetz verlangt* und *was wir tun, um auf der sicheren Seite zu sein*.

> **Keine Rechtsberatung.** Dies ist ein technisch-organisatorisches Prüfwerkzeug. Die Ausgabe ist ein Review, keine Rechtsberatung im Sinne des RDG. Vor Go-live gibt eine Anwältin/ein Anwalt oder die/der Datenschutzbeauftragte des Mandanten frei. Siehe [Rechtlicher Hinweis](#rechtlicher-hinweis).

## Was es tut

1. **Evidenz statt Raten.** Scannt die Codebasis (Dependencies, Quellcode, Config, Env-Schlüsselnamen), lässt einen **Playwright-Runtime-Scanner** gegen die Live-Seite laufen, der jeden Drittanbieter-Origin, jedes Cookie und jeden Storage-Key *vor* jeder Consent-Interaktion, nach „Ablehnen“ und nach „Akzeptieren“ aufzeichnet, und verfolgt personenbezogene Daten Hop für Hop: Browser → Edge/Middleware → API/Server Actions → Datenbank → Auftragsverarbeiter (Mail, KI-APIs, CRM, Payment) → Logs, Monitoring, CI.
2. **Prüft** gegen einen Katalog mit über 100 Punkten: Impressum, Art.-13-Informationspflichten, § 25 TDDDG, Auftragsverarbeiter und Drittlandtransfer, Backend-Datenfluss, Formulare, KI-Funktionen (Art. 22 DSGVO, Art. 50 KI-VO), Art.-9-Gesundheitsdaten für Praxen und Pflegedienste, organisatorische Pflichten, Security-Header.
3. **Berichtet** auf Deutsch mit 🔴/🟠/🟡/🟢/⚪️-Status, Datenfluss-Tabelle, Befundblock (Befund → Rechtsgrundlage → Risiko → Maßnahme → Aufwand → Evidenz mit ID und Evidenzstufe) und priorisiertem Maßnahmenplan.
4. **Behebt** auf Wunsch: modulare Vorlagen für Datenschutzerklärung (DE + EN), Impressum, Cookie-Banner-Texte, VVT (Art. 30) und TOMs (Art. 32), Consent-Gating-Muster (framework-unabhängige Prinzipien + Beispiele für Plain HTML, Next.js, Angular, Astro, WordPress), dann Re-Audit der eigenen Ausgabe.

Bewertungen für rund 50 gängige Dienste (Google Fonts/Analytics/Maps/reCAPTCHA, Meta Pixel, YouTube, Hotjar, Matomo, Plausible, Vercel, Supabase, Firebase, Resend, Sentry, Stripe, Calendly, OpenAI/Anthropic/Gemini-APIs, Turnstile, Friendly Captcha, …) stehen in [`references/services.md`](skills/dsgvo-audit/references/services.md).

## Installation

### Claude Code (empfohlen — Skill + Subagent, Updates per Befehl)

```
/plugin marketplace add lxhelili/dsgvo-audit
/plugin install dsgvo-audit@lxhelili
```

Später aktualisieren mit `/plugin update dsgvo-audit@lxhelili`. Der Subagent `dsgvo-auditor` wird mit dem Plugin installiert und eignet sich für den proaktiven Check vor jedem Deploy.

### Claude.ai / Cowork

`dsgvo-audit.skill` aus dem [neuesten Release](https://github.com/lxhelili/dsgvo-audit/releases/latest) herunterladen und unter **Einstellungen → Skills** hochladen (oder in einen Chat ziehen und *Skill speichern* klicken). In der Cowork-Cloud-Sandbox ist Playwright vorinstalliert, der Runtime-Scanner kann dort laufen — das Sandbox-Netzwerk erreicht aber nicht jede Kundenseite. Endet ein Scan mit Exit-Code 3 (Seite nicht geladen), greift der Skill auf Browser-Tools / HTML-Fetch zurück, oder der Scanner läuft lokal.

### Manuell

`skills/dsgvo-audit/` nach `.claude/skills/` (Projekt) oder `~/.claude/skills/` (global) kopieren, `agents/dsgvo-auditor.md` nach `.claude/agents/`.

## Nutzung

Einfach fragen, in der Sprache, in der du arbeitest — der Skill springt auf das Thema an:

```
Prüfe https://praxis-beispiel.de auf Datenschutz.
Check this repo for DSGVO before we go live: ./client-site
Ist Calendly für eine Physiotherapie-Praxis okay?
Schreib die Datenschutzerklärung für die Seite — hier ist der Code.
```

Mandantengerichtete Ausgaben sind deutsch. Der Chat kann Englisch, Deutsch oder etwas anderes sein.

### Der Scanner allein

```bash
npm i && npx playwright install chromium
npm run scan -- https://example.de --out scan.json        # vor Consent / nach Ablehnen / nach Akzeptieren
npm run scan -- https://example.de --strict               # Exit 1, wenn vor Consent etwas Fremdes lädt (CI-Gate)
npm run scan -- https://example.de --reject "Nur notwendige" --no-accept
```

Ein Scan sieht eine Seite, einen Zustand, einen Zeitpunkt — die relevanten Unterseiten mit `--pages "/kontakt,/buchung"` (oder `--sitemap`) anhängen; jede läuft in einem frischen Profil. Jede Seite meldet außerdem Security-Header, Attribute der First-Party-Cookies, Mixed Content und Formularziele.

Die drei anderen Werkzeuge brauchen keinen Browser:

```bash
npm run lint-origins -- ./kundenseite --own kunde.de --strict   # statisch: SDKs, Origins, Endgerätzugriff, serverseitige Empfänger, Regionen, Env-Key-Namen
npm run gtm -- GTM-XXXX_export.json --md                        # GTM-Container-Export → Tag-Tabelle mit Triggern, Consent Mode, Befund
npm run har -- aufzeichnung.har --phase pre-consent             # vom Kunden aufgezeichnete HAR → JSON-Form des Scanners
```

[`examples/ci/dsgvo-gate.yml`](examples/ci/dsgvo-gate.yml) verdrahtet Linter (jeder PR) und Scanner (Preview-Deployments, `--strict`) in GitHub Actions.

Exit-Codes: `0` ok · `1` `--strict`-Verstoß · `2` Bedienfehler / Playwright fehlt · `3` Seite konnte nicht geladen werden (Netzwerk, DNS, Proxy) — es wird kein Befund ausgegeben, ein fehlgeschlagener Scan liest sich also nie als „sauber“. Die Akzeptieren-Phase bevorzugt einen expliziten „Alle akzeptieren“-Button und klickt nie eine Ablehnen-Variante wie „Nur notwendige akzeptieren“.

## Aufbau des Repositories

```
.claude-plugin/         plugin.json + marketplace.json  (Verteilung über Claude Code)
skills/dsgvo-audit/
  SKILL.md              Workflow, Deployment-Regeln, Berichtsformat
  references/           checklist · recht (Normen, Urteile, Bußgelder) · law-watch (offene Punkte, Prüfdaten) · services · architecture (Datenfluss) · patterns (Gating)
  assets/               Vorlagen: Datenschutzerklärung (DE + EN), Impressum, Cookie-Banner-Texte, VVT (Art. 30), TOMs (Art. 32)
  scripts/              scan-origins.mjs (Runtime-Scanner) · lint-origins.mjs (statisch) · parse-gtm.mjs · parse-har.mjs · render-report.mjs (HTML/PDF) · build-evidence.mjs · list-processors.mjs · diff-scans.mjs · lib/
examples/ci/            GitHub-Actions-Beispiel: Lint bei PRs, Runtime-Scan mit --strict auf Preview-Deployments
agents/                 Subagent dsgvo-auditor
tests/                  Fixtures + Tests, die die Befehle des Skills selbst ausführen
evals/                  Output-Evals (Fixtures + Erwartungen), Trigger-Evals, Anleitung
scripts/                validate · package (.skill) · bump-version · grade-report (deterministische Prüfung der Audit-Ausgaben)
```

## Versionierung

Semantic Versioning, Tags `vX.Y.Z`, ein Changelog. Jedes Release trägt einen **Rechtsstand** (`metadata.law-stand` in SKILL.md, „Stand“ in `recht.md`) — der Monat, bis zu dem die Rechtsquellen geprüft wurden. Ist der Stand älter als ein paar Monate, zeitkritische Punkte (DPF-Liste, neue Urteile, Digital-Omnibus-Status) vor Verwendung prüfen; genau das trägt der Skill Claude auch auf.

Release-Ablauf für Maintainer: `npm run version:bump -- 1.1.0 --law-stand 2026-11` → `CHANGELOG.md` ausfüllen → Release-Commit per Pull Request (`main` ist geschützt) → gemergten Commit mit `v1.1.0` taggen → Tag pushen → der Release-Workflow baut die `.skill` und veröffentlicht ein GitHub-Release.

## Evals

`npm test` belegt, dass die Befehle funktionieren — nicht, ob ein Audit gut ist. [`evals/`](evals/README.md) enthält fünf Output-Evals (erfundene Fixtures: eine Next.js-Seite mit GA4 und Google Fonts, eine statische Seite mit tückischem Banner, eine Praxis-Buchungsseite mit Art.-9-Feldern, eine minimale Astro-Seite für die DSE-Erstellung, ein OpenAI-Chatbot) mit bewerteten Erwartungen, ein Trigger-Eval-Set für die Description und `scripts/grade-report.mjs`, einen deterministischen Grader für Struktur und Pflichtinhalte erzeugter Berichte, Datenschutzerklärungen und Impressen. Vor jedem Release die Output-Evals mit der Vorversion als Baseline laufen lassen; wie, steht in `evals/README.md`.

## Mitwirken

Dienstbewertungen, Rechtsupdates und Framework-Muster sind die Teile, die viele Augen brauchen. Siehe [CONTRIBUTING.de.md](CONTRIBUTING.de.md) — kurz: jede rechtliche Aussage braucht eine Primärquelle, jede Dienstzeile die Dokumentation des Anbieters, und `npm test` muss grün sein.

## Rechtlicher Hinweis

Dieses Projekt stellt technisch-organisatorische Compliance-Prüfungen und Dokumentvorlagen bereit. Es erbringt keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG); nichts, was es erzeugt, darf als solche verstanden werden. Deutsches Recht und seine Auslegung ändern sich; die Referenzen tragen ein Prüfdatum und können veraltet sein. Als *konservative Regel* gekennzeichnete Bewertungen gehen bewusst über das gesetzliche Minimum hinaus. Keine Gewährleistung — siehe [LICENSE](LICENSE). Alles, was veröffentlicht wird, von einer Anwältin/einem Anwalt oder der/dem Datenschutzbeauftragten prüfen lassen.
