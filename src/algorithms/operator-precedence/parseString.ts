import {
  END_MARKER,
  formatProduction,
  isNonTerminal,
  type Grammar,
  type Production,
} from '../grammar/types';
import type { Step } from '../steps';
import { EQUALS, YIELDS, lookupRelation, type PrecedenceTable, type Relation } from './precedenceTable';

export interface StackEntry {
  symbol: string;
  /**
   * For a shifted terminal: the relation between the terminal below it and itself at the
   * moment it was shifted (⋖ or ≐). Used only to draw "$ ⋖ ( ⋖ id" in the trace.
   * Non-terminals pushed by a reduction have none.
   */
  relation?: Relation;
  /**
   * For a non-terminal pushed by a reduction: every non-terminal this phrase can stand for
   * (the production's left side plus anything that reaches it through unit productions such
   * as T → F). Reductions and the final accept check use it.
   */
  derives?: string[];
}

export interface ParseState {
  stack: StackEntry[];
  /** Remaining input, always ending with `$`. */
  input: string[];
}

export type ParseAction =
  | { type: 'shift'; symbol: string }
  | {
      type: 'reduce';
      /** Symbols popped from the stack, bottom to top. */
      handle: string[];
      production: Production;
      /** Every production that fits the handle (same terminal skeleton, compatible non-terminals). */
      candidates: Production[];
    }
  | { type: 'accept' }
  | { type: 'reject'; message: string };

export interface ParseHighlight {
  /** Index in `before.stack` of the topmost terminal (the one compared with the input). */
  topTerminalIndex: number;
  /** Inclusive index range of the handle in `before.stack`, for reduce steps and skeleton-mismatch rejects. */
  handle?: { start: number; end: number };
}

/**
 * One row of the parse trace. `before` is what the row shows (stack and input when the
 * decision was made); `snapshot` (from `Step`) is the state after the action.
 */
export interface ParseStep extends Step<ParseState, ParseHighlight> {
  before: ParseState;
  topTerminal: string;
  lookahead: string;
  /** Relation between `topTerminal` and `lookahead`; undefined when the cell is empty. */
  relation?: Relation;
  action: ParseAction;
}

export interface ParseResult {
  /** Tokens the user typed (without the appended `$`). */
  tokens: string[];
  steps: ParseStep[];
  accepted: boolean;
  /** Set when the input was rejected before parsing started (bad tokens, conflicted table). */
  error?: string;
}

/** Placeholder used when comparing terminal skeletons: every non-terminal looks the same. */
const NT = 'N';

/** Safety net against infinite loops; a correct table always terminates far earlier. */
const MAX_STEPS = 10_000;

/**
 * Parse a space-separated token string with the operator-precedence algorithm.
 *
 * Loop invariant: compare the topmost TERMINAL on the stack (non-terminals are skipped,
 * because precedence relations only exist between terminals) with the next input token:
 *   ⋖ or ≐  → shift the input token
 *   ⋗       → the top of the stack ends a handle: reduce it
 *   empty   → syntax error
 * Accept when the stack is `$ N` (one non-terminal) and the input is `$`.
 */
