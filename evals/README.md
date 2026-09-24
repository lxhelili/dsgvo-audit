# Evals — measuring whether the skill actually audits well

`npm test` proves that the *commands* work: the grep block finds what it must, the scanner sees three consent states, the validator keeps versions in sync. None of that says whether an audit produced with the skill is any good — whether it finds the GA4 tag, calls Formspree a rule-based 🔴 instead of a legal one, asks for the Kammer instead of inventing one. That is what evals measure. Without them, an edit to `SKILL.md` or `references/` is a guess: it may read better and audit worse, and nobody would know.

This directory holds three layers. Each catches a different failure.

| Layer | What it measures | How it runs | Cost |
|---|---|---|---|
| **Trigger evals** (`trigger-evals.json`) | Does the description make Claude open the skill for the right prompts and leave it closed for ordinary dev work? | skill-creator's `run_eval.py` / `run_loop.py` (`claude -p`, many short runs) | minutes, cheap |
| **Output evals** (`evals.json` + `files/`) | Given a fixture repo or page, does the audit find the right things, cite the right norms, separate rule from law, ask instead of invent? | skill-creator's with-skill / baseline subagent runs, graded by `agents/grader.md` against the `expectations` | 5 runs × 2 configs per iteration, minutes each |
| **Deterministic grader** (`scripts/grade-report.mjs`) | Structure and mandatory content of the produced files: eight sections in order, every 🔴/🟠 block complete and cited, RDG disclaimer, no "abmahnsicher", no `[PLATZHALTER]`, § 5 DDG not TMG, no ODR link | `node scripts/grade-report.mjs --report … --dse … --impressum …`; self-tested by `tests/grade-report.test.mjs` in CI | seconds, free |

The deterministic grader is not a substitute for the LLM grader. It cannot tell whether "🔴 Formspree" was justified; it can tell that the finding has no Rechtsgrundlage line, and that is the part no human should have to re-check on every iteration.

## The five output evals

Each eval is a fixture invented for this repo (no client data, `example.de`/`beispiel` names, fake keys) and a prompt phrased the way an agency developer would actually type it. The `expectations` are written to be *discriminating*: a run that skips Phase 1 and writes a generic policy fails most of them, a run that follows the skill passes most of them, and a good baseline without the skill lands in between.

| # | Name | Fixture | What it is designed to catch |
|---|---|---|---|
| 1 | `nextjs-ga-fonts-audit` | `files/nextjs-ga-fonts` — Next.js, GA4 pre-consent, Google Fonts CDN, contact route → Resend + Sentry `extra.body` + `console.log(body)`, `regions: ["iad1"]`, stale ODR link | Evidence-first audit from code only; the hop trace (a form is four recipients); the evidence-level sentence; audit-only when audit was asked |
| 2 | `static-site-runtime-scan` | `tests/fixtures/site-accept-order` served locally | That the scanner is actually run (not replaced by reading HTML); that "Nur notwendige akzeptieren" is not mistaken for accept; that a 404 behind an existing Impressum link is 🔴 |
| 3 | `praxis-art9-intake` | `files/praxis-booking/termin.html` — Behandlung select, Beschwerden/Medikamente textarea, photo upload, Formspree, Calendly | Art. 9 recognised from fields; US services in the health path as a *rule* 🔴 with the lawyer-exception note; § 203 StGB, DSFA, DSB raised; intake questions instead of a generic DSE; nothing invented |
| 4 | `astro-minimal-dse-generation` | `files/astro-minimal` — Hetzner, @fontsource, Plausible, nodemailer to own mailbox, honeypot, `INTAKE.md` with all answers | Module discipline: only what the evidence supports; Plausible on 6(1)(f) not consent; retention from intake; no placeholder left; Art. 21 highlighted; LDI NRW named |
| 5 | `ai-chatbot-processor` | `files/nextjs-ai-chat` — OpenAI route with triage system prompt, unlimited `chat_logs` in Supabase, UI text "Unser Team antwortet sofort" | LLM as Auftragsverarbeiter (DPA, no-training, retention, region); Art. 50 KI-VO labelling; Art. 22 for the triage; tax input as Art. 9-adjacent; "verify via WebSearch" for DPF status |

`expected_output` describes success in prose for the human reviewer; `expectations` are the graded statements. When an expectation passes for a clearly wrong output, or an important outcome has no expectation, tighten it — the grader agent is asked to flag exactly that.

## Running the output evals

This is skill-creator's loop, run from Claude Code with the `skill-creator` skill available (Cowork works too, with `--static` for the viewer). Ask Claude:

> Run the evals in `evals/evals.json` for the skill at `skills/dsgvo-audit`, with-skill and baseline, iteration 1, workspace `evals/workspace/`.

