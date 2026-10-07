/** Core grammar types shared by all parsing algorithms. */

export interface Production {
  /** Index into `Grammar.productions`; lets steps refer to a production unambiguously. */
  id: number;
  lhs: string;
  /** Body symbols in order. An ε-production has an empty body. */
  rhs: string[];
  /** 1-based line in the user's input, for error messages. */
  line: number;
}

export interface Grammar {
  /** LHS of the first production. */
  start: string;
  /** Non-terminals in order of first definition. */
  nonTerminals: string[];
  /** Terminals in order of first appearance in a body (never includes `$`). */
  terminals: string[];
  productions: Production[];
}

/** End-of-input marker used by the precedence table and the parser. Reserved. */
export const END_MARKER = '$';

/** Tokens the user may type to mean the empty string. */
export const EPSILON_TOKENS: readonly string[] = ['ε', 'epsilon'];

/** Convention: a non-terminal is any token starting with an uppercase letter. */
export function isNonTerminal(symbol: string): boolean {
  return /^[A-Z]/.test(symbol);
}

export function isTerminal(symbol: string): boolean {
  return !isNonTerminal(symbol);
}

/** "E → E + T", or "S → ε" for an empty body. */
export function formatProduction(p: Production): string {
  return `${p.lhs} → ${p.rhs.length ? p.rhs.join(' ') : 'ε'}`;
}
