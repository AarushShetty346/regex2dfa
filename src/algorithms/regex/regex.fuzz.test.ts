/**
 * Randomized checks for the direct method: thousands of random expressions, each compared with
 * the browser's own RegExp engine on every string up to a fixed length. A seeded generator
 * keeps every run identical, so a failure always reproduces.
 */
import { describe, expect, it } from 'vitest';
import { rng } from '../testing/rng';
import { parseRegex, postOrder, regexPipeline, regexToString, simulate, type RegexNode } from './index';

type R = ReturnType<typeof rng>;
const SYMBOLS = ['a', 'b', 'c'];

/** Random expression text, with optional redundant parentheses and spaces. */
function randomRegex(r: R, depth: number): string {
  const leaf = () => (r.next() < 0.12 ? r.pick(['ε', '\\e']) : r.pick(SYMBOLS));
  const wrap = (s: string) => (r.next() < 0.15 ? `(${s})` : s);
  if (depth <= 0 || r.next() < 0.25) return wrap(leaf());
  switch (r.int(5)) {
    case 0:
      return `(${randomRegex(r, depth - 1)}|${randomRegex(r, depth - 1)})`;
    case 1:
      return wrap(randomRegex(r, depth - 1) + (r.next() < 0.1 ? ' ' : '') + randomRegex(r, depth - 1));
    default: {
      const inner = randomRegex(r, depth - 1);
      const atom = inner.length === 1 || /^\(.*\)$/.test(inner) ? inner : `(${inner})`;
      return atom + r.pick(['*', '+', '?']);
    }
  }
}

/** The same AST as a native RegExp source: an independent oracle. */
function toJs(n: RegexNode): string {
  switch (n.kind) {
    case 'symbol':
      return n.symbol.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
    case 'epsilon':
      return '(?:)';
    case 'concat':
      return `(?:${toJs(n.left)})(?:${toJs(n.right)})`;
    case 'union':
      return `(?:${toJs(n.left)}|${toJs(n.right)})`;
    case 'star':
      return `(?:${toJs(n.child)})*`;
    case 'plus':
      return `(?:${toJs(n.child)})+`;
    case 'optional':
      return `(?:${toJs(n.child)})?`;
  }
}

function allStrings(alphabet: string[], maxLen: number): string[] {
  const out = [''];
  let frontier = [''];
  for (let len = 1; len <= maxLen; len++) {
    frontier = frontier.flatMap((s) => alphabet.map((a) => s + a));
    out.push(...frontier);
  }
  return out;
}

const CASES = 1500;
const ALL = allStrings([...SYMBOLS, 'd'], 5); // 'd' never appears in a regex, so it must always reject

describe('direct method: random expressions vs RegExp', () => {
  it(`agrees with RegExp on ${CASES} random expressions × ${ALL.length} strings`, () => {
    const r = rng(20261008);
    for (let i = 0; i < CASES; i++) {
      const src = randomRegex(r, 1 + r.int(5));
      const p = regexPipeline(src);
      const oracle = new RegExp(`^(?:${toJs(p.tree)})$`);
      for (const s of ALL) {
        const got = simulate(p.direct.dfa, s).accepted;
        if (got !== oracle.test(s)) expect.fail(`regex ${JSON.stringify(src)} on ${JSON.stringify(s)}: DFA says ${got}`);
      }
    }
  });

  it('accepts and rejects longer random strings correctly', () => {
    const r = rng(7);
    for (let i = 0; i < 400; i++) {
      const src = randomRegex(r, 1 + r.int(5));
      const p = regexPipeline(src);
      const oracle = new RegExp(`^(?:${toJs(p.tree)})$`);
      for (let k = 0; k < 40; k++) {
        const s = Array.from({ length: 6 + r.int(14) }, () => r.pick(SYMBOLS)).join('');
        expect(simulate(p.direct.dfa, s).accepted, `regex ${JSON.stringify(src)} on ${JSON.stringify(s)}`).toBe(oracle.test(s));
      }
    }
  });
});