export function parseString(grammar: Grammar, table: PrecedenceTable, text: string): ParseResult {
  const tokens = text.trim().split(/\s+/).filter(Boolean);

  if (!table.isOperatorPrecedence) {
    return {
      tokens,
      steps: [],
      accepted: false,
      error:
        'The precedence table has conflicts, so this is not an operator-precedence grammar and strings cannot be parsed deterministically.',
    };
  }
  const tokenError = checkTokens(grammar, tokens);
  if (tokenError) return { tokens, steps: [], accepted: false, error: tokenError };

  const unitUp = unitClosure(grammar);
  let stack: StackEntry[] = [{ symbol: END_MARKER }];
  const input = [...tokens, END_MARKER];
  let ip = 0;
  const steps: ParseStep[] = [];

  while (steps.length < MAX_STEPS) {
    const before: ParseState = { stack, input: input.slice(ip) };
    const lookahead = input[ip];
    const topIndex = topTerminalIndex(stack);
    const topTerminal = stack[topIndex].symbol;
    const base = { before, topTerminal, lookahead, highlight: { topTerminalIndex: topIndex } };

    // ACCEPT: the whole input has been reduced to one non-terminal the start symbol derives.
    if (lookahead === END_MARKER && stack.length === 2 && isNonTerminal(stack[1].symbol)) {
      const derives = stack[1].derives ?? [stack[1].symbol];
      if (!derives.includes(grammar.start)) {
        const message =
          `The whole input reduced to ${stack[1].symbol}, but the start symbol ${grammar.start} cannot derive ${stack[1].symbol}, ` +
          `so the string is not in the language.`;
        steps.push(rejectStep(base, before, message));
        return { tokens, steps, accepted: false };
      }
      steps.push({
        ...base,
        action: { type: 'accept' },
        description: 'Accept',
        reason: `The stack is $ ${stack[1].symbol} and the input is $, so the whole string was reduced to a single non-terminal.`,
        snapshot: before,
      });
      return { tokens, steps, accepted: true };
    }

    // Both sides are $, but the stack has not been reduced to `$ N` (e.g. empty input).
    if (lookahead === END_MARKER && topTerminal === END_MARKER) {
      const message = `Reached the end of the input, but the stack is "${stack.map((e) => e.symbol).join(' ')}" instead of $ followed by a single non-terminal.`;
      steps.push(rejectStep(base, before, message));
      return { tokens, steps, accepted: false };
    }

    const relation = lookupRelation(table, topTerminal, lookahead);

    if (relation === undefined) {
      const message = `No precedence relation between ${topTerminal} and ${lookahead} (the table cell is empty).`;
      steps.push(rejectStep(base, before, message));
      return { tokens, steps, accepted: false };
    }

    if (relation === YIELDS || relation === EQUALS) {
      stack = [...stack, { symbol: lookahead, relation }];
      ip++;
      const why =
        relation === YIELDS
          ? `${topTerminal} ⋖ ${lookahead}: ${lookahead} may start a new handle, so shift it.`
          : `${topTerminal} ≐ ${lookahead}: they belong to the same handle, so shift ${lookahead}.`;
      steps.push({
        ...base,
        relation,
        action: { type: 'shift', symbol: lookahead },
        description: `Shift ${lookahead}`,
        reason: why,
        snapshot: { stack, input: input.slice(ip) },
      });
      continue;
    }

    // relation === TAKES: the top of the stack is the right end of a handle.
    const { start, chain } = findHandleStart(stack, table);
    const handleEntries = stack.slice(start);
    const handle = handleEntries.map((e) => e.symbol);
    const handleRange = { start, end: stack.length - 1 };
    const shaped = matchBySkeleton(grammar, handle);
    const candidates = shaped.filter((p) => fitsHandle(p, handleEntries));

    if (candidates.length === 0) {
      const message =
        shaped.length === 0
          ? `The handle "${handle.join(' ')}" has terminal skeleton "${skeleton(handle).join(' ')}", which matches no production body.`
          : `The handle "${handle.join(' ')}" has the shape of ${shaped.map(formatProduction).join(', ')}, but its non-terminals ` +
            `cannot stand for the ones that production needs, so the string is not in the language.`;
      steps.push({
        ...rejectStep(base, before, message),
        relation,
        highlight: { topTerminalIndex: topIndex, handle: handleRange },
      });
      return { tokens, steps, accepted: false };
    }

    const production = candidates[0];
    const derives = [...new Set(candidates.flatMap((p) => unitUp[p.lhs]))];
    stack = [...stack.slice(0, start), { symbol: production.lhs, derives }];
    const alsoMatches =
      candidates.length > 1
        ? ` (Also matches ${candidates.slice(1).map(formatProduction).join(', ')}; the first one is used.)`
        : '';
    steps.push({
      ...base,
      relation,
      highlight: { topTerminalIndex: topIndex, handle: handleRange },
      action: { type: 'reduce', handle, production, candidates },
      description: `Reduce by ${formatProduction(production)}`,
      reason:
        `${topTerminal} ⋗ ${lookahead}, so the handle ends at the top of the stack. ` +
        `It starts after ${chain}. ` +
        `The handle "${handle.join(' ')}" has skeleton "${skeleton(handle).join(' ')}", matching ${formatProduction(production)}.` +
        alsoMatches,
      snapshot: { stack, input: input.slice(ip) },
    });
  }

  throw new Error(`parseString exceeded ${MAX_STEPS} steps; the precedence table is probably inconsistent.`);
}

/**
 * HANDLE DETECTION.
 *
 * We know the handle ends at the top of the stack (top terminal ⋗ input). To find where it
 * starts, walk DOWN the stack terminal by terminal ("popping" conceptually):
 *   - Let `t` be the most recently popped terminal and `s` the next terminal below it.
 *   - If s ≐ t, then s is part of the same handle (e.g. "(" and ")" in "( E )"): keep going.
 *   - If s ⋖ t, then s is NOT in the handle; t is the handle's first terminal. Stop.
 *
 * The handle is everything above `s`. That deliberately includes non-terminals that sit
 * next to the handle's terminals: a non-terminal directly above `s` (left operand, e.g. the
 * E in "E + T") and any non-terminal above the top terminal (right operand). Operator
 * grammars never have two adjacent non-terminals, so at most one non-terminal can sit
 * between two terminals, and it always belongs to the handle.
 *
 * The bottom `$` always bounds the handle, even if the cell ($, t) is empty: in that case
 * the skeleton match below fails and the string is rejected with a clear message.
 *
 * Returns the index where the handle starts plus a short text describing the boundary.
 */
