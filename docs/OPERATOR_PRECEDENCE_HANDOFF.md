# Operator Precedence Parsing: handoff notes

Branch: `feature/operator-precedence` · Iteration 1

## What's built

The **Bottom-Up Parsing** page (`#/bottom-up`) has a method selector. *Operator Precedence
Parsing* is fully implemented; *LR Parsing* is a "Coming soon" placeholder.

The Operator Precedence view has four numbered sections, and each one unlocks when the previous stage is valid:

1. **Grammar**: textarea plus a "Load sample" dropdown (4 samples). Reports malformed input
   (missing arrow, empty/invalid LHS, undefined non-terminal, reserved `$`, ε mixed with
   symbols) and operator-grammar violations (adjacent non-terminals, ε-productions).
2. **Leading and Trailing sets**: one terminal added per step, with the production and
   rule that caused it. Leading is computed to a fixed point first, then Trailing.
3. **Precedence table**: one relation per step. The current cell and its row/column
   headers are highlighted. Conflicts turn red immediately, keep both relations, and show
   both reasons plus the "Not an operator-precedence grammar" verdict. A final verdict
   banner appears at the end.
4. **Parse a string**: trace table (Step | Stack | Input | Relation used | Action) with
   the handle highlighted, an info note on skeletal reduction, and an ACCEPT/REJECT banner.
   This section is disabled with an explanation if the table has conflicts.

Every section uses the shared step controller (Next / Previous / Show All / Reset).

## File map

```
src/
  algorithms/                         Pure TypeScript, no React. Unit-tested.
    steps.ts                          Step<TSnapshot, THighlight>: shared step shape
    grammar/
      types.ts                        Grammar, Production, isNonTerminal, formatProduction
      parseGrammar.ts                 text → Grammar | errors
    operator-precedence/
      samples.ts                      the 4 sample grammars (used by UI and tests)
      validate.ts                     operator-grammar checks
      leadingTrailing.ts              Leading/Trailing step log (fixed point)
      precedenceTable.ts              table step log, conflict detection, lookupRelation
      parseString.ts                  shift/reduce trace, handle detection, skeletal reduction
      *.test.ts                       Vitest tests (expected values from the spec)
  components/
    ComingSoon.tsx                    placeholder card
    stepper/
      useStepper.ts                   position state for any step list (reusable)
      StepController.tsx              Next / Previous / Show All / Reset buttons
      StepExplanation.tsx             "what happened and why" panel
  features/operator-precedence/       React UI only; no algorithm logic here
    OperatorPrecedenceView.tsx        runs the pipeline (analyze()) and lays out the sections
    Section.tsx                       numbered card with optional "disabled" reason
    GrammarInput.tsx                  textarea, samples, errors
    LeadingTrailingView.tsx           sets table and step log
    PrecedenceTableView.tsx           grid, conflict display, verdict
    ParseTraceView.tsx                input form, trace table, stack rendering
    operatorPrecedence.css
  pages/                              HomePage, BottomUpParsingPage (method selector)
  App.tsx                             sidebar plus hash routing (#/bottom-up)
  styles.css                          global styles and colour tokens (light and dark)
```

**Rule of thumb:** to change *what* is computed, edit `src/algorithms/` and its tests. To change
*how it looks*, edit `src/features/`. The two only meet through the exported types.

## The step-log data structure

Every algorithm returns `Step[]` instead of just a result. The base shape is in `src/algorithms/steps.ts`:

```ts
interface Step<TSnapshot, THighlight> {
  description: string;   // what changed, e.g. "Set + ⋖ *"
  reason: string;        // why: production / rule / set entry responsible
  highlight: THighlight; // what the UI should emphasise for this step
  snapshot: TSnapshot;   // FULL state after this step (read-only)
}
```

Each algorithm extends it with its own fields. Below is a real precedence-table step for
sample 1 (`snapshot` is shortened here):

```ts
{
  row: '+', col: '*', relation: '⋖',
  production: { id: 0, lhs: 'E', rhs: ['E', '+', 'T'], line: 1 },
  conflictWith: undefined,           // set to the clashing entries on a conflict
  description: 'Set + ⋖ *',
  reason: '+ ⋖ * because of E → E + T and * ∈ Leading(T).',
  highlight: { row: '+', col: '*' },
  snapshot: {
    cells: { '+': { '+': [{ relation: '⋗', reason: '…' }], '*': [{ relation: '⋖', … }], … }, … },
    conflicts: [],
  },
}
```

And a parse step (a *reduce* while parsing `id + id * id`):

```ts
{
  before: { stack: [{symbol:'$'}, {symbol:'F'}, {symbol:'+', relation:'⋖'}, {symbol:'F'},
                    {symbol:'*', relation:'⋖'}, {symbol:'F'}],
            input: ['$'] },
  topTerminal: '*', lookahead: '$', relation: '⋗',
  action: { type: 'reduce', handle: ['F','*','F'], production: /* T → T * F */, candidates: [/* … */] },
  highlight: { topTerminalIndex: 4, handle: { start: 3, end: 5 } },
  description: 'Reduce by T → T * F',
  reason: '* ⋗ $, so the handle ends at the top of the stack. It starts after + ⋖ *. …',
  snapshot: { stack: [$, F, +, T], input: ['$'] },   // state AFTER the reduce
}
```

