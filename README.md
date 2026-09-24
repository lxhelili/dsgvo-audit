# dsgvo-audit

**A Claude skill that audits websites and web apps for German privacy law — DSGVO/GDPR, TDDDG (cookie consent) and DDG (Impressum) — and then writes or fixes the Datenschutzerklärung, Impressum and consent gating.**

[Deutsche Fassung → README.de.md](README.de.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [How it works (interactive)](https://lxhelili.github.io/dsgvo-audit/) · [Deutsch](https://lxhelili.github.io/dsgvo-audit/de/) · License: MIT

It is built for agencies and freelancers who ship client sites in Germany and want the compliance pass to be as rigorous as a code review: evidence first, every finding tied to an article or paragraph, and an honest line between *what the law says* and *what we do to be safe*.

> **Not legal advice.** This is a technical-organisational compliance tool. Its output is a review, not Rechtsberatung under the RDG. A lawyer or the client's Datenschutzbeauftragte(r) signs off before go-live. See [Legal notice](#legal-notice).

## What it does

1. **Evidence, never guesswork.** Scans the codebase (dependencies, source, config, env key names), runs a **Playwright runtime scanner** against the live site that records every third-party origin, cookie and storage key *before* any consent interaction, after "Ablehnen" and after "Akzeptieren", and traces personal data hop by hop: browser → edge/middleware → API/server actions → database → third-party processors (mail, AI APIs, CRM, payment) → logs, monitoring, CI.
2. **Audits** against a 100+ item checklist: Impressum, Art. 13 information duties, § 25 TDDDG consent, processors and third-country transfers, backend data flow, forms, AI features (Art. 22 DSGVO, Art. 50 KI-VO), Art. 9 health data for practices and care services, organisational duties, security headers.
3. **Reports** in German with 🔴/🟠/🟡/🟢/⚪️ statuses, a data-flow table, a per-finding block (Befund → Rechtsgrundlage → Risiko → Maßnahme → Aufwand) and a prioritised action plan.
4. **Fixes** on request: modular Datenschutzerklärung (DE + EN), Impressum, cookie-banner text, VVT (Art. 30) and TOMs (Art. 32) templates, consent-gating patterns (framework-agnostic principles + examples for plain HTML, Next.js, Angular, Astro, WordPress), then re-audits its own output.

Verdicts for ~50 common services (Google Fonts/Analytics/Maps/reCAPTCHA, Meta Pixel, YouTube, Hotjar, Matomo, Plausible, Vercel, Supabase, Firebase, Resend, Sentry, Stripe, Calendly, OpenAI/Anthropic/Gemini APIs, Turnstile, Friendly Captcha, …) live in [`references/services.md`](skills/dsgvo-audit/references/services.md).

## Install

### Claude Code (recommended — skill + subagent, auto-updates)

```
/plugin marketplace add lxhelili/dsgvo-audit
/plugin install dsgvo-audit@lxhelili
```

Update later with `/plugin update dsgvo-audit@lxhelili`. The `dsgvo-auditor` subagent is installed with the plugin and can be used proactively before deploys.

### Claude.ai / Cowork

Download `dsgvo-audit.skill` from the [latest release](https://github.com/lxhelili/dsgvo-audit/releases/latest) and upload it under **Settings → Skills** (or drop it into a chat and click *Save skill*). Cowork's cloud sandbox has Playwright preinstalled, so the runtime scanner can run there — but the sandbox network may not reach every client site. If a scan exits with code 3 (page not loaded), the skill falls back to browser tools / HTML fetch, or you run the scanner locally.

### Manual

Copy `skills/dsgvo-audit/` into `.claude/skills/` (project) or `~/.claude/skills/` (global), and `agents/dsgvo-auditor.md` into `.claude/agents/`.

## Use

Just ask, in whatever language you work in — the skill triggers on the topic:

```
Prüfe https://praxis-beispiel.de auf Datenschutz.
Check this repo for DSGVO before we go live: ./client-site
Ist Calendly für eine Physiotherapie-Praxis okay?
Schreib die Datenschutzerklärung für die Seite — hier ist der Code.
```

Client-facing output is German. The chat can be English, German, or anything else.

### The scanner on its own

```bash
npm i && npx playwright install chromium
npm run scan -- https://example.de --out scan.json        # pre-consent / after-reject / after-accept
npm run scan -- https://example.de --strict               # exit 1 if anything third-party fires before consent (CI gate)
npm run scan -- https://example.de --reject "Nur notwendige" --no-accept
```

One scan is one page, one state, one moment — add the pages that matter with `--pages "/kontakt,/buchung"` (or `--sitemap`); each runs in a fresh profile. Every page also reports security headers, first-party cookie attributes, mixed content and form targets.

The other three tools need no browser:

```bash
npm run lint-origins -- ./client-site --own client.de --strict   # static: SDKs, origins, storage, server-side recipients, regions, env key names
npm run gtm -- GTM-XXXX_export.json --md                        # GTM container export → tag table with triggers, Consent Mode, verdict
npm run har -- recording.har --phase pre-consent                # client-recorded HAR → the scanner's JSON shape
```

For client delivery, any produced Markdown (report, Datenschutzerklärung, Impressum, VVT, TOMs) becomes one self-contained HTML file — system fonts, no external requests, print styles — and optionally a PDF:

```bash
npm run render -- datenschutz-audit-example.de-2026-09-24.md --pdf      # → .html + .pdf next to the input
```

[`examples/ci/dsgvo-gate.yml`](examples/ci/dsgvo-gate.yml) wires the linter (every PR) and the scanner (preview deployments, `--strict`) into GitHub Actions.

Exit codes: `0` ok · `1` `--strict` violation · `2` usage error / Playwright missing · `3` page could not be loaded (network, DNS, proxy) — no verdict is printed, so a failed scan never reads as a pass. The accept phase prefers an explicit "Alle akzeptieren" button and never clicks a reject-equivalent such as "Nur notwendige akzeptieren".

## Repository layout

```
.claude-plugin/         plugin.json + marketplace.json  (Claude Code distribution)
skills/dsgvo-audit/
  SKILL.md              workflow, deployment rules, report format
  references/           checklist · recht (law, case law, fines) · law-watch (open points, re-check dates) · services · architecture (data-flow trace) · patterns (gating)
  assets/               templates: Datenschutzerklärung (DE + EN), Impressum, cookie-banner texts, VVT (Art. 30), TOMs (Art. 32)
  scripts/              scan-origins.mjs (runtime scanner) · lint-origins.mjs (static) · parse-gtm.mjs · parse-har.mjs · render-report.mjs (HTML/PDF) · lib/signatures.mjs
examples/ci/            GitHub Actions example: lint on PRs, runtime scan with --strict on preview deployments
agents/                 dsgvo-auditor subagent
tests/                  fixtures + tests that run the skill's own commands
evals/                  output evals (fixtures + expectations), trigger evals, how to run them
scripts/                validate · package (.skill) · bump-version · grade-report (deterministic checks on audit output) · summarize-evals (results file from a workspace iteration)
```

## Versioning

Semantic versioning, tags `vX.Y.Z`, one changelog. Every release records a **law stand** (`metadata.law-stand` in SKILL.md, "Stand" in `recht.md`) — the month up to which the legal references were verified. If the stand is older than a few months, verify time-sensitive points (DPF list, new rulings, Digital Omnibus status) before relying on them; the skill tells Claude to do exactly that.

Release flow for maintainers: `npm run version:bump -- 1.1.0 --law-stand 2026-11` → fill `CHANGELOG.md` → commit → `git tag v1.1.0` → push tag → the release workflow builds the `.skill` and publishes a GitHub Release.

## Evals

`npm test` proves the commands work; it says nothing about whether an audit is any good. [`evals/`](evals/README.md) holds five output evals (invented fixtures: a Next.js site with GA4 and Google Fonts, a static site with a tricky banner, a practice booking page with Art. 9 fields, a minimal Astro site for policy generation, an OpenAI chatbot) with graded expectations, a trigger-eval set for the description, and `scripts/grade-report.mjs`, a deterministic grader for the structure and mandatory content of produced reports, policies and Impressum files. Run the output evals with the previous version as baseline before every release; the README in `evals/` says how.

## Contributing

Service verdicts, legal updates and framework patterns are the parts that need many eyes. See [CONTRIBUTING.md](CONTRIBUTING.md) — the short version: every legal claim needs a primary source, every service row needs the vendor's own docs, and `npm test` must pass.

## Legal notice

This project provides technical and organisational compliance checks and document templates. It does not provide legal advice (Rechtsberatung) within the meaning of the German Rechtsdienstleistungsgesetz (RDG), and nothing it produces should be relied on as such. German law and its interpretation change; the references carry a verification date and may be outdated. Verdicts marked as *conservative rules* go beyond the legal minimum by design. No warranty of any kind — see [LICENSE](LICENSE). Have a lawyer or your Datenschutzbeauftragte(r) review anything you publish.
