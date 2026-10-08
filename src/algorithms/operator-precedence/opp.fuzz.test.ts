/**
 * Randomized checks for operator-precedence parsing. Random grammars are written as text, run
 * through the whole pipeline, and compared with independent references: a definition-level
 * Leading/Trailing computation, a relation table rebuilt from those, and an Earley recognizer
 * for membership in the grammar's language. A seeded generator keeps every run identical.
 */
import { describe, expect, it } from 'vitest';
import { parseGrammar } from '../grammar/parseGrammar';
import { isNonTerminal, type Grammar } from '../grammar/types';
import { rng } from '../testing/rng';
import { computeLeadingTrailing } from './leadingTrailing';
import { buildPrecedenceTable, EQUALS, TAKES, YIELDS } from './precedenceTable';
import { parseString } from './parseString';
import { validateOperatorGrammar } from './validate';

type R = ReturnType<typeof rng>;
const NTS = ['E', 'T', 'F'];
const TERMS = ['+', '*', '-', '(', ')', 'id', 'a', 'b'];

/** Random grammar text. `operator` forces bodies that alternate between NTs and terminals. */
function randomGrammar(r: R, operator: boolean): string {
  const nts = NTS.slice(0, 1 + r.int(3));
  const lines = nts.map((A, k) => {
    const bodies: string[] = [];
    // Guarantee a terminal-only way out for every non-terminal, so the language is not empty.
    bodies.push(r.next() < 0.5 ? r.pick(['id', 'a', 'b']) : `( ${r.pick(nts.slice(k))} )`.replace(`( ${A} )`, r.pick(['id', 'a'])));
    for (let i = r.int(3); i > 0; i--) {
      const len = 1 + r.int(4);
      const body: string[] = [];
      for (let j = 0; j < len; j++) {
        const prevNt = body.length > 0 && isNonTerminal(body[body.length - 1]);
        const wantNt = operator ? !prevNt && r.next() < 0.5 : r.next() < 0.45;
        body.push(wantNt ? r.pick(nts) : r.pick(TERMS));
      }
      bodies.push(body.join(' '));
    }
    if (!operator && r.next() < 0.2) bodies.push('ε');
    return `${A} -> ${[...new Set(bodies)].join(' | ')}`;
  });
  return lines.join('\n');
}

// ---------- references ----------

/** Leading/Trailing from the definition, by exploring sentential-form prefixes (exact, since no ε). */
function refSets(g: Grammar, side: 'leading' | 'trailing') {
  const out: Record<string, Set<string>> = {};
  const bodies = (A: string) => g.productions.filter((p) => p.lhs === A).map((p) => (side === 'leading' ? p.rhs : [...p.rhs].reverse()));
  for (const A of g.nonTerminals) {
    out[A] = new Set();
    // A form's first two symbols decide its contribution; expand the first symbol while it is a NT.
    const seen = new Set<string>();
    const queue: string[][] = bodies(A).map((b) => b.slice(0, 2));
    while (queue.length) {
      const form = queue.shift()!;
      const key = form.join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      const [x, y] = form;
      if (!isNonTerminal(x)) out[A].add(x);
      else {
        if (y !== undefined && !isNonTerminal(y)) out[A].add(y);
        for (const b of bodies(x)) queue.push([...b, ...form.slice(1)].slice(0, 2));
      }
    }
  }
  return out;
}

/** All relations from the textbook definitions, as "a rel b" strings. */
function refRelations(g: Grammar) {
  const L = refSets(g, 'leading');
  const T = refSets(g, 'trailing');
  const rel = new Set<string>();
  for (const { rhs } of g.productions) {
    for (let i = 0; i < rhs.length; i++) {
      const [x, y, z] = [rhs[i], rhs[i + 1], rhs[i + 2]];
      if (y === undefined) break;
      if (!isNonTerminal(x) && !isNonTerminal(y)) rel.add(`${x} ${EQUALS} ${y}`);
      if (!isNonTerminal(x) && isNonTerminal(y) && z !== undefined && !isNonTerminal(z)) rel.add(`${x} ${EQUALS} ${z}`);
      if (!isNonTerminal(x) && isNonTerminal(y)) for (const b of L[y]) rel.add(`${x} ${YIELDS} ${b}`);
      if (isNonTerminal(x) && !isNonTerminal(y)) for (const a of T[x]) rel.add(`${a} ${TAKES} ${y}`);
    }
  }
  for (const b of L[g.start]) rel.add(`$ ${YIELDS} ${b}`);
  for (const a of T[g.start]) rel.add(`${a} ${TAKES} $`);
  return rel;
}

/** Earley recognizer: is `tokens` in L(G)? Independent of anything precedence-related. */
function inLanguage(g: Grammar, tokens: string[]): boolean {
  type Item = { p: number; dot: number; origin: number };
  const P = g.productions;
  const sets: Item[][] = Array.from({ length: tokens.length + 1 }, () => []);
  const keys = sets.map(() => new Set<string>());
  const add = (k: number, it: Item) => {
    const key = `${it.p}.${it.dot}.${it.origin}`;
    if (!keys[k].has(key)) (keys[k].add(key), sets[k].push(it));
  };
  P.forEach((p, i) => p.lhs === g.start && add(0, { p: i, dot: 0, origin: 0 }));
  for (let k = 0; k <= tokens.length; k++) {
    for (let n = 0; n < sets[k].length; n++) {
      const it = sets[k][n];
      const rhs = P[it.p].rhs;
      if (it.dot < rhs.length) {
        const X = rhs[it.dot];
        if (isNonTerminal(X)) {
          P.forEach((p, i) => p.lhs === X && add(k, { p: i, dot: 0, origin: k }));
          // Nullable completion (only matters for ε-productions, which operator grammars lack).
          if (P.some((p) => p.lhs === X && p.rhs.length === 0)) add(k, { ...it, dot: it.dot + 1 });
        } else if (tokens[k] === X) add(k + 1, { ...it, dot: it.dot + 1 });
      } else {
        for (const o of sets[it.origin]) {
          const r2 = P[o.p].rhs;
          if (o.dot < r2.length && r2[o.dot] === P[it.p].lhs) add(k, { ...o, dot: o.dot + 1 });
        }
      }
    }
  }
  return sets[tokens.length].some((it) => it.origin === 0 && it.dot === P[it.p].rhs.length && P[it.p].lhs === g.start);
}

