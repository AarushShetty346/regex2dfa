import { describe, expect, it } from 'vitest';
import { parseGrammar } from '../grammar/parseGrammar';
import { computeLeadingTrailing } from './leadingTrailing';
import { sampleText } from './samples';

const grammar = parseGrammar(sampleText('valid-expr')).grammar!;
const result = computeLeadingTrailing(grammar);

/** Compare as sets so the test does not depend on display order. */
const asSet = (xs: string[]) => new Set(xs);

describe('computeLeadingTrailing (sample 1)', () => {
  it('computes the expected Leading sets', () => {
    expect(asSet(result.leading.E)).toEqual(asSet(['+', '*', '(', 'id']));
    expect(asSet(result.leading.T)).toEqual(asSet(['*', '(', 'id']));
    expect(asSet(result.leading.F)).toEqual(asSet(['(', 'id']));
  });

  it('computes the expected Trailing sets', () => {
    expect(asSet(result.trailing.E)).toEqual(asSet(['+', '*', ')', 'id']));
    expect(asSet(result.trailing.T)).toEqual(asSet(['*', ')', 'id']));
    expect(asSet(result.trailing.F)).toEqual(asSet([')', 'id']));
  });

  it('adds exactly one terminal per "add" step, and every add is recorded once', () => {
    const adds = result.steps.filter((s) => s.kind === 'add');
    const total = (sets: Record<string, string[]>) =>
      Object.values(sets).reduce((n, s) => n + s.length, 0);
    expect(adds).toHaveLength(total(result.leading) + total(result.trailing));

    let prevCount = 0;
    for (const step of result.steps) {
      const count = total(step.snapshot.leading) + total(step.snapshot.trailing);
      expect(count - prevCount).toBe(step.kind === 'add' ? 1 : 0);
      prevCount = count;
    }
  });

  it('records the production and rule behind each step', () => {
    const plusInE = result.steps.find(
      (s) => s.kind === 'add' && s.set === 'leading' && s.nonTerminal === 'E' && s.terminal === '+',
    );
    expect(plusInE).toMatchObject({ rule: 'after-nt', production: { lhs: 'E', rhs: ['E', '+', 'T'] } });

    const idInT = result.steps.find(
      (s) => s.kind === 'add' && s.set === 'leading' && s.nonTerminal === 'T' && s.terminal === 'id',
    );
    expect(idInT).toMatchObject({ rule: 'inherit', fromNonTerminal: 'F' });
    expect(idInT!.reason).toContain('id ∈ Leading(F)');
  });

  it('ends each phase with a fixed-point step (Leading before Trailing)', () => {
    const fixed = result.steps.filter((s) => s.kind === 'fixed-point');
    expect(fixed.map((s) => s.set)).toEqual(['leading', 'trailing']);
    expect(result.steps[result.steps.length - 1].kind).toBe('fixed-point');
  });
});
