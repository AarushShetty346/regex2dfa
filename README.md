# Compiler Visualizer

An interactive, client-side visualizer for compiler-design algorithms. Each algorithm is a
pure function that returns a **list of steps** (what changed, why, what to highlight), and
the UI walks through those steps with Next / Previous / Show All / Reset.

## Status

| Topic | Status |
|---|---|
| Bottom-Up Parsing → Operator Precedence Parsing | In progress (`feature/operator-precedence`) |
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

Vite + React + TypeScript, Vitest for tests, plain CSS. No backend.