function findHandleStart(stack: StackEntry[], table: PrecedenceTable): { start: number; chain: string } {
  let lastPopped = topTerminalIndex(stack);
  let below = previousTerminalIndex(stack, lastPopped - 1);
  const equalities: string[] = [];

  for (;;) {
    const s = stack[below].symbol;
    const t = stack[lastPopped].symbol;
    const relation = lookupRelation(table, s, t);
    if (relation === YIELDS || below === 0) {
      const boundary = `${s} ${relation ?? '(no relation)'} ${t}`;
      const chain = equalities.length ? `${boundary} (with ${equalities.join(', ')} inside the handle)` : boundary;
      return { start: below + 1, chain };
    }
    // s ≐ t (or, on a malformed stack, no ⋖): s belongs to the handle, keep walking down.
    equalities.unshift(`${s} ${relation ?? '?'} ${t}`);
    lastPopped = below;
    below = previousTerminalIndex(stack, below - 1);
  }
}

/**
 * SKELETAL REDUCTION.
 *
 * The parser only ever looks at terminals, so it cannot know which non-terminal a phrase
 * "really" is. For example after reducing `id` (by F → id) the parser holds some
 * non-terminal, but it never applies the unit productions T → F and E → T, because unit
 * productions contain no terminal and therefore can never trigger a ⋗ that would reduce
 * them. So a handle like "F + F" must still match E → E + T.
 *
 * The standard fix is to compare only the *terminal skeleton*: replace every non-terminal
 * with the same placeholder N, so "F + F" and "E + T" both become "N + N". Which
 * non-terminal we push afterwards doesn't affect acceptance; we push the matched
 * production's LHS so the trace stays readable.
 */
function matchBySkeleton(grammar: Grammar, handle: string[]): Production[] {
  const target = skeleton(handle);
  return grammar.productions.filter((p) => {
    const body = skeleton(p.rhs);
    return body.length === target.length && body.every((s, i) => s === target[i]);
  });
}

/**
 * The skeleton alone is too loose: in E → b | F a ( F with F → a, the handle "a" reduces to F,
 * and a skeleton-only parser would then accept "a" because the stack is "$ N". So each
 * non-terminal on the stack remembers which non-terminals it can stand for, and a production
 * fits only if every non-terminal it expects is one of those.
 */
function fitsHandle(p: Production, handle: StackEntry[]): boolean {
  return p.rhs.every((sym, i) => !isNonTerminal(sym) || (handle[i].derives ?? [handle[i].symbol]).includes(sym));
}

/** For every non-terminal X, all A with A ⇒* X through unit productions (A → B), X included. */
function unitClosure(grammar: Grammar): Record<string, string[]> {
  const up: Record<string, Set<string>> = Object.fromEntries(grammar.nonTerminals.map((X) => [X, new Set([X])]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of grammar.productions) {
      if (p.rhs.length !== 1 || !isNonTerminal(p.rhs[0])) continue;
      // A → B: any phrase that can stand for B can stand for A too.
      for (const X of grammar.nonTerminals)
        if (up[X].has(p.rhs[0]) && !up[X].has(p.lhs)) {
          up[X].add(p.lhs);
          changed = true;
        }
    }
  }
  return Object.fromEntries(Object.entries(up).map(([X, s]) => [X, [...s]]));
}

function skeleton(symbols: string[]): string[] {
  return symbols.map((s) => (isNonTerminal(s) ? NT : s));
}

function topTerminalIndex(stack: StackEntry[]): number {
  return previousTerminalIndex(stack, stack.length - 1);
}

/** Index of the nearest terminal at or below `from` (the bottom `$` is always a terminal). */
function previousTerminalIndex(stack: StackEntry[], from: number): number {
  for (let i = from; i >= 0; i--) if (!isNonTerminal(stack[i].symbol)) return i;
  return 0;
}

function rejectStep(
  base: Pick<ParseStep, 'before' | 'topTerminal' | 'lookahead' | 'highlight'>,
  before: ParseState,
  message: string,
): ParseStep {
  return {
    ...base,
    action: { type: 'reject', message },
    description: 'Reject',
    reason: message,
    snapshot: before,
  };
}

function checkTokens(grammar: Grammar, tokens: string[]): string | undefined {
  if (tokens.includes(END_MARKER)) {
    return 'Do not type "$": the end marker is appended automatically.';
  }
  const unknown = [...new Set(tokens.filter((t) => !grammar.terminals.includes(t)))];
  if (unknown.length === 0) return undefined;
  const list = unknown.map((t) => `"${t}"`).join(', ');
  const hint = unknown.some(isNonTerminal) ? ' Non-terminals cannot appear in the input string.' : '';
  return `${list} ${unknown.length === 1 ? 'is not a terminal' : 'are not terminals'} of this grammar. Terminals: ${grammar.terminals.join(' ')}. Separate tokens with spaces.${hint}`;
}
