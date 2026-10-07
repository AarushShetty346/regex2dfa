import { describe, expect, it } from 'vitest';
import { parseGrammar } from '../grammar/parseGrammar';
import { computeLeadingTrailing } from './leadingTrailing';
import { buildPrecedenceTable, type PrecedenceTable } from './precedenceTable';
import { sampleText } from './samples';

function build(sampleId: string) {
  const grammar = parseGrammar(sampleText(sampleId)).grammar!;
  return buildPrecedenceTable(grammar, computeLeadingTrailing(grammar));
}

/** Render the table as the same text grid used in the spec (blank = no relation). */
function grid(table: PrecedenceTable): string[][] {
  return table.symbols.map((row) =>
    table.symbols.map((col) => table.cells[row][col].map((e) => e.relation).join('/')),
  );
}

describe('buildPrecedenceTable (sample 1)', () => {
  const { steps, table } = build('valid-expr');

  it('uses terminals plus $ as axes', () => {
    expect(table.symbols).toEqual(['+', '*', '(', ')', 'id', '$']);
  });

  it('matches the expected table exactly', () => {
    // Columns:  +     *     (     )     id    $
    expect(grid(table)).toEqual([
      ['⋗', '⋖', '⋖', '⋗', '⋖', '⋗'], // +
      ['⋗', '⋗', '⋖', '⋗', '⋖', '⋗'], // *
      ['⋖', '⋖', '⋖', '≐', '⋖', ''], //  (
      ['⋗', '⋗', '', '⋗', '', '⋗'], //   )
      ['⋗', '⋗', '', '⋗', '', '⋗'], //   id
      ['⋖', '⋖', '⋖', '', '⋖', ''], //   $
    ]);
  });

  it('has no conflicts and is a valid operator-precedence grammar', () => {
    expect(table.conflicts).toEqual([]);
    expect(table.isOperatorPrecedence).toBe(true);
  });

  it('adds exactly one relation per step, with a reason', () => {
    const filled = table.symbols.flatMap((r) => table.symbols.map((c) => table.cells[r][c].length));
    expect(steps).toHaveLength(filled.reduce((a, b) => a + b, 0));
    const plusStar = steps.find((s) => s.row === '+' && s.col === '*')!;
    expect(plusStar.reason).toBe('+ ⋖ * because of E → E + T and * ∈ Leading(T).');
    expect(plusStar.highlight).toEqual({ row: '+', col: '*' });
  });

  it('snapshots grow monotonically and are independent copies', () => {
    const first = steps[0].snapshot.cells;
    const last = steps[steps.length - 1].snapshot.cells;
    const count = (c: typeof first) =>
      Object.values(c).flatMap((row) => Object.values(row)).reduce((n, e) => n + e.length, 0);
    expect(count(first)).toBe(1);
    expect(count(last)).toBe(steps.length);
  });
});

describe('buildPrecedenceTable conflict detection (sample 4)', () => {
  const { steps, table } = build('ambiguous');

  it('is not an operator-precedence grammar', () => {
    expect(table.isOperatorPrecedence).toBe(false);
  });

  it.each([
    ['+', '+'],
    ['*', '*'],
  ])('reports a ⋖/⋗ conflict in cell (%s, %s) and keeps both relations', (row, col) => {
    const conflict = table.conflicts.find((c) => c.row === row && c.col === col);
    expect(conflict).toBeDefined();
    expect(conflict!.entries.map((e) => e.relation).sort()).toEqual(['⋖', '⋗'].sort());
    expect(table.cells[row][col]).toHaveLength(2);
    for (const entry of conflict!.entries) expect(entry.reason).toMatch(/because of E → E/);
  });

  it('flags the conflicting step with the relation it clashed with', () => {
    // E → E + E is scanned left to right: the pair "E +" adds + ⋗ + first,
    // then the pair "+ E" tries + ⋖ + and clashes.
    const step = steps.find((s) => s.row === '+' && s.col === '+' && s.conflictWith)!;
    expect(step.conflictWith!.map((e) => e.relation)).toEqual(['⋗']);
    expect(step.relation).toBe('⋖');
    expect(step.snapshot.conflicts.some((c) => c.row === '+' && c.col === '+')).toBe(true);
  });
});
