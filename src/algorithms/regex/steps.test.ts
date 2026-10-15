/**
 * Step-by-step checks for the direct method on hand-picked expressions: every phase is replayed
 * and compared with its definition, and the DFA is compared with a matcher built on Brzozowski
 * derivatives, which shares no code with the construction.
 */
import { describe, expect, it } from 'vitest';
import { regexPipeline, simulate, postOrder, RegexSyntaxError, type RegexNode } from './index';

// ---- independent oracle: Brzozowski derivatives on the AST ----
type D = { k: 'empty' } | { k: 'eps' } | { k: 'sym'; s: string } | { k: 'cat'; l: D; r: D } | { k: 'alt'; l: D; r: D } | { k: 'star'; c: D };
const E: D = { k: 'empty' }, EPS: D = { k: 'eps' };
function conv(n: RegexNode): D {
  switch (n.kind) {
    case 'symbol': return { k: 'sym', s: n.symbol };
    case 'epsilon': return EPS;
    case 'concat': return { k: 'cat', l: conv(n.left), r: conv(n.right) };
    case 'union': return { k: 'alt', l: conv(n.left), r: conv(n.right) };
    case 'star': return { k: 'star', c: conv(n.child) };
    case 'plus': { const c = conv(n.child); return { k: 'cat', l: c, r: { k: 'star', c } }; }
    case 'optional': return { k: 'alt', l: conv(n.child), r: EPS };
  }
}
const nul = (d: D): boolean => d.k === 'eps' || d.k === 'star' || (d.k === 'cat' ? nul(d.l) && nul(d.r) : d.k === 'alt' ? nul(d.l) || nul(d.r) : false);
const cat = (l: D, r: D): D => (l.k === 'empty' || r.k === 'empty' ? E : l.k === 'eps' ? r : r.k === 'eps' ? l : { k: 'cat', l, r });
const alt = (l: D, r: D): D => (l.k === 'empty' ? r : r.k === 'empty' ? l : { k: 'alt', l, r });
function der(d: D, a: string): D {
  switch (d.k) {
    case 'empty': case 'eps': return E;
    case 'sym': return d.s === a ? EPS : E;
    case 'alt': return alt(der(d.l, a), der(d.r, a));
    case 'star': return cat(der(d.c, a), d);
    case 'cat': { const x = cat(der(d.l, a), d.r); return nul(d.l) ? alt(x, der(d.r, a)) : x; }
  }
}
const matches = (d: D, w: string[]) => nul(w.reduce(der, d));

function words(alpha: string[], max: number) { const out: string[][] = [[]]; let f: string[][] = [[]]; for (let i = 0; i < max; i++) { f = f.flatMap((w) => alpha.map((a) => [...w, a])); out.push(...f); } return out; }

const CASES = [
  'a', 'ab', 'a|b', 'a*', 'a+', 'a?', '(a|b)*abb', '(a|b)*a(a|b)(a|b)', 'a**', '(a*)*', '(a*)+', '(a?)*', '(a+)?', '((a|b)*)*',
  'ε', '\\e', 'ε*', '(ε|a)*', 'aε', 'εa', 'a|ε', '(a|ε)(b|ε)', '((ε))', 'a(ba)*', '(ab|a)*b', 'a*b*c*', '(a|b|c)*abc',
  '(0|1(01*0)*1)*', 'x?y+z*', '(a b)* c', '\\*a\\|', 'a#b', '(a|b)+?', '((a|b)(a|b))*', '(aa|aab)*b', 'a(b|c)*d?',
  '(a*b*)*', '(a|b*)*', '((a)|(b))((c))', 'abcabcabcabc', '(a|bc|def)+', '(ab)?(ba)?', 'a?a?a?aaa', '(1|0)*1(1|0)?',
];

