import {
  END_MARKER,
  formatProduction,
  isNonTerminal,
  type Grammar,
  type Production,
} from '../grammar/types';
import type { Step } from '../steps';
import type { TerminalSets } from './leadingTrailing';

/** a ⋖ b: a yields precedence to b (b starts a handle). */
export const YIELDS = '⋖';
/** a ≐ b: same precedence, a and b belong to the same handle. */
export const EQUALS = '≐';
/** a ⋗ b: a takes precedence over b (a ends a handle). */
export const TAKES = '⋗';
export type Relation = typeof YIELDS | typeof EQUALS | typeof TAKES;

export interface CellEntry {
  relation: Relation;
  reason: string;
  /** Production that produced the relation; absent for the `$` rules. */
  production?: Production;
}

/** cells[row][col], row = stack-top terminal, col = input terminal. */
export type TableCells = Record<string, Record<string, CellEntry[]>>;

export interface Conflict {
  row: string;
  col: string;
  /** All distinct relations in the cell, each with its own reason. */
  entries: CellEntry[];
}

export interface TableSnapshot {
  cells: TableCells;
  conflicts: Conflict[];
}

export interface TableHighlight {
  row: string;
  col: string;
}

export interface TableStep extends Step<TableSnapshot, TableHighlight> {
  row: string;
  col: string;
  relation: Relation;
  production?: Production;
  /** Set when the cell already held a *different* relation: the entries it clashed with. */
  conflictWith?: CellEntry[];
}

export interface PrecedenceTable {
  /** Axis order for both rows and columns: grammar terminals, then `$`. */
  symbols: string[];
  cells: TableCells;
  conflicts: Conflict[];
  /** True when no cell holds more than one relation. */
  isOperatorPrecedence: boolean;
}

export interface PrecedenceTableResult {
  steps: TableStep[];
  table: PrecedenceTable;
}

/**
 * Build the operator-precedence table, one relation per step.
 *
 * For each production, every adjacent pair (and every terminal–NT–terminal triple) in the
 * body is examined left to right:
 *   a b   or  a B b   →  a ≐ b          (a and b are parts of the same handle)
 *   a B               →  a ⋖ Leading(B) (B's first terminal must be reduced before a)
 *   B a               →  Trailing(B) ⋗ a (B's last terminal must be reduced before a)
 * Then the end marker: $ ⋖ Leading(S) and Trailing(S) ⋗ $.
 *
 * Adding a relation that is already in the cell is not a change, so it produces no step.
 * Adding a *different* relation to a non-empty cell is a conflict: both relations are kept
 * (so the UI can show both reasons) and the grammar is not operator-precedence.
 */
export function buildPrecedenceTable(
  grammar: Grammar,
  sets: { leading: TerminalSets; trailing: TerminalSets },
): PrecedenceTableResult {
  const symbols = [...grammar.terminals, END_MARKER];
  const cells: TableCells = Object.fromEntries(
    symbols.map((r) => [r, Object.fromEntries(symbols.map((c) => [c, [] as CellEntry[]]))]),
  );
  const conflicts: Conflict[] = [];
  const steps: TableStep[] = [];

  const set = (
    row: string,
    col: string,
    relation: Relation,
    reason: string,
    production?: Production,
  ) => {
    const cell = cells[row][col];
    if (cell.some((e) => e.relation === relation)) return; // duplicate, not a change

    const conflictWith = cell.length > 0 ? [...cell] : undefined;
    cell.push({ relation, reason, production });

    if (conflictWith) {
      const existing = conflicts.find((c) => c.row === row && c.col === col);
      if (existing) existing.entries = [...cell];
      else conflicts.push({ row, col, entries: [...cell] });
    }

    steps.push({
      row,
      col,
      relation,
      production,
      conflictWith,
      description: conflictWith
        ? `Conflict at (${row}, ${col}): ${conflictWith.map((e) => e.relation).join(' ')} vs ${relation}`
        : `Set ${row} ${relation} ${col}`,
      reason,
      highlight: { row, col },
      // structuredClone gives each step its own frozen-in-time copy of the table.
      snapshot: structuredClone({ cells, conflicts }),
    });
  };

  for (const production of grammar.productions) {
    const body = production.rhs;
    const p = formatProduction(production);

    for (let i = 0; i < body.length - 1; i++) {
      const x = body[i];
      const y = body[i + 1];

      if (!isNonTerminal(x) && !isNonTerminal(y)) {
        set(x, y, EQUALS, `${x} ≐ ${y} because of ${p}: ${x} and ${y} are adjacent in the body.`, production);
      }

      if (!isNonTerminal(x) && isNonTerminal(y)) {
        const z = body[i + 2];
        if (z !== undefined && !isNonTerminal(z)) {
          set(
            x,
            z,
            EQUALS,
            `${x} ≐ ${z} because of ${p}: ${x} and ${z} are separated only by the non-terminal ${y}.`,
            production,
          );
        }
        for (const b of sets.leading[y]) {
          set(x, b, YIELDS, `${x} ⋖ ${b} because of ${p} and ${b} ∈ Leading(${y}).`, production);
        }
      }

      if (isNonTerminal(x) && !isNonTerminal(y)) {
        for (const a of sets.trailing[x]) {
          set(a, y, TAKES, `${a} ⋗ ${y} because of ${p} and ${a} ∈ Trailing(${x}).`, production);
        }
      }
    }
  }

  const S = grammar.start;
  for (const b of sets.leading[S]) {
    set(END_MARKER, b, YIELDS, `$ ⋖ ${b} because ${b} ∈ Leading(${S}) and ${S} is the start symbol.`);
  }
  for (const a of sets.trailing[S]) {
    set(a, END_MARKER, TAKES, `${a} ⋗ $ because ${a} ∈ Trailing(${S}) and ${S} is the start symbol.`);
  }

  return {
    steps,
    table: { symbols, cells, conflicts, isOperatorPrecedence: conflicts.length === 0 },
  };
}

/** The single relation in a cell, or `undefined` if the cell is empty or conflicted. */
export function lookupRelation(table: PrecedenceTable, row: string, col: string): Relation | undefined {
  const cell = table.cells[row]?.[col];
  return cell && cell.length === 1 ? cell[0].relation : undefined;
}
