# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/): **major** = workflow or report structure changes / legal position changes that alter verdicts; **minor** = new services, new checklist items, new patterns; **patch** = corrections and wording.

Each release also carries a `law-stand` (YYYY-MM) in `SKILL.md` → the month up to which the legal references were verified.

## [Unreleased]

## [1.3.0] – 2026-09-25

### Added

- `references/gesundheit.md` — health profile, loaded for Heilberufe, Pflege/Therapie, Apotheken, aesthetic practices or any health input: when a website is Art. 9 (incl. indirect disclosure, EuGH C-184/20), Art. 9(2)(h) + § 22 BDSG vs. explicit consent, § 203 StGB for **every** service provider (Abs. 4 S. 2 Nr. 1), booking and communication channels (Doctolib as link, Messenger, e-mail encryption, Videosprechstunde Anlage 31b BMV-Ä), DSFA/DSB thresholds (ErwG 91: single practice usually not large-scale), retention (§ 630f Abs. 3 BGB), Impressum and HWG flags, and the six findings that appear on almost every health website.
- `assets/loeschkonzept-template.md` — Löschkonzept after DIN 66398: deletion classes L1–L8 with statutory periods (§ 257 HGB/§ 147 AO incl. 8 years for Buchungsbelege since 2025, § 630f BGB, AGG/ArbGG, § 195 BGB), one row per data type with start event, every hop where the data sits, and status (S) proven / (A) client / (—) missing; blocking instead of deletion (§ 35 Abs. 3 BDSG), Art. 17/19 process, deletion log.
- `checklist.md` section 12 — data-subject rights as far as website and code show them: request channel, deletion reaching auth/storage/mailer/CRM/payment (Art. 17, 19), export (Art. 15, 20), rectification, objection (unsubscribe + `List-Unsubscribe`), withdrawal that actually removes cookies (Art. 7(3)), restriction flag, Art. 22 human review, proportionate identity checks, retention implemented not just described.
- `architecture.md` — "Betroffenenrechte im Code finden": grep patterns for delete flows and cascades, export endpoints, unsubscribe/consent-reset, and cron/TTL/retention, with the typical gaps.
- Measured in `evals/results/1.3.0-iteration-5.md`: 110/112 vs 108/112 against 1.2.3 (two runs each), no regression, no flaky expectation; the health profile made § 203 a dedicated finding covering every provider in both runs.
- `evals.json`: eval 3 gained two expectations (§ 203 for every provider incl. hoster/mailbox/agency; proportionate DSFA/DSB).

### Changed

- `main` is protected (pull request + green `validate-and-test`, linear history, no force push or deletion, admins included). CONTRIBUTING, READMEs and the `version:bump` hint describe the release via a PR and tagging the merged commit.

## [1.2.3] – 2026-09-25

### Fixed

- `processors.mjs` / `services.md`: Resend's EU region was presented as removing the US transfer ("EU-Region; sonst DPF/SCC"). Per Resend's documentation the region only changes where mail is sent from; account data, metadata and logs stay in the US — the transfer mechanism (DPF/SCC) is needed either way. Three of four iteration-4 runs repeated the wrong claim from the tool output.
- `grade-report.mjs`: a „Kein OS-Plattform-Link | ⚪️ | Inhalt fehlt“ checklist row counted as advice to add the link. Test added.
- `evals.json`: eval 4's `--expect "6 Monate"` failed a DSE that writes „sechs Monate“ — now `(6|sechs) Monate`.

### Changed

- SKILL.md Phase 5: provider addresses from general knowledge and technical claims the code does not show (HTTPS/TLS) are listed for the client to check — both 1.2.2 runs of eval 4 wrote them into the DSE unflagged.
- `summarize-evals.mjs` reads repeat runs (`<config>/run-N/`), sums pass counts, averages time and tokens, and lists flaky expectations. `evals/README.md` documents the run hygiene learned in iterations 2–4 (snapshots for both configurations, hidden grading key, repeat runs, one grader per eval).
- `docs/`: the site covers evidence IDs, the processor overview and the scan diff, and shows the measured iteration-1 numbers instead of illustrative ones.

## [1.2.2] – 2026-09-24

### Fixed

