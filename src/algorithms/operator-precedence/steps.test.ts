/**
 * Step-by-step checks for operator-precedence parsing on hand-picked grammars: every string up to a
 * length bound is parsed, the language is enumerated by brute-force derivation, and every trace row
 * is replayed against the stack and input it claims.
 */
import { describe, expect, it } from 'vitest';
import { parseGrammar } from '../grammar/parseGrammar';
import { isNonTerminal, type Grammar } from '../grammar/types';
import { computeLeadingTrailing } from './leadingTrailing';
import { buildPrecedenceTable } from './precedenceTable';
import { parseString } from './parseString';
import { validateOperatorGrammar } from './validate';

// Brute-force language: all terminal strings up to length n, by BFS over leftmost sentential forms.
// No ε-productions, so forms never shrink and pruning by length is exact. Unit cycles are bounded by `seen`.
function language(g: Grammar, n: number): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>();
  const q: string[][] = [[g.start]];
  while (q.length) {
    const f = q.pop()!;
    const key = f.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    const i = f.findIndex(isNonTerminal);
    if (i < 0) { out.add(key); continue; }
    for (const p of g.productions) if (p.lhs === f[i]) {
      const nf = [...f.slice(0, i), ...p.rhs, ...f.slice(i + 1)];
      if (nf.length <= n) q.push(nf);
    }
  }
  return out;
}
function allStrings(t: string[], n: number) { const out: string[][] = []; let f: string[][] = [[]]; for (let i = 1; i <= n; i++) { f = f.flatMap((w) => t.map((a) => [...w, a])); out.push(...f); } return out; }

const GRAMMARS: [string, number][] = [
  ['E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id', 5],
  ['E -> E + T | E - T | T\nT -> T * F | T / F | F\nF -> ( E ) | id', 5],
  ['E -> E + T | T\nT -> T * F | F\nF -> P ^ F | P\nP -> ( E ) | id', 5],
  ['S -> a', 3],
  ['S -> ( S ) | x', 7],
  ['S -> S , a | a', 7],
  ['E -> E or T | T\nT -> T and F | F\nF -> not F | ( E ) | t | f', 5],
  ['E -> - E | E - E2 | E2\nE2 -> id', 5],
  ['S -> if C then S | x\nC -> c', 7],
  ['L -> L ; S | S\nS -> id = E\nE -> E + id | id', 7],
  ['E -> E + E | E * E | id', 5],   // ambiguous: expect conflicts
  ['S -> a S b | a b', 8],
  ['A -> B\nB -> C\nC -> x | ( A )', 7],
  ['E -> b | F a (\nF -> a', 5],
];

describe('operator precedence, step by step', () => {
  for (const [text, n] of GRAMMARS) {
    it(text.replace(/\n/g, ' ; '), { timeout: 60_000 }, () => {
      const { grammar, errors } = parseGrammar(text);
      expect(errors).toEqual([]);
      const g = grammar!;
      expect(validateOperatorGrammar(g)).toEqual([]);
      const sets = computeLeadingTrailing(g);
      const { table, steps: tsteps } = buildPrecedenceTable(g, sets);
      // step logs end at the final state
      const lt = sets.steps.at(-1)!;
      expect(lt.kind).toBe('fixed-point');
      expect(lt.snapshot).toEqual({ leading: sets.leading, trailing: sets.trailing });
      if (tsteps.length) expect(tsteps.at(-1)!.snapshot.cells).toEqual(table.cells);
      if (!table.isOperatorPrecedence) return; // ambiguous: parsing is disabled in the UI
      const lang = language(g, n);
      let pos = 0, mism: string[] = [];
      for (const w of allStrings(g.terminals, n)) {
        const want = lang.has(w.join(' '));
        const r = parseString(g, table, w.join(' '));
        if (want) pos++;
        if (r.accepted !== want) mism.push(`"${w.join(' ')}" parser=${r.accepted} truth=${want}`);
        // trace consistency
        let stack = ['$'], input = [...w, '$'];
        for (const s of r.steps) {
          expect(s.before.stack.map((e) => e.symbol)).toEqual(stack);
          expect(s.before.input).toEqual(input);
          const a = s.action;
          if (a.type === 'shift') { expect(a.symbol).toBe(input[0]); stack = [...stack, input[0]]; input = input.slice(1); }
          else if (a.type === 'reduce') {
            expect(stack.slice(stack.length - a.handle.length)).toEqual(a.handle);
            expect(a.production.rhs.length).toBe(a.handle.length);
            a.production.rhs.forEach((x, i) => expect(isNonTerminal(x) ? isNonTerminal(a.handle[i]) : x === a.handle[i]).toBe(true));
            stack = [...stack.slice(0, stack.length - a.handle.length), a.production.lhs];
          }
          expect(s.snapshot.stack.map((e) => e.symbol)).toEqual(stack);
        }
        const last = r.steps.at(-1);
        if (!r.error) expect(last!.action.type).toBe(r.accepted ? 'accept' : 'reject');
      }
      expect(mism.slice(0, 10)).toEqual([]);
      expect(pos).toBeGreaterThan(0);
    });
  }

  it('invalid grammars are flagged', () => {
    expect(validateOperatorGrammar(parseGrammar('E -> E A E | id\nA -> + | *').grammar!)).toHaveLength(1);
    expect(validateOperatorGrammar(parseGrammar('S -> a S | ε').grammar!)).toHaveLength(1);
    for (const bad of ['E E + T', '-> a', 'e -> a', 'E -> E+T | id', 'E -> E $', '', 'A -> a -> b', 'A -> a ε']) expect(parseGrammar(bad).errors.length, bad).toBeGreaterThan(0);
  });

  it('bad input strings', () => {
    const g = parseGrammar('E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id').grammar!;
    const t = buildPrecedenceTable(g, computeLeadingTrailing(g)).table;
    expect(parseString(g, t, 'id + x').error).toMatch(/not a terminal/);
    expect(parseString(g, t, 'id $').error).toMatch(/\$/);
    expect(parseString(g, t, '').accepted).toBe(false);
    expect(parseString(g, t, 'E').error).toMatch(/Non-terminals/);
    const long = Array.from({ length: 200 }, () => 'id').join(' + ');
    expect(parseString(g, t, `( ${long} ) * id`).accepted).toBe(true);
  });
});
