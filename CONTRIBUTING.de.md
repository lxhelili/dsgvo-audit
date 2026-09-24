# Mitwirken

[English → CONTRIBUTING.md](CONTRIBUTING.md)

Danke fürs Mithelfen. Drei Arten von Beiträgen sind am wertvollsten, in dieser Reihenfolge:

1. **Rechtsupdates** — ein Urteil, eine Gesetzesänderung, neue Behördenpapiere, die eine Bewertung ändern.
2. **Dienst-Einträge** — ein Drittanbieter, der in `references/services.md` fehlt, oder einer, dessen Verhalten sich geändert hat (neue Region, neuer AVV, setzt jetzt Cookies).
3. **Muster** — ein Consent-Gating- oder Self-Hosting-Muster für ein noch nicht abgedecktes Framework.

Für die ersten beiden gibt es Issue-Vorlagen, falls du keinen PR öffnen willst; sie fragen die Quellen ab, die wir brauchen.

## Grundregeln

- **Primärquellen für rechtliche Aussagen.** Urteil (mit Aktenzeichen), Gesetzestext (gesetze-im-internet.de, EUR-Lex) oder das Dokument der Behörde selbst. Kanzlei-Blogs sind als *sekundäre* Hinweise willkommen, nicht als Quelle.
- **Anbieter-Dokumentation für Dienstzeilen.** Datenschutzseite, AVV/DPA-Seite, Regionsdokumentation des Anbieters verlinken, bei US-Anbietern den Eintrag in der DPF-Liste. Wo möglich `npm run scan -- <Seite mit dem Dienst>` laufen lassen und die relevanten Zeilen einfügen.
- **Sagen, ob Gesetz oder Regel.** Bewertungen, die über das gesetzliche Minimum hinausgehen, sind in `services.md` mit `(R)` und im Prüfkatalog als „konservative Regel“ markiert. Eine konservative Regel wird nicht ohne Quelle zu „rechtswidrig“.
- **Deutsch bleibt die maßgebliche Sprache** für alles, was ein Mandant liest (Prüfkatalog, recht, services, Vorlagen). `SKILL.md`, README und diese Datei sind englisch mit deutschen Rechtsbegriffen im Original. Normbezeichnungen nicht übersetzen.
- **SKILL.md schlank halten.** Details gehören in `references/`. Nähert sich SKILL.md 500 Zeilen, aufteilen.
- **Das Warum erklären.** Der Skill ist für ein fähiges Modell geschrieben; ein Satz Begründung schlägt ein MUSS in Großbuchstaben.
- **Keine Mandantendaten.** Fixtures und Beispiele nutzen erfundene Namen und `example.de`.
- **Evals vor Änderungen, die Urteile berühren.** Eine Änderung an `SKILL.md`, `references/` oder `assets/` wird gemessen, nicht überflogen: Output-Evals in `evals/` mit der Vorversion als Baseline laufen lassen und die Zahlen in den PR schreiben (siehe `evals/README.md`). Ein neues Dienst-Urteil oder eine neue Rechtsposition bekommt eine Erwartung in `evals/evals.json`, damit eine Regression sichtbar wird.

## Ablauf

```bash
git clone https://github.com/lxhelili/dsgvo-audit && cd dsgvo-audit
npm i && npx playwright install chromium
npm test            # validate + Phase-1-grep-Test + Scanner End-to-End
npm run package     # baut dist/dsgvo-audit.skill
```

`npm run validate` prüft: Frontmatter-Schlüssel, Description ≤ 1024 Zeichen, jede aus SKILL.md referenzierte Datei existiert, Versionen in plugin/marketplace/package/SKILL synchron, CHANGELOG-Abschnitt zur Version, Agent-Frontmatter, keine bekannten Regressionen (Brace-Glob im grep, § 7 Nr. 3 UWG, OS-Plattform-Link ohne Entfernungs-Hinweis).

`tests/phase1.test.sh` führt den *echten* Bash-Block aus SKILL.md gegen `tests/fixtures/repo` aus — wer die grep-Befehle ändert, wird hier gehalten.

Branch von `main`, PR öffnen, Checkliste ausfüllen. CI führt dieselben drei Befehle aus.

## Dienstzeile hinzufügen

Passende Tabelle in `references/services.md` wählen, Spalten beibehalten:

```
| <Dienst> | <Consent § 25: ja / nein / streitig> | <DSGVO-Basis> | <Drittland / Region> | <🔴🟠🟡🟢 + Begründung in einem Satz + sicherere Alternative> |
```

Origin-Regex in die `SIGNATURES`-Liste in `scripts/scan-origins.mjs` eintragen, damit der Scanner den Dienst benennt, und — falls ein Dienst ein eigenes DSE-Modul braucht — ein Modul in `assets/datenschutzerklaerung-template.md`.

## Checkliste Rechtsupdate

1. Betroffene Datei(en) ändern und die Quelle dort nennen, wo die Datei das schon tut (`recht.md` Urteilsliste, Spalte „Merksatz“).
2. Ändern sich Bewertungen, im selben PR `checklist.md` und/oder `services.md` anpassen.
3. Rechtsstand bumpen: `npm run version:bump -- <x.y.z> --law-stand YYYY-MM` (minor für neue Inhalte, patch für Korrekturen, major wenn Bewertungen oder die Berichtsstruktur sich ändern).
4. Zeile unter `[Unreleased]` in `CHANGELOG.md`.

## Release (Maintainer)

Jede Änderung landet sofort unter `## [Unreleased]` in `CHANGELOG.md`. Ein Release ist dann:

```bash
npm run version:bump -- 1.1.0 --law-stand 2026-11   # verschiebt [Unreleased] nach [1.1.0], synchronisiert alle Versionsfelder
npm test
git commit -am "release: v1.1.0" && git tag v1.1.0
git push && git push --tags          # release.yml baut die .skill und erstellt das GitHub-Release
```

Der Bump verweigert ein leeres `[Unreleased]`; für einen „Recht geprüft, nichts geändert“-Patch `--allow-empty` mitgeben.

Claude-Code-Nutzer bekommen das Update per `/plugin update dsgvo-audit@lxhelili`. **Die Kopie in Claude.ai / Cowork aktualisiert sich nicht selbst**: `dsgvo-audit.skill` aus dem neuen Release laden und unter Einstellungen → Skills hochladen (alte ersetzen). Das ist der letzte Schritt jedes Releases.

### Wartungsrhythmus

- **Quartalsweise (automatisch)**: `legal-review.yml` öffnet am 1. Jan / Apr / Jul / Okt ein Issue mit den beweglichen Punkten (DPF, § 25 TDDDG / Digital Omnibus, KI-VO, DSK, Gerichte, BFSG). Es endet immer in einem Release, das den Rechtsstand weiterbewegt. `npm run validate` warnt, sobald der Rechtsstand älter als vier Monate ist.
- **Monatlich (automatisch)**: Dependabot für npm (Playwright) und GitHub Actions. CI installiert das passende Chromium, Scanner-Brüche zeigen sich dort.
- **Nach jedem echten Audit**: zehn Minuten für das, was der Skill verpasst hat — ein Dienst ohne Zeile in `services.md`, eine Origin, die der Scanner „unknown“ nannte, ein Befund, der in der Checkliste fehlte. Jedes wird Zeile + Signatur oder eine neue Eval-Expectation.