- `lint-origins.mjs` missed env keys whose name *starts* with the service keyword (`RESEND_API_KEY`, `SENTRY_DSN`) — only keys with a prefix (`NEXT_PUBLIC_GA_ID`) were recorded. Found by the iteration-3 eval run.
- `signatures.mjs` labelled `googletagmanager.com/gtag/js` as "Google Tag Manager"; gtag.js is the Google tag for GA4/Ads, not a GTM container. It now has its own signature ("Google tag (gtag.js)"), mapped to the GA row in `processors.mjs`.

### Changed

- SKILL.md report section 5 gains a **Rolle** column (Art. 28 / Art. 26 / eigener Verantwortlicher / self-hosten) — `list-processors.mjs` produced it, the report spec did not ask for it, so a 1.2.1 report dropped it (eval 1).
- SKILL.md rule 6: DPF status only from the official list with the check date — never from memory or a secondary website; if the list cannot be opened, write both branches (listed → DPF, not listed → SCC + TIA) instead of a verdict. Both 1.2.0 and 1.2.1 built "SCC + TIA" on a secondary website's "not DPF-certified" in the eval run.
- SKILL.md rule 8: for Berufsgeheimnisträger the § 203 Abs. 4 StGB obligation (§ 62a StBerG, § 43e BRAO) covers every processor that sees the content — the 1.2.1 run asked it for OpenAI only, not for the Supabase transcript store.
- `grade-report.mjs`: three false positives fixed — a regex inside a code block counted as a template placeholder; a negated „keine … im Sinne von § 25 Abs. 1 TDDDG“ made a DSE "consent-based"; a „kein Link auf ec.europa.eu/consumers/odr“ note counted as an ODR link (now only an actual link does). Tests for each.
- SKILL.md Management Summary gives the scope sentence verbatim („Gescannt: … Ein Scan erfasst nur diese Seite(n); Unterseiten … brauchen einen eigenen Scan.“) — the 1.2.1 wording still let a run name the scanned page without saying subpages need their own scan (eval 2).

## [1.2.1] – 2026-09-24

### Changed

- SKILL.md, after the 1.2.0 eval run (`evals/results/1.2.0-iteration-2.md`, 49/51 vs. 48/51 against 1.1.0): the Management Summary states what the evidence did *not* cover (unscanned subpages — one scan is one page —, GTM, server side); the evidence-level definition names the Google Fonts case (`<link>` in code is observed, the request is not); section 5 adds the recipients no scan can see (hoster, mailbox, DB host, intake); the Impressum takes no Kammer, Aufsichtsbehörde, register court or title inferred from location or trade. `list-processors.mjs --md` says the same about hoster/mailbox in its footnote.
- `evals.json`: eval 1's evidence expectation names Google Fonts as well as GA4; eval 4 gained "nothing filled in that INTAKE.md or the code does not state".

### Fixed

- `grade-report.mjs` required Art. 7 Abs. 3 in every Datenschutzerklärung; it is now required only when the DSE names consent-based processing (Art. 6(1)(a), Art. 9(2)(a), § 25(1) TDDDG). A consent-free site (cookieless analytics on lit. f) failed the check in the eval run.

## [1.2.0] – 2026-09-24

### Added

- **Evidence IDs and evidence levels.** `scripts/build-evidence.mjs` numbers every observation from the scanner, HAR parser, linter and GTM parser (E-01, E-02 … — same inputs in the same order give the same IDs; a scan that did not load is skipped, never read as clean) and prints the Evidenzverzeichnis. Every 🔴/🟠 finding now ends with `**Evidenz:** E-xx · beobachtet | abgeleitet | Mandantenangabe`; SKILL.md Phase 4 defines the three levels (the claim decides, not the tool — "GA lädt vor Consent" from code without a runtime scan is *abgeleitet*).
- **Processor overview.** `scripts/list-processors.mjs` maps every detected recipient (origins, SDKs, server-side hits, GTM tags incl. origins inside Custom HTML, form targets) to role (Art. 28 / Art. 26 / eigener Verantwortlicher / vermeiden / klären), contract, region and transfer mechanism, with the evidence IDs behind it; `--md` is the start of report section 5 plus the list of AVVs to request and the Art. 28(3) contents. Libraries that are not recipients themselves (Prisma, Nodemailer, Auth.js, AI SDK) are named with the recipient still to find. The contract status is always ⚪️ — only the client can confirm a signed AVV. Data in `scripts/lib/processors.mjs`; a test fails when a signature has no processor row.
- **Privacy change detection.** `scripts/diff-scans.mjs` compares two scans (or HAR vs. scan, or two lints): added items are 🔴 regressions (third-party origin/cookie before consent or after "Ablehnen", third-party form target, OS-Plattform link; in lint a tracking/AI SDK, a server-side recipient, a non-EU region, an ungated origin in a load context) or 🟡 review items (DSE/banner/AVV update); removed items are listed so they leave the DSE too. Pages are matched by path; a page only the current run scanned (e.g. a new route on a preview) counts as entirely new, so a tracker there still fails `--strict`; a page not scanned this time is reported as unchecked, not as "removed". `--strict` exit 1, exit 3 for a scan without result.
- `examples/ci/dsgvo-watch.yml` — weekly production scan against a committed baseline with `diff-scans.mjs --strict`, diff in the job summary. `dsgvo-gate.yml` now also diffs the PR's lint against the base branch.
- `npm run evidence`, `npm run processors`, `npm run diff`; tests for all three tools in `tests/tools.test.mjs`.

