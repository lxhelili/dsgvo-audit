## What

<!-- One paragraph: what changes and why. Link the issue if there is one. -->

## Checklist

- [ ] `npm test` passes locally (validate + phase1 + scanner)
- [ ] Legal claims cite a primary source (judgment, law text, authority document) in the PR or in the file
- [ ] If a service verdict changed: the reasoning in the "Urteil" column explains it; (R) marks conservative rules
- [ ] If law changed: `Stand` in `references/recht.md` and `metadata.law-stand` in `SKILL.md` updated (`npm run version:bump -- <x.y.z> --law-stand YYYY-MM`)
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`
- [ ] No client names, real URLs, or secrets in fixtures or examples
- [ ] Templates keep `[PLATZHALTER]` markers; references contain none
