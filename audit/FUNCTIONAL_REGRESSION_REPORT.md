# Functional regression report

**Result: no functional regressions found.** Every computed output the UI shows is identical before and after.

## 1. Algorithm code
`git diff main -- src/algorithms` is empty. No algorithm, step list, highlight or simulation was changed.
`src/components/graph/layout.ts` (dagre layout and edge routing) is also unchanged.

## 2. Unit tests
| | Before (`main`) | After |
|---|---|---|
| Files | 6 | 8 |
| Tests | 68 passed, 0 failed | 75 passed, 0 failed |
| Log | `evidence/unit-tests-before.txt` | `evidence/unit-tests-after.txt` |

New tests (UI helpers only):
- `src/app/routes.test.ts`: all five routes still resolve (with and without the slash); empty/unknown hashes go
  home; the query is read after the page id; `topicHref` round-trips expressions with `|`, `ε`, `?`, `+`.
- `src/components/graph/describe.test.ts`: the text view lists every node with start/accepting flags, merges
  parallel edges exactly as the drawing does, keeps tree children in order; zoom steps clamp at both ends.

## 3. Semantic diff through the real UI
`audit/tools/capture.py` drove both builds in Chromium with the same script and `diff.py` compared the results
(`evidence/semantic-baseline.json`, `evidence/semantic-after.json`, `evidence/semantic-diff.txt`).

| What was compared | Cases | Differences |
|---|---|---|
| Step totals per stage (Tree, Thompson, Subset, Minimize) | 12 regexes × 4 stages | 0 |
| Every graph after "Show all": node labels, start/accepting marks, edge labels | 12 × 4 (+ NFA reference) | 0 |
| Every table after "Show all" (Dtran, signature tables) | 12 × 4 | 0 |
| Step-list length | 12 × 4 | 0 |
| String tester verdicts | 12 regexes × 14 strings = 168 | 0 |
| Stepper positions: next×3, prev, show all, reset, →, End, ←, Home | 10 actions | 0 (1, 2, 3, 2, 10, 0, 1, 10, 9, 0) |
| Bottom-up: sets, precedence and trace tables, banners, step totals | 5 grammars × 3 strings | 0 |
| Error alerts for 8 invalid inputs | 8 | 8 intended: same message text, plus the new aria-hidden character pointer (e.g. `(a|b▏`) appended in the DOM |
| Route headings | 6 routes | Intended copy changes only (home heading; "Bottom-Up Parsing" → "Bottom-up parsing"; section numbers "1" → "01"; planned pages now have an `h1`) |

Regexes: `a`, `ab`, `a|b`, `a*`, `(a|b)*`, `a(b|c)*`, `(a|b)*abb`, `a(b|c)*d+`, `(0|1(01*0)*1)*`, `(ab|ba)?c*`,
`(a|ε)b+a?`, `a\*b`. Strings: ε, `a`, `aaa`, `b`, `ab`, `abb`, `babb`, `abc`, `ba`, `bd`, `acd`, `c`, `0110`, `x`.
Example: for `a*`, ε / `a` / `aaa` are Accepted and `b` is Rejected in both versions.
Invalid inputs: empty, `(a`, `a|`, `*a`, `)`, `a\`, `(a|b`, `a||b`; all still alert, set `aria-invalid`, and
do not crash.

## 4. Browser flows (`evidence/e2e.txt`, 34/34 passed)
Navigation and titles, focus to `h1` after navigation, URL mirrors `?re=` and `?stage=`, refresh keeps the stage,
back/forward, home pipeline and example links open the right stage and expression, invalid `?re=` falls back
safely, unknown routes go home, rapid stepping with animation on leaves every node at full opacity, tab keyboard
behaviour, zoom/fit/list, 24px scrubber, mobile menu (open, Escape, navigate), no control under 24px on touch,
skip link, focus visible on 40 Tab stops, no console or page errors.

## 5. Behaviour changes that are intended (not regressions)
- Stage switching is a tablist; the same five stages, labels and counts.
- New optional URL query (`?re=`, `?stage=`), written with `history.replaceState` so it adds no history entries.
  Plain `#/regex-dfa` still opens `(a|b)*abb` on the Thompson stage.
- Bottom-up method chooser is two tabs instead of a `<select>`; LR still shows its planned note.
- Graph toolbar (zoom, fit, list) and the demo's pause button are additions; nothing was removed.
- Graph motion durations are shorter (glide 550→400ms, pop 500→360ms, edge draw 600→400ms).

## 6. Not verified
- The live GitHub Pages site could not be opened from the sandbox (proxy blocks `github.io`). The baseline is the
  local build of the same `main` commit, served under `/regex2dfa/`.
- Safari/iPad was not available; checks ran in Chromium with touch emulation at 390px.
- Screen-reader output was not listened to; accessible names, roles and live regions were checked in the DOM.