### Changed

- `grade-report.mjs`: two new checks — every 🔴/🟠 block carries an evidence line with an E-ID and a level, and every cited E-ID is listed under an `Evidenzverzeichnis` heading. Reports written for 1.1.0 fail these checks until the evidence line and the list are added. The golden fixture shows the format (section 3 → `### Evidenzverzeichnis`, section 5 with an Evidenz column).
- `services.md` / `processors.mjs`: Doctolib has a double role — Auftragsverarbeiter for the practice's appointment and patient management (AVV, Doctolib provides one), independent controller for the patient account. 1.1.0 called it "i. d. R. eigener Verantwortlicher, kein AVV-Automatismus", which would have let an audit skip a required AVV.
- SKILL.md: Phase 1f (number the evidence, list the recipients), report sections 3 and 5, finding format, "Re-audit and maintenance" in Phase 5; subagent and READMEs follow.

## [1.1.0] – 2026-09-24

### Added

- `scripts/lint-origins.mjs` — the Phase-1a grep block as one repeatable command: SDK classification from `package.json`, third-party origins in load contexts (script/link/iframe/preconnect/CSS), device storage (§ 25 TDDDG), server-side recipients, config files, function regions, env key names (never values). JSON output, `--own <domain>`, `--strict` exit 1 for fonts/CDN assets/reCAPTCHA loaded from the vendor and for trackers with no consent gate in the same file.
- `scripts/parse-gtm.mjs` — GTM container export → per-tag table: type (incl. community templates), firing/blocking triggers (built-in All Pages/Initialization/Consent Initialization resolved), Consent-Mode settings, origins found inside Custom HTML, verdict (🔴 fires on All Pages without consent condition · 🟡 consent-named trigger or NEEDS_CONSENT · ⚪️ paused). `--md` prints the table for the report.
- `scripts/parse-har.mjs` — client-recorded HAR → the scanner's JSON shape (third-party origins, Set-Cookie, cookies with attributes, security headers, mixed content); `--phase` records which banner state the client captured; says that storage keys are not in a HAR.
- `scripts/lib/signatures.mjs` — the one origin list shared by scanner, linter and both parsers; plus header/cookie-attribute checks. New signatures: Doctolib, jameda, samedi, Cal.com, hosted form services (Formspree/Tally/Typeform/Google Forms).
- Scanner: `--pages "/kontakt,/buchung"` and `--sitemap` (`--max-pages`, default 10) scan further pages, each in a fresh browser context so consent never carries over; results under `pages`, `--strict` covers all of them. Every page now also reports security headers (HSTS, CSP, Referrer-Policy, X-Content-Type-Options), first-party cookie attributes (secure/sameSite/httpOnly), mixed content, and forms with their action target and whether a Datenschutzhinweis is present (checklist 6 and 10).
- `examples/ci/dsgvo-gate.yml` — GitHub Actions example: static lint on every PR, runtime scan with `--strict` on preview deployments (`deployment_status`) or by hand (`workflow_dispatch`), JSON as artifact.
- `references/law-watch.md` — the open legal points (DPF appeal, Digital Omnibus, EinwV/PIMS, KI-VO Art. 50, DSK guidance, Fonts case law, Art. 82 damages, captcha positions, hosting regions, LLM endpoints, BFSG) with current stand, what would change where, a re-check date and the source. `npm run validate` fails a row without a date and warns when a date has passed.
- Service rows: Doctolib / jameda / samedi / Timify (link instead of widget; controller vs processor role), Microsoft 365 / Google Workspace as the mailbox every form ends in (DPA, EU residency, Art. 9 rule).
- `tests/tools.test.mjs` (linter, GTM parser, HAR parser against fixtures) and a fourth scanner case (`--pages`, headers, cookie attributes, form target); both in `npm test` and CI.

