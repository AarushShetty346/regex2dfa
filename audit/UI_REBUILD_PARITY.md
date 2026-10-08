# UI rebuild: functional parity

The whole UI was deleted and rebuilt (see [docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md)). This file records how
the rebuild was checked against `main` (merge of PR #10).

| Check | Result | Evidence |
|---|---|---|
| Unit tests (`npm test`) | 8 files, 75 tests pass | `evidence/rebuild-unit-tests.txt` |
| Typecheck + build (`npm run build`) | clean | |
| Semantic capture, `main` vs rebuild (`tools/capture.py`): 12 regexes × 4 stages (step counts, every graph node/edge with start and accepting marks, every table, step lists), 14 strings × 12 regexes on the tester, 8 invalid inputs, stepper buttons and keys, 5 grammars × 3 parse inputs | identical except headings | `evidence/rebuild-semantic-diff.txt` |
| Browser checks (`tools/e2e.py`): navigation, deep links, refresh, back/forward, focus after navigation, tab keyboard, zoom/fit, table view, theme toggle, mobile drawer, touch target sizes, focus indicators over 40 tabs, console errors | 35 / 35 pass | `evidence/rebuild-e2e-results.json` |

The only differences in the semantic diff are heading text: the home page section titles were rewritten, and each
bottom-up section heading now starts with a visually hidden "Step N:" instead of a visible "01".

`capture.py` was changed in two compatible ways so it reads both versions: accepting rings are matched by
`.node-ring` (old) or `[data-accepting]` (new), and empty edge labels (syntax-tree edges, which the new renderer no
longer draws as empty text) are ignored. `e2e.py` now targets the new class names and Ark UI roles (the Diagram/Table
switch is a radio group; the mobile menu is a dialog) and adds the theme check.

Screenshots of every state at 390 and 1440 px in both themes are in `screenshots/rebuild/`.
