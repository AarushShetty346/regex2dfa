import { describe, expect, it } from 'vitest';
import { parseGrammar } from '../grammar/parseGrammar';
import { formatProduction } from '../grammar/types';
import { computeLeadingTrailing } from './leadingTrailing';
import { buildPrecedenceTable } from './precedenceTable';
import { parseString } from './parseString';
import { sampleText } from './samples';

function setup(sampleId: string) {
  const grammar = parseGrammar(sampleText(sampleId)).grammar!;
  const { table } = buildPrecedenceTable(grammar, computeLeadingTrailing(grammar));
  return (input: string) => parseString(grammar, table, input);
}

const parse = setup('valid-expr');
const lastAction = (input: string) => {
  const { steps } = parse(input);
  return steps[steps.length - 1].action;
};

describe('parseString (sample 1)', () => {
  it.each(['id + id * id', '( id + id ) * id'])('accepts "%s"', (input) => {
    const result = parse(input);
    expect(result.error).toBeUndefined();
    expect(result.accepted).toBe(true);
    expect(lastAction(input).type).toBe('accept');
  });

  it('rejects "id id" because id/id has no relation', () => {
    const result = parse('id id');
    expect(result.accepted).toBe(false);
    const action = lastAction('id id');
    expect(action).toEqual({
      type: 'reject',
      message: 'No precedence relation between id and id (the table cell is empty).',
    });
  });

  it('rejects "id + * id" (handle "* F" matches no production)', () => {
    const result = parse('id + * id');
    expect(result.accepted).toBe(false);
    const action = lastAction('id + * id');
    expect(action.type).toBe('reject');
    if (action.type === 'reject') expect(action.message).toMatch(/matches no production/);
  });

  it('rejects "( id" because ( and $ have no relation', () => {
    const result = parse('( id');
    expect(result.accepted).toBe(false);
    const action = lastAction('( id');
    expect(action).toEqual({
      type: 'reject',
      message: 'No precedence relation between ( and $ (the table cell is empty).',
    });
  });

  it('reduces id + id * id in the expected order using skeletal matching', () => {
    const reductions = parse('id + id * id')
      .steps.filter((s) => s.action.type === 'reduce')
      .map((s) => (s.action.type === 'reduce' ? formatProduction(s.action.production) : ''));
    // * binds tighter than +, so "F * F" is reduced before "F + T".
    expect(reductions).toEqual(['F → id', 'F → id', 'F → id', 'T → T * F', 'E → E + T']);
  });

  it('includes adjacent non-terminals in the handle and highlights it', () => {
    const step = parse('id + id * id').steps.find(
      (s) => s.action.type === 'reduce' && s.action.production.rhs.join(' ') === 'T * F',
    )!;
    expect(step.action.type === 'reduce' && step.action.handle).toEqual(['F', '*', 'F']);
    // Stack before: $ F + F * F  → handle is indices 3..5
    expect(step.before.stack.map((e) => e.symbol)).toEqual(['$', 'F', '+', 'F', '*', 'F']);
    expect(step.highlight.handle).toEqual({ start: 3, end: 5 });
    expect(step.relation).toBe('⋗');
  });

  it('walks over ≐ when finding the handle ( E )', () => {
    const step = parse('( id ) * id').steps.find(
      (s) => s.action.type === 'reduce' && s.action.production.rhs[0] === '(',
    )!;
    expect(step.action.type === 'reduce' && step.action.handle).toEqual(['(', 'F', ')']);
  });

  it('records relations on the stack for display ($ ⋖ id)', () => {
    const first = parse('id').steps[0];
    expect(first.action).toEqual({ type: 'shift', symbol: 'id' });
    expect(first.relation).toBe('⋖');
    expect(first.snapshot.stack).toEqual([{ symbol: '$' }, { symbol: 'id', relation: '⋖' }]);
  });

  it('rejects unknown tokens before parsing', () => {
    const result = parse('id + x');
    expect(result.steps).toEqual([]);
    expect(result.error).toMatch(/"x" is not a terminal of this grammar/);
    expect(parse('id+id').error).toMatch(/Separate tokens with spaces/);
    expect(parse('id $').error).toMatch(/appended automatically/);
  });

  it('rejects the empty string', () => {
    const result = parse('');
    expect(result.accepted).toBe(false);
    expect(lastAction('').type).toBe('reject');
  });
});

describe('parseString with a conflicted table (sample 4)', () => {
  it('refuses to parse and explains why', () => {
    const result = setup('ambiguous')('id + id');
    expect(result.steps).toEqual([]);
    expect(result.error).toMatch(/conflicts/);
  });
});