- `scripts/render-report.mjs` — Markdown → one self-contained HTML file for client delivery (system fonts, no external requests, print styles, TOC), `--pdf` via Playwright when installed (exit 4 and HTML still written otherwise). Covers report, DSE, Impressum, VVT and TOMs; `npm run render`.
- `assets/vvt-template.md` — Verzeichnis von Verarbeitungstätigkeiten (Art. 30) with the eleven typical website activities (hosting/logs, contact, booking, analytics, newsletter, applications, account, payment, AI feature, monitoring, consent log), each with the lit. a–g fields; one row of the audit's Datenfluss-Übersicht = one activity.
- `assets/toms-template.md` — TOMs (Art. 32) along Vertraulichkeit / Integrität / Verfügbarkeit / Überprüfungsverfahren; each measure marked (S) proven by scan/lint/code with the evidence location, or (A) client statement.
- `assets/cookie-banner-texte.md` — banner texts (first layer, settings layer with category tables `necessary/statistics/marketing/external` matching `patterns.md`, two-click placeholder, footer/withdrawal note, English variant) and the rule checklist with norms; "no banner when nothing needs consent".
- `assets/privacy-policy-template.en.md` — English mirror of the DSE template, same module numbers, terminology table, "German prevails" clause (Art. 12(1) for multilingual sites).
- `evals/results/1.1.0-iteration-1.md` — first measured run of the five output evals: **46/47 with the skill vs. 35/47 without** (LLM grader, one run each), deterministic grader 57/60 vs. 23/30 on the files that apply; cost ≈ 1.4–1.9× tokens. Five skill defects found and fixed (see Fixed). `scripts/summarize-evals.mjs` (`npm run evals:summary`) builds the results file from a workspace iteration.
- `evals/evals.json`: eval 3 expectation 6 corrected (Calendly script is at the end of `<body>`, not in `<head>`); eval 4 gained a "Pflicht zur Bereitstellung" expectation; eval 5 gained a § 203 StGB / § 62a StBerG expectation — both gaps named by the graders.

### Fixed

