# Compiler Visualizer

An interactive, client-side visualizer for compiler-design algorithms. Each algorithm is a
pure function that returns a **list of steps** (what changed, why, what to highlight), and
the UI walks through those steps with Next / Previous / Show All / Reset.

## Status

| Topic | Status |
|---|---|
| Regex → DFA (syntax tree, Thompson NFA, subset construction, minimization, string tester) | Done |
| Bottom-Up Parsing → Operator Precedence Parsing | Built on `feature/operator-precedence`; see [docs/OPERATOR_PRECEDENCE_HANDOFF.md](docs/OPERATOR_PRECEDENCE_HANDOFF.md) |
| Bottom-Up Parsing → LR Parsing | Coming soon |
| First & Follow, Top-Down (LL) | Coming soon |

## Run it

Requires Node.js 20+.

```bash
npm install
npm run dev      # start the dev server (prints a localhost URL)
npm test         # run unit tests once
npm run build    # type-check and build to dist/
```

## Stack

Vite + React + TypeScript, Vitest for tests, plain CSS with theme tokens (light and dark).
Graphs are laid out with dagre and drawn as SVG; GSAP animates step-to-step changes and
Lenis smooths page scrolling (both skipped under `prefers-reduced-motion`). Fonts are
self-hosted Geist and Geist Mono, icons are Phosphor. No backend.
