# Baseline test results

Run on `main` at `dbe9267` in a clean checkout, before any change. Node 22, npm lockfile install.

| Command | Result | Evidence |
|---|---|---|
| `npm ci` | Installed from the lockfile, no errors | — |
| `npm test` (`vitest run`) | **6 files, 68 tests, 68 passed, 0 failed** | `evidence/unit-tests-before.txt` (verbose list of every test) |
| `npm run typecheck` (`tsc --noEmit`) | Passed | — |
| `npm run build` | Passed. `index.js` 469.53 kB (148.90 kB gzip), `index.css` 25.34 kB (6.18 kB gzip) | — |

No pre-existing failures, so every later failure would be a regression.

## Browser baseline

The baseline build was served locally at `/regex2dfa/` (the same subpath GitHub Pages uses) and driven with
Playwright Chromium. The live site at `aarushshetty346.github.io` could not be reached from the sandbox (its
proxy blocks `github.io`), so the local build of `main` stands in for production. It is the same commit the
Pages workflow deployed.

| Check | Result | Evidence |
|---|---|---|
| Semantic capture: 12 regexes × 4 stages (step totals, every graph's node and edge labels with start/accepting marks, every table) | Recorded | `evidence/semantic-baseline.json` |
| String tester: 12 regexes × 14 strings | Recorded (e.g. `a*`: ε, `a`, `aaa` accepted; `b` rejected) | same file, `strings` |
| Invalid input: `''`, `(a`, `a|`, `*a`, `)`, `a\`, `(a|b`, `a||b` | All show an alert and set `aria-invalid`; no crash | same file, `invalid` |
| Step controls on Thompson (`(a|b)*abb`): next ×3, prev, show all, reset, →, End, ←, Home | Positions 1, 2, 3, 2, 10, 0, 1, 10, 9, 0 | same file, `stepper` |
| Bottom-up: 5 grammars × 3 strings, all controllers on "Show all" | Recorded | same file, `bottom_up` |
| Console errors / page errors during the whole run | None | `capture.py` output |
| Screenshots of 9 states at 390, 768 and 1440px | Captured | `screenshots/before/` |
| Page-level horizontal overflow at 360–1920px | Subset stage: 345px at 360, 315px at 390, 180px at 768. Bottom-up: 142px at 360, 112px at 390. Others: none | `evidence/measurements.md` |

The tools that produced these are in `audit/tools/` (see `audit/tools/README.md`).
