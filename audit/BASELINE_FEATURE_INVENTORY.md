# Baseline feature inventory

Source of truth: `main` at `dbe9267` ("Stop the hero buttons from jittering on hover"), inspected file by file
before any change. Branches on the remote: only `main`. The README still says operator precedence lives on
`feature/operator-precedence`, but that branch was merged into `main` (PR #2); the code is on `main` and the
page is live. No unmerged feature branch exists, so nothing outside `main` needed protecting.

The column **Preserved by** says how each behaviour was kept and how it was checked. "Semantic diff" means the
`audit/tools/capture.py` run, which drives the real UI for 12 expressions, 14 test strings each, 8 invalid
inputs and 5 grammars, before and after; see `audit/evidence/semantic-diff.txt`.

## Stack and build

| Item | Baseline | Preserved by |
|---|---|---|
| React 19 + TypeScript + Vite 8, plain CSS with tokens | `package.json`, `src/styles.css` | Same stack; no dependency added or removed |
| Graph layout | dagre (`src/components/graph/layout.ts`) | `layout.ts` unchanged |
| Rendering | Hand-written SVG (`AutomatonGraph.tsx`) | Same component; only a `zoom` prop, a halo circle and a `data-start` attribute added |
| Motion | GSAP (`gsap.context` + `revert` cleanup), Lenis smooth scroll | Same libraries and cleanup pattern; durations shortened |
| Icons / fonts | Phosphor; self-hosted Geist + Geist Mono | Unchanged |
| Tests | Vitest, 6 files / 68 tests, pure algorithm tests | All 68 still pass; 7 new tests added (75 total) |
| Deploy | `.github/workflows/deploy.yml`: test + build on push to `main`, push `dist` to `gh-pages` | Workflow untouched; `base: './'` and hash routing kept |

## Routes

| Route | Page | Preserved by |
|---|---|---|
| `#/home` (and empty / unknown hash) | Home | `parseHash` keeps the fallback; unit test + e2e "unknown route falls back to home" |
| `#/regex-dfa` | Regex to DFA | Same id. New optional query `?re=…&stage=…` is additive; plain `#/regex-dfa` still opens the default `(a|b)*abb` on the Thompson stage |
| `#/bottom-up` | Bottom-up parsing | Same id |
| `#/first-follow` | "Coming soon" placeholder | Same id, now an honest "Planned" page |
| `#/top-down` | "Coming soon" placeholder | Same id, now an honest "Planned" page |
| Hash parsing also accepted `#home` (no slash) | | Still accepted (unit test) |

## Pages, controls, inputs and outputs

### Shell
- Sidebar with brand link to home and five topic links; `aria-current="page"` on the active one; "soon" badges on
  unbuilt topics. At ≤720px it became an icon-only strip (labels hidden).
- Scroll resets to top on hash change. Lenis smooth scrolling unless reduced motion.
- **Preserved:** every link and destination; scroll reset; Lenis. Changed presentation: links grouped under
  "Available" / "Planned" instead of badges, and a labelled menu button on narrow screens instead of unlabelled icons.

### Home
- Hero heading, lede, two CTAs (Regex to DFA, Bottom-up parsing).
- Live demo: the real minimal DFA for `(a|b)*abb` reading `babb` on a 1.1s loop, with a tape and an "accepted"
  verdict; static final frame under reduced motion.
- Four topic cards (two available, two "Coming soon"). Planned cards were links to the placeholder pages.
- GSAP entrance animation.
- **Preserved:** both CTAs, the demo (same computation, same loop timing), entrance animation (shorter).
  Planned modules are no longer styled as clickable cards; they are still reachable from the sidebar.

### Regex to DFA (`src/pages/RegexToDfaPage.tsx`)
| Control / output | Behaviour | Preserved by |
|---|---|---|
| Regular expression input (label "Regular expression") | Parses on every keystroke via `useDeferredValue` | Same state flow; semantic diff on 12 expressions |
| ε button | Appends `ε` | Kept (now with an accessible name) |
| Help line | Operator legend | Kept, same text |
| Error line (`role="alert"`) | `RegexSyntaxError.message` + "(at character N)" | Same message text; a pointer under the expression now marks the character (aria-hidden) |
| Last valid result kept while invalid | Pipeline of last valid expression stays on screen | Kept, and now labelled with a note naming the expression being shown |
| Example chips | `(a|b)*abb`, `a(b|c)*d+`, `(0|1(01*0)*1)*`, `(ab|ba)?c*`, `(a|ε)b+a?` | Same list (moved to `regex/examples.ts`) |
| Stage selector (5 buttons, `aria-pressed`) with counts | Syntax tree · Thompson NFA · Subset construction · Minimize · Test strings | Same five stages, labels and counts; now an ARIA tablist with arrow/Home/End keys |
| Default stage | Thompson NFA | Kept |

Stages (each with Next / Previous / Show all / Reset, a scrubber, a step counter, ←/→/Home/End keys while focus
is outside text fields):

| Stage | Outputs | Preserved by |
|---|---|---|
| Syntax tree | Tree drawn top-down, operands in order; postfix, alphabet, pipeline counts; static explanation | Same data; semantic diff of node labels |
| Thompson NFA | NFA after each rule, new/fragment/muted tones, ε-edges dashed; step card; legend; clickable step list | Same step list and highlighting; step totals and final graphs identical |
| Subset construction | DFA under construction with new/focus tones; Thompson NFA reference with closure/move highlighting; Dtran table growing row by row with active row/cell; step list | Identical Dtran text and graphs in semantic diff |
| Minimize | DFA coloured by partition group per round (stable colours); partition chips; signature table; final minimal DFA | Identical tables and graphs |
| Test strings | Test string input; example strings (shortest accepted string etc.); tape; step card; Accepted/Rejected verdict | Identical verdicts for 12 × 14 strings |

Empty states: "Nothing built yet" (Thompson), "No DFA states yet" (subset), "Rows appear as states are
discovered." (Dtran). All kept with the same text.

### Bottom-up parsing (`src/pages/BottomUpParsingPage.tsx`, `src/features/operator-precedence/*`)
| Control / output | Preserved by |
|---|---|
| Method selector (`<select>`): Operator Precedence / LR (coming soon → `ComingSoon` card) | Now a two-tab control; LR still selectable and shows the same planned note |
| Grammar textarea (`aria-label="Grammar"`), "Load sample" select with 4 grammars | Same labels and samples |
| Malformed-grammar and not-an-operator-grammar banners (`role="alert"`); valid-grammar banner | Same text (semantic diff on 5 grammars) |
| Sections 2–4 disabled with a reason when the grammar is invalid | Same reasons |
| Leading/Trailing step controller, sets table, explanation, step log `<details>` | Same; tables identical |
| Precedence table step controller, crosshair/current/conflict cells, conflict explanation, verdict | Same; tables identical |
| Parse-a-string input, "$ is appended automatically", skeletal-reduction `<details>`, trace table with handles, reason line, ACCEPT/REJECT banner | Same; traces identical for 3 strings × 5 grammars |

### Keyboard shortcuts
| Shortcut | Where | Preserved by |
|---|---|---|
| ← / → previous / next step | Regex stages (`keyboard` prop), not in text fields | Kept; e2e and semantic stepper log identical |
| Home / End reset / show all | Same | Kept |
| Native range-input keys on the scrubber | All step controllers | Kept |
| New: ←/→/Home/End inside the stage tablist move between stages (and do not also step) | Regex page | e2e "ArrowRight on tabs does not also step" |
| New: Escape closes the mobile menu | Shell | e2e |

### Animations
Home entrance (GSAP), demo loop (interval), stage reveal (`useReveal`), graph diff animation (moved nodes glide,
new nodes pop, new edges draw), CSS transitions, reduced-motion global override. All kept with shorter
durations; the demo gained a pause button.

### Exports / downloads
None exist in the baseline. None were added.

### Compiler algorithms (`src/algorithms/**`, untouched)
Regex parser (precedence: postfix ops > concatenation > union; escapes; `ε` and `\e`), Thompson construction,
subset construction with ε-closure, partition-refinement minimization, DFA simulation; grammar parser,
operator-grammar validation, Leading/Trailing to fixed point, precedence table with conflict detection,
operator-precedence shift-reduce parsing with skeletal handle matching.
`git diff main -- src/algorithms` is empty.
