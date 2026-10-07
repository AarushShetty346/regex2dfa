import {
  END_MARKER,
  EPSILON_TOKENS,
  isNonTerminal,
  type Grammar,
  type Production,
} from './types';

export interface GrammarError {
  /** 1-based input line, when the error belongs to a specific line. */
  line?: number;
  message: string;
}

export interface ParseGrammarResult {
  /** `null` whenever there is at least one error. */
  grammar: Grammar | null;
  errors: GrammarError[];
}

const ARROW = /->|→/;

/**
 * Parse grammar text into a `Grammar`.
 *
 * Format: one or more productions per non-terminal, one line each, e.g.
 *   E -> E + T | T
 * Tokens are separated by whitespace, so multi-character terminals such as `id` work.
 * An alternative that is empty or is exactly `ε` / `epsilon` becomes an ε-production
 * (empty body). Those are *accepted* here and rejected later by
 * `validateOperatorGrammar`, because they are a property of the grammar, not a typo.
 *
 * This function only reports malformed input; it never throws.
 */
export function parseGrammar(text: string): ParseGrammarResult {
  const errors: GrammarError[] = [];
  const productions: Production[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const content = raw.trim();
    if (!content) return;

    const arrow = content.match(ARROW);
    if (!arrow || arrow.index === undefined) {
      errors.push({ line, message: `Line ${line}: missing arrow ("->" or "→") in "${content}".` });
      return;
    }

    const lhsText = content.slice(0, arrow.index).trim();
    const bodyText = content.slice(arrow.index + arrow[0].length);

    if (!lhsText) {
      errors.push({ line, message: `Line ${line}: the left-hand side is empty.` });
      return;
    }
    const lhsTokens = lhsText.split(/\s+/);
    if (lhsTokens.length > 1) {
      errors.push({
        line,
        message: `Line ${line}: the left-hand side must be a single non-terminal, found "${lhsText}".`,
      });
      return;
    }
    const lhs = lhsTokens[0];
    if (!isNonTerminal(lhs)) {
      errors.push({
        line,
        message: `Line ${line}: the left-hand side "${lhs}" must be a non-terminal (start with an uppercase letter).`,
      });
      return;
    }
    if (ARROW.test(bodyText)) {
      errors.push({ line, message: `Line ${line}: more than one arrow on a line.` });
      return;
    }

    for (const alternative of bodyText.split('|')) {
      const tokens = alternative.trim().split(/\s+/).filter(Boolean);
      const isEpsilon =
        tokens.length === 0 || (tokens.length === 1 && EPSILON_TOKENS.includes(tokens[0]));

      if (!isEpsilon && tokens.some((t) => EPSILON_TOKENS.includes(t))) {
        errors.push({
          line,
          message: `Line ${line}: ε cannot be combined with other symbols in "${alternative.trim()}".`,
        });
        continue;
      }
      if (tokens.includes(END_MARKER)) {
        errors.push({
          line,
          message: `Line ${line}: "${END_MARKER}" is reserved as the end-of-input marker and cannot appear in a grammar.`,
        });
        continue;
      }
      productions.push({ id: productions.length, lhs, rhs: isEpsilon ? [] : tokens, line });
    }
  });

  if (productions.length === 0 && errors.length === 0) {
    errors.push({ message: 'Enter at least one production, e.g. "E -> E + T | T".' });
  }

  const nonTerminals = unique(productions.map((p) => p.lhs));
  const defined = new Set(nonTerminals);
  const terminals: string[] = [];
  const reportedUndefined = new Set<string>();

  for (const p of productions) {
    for (const symbol of p.rhs) {
      if (!isNonTerminal(symbol)) {
        if (!terminals.includes(symbol)) terminals.push(symbol);
      } else if (!defined.has(symbol) && !reportedUndefined.has(symbol)) {
        reportedUndefined.add(symbol);
        // A common beginner mistake is "E+T" without spaces, which reads as one
        // non-terminal token; point that out when the token has punctuation in it.
        const hint = /[^A-Za-z0-9_']/.test(symbol)
          ? ' Tokens must be separated by spaces, e.g. "E + T" rather than "E+T".'
          : '';
        errors.push({
          line: p.line,
          message: `Line ${p.line}: non-terminal "${symbol}" is used but has no productions.${hint}`,
        });
      }
    }
  }

  if (errors.length > 0) return { grammar: null, errors };
  return {
    grammar: { start: productions[0].lhs, nonTerminals, terminals, productions },
    errors: [],
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
