# Contributing

[Deutsch → CONTRIBUTING.de.md](CONTRIBUTING.de.md)

Thanks for helping keep this accurate. Three kinds of contributions matter most, in this order:

1. **Legal updates** — a ruling, a law change, new supervisory-authority guidance that changes a verdict.
2. **Service entries** — a third-party service that is missing from `references/services.md`, or one whose behaviour changed (new region option, new DPA, started setting cookies).
3. **Patterns** — a consent-gating or self-hosting pattern for a framework that is not covered yet.

Use the issue templates for the first two if you'd rather not open a PR; they ask for the sources we need.

## Ground rules

- **Primary sources for legal claims.** A judgment (with Aktenzeichen), the law text (gesetze-im-internet.de, EUR-Lex), or the authority's own document. Law-firm blog posts are welcome as *secondary* pointers, not as the source.
- **Vendor docs for service rows.** Link the vendor's privacy page, DPA page, region documentation, and — for US vendors — the DPF list entry. Run `npm run scan -- <a page using the service>` where possible and paste the relevant lines.
- **Say whether it is law or rule.** Verdicts that go beyond the legal minimum are marked `(R)` in `services.md` and "konservative Regel" in the checklist. Don't upgrade a conservative rule into "rechtswidrig" without a source.
- **German stays the authoritative language** for everything a client will read (checklist, recht, services, templates). `SKILL.md`, README and this file are English with German legal terms as-is. Don't translate norm names.
- **Keep SKILL.md lean.** Detail goes into `references/`. If SKILL.md approaches 500 lines, split.
- **Explain the why.** The skill is written for a capable model; a sentence of reasoning beats a MUST in capitals.
- **No client data.** Fixtures and examples use invented names and `example.de`.
- **Evals before verdict-changing edits.** A change to `SKILL.md`, `references/` or `assets/` is measured, not eyeballed: run the output evals in `evals/` with the previous version as baseline and put the numbers in the PR (see `evals/README.md`). A new service verdict or legal position gets an expectation in `evals/evals.json` so a regression would show.

## Workflow

```bash
git clone https://github.com/lxhelili/dsgvo-audit && cd dsgvo-audit
npm i && npx playwright install chromium
npm test            # validate + phase1 grep test + scanner end-to-end
npm run package     # builds dist/dsgvo-audit.skill
```

`npm run validate` checks: frontmatter keys, description ≤ 1024 chars, every file referenced from SKILL.md exists, plugin/marketplace/package/SKILL versions in sync, CHANGELOG section for the version, agent frontmatter, no known regressions (brace-glob grep, § 7 Nr. 3 UWG, OS-Plattform link without removal note).

`tests/phase1.test.sh` runs the *actual* bash block from SKILL.md against `tests/fixtures/repo` — if you edit the grep commands, this is what keeps them working. `tests/grade-report.test.mjs` checks that `scripts/grade-report.mjs` accepts the golden report/DSE/Impressum fixtures and rejects the broken one; `tests/scanner.test.mjs` runs the scanner end-to-end against three cases.

Branch from `main`, open a PR, fill the checklist. CI runs the same three commands.

## Adding a service row

Pick the right table in `references/services.md`, keep the columns:

```
| <Dienst> | <Consent § 25: ja / nein / streitig> | <DSGVO-Basis> | <Drittland / Region> | <🔴🟠🟡🟢 + one-line reasoning + safer alternative> |
```

Add the origin regex to the `SIGNATURES` list in `scripts/scan-origins.mjs` so the scanner labels it, and — if a service needs a DSE module beyond the generic one — a module to `assets/datenschutzerklaerung-template.md`.

## Legal update checklist

1. Change the affected file(s) and cite the source inline where the file already does so (`recht.md` case list, table "Merksatz" column).
2. If the change affects verdicts, update `checklist.md` and/or `services.md` in the same PR.
3. Bump the law stand: `npm run version:bump -- <x.y.z> --law-stand YYYY-MM` (minor for new content, patch for corrections, major if verdicts or the report structure change).
4. Add a line under `[Unreleased]` in `CHANGELOG.md`.

## Releasing (maintainers)

Every change lands under `## [Unreleased]` in `CHANGELOG.md` as it is made. A release is then:

```bash
npm run version:bump -- 1.1.0 --law-stand 2026-11   # moves [Unreleased] into [1.1.0], syncs every version field
npm test
git commit -am "release: v1.1.0" && git tag v1.1.0
git push && git push --tags          # release.yml builds the .skill and creates the GitHub Release
```

The bump refuses an empty `[Unreleased]`; for a "law re-verified, nothing changed" patch pass `--allow-empty`.

Claude Code users get the update via `/plugin update dsgvo-audit@lxhelili`. **The Claude.ai / Cowork copy does not update itself**: download `dsgvo-audit.skill` from the new release and upload it under Settings → Skills (replace the old one). That is the last step of every release.

### Maintenance cadence

- **Quarterly (automated)**: `legal-review.yml` opens an issue on 1 Jan / Apr / Jul / Oct with the list of moving parts (DPF, § 25 TDDDG / Digital Omnibus, KI-VO, DSK, courts, BFSG). It always ends in a release that moves the law-stand. `npm run validate` warns once the law-stand is older than four months.
- **Monthly (automated)**: Dependabot for npm (Playwright) and GitHub Actions. CI installs the matching Chromium, so scanner breakage shows up there.
- **After every real audit**: ten minutes for what the skill missed — a service without a row in `services.md`, an origin the scanner labelled unknown, a finding the checklist lacked. Each becomes a row + signature, or a new eval expectation.