**Why full snapshots?** The UI renders `steps[current]` directly. Previous, Reset and Show All
need no undo logic or replaying, so the UI can't drift out of sync with the algorithm. The
grammars are tiny, so copying the state at every step costs nothing noticeable.

**How the UI uses it:** `useStepper(steps.length, resetKey)` stores `shown` (0..total). The
current step is `steps[shown - 1]`. A new step list (e.g. the grammar was edited) resets the
position because `resetKey` changes.

Step types per algorithm:

| Algorithm | Step type | Extra fields |
|---|---|---|
| Leading/Trailing | `LeadingTrailingStep` | `kind: 'add' \| 'fixed-point'`, `set`, `pass`, `nonTerminal`, `terminal`, `production`, `rule`, `fromNonTerminal` |
| Precedence table | `TableStep` | `row`, `col`, `relation`, `production`, `conflictWith` |
| String parsing | `ParseStep` | `before`, `topTerminal`, `lookahead`, `relation`, `action` |

## Key algorithm decisions

- **Trailing = Leading of the reversed body.** One implementation reads the body in either
  direction (`leadingTrailing.ts`). Repeated passes run until a pass adds nothing (a fixed
  point), because `A → B…` reads Leading(B), which may still be incomplete.
- **Duplicate relations produce no step.** Re-adding a relation already in a cell is not a
  change. A *different* relation in a filled cell is a conflict: both are kept.
- **Handle detection** (`findHandleStart` in `parseString.ts`): when top-terminal ⋗ input, walk
  down the stack terminal by terminal, skipping over `≐` pairs, until a terminal `s` with
  `s ⋖ (last popped terminal)`. The handle is everything above `s`, including non-terminals
  next to the handle's terminals (e.g. both `F`s in `F * F`). The bottom `$` always stops the walk.
- **Skeletal reduction** (`matchBySkeleton`): the parser never applies unit productions like
  `E → T` (they contain no terminal, so nothing can trigger them). Handles are therefore
  matched by **terminal skeleton**, with every non-terminal replaced by `N`. `F + F` → `N + N`
  matches `E → E + T`. The LHS of the first matching production is pushed. If several
  productions match, the trace says so.
- **Accept** when the stack is `$ N` (any single non-terminal) and the input is `$`.

## How to run

```bash
npm install
npm run dev        # http://localhost:5173 → "Bottom-Up Parsing" in the sidebar
npm test           # Vitest, runs once (npm run test:watch to re-run on save)
npm run typecheck  # TypeScript only
npm run build      # typecheck + production build to dist/
```

Tested with Node 24, npm 11. Installed versions: React 19, Vite 8, TypeScript 7, Vitest 5.

## Tests

`src/algorithms/**/*.test.ts` has 39 tests, all passing. They cover parsing and validation,
Leading/Trailing (sample 1), the full expected table for sample 1, conflicts in (+,+) and (*,*)
for sample 4, the five parse expectations from the spec, handle contents and highlights,
and pre-parse rejections.

## Known limitations and bugs

- **No UI tests.** Only the algorithms are unit-tested; the UI was checked by hand in the
  browser. Adding React Testing Library would need new dev dependencies.
- **Analysis runs on every keystroke** in the grammar box, so step positions reset while typing.
  It's fast enough, but a "half-typed" grammar shows errors as you type.
- **The parse input is kept when switching grammars.** After loading another sample, the old
  test string may be rejected as containing unknown tokens until you type a new one.
- **Tokenisation is space-based.** `E+T` is one token, and the error message hints at this.
  `|` cannot be a terminal, and terminals cannot start with an uppercase letter.
- **Only the first adjacent non-terminal pair** per production is reported.
- **Ambiguous skeletons:** if two productions have the same skeleton (e.g. `E → E + E` and
  `T → T + T`), the first one is used. Acceptance is unaffected, but the pushed LHS may not be
  the "intended" one.
- **Not detected:** unreachable or unproductive non-terminals.
- **Not implemented:** precedence functions (f/g), error recovery, parse trees.
- **Dark mode** follows the OS setting only; there is no toggle.

## TODO for the next iteration (in priority order)

1. **Component tests** for the step controller and each section (needs `@testing-library/react`
   and `jsdom`; ask before adding).
2. **Reset or suggest test strings per sample** (e.g. a dropdown of accept/reject examples),
   and clear the parse input when the grammar changes.
3. **Keyboard shortcuts** for the step controller (←/→, Home/End), then reuse them everywhere.
4. **Debounce grammar analysis**, or add an "Analyze" button.
5. **Precedence functions** f/g built from the table (with their own step log).
6. **Parse tree or derivation view** built from the reduce steps.
7. **LR Parsing** under Bottom-Up, reusing `Step`, `useStepper` and `StepController`.
8. **First & Follow** and **Top-Down (LL)** pages (sidebar entries already exist).
9. Export the trace or table (CSV/Markdown) for assignments.
