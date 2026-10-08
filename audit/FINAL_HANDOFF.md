# Final handoff: UI/UX overhaul

Branch `feature/ui-overhaul`, based on `main` @ `dbe9267`. Not merged and not deployed: merging to `main`
deploys GitHub Pages, so that waits for your approval.

## 1. What changed

**Design system** (`src/styles.css`, `operatorPrecedence.css`): one token block (surfaces, a three-step text
ramp that passes 4.5:1 everywhere, a single blue accent, teal/amber/red reserved for accepted/handle/error, a
4px spacing scale, radii 6/8/12, a seven-step type scale, control heights that grow on touch, three motion
durations). Orange-on-everything, card glows and pill shapes are gone.

**Shell** (`src/App.tsx`, `src/app/routes.ts`): skip link; navigation grouped into Available and Planned; a
labelled menu button below 900px (Escape closes it); per-page `document.title`; focus moves to the page heading
after navigation. Topic metadata and hash parsing live in `routes.ts`.

**Home** (`src/pages/HomePage.tsx`): heading that says what the tool does; the live DFA demo in an
instrument-style panel with a pause button and current-state readout; the real five-stage pipeline with counts
for the demo regex (each links to that stage); a module list with honest status; example expressions that open
the workspace pre-filled.

**Regex to DFA** (`src/pages/RegexToDfaPage.tsx`, `src/pages/regex/*`): expression bar with the input, ε button,
help or an error with a pointer at the failing character, examples, and a facts column (alphabet, postfix,
NFA → DFA → minimal counts); a note when an invalid input leaves the last valid result on screen; the stages as an
ARIA tablist; each stage as a workbench with the canvas first, step controls docked under it, and the explanation
rail beside it. The URL now carries `?re=` and `?stage=` so a view can be shared.

**Graphs** (`src/components/graph/GraphFrame.tsx`, `describe.ts`, `AutomatonGraph.tsx`): a toolbar on every
graph with Diagram/List, zoom out/in, a readout and Fit; zoomed graphs scroll and can be dragged; the List view
is a table of states, roles and transitions built from the same data as the drawing. Active states get a dashed
halo (shape, not only colour); legends use drawn glyphs. Dagre layout and edge routing are unchanged.

**Step controls** (`StepController.tsx`): Reset separated from the forward controls by a divider; Next is the
only filled button and loses its fill when disabled; Show all has a text label on wide screens; the scrubber is
24px tall; the count is zero-padded; key hints shown where keys work; arrow keys inside a tablist no longer step.

**Tables**: sticky headers, hairline rows, start and accepting markers exposed to assistive tech, focusable
scroll containers with labels.

**Bottom-up parsing**: same header and tokens; method tabs with LR marked Planned; numbered panels; locked
sections explain why; banners with icons; amber for handles, blue for the current cell; Phosphor icon instead
of the "ℹ️" emoji.

**Planned pages** (`ComingSoon.tsx`): say the module is not built, what it will cover, and link to the working
ones.

## 2. What was preserved
- All algorithm code (`src/algorithms/**` unchanged) and the dagre layout.
- Every route id, the `./` base and hash routing; old links work unchanged.
- Every control: input, ε, examples, five stages, Next / Previous / Show all / Reset, scrubber, ←/→/Home/End,
  clickable step lists, test string input and examples, grammar textarea, sample loader, method choice, parse
  input, step logs, skeletal-reduction note.
- Every output and every explanation text (the semantic diff shows zero differences in graphs, tables, step
  counts, verdicts and bottom-up output).

## 3. What was tested
| Check | Result |
|---|---|
| `npm test` | 75/75 pass (68 original + 7 new) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass. JS 496.6 kB (154.5 kB gzip) vs 469.5 kB (148.9 kB) before; CSS 43.0 kB (8.8 kB gzip) vs 25.3 kB (6.2 kB) |
| Semantic diff, 12 regexes / 168 string tests / 5 grammars | 0 differences in computed output |
| Browser e2e (`audit/tools/e2e.py`) | 34/34 pass |
| Overflow, 9 states × 7 widths | 0px everywhere (was up to 345px) |
| `uicheck.py` + `audit.js` re-run | See `FINAL_UI_UX_AUDIT.md` |
| GitHub Pages path | Built `dist` served under `/regex2dfa/`; CSS, fonts and routes load; refresh and back/forward work |

## 4. Results
- UI audit: **27/100 → 96/100** by the EnchStyle skill's scoring (3 Critical + 11 Warnings → 4 Polish).
- Contrast candidates on the regex page 35–37 → 1 (a disabled button, exempt). Unnamed controls on phones 6 → 0.
  Font sizes 17 → 6–8. Radii 6 → 4–5.
- Known limitations: two-line tab and step labels (deliberate); the bottom-up page is long with no jump links;
  wide parse traces and big NFAs scroll inside their frames on phones; the explanation rail does not collapse
  (it moves below the canvas instead).
- Not verified: the live github.io site (blocked from the sandbox; the identical `main` build was used), real
  Safari/iPad, and a screen reader by ear.

## 5. Evidence
- Screenshots: `audit/screenshots/before/`, `audit/screenshots/after/` (same names, 390/768/1440).
- Logs and data: `audit/evidence/` (unit-test logs, build log, semantic captures and diff, e2e log, measurement
  tables, raw `uicheck` output).
- Tools to reproduce: `audit/tools/` (see its README).
- Reproduce a check: `npm run build`, serve `dist` as `/regex2dfa/`, then
  `python3 -I audit/tools/e2e.py http://localhost:4802/regex2dfa /tmp/shots`.

## Third-party guidance used
- **EnchStyle/ui-ux-audit-skill**: read SKILL.md and references; ran `scripts/uicheck.py` (reviewed first: local
  Playwright rendering only) and used its severity/scoring and "what not to flag" rules.
- **imYChaudhary22/ui-ux-audit**: read SKILL.md; reviewed `audit.js` (DOM reads only, returns JSON) and injected it
  with Playwright instead of Chrome tools; its installer was not run.
- **hueyexe/frontend-agent-skills**: read the eight named skills and applied them: visual composition (one
  dominant canvas, hierarchy by weight and space), design-system architecture (tokens first, shared components),
  IA/navigation (grouped by status, visible wayfinding, titles and focus), interaction patterns (tablist,
  segmented toggles, disabled states), usability (system status for stale results), accessibility (names, roles,
  text alternatives, targets), UX writing (honest status copy, plain labels), forms/inputs (visible labels,
  inline errors next to the field with a pointer, preserved input).
Nothing from these repos was copied into the app or added as a dependency.