What happens, per skill-creator's process:

1. For each eval two subagents run in the same turn — one with the skill loaded, one without (baseline) — saving outputs to `evals/workspace/iteration-N/<eval-name>/{with_skill,without_skill}/outputs/`. Eval 2 needs the fixture served (`python3 -m http.server` in `tests/fixtures/site-accept-order`); the prompt says so.
2. A grader subagent (skill-creator's `agents/grader.md`) reads each transcript and output and marks every expectation `passed`/`failed` with evidence → `grading.json`.
3. Run the deterministic grader on the produced files and merge — it is the cheap half of the grading:
   ```bash
   node scripts/grade-report.mjs --report evals/workspace/iteration-1/nextjs-ga-fonts-audit/with_skill/outputs/datenschutz-audit-*.md --json grading-structure.json
   node scripts/grade-report.mjs --dse …/datenschutzerklaerung.md --impressum …/impressum.md --expect-no "Google Fonts|Google Analytics|YouTube|Newsletter"
   ```
4. `python -m scripts.aggregate_benchmark evals/workspace/iteration-1 --skill-name dsgvo-audit` → `benchmark.md` with pass rate, time and tokens per configuration, with-skill vs baseline.
5. Read the analyst pass: which expectations pass regardless of the skill (non-discriminating — rewrite them), which are flaky (run again before trusting them), where the skill costs tokens without buying accuracy.

When the change is to an existing version, the baseline is the *previous* skill, not "no skill": snapshot it first (`cp -r skills/dsgvo-audit evals/workspace/skill-snapshot/`) and point the baseline runs at the snapshot. That answers the question that matters for a release: did this edit make audits better or worse?

`evals/workspace/` is git-ignored. Commit `benchmark.md` of a release iteration into `evals/results/<version>.md` if you want the history in the repo; the raw transcripts stay out.

## Running the trigger evals

Trigger evals test the description alone: does Claude open the skill for these prompts? `trigger-evals.json` has 12 prompts that should trigger (German and English, casual and formal, including the "review this contact route" borderline) and 8 that should not (ordinary Supabase/Vercel/Resend work, performance, general knowledge). The negatives matter as much as the positives: the description's last sentence exists because of them.

```bash
# from the skill-creator directory, with the model that powers your sessions
python -m scripts.run_eval --eval-set <repo>/evals/trigger-evals.json --skill-path <repo>/skills/dsgvo-audit --model <model-id> --runs-per-query 3
# or let it optimise the description (60/40 train/test split, up to 5 iterations)
python -m scripts.run_loop --eval-set <repo>/evals/trigger-evals.json --skill-path <repo>/skills/dsgvo-audit --model <model-id> --verbose
```

A description that `run_loop` proposes still has to pass `npm run validate` (≤ 1024 chars, warning above 980) and still has to keep the "not for ordinary dev work" clause — the optimiser is judged on trigger rate, not on scope discipline, so read its output before applying it.

## When to run what

| Change | Run |
|---|---|
| Any edit to `SKILL.md` body, `references/`, `assets/` | Output evals, with the previous version as baseline; deterministic grader on every produced file |
| Any edit to the description | Trigger evals (3 runs per query), then output evals once — a description that triggers better can still change how the skill is read |
| Law-stand bump | Output evals — a changed verdict (`services.md`) should show up in expectations, and if it does not, add one |
| Scanner / grep changes | `npm test` is enough |
| Release | All three, with the numbers in the CHANGELOG entry ("expectations 41/48 → 46/48 vs 1.0.0") |

## Writing a new eval

1. Invent the fixture. Small, but every signal on purpose: the GA4 tag is in the layout because that is where agencies leave it; `regions: ["iad1"]` is there because Vercel's default is not Frankfurt. No real client code, keys or names.
2. Write the prompt as a developer would type it, in the language they would use. "Prüfe … auf Datenschutz" and "is this legally okay?" both belong in the set.
3. Write `expected_output` as a paragraph for the human reviewer.
4. Write 8–11 `expectations`, each verifiable from the transcript or the files, each of which a lazy run would fail. Avoid expectations that pass on presence alone ("the report mentions Google Analytics") — ask for the verdict, the norm and the file reference.
5. Add the fixture paths to `files` and run `npm run validate` — it checks that the fixtures exist and ids are unique.
6. If the eval produces a file the deterministic grader can check, add the `--expect` / `--expect-no` patterns to the eval's `grader_args` (optional field, free-form; see eval 4).

## What evals will not tell you

They measure against the fixtures and expectations you wrote. A legal position that is wrong in `recht.md` and repeated in an expectation passes with full marks. The legal review cadence in `CONTRIBUTING.md` (primary sources, law-stand) is the check on the expectations themselves; the evals check that the skill applies what the references say.
