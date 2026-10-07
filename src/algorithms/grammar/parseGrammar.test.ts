import { describe, expect, it } from 'vitest';
import { parseGrammar } from './parseGrammar';
import { formatProduction } from './types';
import { sampleText } from '../operator-precedence/samples';

describe('parseGrammar', () => {
  it('parses the valid sample with start symbol, terminals and productions', () => {
    const { grammar, errors } = parseGrammar(sampleText('valid-expr'));
    expect(errors).toEqual([]);
    expect(grammar).not.toBeNull();
    expect(grammar!.start).toBe('E');
    expect(grammar!.nonTerminals).toEqual(['E', 'T', 'F']);
    expect(grammar!.terminals).toEqual(['+', '*', '(', ')', 'id']);
    expect(grammar!.productions.map(formatProduction)).toEqual([
      'E → E + T',
      'E → T',
      'T → T * F',
      'T → F',
      'F → ( E )',
      'F → id',
    ]);
  });

  it('accepts the unicode arrow and merges repeated left-hand sides', () => {
    const { grammar, errors } = parseGrammar('S → a S\nS → b');
    expect(errors).toEqual([]);
    expect(grammar!.productions).toHaveLength(2);
    expect(grammar!.nonTerminals).toEqual(['S']);
  });

  it('turns ε, epsilon and empty alternatives into empty bodies', () => {
    const { grammar, errors } = parseGrammar('S -> a S | ε\nA -> b | epsilon\nB -> c |');
    expect(errors).toEqual([]);
    const empty = grammar!.productions.filter((p) => p.rhs.length === 0);
    expect(empty.map((p) => p.lhs)).toEqual(['S', 'A', 'B']);
  });

  it('reports a missing arrow', () => {
    const { grammar, errors } = parseGrammar('E E + T');
    expect(grammar).toBeNull();
    expect(errors[0].message).toMatch(/missing arrow/);
    expect(errors[0].line).toBe(1);
  });

  it('reports an empty left-hand side', () => {
    expect(parseGrammar('-> a').errors[0].message).toMatch(/left-hand side is empty/);
  });

  it('reports a lowercase or multi-token left-hand side', () => {
    expect(parseGrammar('e -> a').errors[0].message).toMatch(/must be a non-terminal/);
    expect(parseGrammar('A B -> a').errors[0].message).toMatch(/single non-terminal/);
  });

  it('reports undefined non-terminals, with a spacing hint for "E+T"', () => {
    const { errors } = parseGrammar('E -> E+T | id');
    expect(errors[0].message).toMatch(/"E\+T" is used but has no productions/);
    expect(errors[0].message).toMatch(/separated by spaces/);
  });

  it('rejects the reserved $ symbol and empty input', () => {
    expect(parseGrammar('E -> E $').errors[0].message).toMatch(/reserved/);
    expect(parseGrammar('   \n  ').errors[0].message).toMatch(/at least one production/);
  });
});