describe('direct method: escapes and a literal # (the end-marker symbol)', () => {
  it('agrees with RegExp when expressions use \\*, \\| and #', () => {
    const r = rng(4242);
    const strings = allStrings(['a', '*', '|', '#'], 5);
    for (let i = 0; i < 300; i++) {
      // Swap some symbols for escaped operators or a literal #.
      const src = randomRegex(r, 1 + r.int(4)).replace(/[bc]/g, (m) => r.pick(['\\*', '\\|', '#', m === 'b' ? 'a' : '#']));
      const p = regexPipeline(src);
      const oracle = new RegExp(`^(?:${toJs(p.tree)})$`);
      for (const s of strings) {
        const got = simulate(p.direct.dfa, s).accepted;
        if (got !== oracle.test(s)) expect.fail(`regex ${JSON.stringify(src)} on ${JSON.stringify(s)}: DFA says ${got}`);
      }
    }
  });
});

describe('direct method: structural invariants on random expressions', () => {
  const r = rng(99);
  const samples = Array.from({ length: 600 }, () => randomRegex(r, 1 + r.int(5)));

  it('the printed form parses back to the same language', () => {
    for (const src of samples) {
      const a = regexPipeline(src);
      const b = regexPipeline(regexToString(parseRegex(src)));
      for (const s of ALL.slice(0, 400)) expect(simulate(b.direct.dfa, s).accepted).toBe(simulate(a.direct.dfa, s).accepted);
    }
  });

  it('the tree builds node by node like a postfix stack machine', () => {
    for (const src of samples) {
      const { direct } = regexPipeline(src);
      const byId = new Map(postOrder(direct.tree).map((n) => [n.id, n]));
      let stack: number[] = [];
      for (const step of direct.buildSteps) {
        const n = byId.get(step.nodeId)!;
        const arity = n.kind === 'concat' || n.kind === 'union' ? 2 : n.kind === 'symbol' || n.kind === 'epsilon' ? 0 : 1;
        const kids = arity === 2 && 'left' in n ? [n.left.id, n.right.id] : arity === 1 && 'child' in n ? [n.child.id] : [];
        // The operands of each operator are exactly the subtrees on top of the stack.
        expect(stack.slice(stack.length - arity), src).toEqual(arity ? kids : []);
        stack = [...stack.slice(0, stack.length - arity), n.id];
        expect(step.stack, src).toEqual(stack);
      }
      expect(stack, src).toEqual([direct.tree.id]);
    }
  });

  it('nullable, firstpos and lastpos match a brute-force reading of each subtree', () => {
    for (const src of samples) {
      const { direct } = regexPipeline(src);
      const symbolAt = new Map(direct.positions.map((p) => [p.pos, p.symbol]));
      for (const n of postOrder(direct.tree)) {
        if (n === direct.tree || (n.kind === 'symbol' && direct.positions[direct.endPos - 1].nodeId === n.id)) continue; // # is checked below
        const f = direct.facts[n.id];
        const re = new RegExp(`^(?:${toJs(n)})$`);
        expect(f.nullable, `nullable of ${regexToString(n)} in ${src}`).toBe(re.test(''));
        // firstpos/lastpos symbols are exactly the symbols that can start/end a non-empty match.
        const words = ALL.filter((w) => w.length > 0 && w.length <= 4 && re.test(w));
        const first = new Set(words.map((w) => w[0]));
        const last = new Set(words.map((w) => w.at(-1)!));
        expect(new Set(f.firstpos.map((p) => symbolAt.get(p))), `firstpos of ${regexToString(n)}`).toEqual(first);
        expect(new Set(f.lastpos.map((p) => symbolAt.get(p))), `lastpos of ${regexToString(n)}`).toEqual(last);
      }
      const root = direct.facts[direct.tree.id];
      expect(root.nullable).toBe(false);
      expect(root.lastpos).toEqual([direct.endPos]);
    }
  });

  it('followpos matches the positions that are adjacent in actual matches', () => {
    let checked = 0;
    for (const src of samples) {
      const { direct } = regexPipeline(src);
      const n = direct.positions.length;
      if (n > 6) continue;
      // Reference from the definition: list every word of the marked language (each position is
      // its own letter) up to a length bound, and read off which positions sit next to each other.
      // Any adjacency has a witness of length at most 2n (one pass to reach i, one to leave j).
      const K = 2 * n;
      const CAP = 100_000;
      let blown = false;
      const posOf = new Map(direct.positions.map((p) => [p.nodeId, p.pos]));
      const lang = (t: RegexNode): Set<string> => {
        const cat = (A: Set<string>, B: Set<string>) => {
          const out = new Set<string>();
          for (const x of A) for (const y of B) if (x.length + y.length <= K) out.add(x + y);
          if (out.size > CAP) blown = true;
          return out;
        };
        const closure = (A: Set<string>, withEmpty: boolean) => {
          let acc = new Set(A);
          for (; !blown; ) {
            const next = new Set([...acc, ...cat(acc, A)]);
            if (next.size === acc.size) break;
            acc = next;
          }
          if (withEmpty) acc.add('');
          return acc;
        };
        switch (t.kind) {
          case 'symbol':
            return new Set([String.fromCharCode(0x40 + posOf.get(t.id)!)]);
          case 'epsilon':
            return new Set(['']);
          case 'concat':
            return cat(lang(t.left), lang(t.right));
          case 'union':
            return new Set([...lang(t.left), ...lang(t.right)]);
          case 'star':
            return closure(lang(t.child), true);
          case 'plus':
            return closure(lang(t.child), false);
          case 'optional':
            return new Set([...lang(t.child), '']);
        }
      };
      const words = lang(direct.tree);
      if (blown) continue;
      const want: Set<number>[] = Array.from({ length: n + 1 }, () => new Set());
      for (const w of words)
        for (let k = 0; k + 1 < w.length; k++) want[w.charCodeAt(k) - 0x40].add(w.charCodeAt(k + 1) - 0x40);
      for (let i = 1; i <= n; i++) expect(direct.followpos[i], `followpos(${i}) in ${src}`).toEqual([...want[i]].sort((x, y) => x - y));
      checked++;
    }
    expect(checked).toBeGreaterThan(150);
  });

  it('the DFA is deterministic and every state is reachable', () => {
    for (const src of samples) {
      const { dfa } = regexPipeline(src).direct;
      const keys = dfa.transitions.map((t) => `${t.from}/${t.symbol}`);
      expect(new Set(keys).size).toBe(keys.length);
      const seen = new Set([dfa.start]);
      const queue = [dfa.start];
      while (queue.length) {
        const q = queue.shift()!;
        for (const t of dfa.transitions)
          if (t.from === q && !seen.has(t.to)) {
            seen.add(t.to);
            queue.push(t.to);
          }
      }
      expect(seen.size).toBe(dfa.states.length);
    }
  });
});

describe('direct method: edge cases', () => {
  it.each([
    ['ε', [''], ['a']],
    ['ε*', [''], ['a']],
    ['(ε|a)*', ['', 'a', 'aaa'], ['b']],
    ['a**', ['', 'a', 'aa'], ['b']],
    ['a?+', ['', 'a', 'aa'], ['b']],
    ['(a|b)+?', ['', 'ab', 'bba'], ['c']],
    ['a|bc*', ['a', 'b', 'bcc'], ['ac', 'abc', '']],
    ['ab|c', ['ab', 'c'], ['ac', 'abc']],
    ['(a|)', [], []],
  ])('%s', (src, yes, no) => {
    if (src === '(a|)') {
      expect(() => regexPipeline(src)).toThrow();
      return;
    }
    const { dfa } = regexPipeline(src).direct;
    for (const s of yes) expect(simulate(dfa, s).accepted, `"${s}"`).toBe(true);
    for (const s of no) expect(simulate(dfa, s).accepted, `"${s}"`).toBe(false);
  });
});
