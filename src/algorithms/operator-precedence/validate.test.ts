import { describe, expect, it } from 'vitest';
import { parseGrammar } from '../grammar/parseGrammar';
import { validateOperatorGrammar } from './validate';
import { sampleText } from './samples';

function issuesFor(text: string) {
  const { grammar, errors } = parseGrammar(text);
  expect(errors).toEqual([]);
  return validateOperatorGrammar(grammar!);
}

describe('validateOperatorGrammar', () => {
  it('accepts the valid sample', () => {
    expect(issuesFor(sampleText('valid-expr'))).toEqual([]);
  });

  it('accepts the ambiguous sample (it is an operator grammar, just not an OPG)', () => {
    expect(issuesFor(sampleText('ambiguous'))).toEqual([]);
  });

  it('rejects adjacent non-terminals and names the production and pair', () => {
    const issues = issuesFor(sampleText('adjacent-nt'));
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('adjacent-non-terminals');
    expect(issues[0].message).toBe('Invalid: E → E A E has adjacent non-terminals E A.');
  });

  it('rejects ε-productions and names the production', () => {
    const issues = issuesFor(sampleText('epsilon'));
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('epsilon');
    expect(issues[0].message).toMatch(/^Invalid: S → ε is an ε-production/);
  });

  it('treats "epsilon" and an empty alternative the same as ε', () => {
    expect(issuesFor('S -> a | epsilon')[0].kind).toBe('epsilon');
    expect(issuesFor('S -> a |')[0].kind).toBe('epsilon');
  });
});