/** A random word of L(G) by bounded random derivation, or null if it got too long. */
function derive(g: Grammar, r: R, maxLen = 12): string[] | null {
  let form = [g.start];
  for (let steps = 0; steps < 60; steps++) {
    const i = form.findIndex(isNonTerminal);
    if (i < 0) return form;
    const options = g.productions.filter((p) => p.lhs === form[i]);
    // Prefer short bodies as the form grows, so derivations terminate.
    const pick = form.length > maxLen / 2 ? options.reduce((a, b) => (b.rhs.filter(isNonTerminal).length < a.rhs.filter(isNonTerminal).length ? b : a)) : r.pick(options);
    form = [...form.slice(0, i), ...pick.rhs, ...form.slice(i + 1)];
    if (form.length > maxLen) return null;
  }
  return null;
}

const pipeline = (text: string) => {
  const grammar = parseGrammar(text).grammar;
  if (!grammar) return null;
  const sets = computeLeadingTrailing(grammar);
  const { table } = buildPrecedenceTable(grammar, sets);
  return { grammar, sets, table };
};

// ---------- tests ----------

describe('operator-grammar check on random grammars', () => {
  it('flags exactly the grammars with an ε-body or two adjacent non-terminals', () => {
    const r = rng(11);
    let flagged = 0;
    for (let i = 0; i < 2000; i++) {
      const g = parseGrammar(randomGrammar(r, r.next() < 0.5)).grammar!;
      const bad = g.productions.filter((p) => p.rhs.length === 0 || p.rhs.some((s, k) => k > 0 && isNonTerminal(s) && isNonTerminal(p.rhs[k - 1])));
      const issues = validateOperatorGrammar(g);
      expect(issues.map((x) => x.production.id)).toEqual(bad.map((p) => p.id));
      if (bad.length) flagged++;
    }
    expect(flagged).toBeGreaterThan(300);
  });
});

describe('Leading, Trailing and the precedence table on random operator grammars', () => {
  it('match definition-level references', () => {
    const r = rng(12);
    for (let i = 0; i < 2000; i++) {
      const text = randomGrammar(r, true);
      const p = pipeline(text)!;
      expect(validateOperatorGrammar(p.grammar)).toEqual([]);
      for (const side of ['leading', 'trailing'] as const) {
        const ref = refSets(p.grammar, side);
        for (const A of p.grammar.nonTerminals) expect(new Set(p.sets[side][A]), `${side}(${A}) for\n${text}`).toEqual(ref[A]);
      }
      const got = new Set<string>();
      for (const row of p.table.symbols) for (const col of p.table.symbols) for (const e of p.table.cells[row][col]) got.add(`${row} ${e.relation} ${col}`);
      expect(got, text).toEqual(refRelations(p.grammar));
      // A conflict is exactly a cell with two or more different relations.
      const multi = p.table.symbols.flatMap((row) => p.table.symbols.filter((col) => p.table.cells[row][col].length > 1).map((col) => `${row},${col}`));
      expect(p.table.conflicts.map((c) => `${c.row},${c.col}`).sort()).toEqual(multi.sort());
      expect(p.table.isOperatorPrecedence).toBe(multi.length === 0);
    }
  });
});

describe('parsing random strings with random conflict-free operator grammars', () => {
  it('accepts every generated sentence and agrees with an Earley recognizer', () => {
    const r = rng(13);
    let grammars = 0;
    let positives = 0;
    let negatives = 0;
    const mismatches: string[] = [];
    while (grammars < 600) {
      const text = randomGrammar(r, true);
      const p = pipeline(text)!;
      if (!p.table.isOperatorPrecedence) continue;
      grammars++;
      const words: string[][] = [];
      for (let k = 0; k < 25; k++) {
        const w = derive(p.grammar, r);
        if (w) words.push(w);
      }
      // Near misses: drop, duplicate or swap a token of a real sentence; plus pure noise.
      for (const w of [...words]) {
        const m = [...w];
        const j = r.int(m.length);
        const op = r.int(3);
        if (op === 0) m.splice(j, 1);
        else if (op === 1) m.splice(j, 0, m[j]);
        else m[j] = r.pick(p.grammar.terminals);
        words.push(m);
      }
      for (let k = 0; k < 15; k++) words.push(Array.from({ length: r.int(7) }, () => r.pick(p.grammar.terminals)));

      for (const w of words) {
        const want = inLanguage(p.grammar, w);
        const got = parseString(p.grammar, p.table, w.join(' ')).accepted;
        if (want) positives++;
        else negatives++;
        if (got !== want) mismatches.push(`${text.replace(/\n/g, ' ; ')}  ::  "${w.join(' ')}"  parser=${got} earley=${want}`);
      }
    }
    expect(positives).toBeGreaterThan(5000);
    expect(negatives).toBeGreaterThan(5000);
    expect(mismatches.slice(0, 15)).toEqual([]);
  });
});
