import { describe, expect, it } from 'vitest';
import {
  EPSILON,
  RegexSyntaxError,
  parseRegex,
  regexPipeline,
  regexToString,
  simulate,
  toPostfix,
  type DFA,
  type RegexNode,
} from './index';

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

describe('Dragon Book example (a|b)*abb, direct method', () => {
  const { direct } = regexPipeline('(a|b)*abb');

  it('numbers positions 1..6 with # last', () => {
    expect(direct.positions.map((p) => p.symbol)).toEqual(['a', 'b', 'a', 'b', 'b', '#']);
    expect(direct.endPos).toBe(6);
    expect(direct.positions.at(-1)!.end).toBe(true);
  });

  it('builds the augmented tree node by node from the postfix form', () => {
    const steps = direct.buildSteps;
    expect(steps.map((s) => s.token).join(' ')).toBe('a b | * a • b • b • # •');
    expect(steps).toHaveLength(Object.keys(direct.facts).length);
    // Every node is created once, after its children, and the last step creates the root.
    expect(new Set(steps.map((s) => s.nodeId)).size).toBe(steps.length);
    expect(steps.at(-1)!.nodeId).toBe(direct.tree.id);
    expect(steps.at(-1)!.stack).toEqual([direct.tree.id]);
    // After reading a b the stack holds two leaves; | then joins them into one subtree.
    expect(steps[1].stack).toHaveLength(2);
    expect(steps[2].stack).toHaveLength(1);
    expect(steps[0].title).toBe('Leaf a, position 1');
    expect(steps.at(-2)!.title).toBe('Leaf # (end marker), position 6');
  });

  it('computes firstpos and lastpos of the root', () => {
    const root = direct.facts[direct.tree.id];
    expect(root).toEqual({ nullable: false, firstpos: [1, 2, 3], lastpos: [6] });
    expect(direct.functionSteps).toHaveLength(Object.keys(direct.facts).length);
  });

  it('computes the followpos table from the book', () => {
    expect(direct.followpos.slice(1)).toEqual([[1, 2, 3], [1, 2, 3], [4], [5], [6], []]);
    expect(direct.followSteps.at(-1)!.followpos).toEqual(direct.followpos);
  });

  it('builds the 4-state DFA A..D', () => {
    const { dfa } = direct;
    expect(dfa.states.map((s) => s.positions)).toEqual([
      [1, 2, 3],
      [1, 2, 3, 4],
      [1, 2, 3, 5],
      [1, 2, 3, 6],
    ]);
    expect(dfa.states.filter((s) => s.accepting).map((s) => s.name)).toEqual(['D']);
    const edges = dfa.transitions.map((t) => `${dfa.states[t.from].name}-${t.symbol}-${dfa.states[t.to].name}`).sort();
    expect(edges).toEqual(['A-a-B', 'A-b-A', 'B-a-B', 'B-b-C', 'C-a-B', 'C-b-D', 'D-a-B', 'D-b-A'].sort());
    // One step for the start state plus one per (state, symbol).
    expect(direct.dfaSteps).toHaveLength(1 + 4 * 2);
  });

  it('treats a literal # in the input as an ordinary symbol', () => {
    const d = regexPipeline('a#').direct;
    expect(d.endPos).toBe(3);
    expect(simulate(d.dfa, 'a#').accepted).toBe(true);
    expect(simulate(d.dfa, 'a').accepted).toBe(false);
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

  it.each(cases)('%s: the direct DFA agrees with RegExp', (src) => {
    const p = regexPipeline(src);
    const oracle = new RegExp(`^(?:${toJs(p.tree)})$`);
    const alphabet = p.alphabet.length ? [...p.alphabet, 'z'] : ['z'];
    for (const s of allStrings(alphabet, 6)) {
      const want = oracle.test(s);
      expect(dfaAccepts(p.direct.dfa, s), `DFA on "${s}"`).toBe(want);
    }
  });

  it.each(cases)('%s: the DFA is deterministic', (src) => {
    const { dfa } = regexPipeline(src).direct;
    const keys = dfa.transitions.map((t) => `${t.from}/${t.symbol}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('simulate', () => {
  it('reports where a run gets stuck', () => {
    const dfa = regexPipeline('ab').direct.dfa;
    const run = simulate(dfa, 'abb');
    expect(run.accepted).toBe(false);
    expect(run.final).toBeNull();
    expect(run.steps.at(-1)).toMatchObject({ index: 2, symbol: 'b', to: null });
    expect(simulate(dfa, 'ab').accepted).toBe(true);
  });
});
