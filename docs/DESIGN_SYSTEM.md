# Design system

The UI was rebuilt from scratch in October 2026. Nothing from the previous look was kept; the
algorithms in `src/algorithms/`, the dagre layout in `src/lib/graph/`, the step state in
`src/lib/stepper/` and the hash routes are unchanged.

## Where each piece came from

| Need | Source | How it is used |
|---|---|---|
| Visual direction | [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) data set | Palette from its "Developer Tool / IDE" row (code dark + run green) with the "Educational App" indigo as a second hue; font pairing "Developer Mono" (JetBrains Mono headings, IBM Plex Sans body); style "Minimalism & Swiss" on an IDE canvas; its accessibility rules (4.5:1 text, 44px touch targets, visible focus, reduced motion) |
| Accessible primitives | [Ark UI](https://ark-ui.com) (`@ark-ui/react`) | Tabs (pipeline stages, parsing method), Dialog (mobile drawer), Menu (sample grammars), ToggleGroup (Diagram/Table), Tooltip (icon buttons), Collapsible (step log, notes). Unstyled, so all appearance is our CSS |
| Component patterns | shadcn/ui and Origin UI, as reference only | Button variants, segmented control, input with suffix, numbered section rail, code editor with gutter. No Tailwind or shadcn tooling was added |
| Motion | [React Bits](https://github.com/DavidHDev/react-bits), selectively | `SplitText` → `SplitHeading` (hero), `AnimatedContent` → `Reveal` (home sections), `SpotlightCard` (module cards). Adapted to GSAP only, with reduced-motion support; see headers in `src/ui/bits/` |
| Graphs | React Flow was evaluated, not adopted | The dagre + SVG renderer passes every parity check and keeps step-to-step GSAP transitions; React Flow would add a second rendering and interaction model without fixing a failing test |

## Tokens

All colours, type sizes, radii, spacing and motion timings live in `src/styles/tokens.css`.
Components read semantic names only (`--surface`, `--fg-muted`, `--primary`, `--highlight`, …), so
the palette can change in one place. The site has a single light theme; the dark theme and its
toggle were removed in October 2026.

Colour meaning in diagrams and tables:

| Token | Meaning |
|---|---|
| `--primary` (green) | current state, current fragment, primary action, accepted |
| `--highlight` (amber) | added in this step, edge just taken, handle |
| `--secondary` (indigo) | ε-closure, precedence relation, step explanation |
| `--danger` (red) | error, conflict, rejected |
| `--grp-0…5` | partition groups during minimization (categorical) |

Every colour is paired with a shape or text (halo, double ring, dashed edge, badge label).

## Files

```
src/styles/tokens.css      tokens (light theme)
src/styles/base.css        reset, type, buttons, fields, chips, tables, Ark UI parts
src/styles/shell.css       top bar, drawer, page frame
src/styles/workbench.css   Regex to DFA workspace, diagram, step bar, inspector
src/styles/pages.css       home, bottom-up parsing, planned pages
src/ui/                    primitives (Button, IconButton, Callout, Badge, PageIntro) and React Bits adaptations
src/graph/                 StateDiagram (SVG renderer) and DiagramPanel (tools, table view, legend)
src/stepper/StepBar.tsx    step transport controls
```