describe('direct method, step by step', () => {
  for (const src of CASES) {
    it(src, () => {
      const p = regexPipeline(src);
      const d = p.direct;
      const oracle = conv(p.tree);
      const alpha = [...p.alphabet, 'z'];
      const maxLen = p.alphabet.length <= 2 ? 9 : p.alphabet.length <= 3 ? 6 : 4;
      for (const w of words(alpha, maxLen)) expect(simulate(d.dfa, w.join('')).accepted, `${src} on "${w.join('')}"`).toBe(matches(oracle, w));

      // positions are left to right, # is last
      const leaves = postOrder(d.tree).filter((n) => n.kind === 'symbol');
      expect(d.positions.map((p) => p.nodeId)).toEqual(leaves.map((n) => n.id));
      expect(d.positions.at(-1)!.end).toBe(true);
      // one build step / function step per node, in post-order
      const order = postOrder(d.tree).map((n) => n.id);
      expect(d.buildSteps.map((s) => s.nodeId)).toEqual(order);
      expect(d.functionSteps.map((s) => s.nodeId)).toEqual(order);
      for (const s of d.functionSteps) expect(s.facts).toEqual(d.facts[s.nodeId]);
      // followpos steps are cumulative and end at the final table
      let prev: number[][] = Array.from({ length: d.endPos + 1 }, () => []);
      for (const s of d.followSteps) {
        for (let i = 1; i <= d.endPos; i++) {
          const want = s.from.includes(i) ? [...new Set([...prev[i], ...s.add])].sort((a, b) => a - b) : prev[i];
          expect(s.followpos[i]).toEqual(want);
        }
        prev = s.followpos;
      }
      expect(prev).toEqual(d.followpos);
      expect(d.followpos[d.endPos]).toEqual([]);
      // DFA steps: one start + one per (state, symbol), in BFS order; snapshots grow monotonically
      const moves = d.dfaSteps.filter((s) => s.kind === 'move');
      expect(moves.length).toBe(d.dfa.states.length * p.alphabet.length);
      let k = 0;
      for (const st of d.dfa.states)
        for (const a of p.alphabet) {
        const m = moves[k++] as Extract<typeof moves[number], { kind: 'move' }>;
        expect([m.from, m.symbol]).toEqual([st.id, a]);
        const used = st.positions.filter((q) => d.positions[q - 1].symbol === a && !d.positions[q - 1].end);
        expect(m.used).toEqual(used);
        const res = [...new Set(used.flatMap((q) => d.followpos[q]))].sort((x, y) => x - y);
        expect(m.result).toEqual(used.length ? res : []);
        if (!used.length) expect(m.target).toBeNull();
        else expect(d.dfa.states[m.target!].positions).toEqual(res);
      }
      expect(d.dfaSteps.at(-1)!.dfa).toEqual(d.dfa);
      // distinct states, accepting iff contains #
      const keys = d.dfa.states.map((s) => s.positions.join(','));
      expect(new Set(keys).size).toBe(keys.length);
      for (const s of d.dfa.states) expect(s.accepting).toBe(s.positions.includes(d.endPos));
      // deterministic
      const tk = d.dfa.transitions.map((t) => `${t.from},${t.symbol}`);
      expect(new Set(tk).size).toBe(tk.length);
    });
  }

  it('dragon book example (a|b)*abb', () => {
    const d = regexPipeline('(a|b)*abb').direct;
    expect(d.followpos.slice(1)).toEqual([[1, 2, 3], [1, 2, 3], [4], [5], [6], []]);
    expect(d.dfa.states.map((s) => s.positions)).toEqual([[1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 5], [1, 2, 3, 6]]);
  });

  for (const bad of ['', '   ', '(', ')', 'a|', '|a', '*', 'a(', '(a))', '()', 'a||b', '\\', '(*a)', 'a|*', '+a']) {
    it(`rejects ${JSON.stringify(bad)}`, () => {
      expect(() => regexPipeline(bad)).toThrow(RegexSyntaxError);
    });
  }
  it('long input', () => {
    const src = '(a|b)*' + 'ab'.repeat(30);
    const d = regexPipeline(src).direct;
    const w = 'ba'.repeat(20) + 'ab'.repeat(30);
    expect(simulate(d.dfa, w).accepted).toBe(true);
    expect(simulate(d.dfa, w + 'a').accepted).toBe(false);
  });
});
