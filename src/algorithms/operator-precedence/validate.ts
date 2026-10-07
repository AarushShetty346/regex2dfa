import { formatProduction, isNonTerminal, type Grammar, type Production } from '../grammar/types';

export type OperatorGrammarIssue =
  | {
      kind: 'adjacent-non-terminals';
      production: Production;
      pair: [string, string];
      message: string;
    }
  | { kind: 'epsilon'; production: Production; message: string };

/**
 * Check the two defining properties of an operator grammar.
 *
 * Why these two rules: operator-precedence parsing decides everything by comparing
 * *terminals* (operators). If a body had two adjacent non-terminals (E → E A E), or
 * could vanish (S → ε), there would be places in a sentential form where no terminal
 * separates two phrases, and the precedence relations alone could not find the handle.
 *
 * Returns one issue per offending production (an empty list means the grammar is valid).
 * For adjacent non-terminals only the first pair in each body is reported to keep
 * messages short.
 */
export function validateOperatorGrammar(grammar: Grammar): OperatorGrammarIssue[] {
  const issues: OperatorGrammarIssue[] = [];

  for (const production of grammar.productions) {
    const { rhs } = production;
    if (rhs.length === 0) {
      issues.push({
        kind: 'epsilon',
        production,
        message: `Invalid: ${formatProduction(production)} is an ε-production (operator grammars cannot have empty bodies).`,
      });
      continue;
    }
    for (let i = 0; i + 1 < rhs.length; i++) {
      if (isNonTerminal(rhs[i]) && isNonTerminal(rhs[i + 1])) {
        issues.push({
          kind: 'adjacent-non-terminals',
          production,
          pair: [rhs[i], rhs[i + 1]],
          message: `Invalid: ${formatProduction(production)} has adjacent non-terminals ${rhs[i]} ${rhs[i + 1]}.`,
        });
        break;
      }
    }
  }

  return issues;
}