- `lint-origins.mjs --strict` no longer fails on cookieless EU analytics (Plausible, Umami, Pirsch, Fathom) loaded without a consent gate — `services.md` rates them 🟢 on Art. 6(1)(f), so the lint now prints an ℹ️ note (runtime scan must confirm no cookie/storage; DSE module + DPA; first-party proxy recommended) instead of contradicting the skill's own service table. Found by the first eval run.
- `grade-report.mjs`: the 🔴/🟠 block regex now uses the `u` flag (without it 🟡/🟢 headings matched via a shared UTF-16 surrogate and were graded as incomplete critical blocks); a negated or quoted forbidden phrase („keine ‚100 % konform'-Siegel") no longer counts as a claim; the evidence-level statement may sit in the report header above section 1; `--expect`/`--expect-no` are multiline so `^#+ ` anchors work. Eval 4's `--expect-no` is heading-anchored, so "no connection to Google Fonts" in a fonts section no longer fails it. All found by the first eval run.
- `impressum-template.md` carries a `Stand: [DATUM]` line — the eval-4 run delivered an Impressum without a date because the template had none.
- `render-report.mjs` neutralises `javascript:`/`data:` link targets (scheme allowlist, `rel="noopener noreferrer"`) and emits a `default-src 'none'` CSP meta tag.

### Changed

- SKILL.md Phase 4/5 point to the renderer and the four new templates; Phase 5 ends with "re-run Phase 3, the scanner and the grader on your own output".
- SKILL.md Phase 1 references the four scripts at the step where each is used; Files list and Phase 3 point to `law-watch.md`.

## [1.0.0] – 2026-09-24

Initial release. Law stand: 2026-09.

### Added

- Skill `dsgvo-audit`: five-phase workflow (evidence → intake → audit → report → remediation), Ampel statuses, hard rules; identity as a senior privacy-compliance analyst — not a lawyer, not a DSB (§ 43c BRAO, Art. 37–39 DSGVO), with an RDG disclaimer and "rule vs. law" framing for every deployment rule.
- `references/checklist.md`, `references/recht.md` (DPF status incl. EuG T-553/23 and the pending CJEU appeal, BGH VI ZR 10/24, EuGH C-621/22, EinwV, KI-VO Art. 50, BFSG; Digital Omnibus marked as *not* law), `references/services.md` (per-service verdicts), modular Datenschutzerklärung and Impressum templates.
- Impressum template follows the shutdown of the EU OS-Plattform on 2025-07-20 (Regulation (EU) 2024/3228): no ODR link, and the checklist flags its *presence* (§ 5 UWG); § 36 VSBG notice with the ≤ 10 employees exemption.
- `scripts/scan-origins.mjs` — Playwright runtime scanner: third-party origins, cookies (incl. `Set-Cookie` from API/redirect responses) and storage **before** consent, after "Ablehnen", after "Akzeptieren"; Impressum/Datenschutz link check; stale OS-Plattform link detection; `--strict` exit code.
- `references/architecture.md` — full-stack data-flow trace (Browser → Edge/Middleware → API/Server Actions → DB → third parties → Logs/CI → people) with a report table and per-framework hints for locating handlers.
- `references/patterns.md` — seven framework-agnostic consent-gating principles, then examples for plain HTML, Next.js, Angular (signals, `effect()` with injector), Astro, WordPress.
- Checklist sections: Datenfluss & Backend, KI-Funktionen, Angrenzend (BFSG, Shop duties, § 5 UWG).
- Service verdicts: LLM/AI APIs (DPA, no-training, retention, region, Art. 22, Art. 50 KI-VO), Firebase, Neon, Formspree/Tally, Zapier/Make, social login, review widgets, chat widgets, Cloudflare Web Analytics, Umami/Pirsch.
- Datenschutzerklärung modules: Nutzerkonto/Social Login, Zahlungsabwicklung, KI-Funktionen; multilingual note (Art. 12).
- Phase 1: `package.json` dependency scan, `.env` key-name scan (values never printed), GTM container-export request, multilingual check, evidence-level statement.
- Report: worked example of a finding block; Aufwand scale S/M/L; Datenfluss-Übersicht section.
- Repo tooling: plugin manifests, validator, packager, version bump, CI, release workflow, tests, issue/PR templates.
- Claude Code subagent `dsgvo-auditor`.
- `evals/` — measurement for the skill itself, following skill-creator's format: `evals.json` with five output evals on invented fixtures, 8–11 discriminating expectations each; `trigger-evals.json` (12 positive, 8 negative prompts); `evals/README.md` with the run procedure and the cadence per kind of change.
- `scripts/grade-report.mjs` — deterministic grader for produced files (report sections, cited findings, Aufwand scale, RDG disclaimer, no placeholders; DSE and Impressum checks; `--expect` / `--expect-no`; `--json`). Golden and broken fixtures under `tests/fixtures/reports`, self-test in `npm test` and CI.
- Scanner: the accept phase prefers an explicit accept-all button and never clicks a REJECT match ("Nur notwendige akzeptieren" before "Alle akzeptieren" is covered by `tests/fixtures/site-accept-order`); an unreachable page prints no verdict, writes `verdict: null` and exits 3; HTTP 403/429/503 get a bot-protection note.
- Validator: checks `evals/evals.json` and `trigger-evals.json`, syntax-checks repo `scripts/`, warns when the description nears the 1024-char limit, and **warns when `law-stand` is older than four months**.
- `scripts/bump-version.mjs` moves the `[Unreleased]` entries into the new section, updates the compare links, and refuses an empty `[Unreleased]` unless `--allow-empty` is given (law-stand-only patch).
- `.github/workflows/legal-review.yml` — opens a quarterly issue (1 Jan / Apr / Jul / Oct, or by hand) with the moving parts of the legal references and a close-out checklist that ends in a release.
- `.github/dependabot.yml` — monthly npm (Playwright) and GitHub Actions updates.
- `docs/` — interactive "How it works" page in English and German (GitHub Pages from `main` → `/docs`), fonts self-hosted under `docs/fonts/` so the page follows the skill's own rule.
- Node ≥ 22.

[Unreleased]: https://github.com/lxhelili/dsgvo-audit/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/lxhelili/dsgvo-audit/compare/v1.2.3...v1.3.0
[1.2.3]: https://github.com/lxhelili/dsgvo-audit/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/lxhelili/dsgvo-audit/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/lxhelili/dsgvo-audit/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/lxhelili/dsgvo-audit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lxhelili/dsgvo-audit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lxhelili/dsgvo-audit/releases/tag/v1.0.0
