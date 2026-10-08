# Redesign plan

Written after the baseline audit and before broad implementation. It is the spec the code follows; the final
handoff says where reality differs.

## Constraints (from the brief and the repo)
- UI only. `src/algorithms/**` is not edited. Step lists, highlights and outputs come from the same pure functions.
- Keep React + plain CSS + tokens, dagre + SVG, GSAP + Lenis, Phosphor, Geist. Add no dependency.
- Keep `base: './'` and hash routes (`#/home`, `#/regex-dfa`, `#/bottom-up`, `#/first-follow`, `#/top-down`).
- Keep every control's accessible name (`Regular expression`, `Test string`, `Grammar`, `Input string`, `Next`,
  `Previous`, `Show all`, `Reset`, `Jump to step`) so the same regression script runs on both versions.

## Direction: a compiler lab workbench
One sentence: the automaton is the instrument reading, and everything else is the instrument's controls and
logbook. Concretely: a dominant canvas with its own toolbar and a docked step controller, a logbook rail
(explanation, tables, step list) beside it, hairline structure instead of glowing cards, and monospace for
anything the algorithm computed.

Directions considered and rejected: (a) keep the orange "lab instrument" palette and only fix defects; rejected
because the accent was carrying every meaning at once. (b) A light academic "paper" theme; rejected because the
product is dark-only by an earlier decision and the user asked for a dark theme.

## Tokens (`src/styles.css` `:root`)
| Group | Values |
|---|---|
| Surfaces | `--bg #090d12`, `--surface #0f151d`, `--surface-2 #141c26`, `--surface-3 #1a2430` |
| Text | `--text #f1f5f9` (≥14:1), `--text-2 #9aa9b9` (≥6.5:1), `--text-3 #8190a3` (≥4.8:1 on every surface) |
| Lines | `--border #222c38`, `--border-strong #2e3a48`, `--border-control #5a6b80` (≥3:1 text-field edge) |
| Accent | `--accent #70b8f4` (primary action, focus, current step), ink `#06121d` (8.9:1 on accent) |
| Meaning | `--ok #55cdb8` accepted/available, `--warn #e9b86a` handle/stale, `--error #f17f86` |
| Spacing | 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48 |
| Radius | 6 small controls and chips · 8 inputs and buttons · 12 panels (no pills) |
| Type | 12 / 13 / 14 / 15 / 17 / 22 / 32px; hero `clamp(32px, 3.6vw, 48px)` |
| Controls | 36px (30px for toolbar tools); 40/36px on `pointer: coarse` |
| Motion | 140ms feedback, 200ms tabs/panels, 320ms graph tone changes; ease `cubic-bezier(0.2, 0, 0, 1)` |

Partition-group tints stay categorical (six hues) because they encode equivalence classes; they are retuned to
sit on the new surfaces.

## Components
| Component | Responsibility | File |
|---|---|---|
| App shell | Skip link, grouped navigation (Available / Planned), labelled mobile menu, per-page title, focus to `h1` on navigation | `src/App.tsx` |
| Routes | Topic metadata with honest status; `parseHash` / `topicHref` with optional query | `src/app/routes.ts` |
| PageHeader, StatusBadge | Title block and text-labelled status | `src/components/ui/` |
| GraphFrame | Toolbar (Diagram/List, zoom −/+, Fit), scroll + drag pan, legend row, text view | `src/components/graph/GraphFrame.tsx` |
| describeGraph | Pure text model of a drawn graph (parallel edges merged like the drawing) | `src/components/graph/describe.ts` |
| StepController | Reset set apart, Previous / Next (primary) / Show all, 24px scrubber, step count, key hints | `src/components/stepper/StepController.tsx` |
| StageLayout | Canvas panel with docked controller, rail | `src/pages/regex/shared.tsx` |
| ComingSoon | Planned page that says so and links to working modules | `src/components/ComingSoon.tsx` |

## Pages
- **Home:** eyebrow, one heading that says what the product does, live demo (with pause), the real Regex→DFA
  pipeline (five stages with counts for the demo regex, each linking to that stage), a module list with
  Available/Planned status, example links that open the workspace with the expression filled in.
- **Regex to DFA:** page header; an expression bar (input with ε, help or error with a character pointer,
  examples; facts: alphabet, postfix, state counts); a stale-result note when the input is invalid; a five-step
  tablist; the stage workbench. URL mirrors `?re=` and `?stage=` with `replaceState` (no new history entries).
- **Bottom-up parsing:** same header, method tabs (LR marked Planned), numbered panels, shared tables and banners.
- **Planned pages:** honest status, what it will cover, links to working modules.

## Graph styling
Nodes: surface fill with a light stroke; accepting = double circle; start = incoming arrow; current / new /
result states add a dashed halo so "active" is a shape, not only a colour. Edges: one grey, accent for the step's
edge, dashed for ε. Labels: monospace with a background-coloured halo. Layout (`layout.ts`) unchanged.

## Motion
Stage reveal 280ms rise of 6px; graph diff animation kept but shorter (glide 400ms, pop 360ms, draw 400ms);
home entrance 400–500ms; all cleaned up with `gsap.context().revert()`; everything off under reduced motion.

## Responsive
≥1181px canvas + 360px rail; ≤1180 rail below in auto-fit columns; ≤960 hero and expression bar stack, stage
tabs wrap to a grid; ≤900 sidebar becomes a top bar with a menu. Tables and wide drawings scroll inside their own
containers; the page never scrolls sideways.

## Verification plan
Same unit tests + new ones; semantic diff of the capture script; e2e script for navigation, deep links,
keyboard, graph tools, mobile menu, focus and console; overflow at seven widths; both audit tools re-run.
