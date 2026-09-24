# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/): **major** = workflow or report structure changes / legal position changes that alter verdicts; **minor** = new services, new checklist items, new patterns; **patch** = corrections and wording.

Each release also carries a `law-stand` (YYYY-MM) in `SKILL.md` → the month up to which the legal references were verified.

## [Unreleased]

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

[Unreleased]: https://github.com/lxhelili/dsgvo-audit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lxhelili/dsgvo-audit/releases/tag/v1.0.0
