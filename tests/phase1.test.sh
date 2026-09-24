#!/usr/bin/env bash
# phase1.test.sh — runs the *actual* static-scan commands from SKILL.md (first bash block)
# against tests/fixtures/repo and asserts they find what they must. If someone edits the
# grep in SKILL.md and breaks it, this fails — that is a bug an earlier draft shipped with.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL="$ROOT/skills/dsgvo-audit/SKILL.md"
FIX="$ROOT/tests/fixtures/repo"

# extract the first ```bash ... ``` block
BLOCK="$(awk '/^```bash/{f=1;next} /^```/{if(f){exit}} f' "$SKILL")"
[ -n "$BLOCK" ] || { echo "❌ no bash block found in SKILL.md"; exit 1; }

OUT="$(cd "$FIX" && bash -c "$BLOCK" 2>&1)"
status=0
expect() { if grep -q -- "$1" <<<"$OUT"; then echo "  ✅ finds $1"; else echo "  ❌ MISSING $1"; status=1; fi; }
forbid() { if grep -q -- "$1" <<<"$OUT"; then echo "  ❌ LEAKS $1"; status=1; else echo "  ✅ does not print $1"; fi; }

echo "phase1 static scan against fixture:"
expect '@vercel/analytics'          # dependency scan
expect 'fonts.googleapis'           # origin scan (html)
expect 'googletagmanager'           # origin scan (tsx)
expect 'localStorage'               # storage scan
expect 'resend'                     # server-side scan
expect 'NEXT_PUBLIC_GA_ID='         # env key names
forbid 'sk-FIXTURE'                 # env values must never be printed
forbid 'include="\*\.{'             # brace globs silently match nothing

exit $status
