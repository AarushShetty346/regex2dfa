import { describe, expect, it } from 'vitest';
import {
  EPSILON,
  RegexSyntaxError,
  epsilonClosure,
  move,
  parseRegex,
  regexPipeline,
  regexToString,
  simulate,
  toPostfix,
  type DFA,
  type NFA,
  type RegexNode,
} from './index';

function nfaAccepts(nfa: NFA, input: string): boolean {
  let cur = epsilonClosure(nfa, [nfa.start]);
  for (const c of input) {
    const m = move(nfa, cur, c);
    cur = m.length ? epsilonClosure(nfa, m) : [];
  }
  return cur.includes(nfa.accept);
}

const dfaAccepts = (dfa: DFA, input: string) => simulate(dfa, input).accepted;

/** Translate our AST to a native JS RegExp as an independent oracle. */
function toJs(n: RegexNode): string {
  switch (n.kind) {
    case 'symbol':
      return n.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

describe('parseRegex', () => {
  it('respects precedence: star > concat > union', () => {
    expect(regexToString(parseRegex('a|bc*'))).toBe('a|bc*');
    expect(toPostfix(parseRegex('a|bc*'))).toBe('a b c * • |');
    expect(toPostfix(parseRegex('(a|b)*abb'))).toBe('a b | * a • b • b •');
  });

  it('ignores whitespace and supports ε and escapes', () => {
    expect(regexToString(parseRegex(' a ( b | ε ) '))).toBe(`a(b|${EPSILON})`);
    expect(regexToString(parseRegex('a\\e'))).toBe(`a${EPSILON}`);
    expect(parseRegex('\\*')).toMatchObject({ kind: 'symbol', symbol: '*' });
  });

  it.each([
    ['', 0],
    ['(ab', 3],
    ['ab)', 2],
    ['a||b', 2],
    ['*a', 0],
    ['(|a)', 1],
    ['a\\', 1],
  ])('rejects %j at position %i', (input, position) => {
    try {
      parseRegex(input);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RegexSyntaxError);
      expect((e as RegexSyntaxError).position).toBe(position);
    }
  });
});

describe('Dragon Book example (a|b)*abb', () => {
  const p = regexPipeline('(a|b)*abb');

  it('builds the 11-state Thompson NFA numbered 0..10', () => {
    const { nfa } = p.thompson;
    expect(nfa.states).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(nfa.start).toBe(0);
    expect(nfa.accept).toBe(10);
    const edges = nfa.transitions.map((t) => `${t.from}-${t.symbol}-${t.to}`).sort();
    expect(edges).toEqual(
      [
        '0-ε-1', '0-ε-7', '1-ε-2', '1-ε-4', '2-a-3', '4-b-5', '3-ε-6', '5-ε-6',
        '6-ε-1', '6-ε-7', '7-a-8', '8-b-9', '9-b-10',
      ].sort(),
    );
  });

  it('subset construction gives states A..E as in the book', () => {
    const { dfa } = p.subset;
    expect(dfa.states.map((s) => s.nfaStates)).toEqual([
      [0, 1, 2, 4, 7],
      [1, 2, 3, 4, 6, 7, 8],
      [1, 2, 4, 5, 6, 7],
      [1, 2, 4, 5, 6, 7, 9],
      [1, 2, 4, 5, 6, 7, 10],
    ]);
    expect(dfa.states.filter((s) => s.accepting).map((s) => s.name)).toEqual(['E']);
    // One step for the start state plus one per (state, symbol).
    expect(p.subset.steps).toHaveLength(1 + 5 * 2);
  });

  it('minimization merges A and C into 4 states', () => {
    const { dfa, steps } = p.minimize;
    expect(dfa.states.map((s) => s.name)).toEqual(['AC', 'B', 'D', 'E']);
    expect(steps.at(-1)!.kind).toBe('result');
  });

  it('every Thompson step only grows the NFA', () => {
    const steps = p.thompson.steps;
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].states.length).toBeGreaterThanOrEqual(steps[i - 1].states.length);
      expect(steps[i].transitions.length).toBeGreaterThanOrEqual(steps[i - 1].transitions.length);
    }
    expect(steps.at(-1)!.transitions).toHaveLength(p.thompson.nfa.transitions.length);
  });
});

describe('language equivalence against JS RegExp', () => {
  const cases = [
    'a',
    'ab|ba',
    '(a|b)*abb',
    'a*b*',
    '(ab)*',
    'a+b?',
    '(a|ε)b',
    '((a|b)(a|b))*',
    '(a*|b*)*',
    'a(b|c)*d+',
    '(0|1(01*0)*1)*', // binary multiples of 3
    'ε',
    'a??',
    '(a|b)*a(a|b)(a|b)',
  ];

  it.each(cases)('%s: NFA, DFA and minimal DFA agree with RegExp', (src) => {
    const p = regexPipeline(src);
    const oracle = new RegExp(`^(?:${toJs(p.tree)})$`);
    const alphabet = p.alphabet.length ? [...p.alphabet, 'z'] : ['z'];
    for (const s of allStrings(alphabet, 6)) {
      const want = oracle.test(s);
      expect(nfaAccepts(p.thompson.nfa, s), `NFA on "${s}"`).toBe(want);
      expect(dfaAccepts(p.subset.dfa, s), `DFA on "${s}"`).toBe(want);
      expect(dfaAccepts(p.minimize.dfa, s), `min DFA on "${s}"`).toBe(want);
    }
  });

  it('minimal DFA sizes match known values', () => {
    expect(regexPipeline('(0|1(01*0)*1)*').minimize.dfa.states).toHaveLength(3);
    expect(regexPipeline('(a|b)*a(a|b)(a|b)').minimize.dfa.states).toHaveLength(8);
    expect(regexPipeline('(a*|b*)*').minimize.dfa.states).toHaveLength(1);
  });
});

describe('simulate', () => {
  it('reports where a run gets stuck', () => {
    const dfa = regexPipeline('ab').minimize.dfa;
    const run = simulate(dfa, 'abb');
    expect(run.accepted).toBe(false);
    expect(run.final).toBeNull();
    expect(run.steps.at(-1)).toMatchObject({ index: 2, symbol: 'b', to: null });
    expect(simulate(dfa, 'ab').accepted).toBe(true);
  });
});
