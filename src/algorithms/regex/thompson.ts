import { EPSILON, alphabetOf, postOrder, regexToString, type RegexNode } from './parse';

export interface NfaTransition {
  from: number;
  to: number;
  /** A symbol of the alphabet, or `EPSILON`. */
  symbol: string;
}

export interface NFA {
  states: number[];
  start: number;
  accept: number;
  transitions: NfaTransition[];
  alphabet: string[];
}

/** One application of a Thompson rule, with the whole (partial) NFA forest after it. */
export interface ThompsonStep {
  rule: RegexNode['kind'];
  /** The sub-expression this step built, e.g. `(a|b)*`. */
  text: string;
  title: string;
  detail: string;
  /** Every state and transition that exists after this step (may be several disconnected fragments). */
  states: number[];
  transitions: NfaTransition[];
  /** States belonging to the fragment built in this step. */
  fragment: number[];
  newStates: number[];
  newTransitions: NfaTransition[];
  start: number;
  accept: number;
}

export interface ThompsonResult {
  nfa: NFA;
  steps: ThompsonStep[];
}

interface Built {
  start: number;
  accept: number;
  states: number[];
  /** States this node allocated itself (not its children's, not a shared start). */
  own: number[];
  /** Edges this node added itself. */
  edges: NfaTransition[];
  /** True when the start state is borrowed from the fragment to the left (concatenation). */
  sharedStart: boolean;
}

const RULE_TITLE: Record<RegexNode['kind'], string> = {
  symbol: 'Symbol',
  epsilon: 'Empty string',
  concat: 'Concatenation',
  union: 'Union',
  star: 'Kleene star',
  plus: 'One or more',
  optional: 'Optional',
};

/**
 * Thompson's construction (the Dragon Book variant).
 *
 * Concatenation does not add an ε-edge: the right fragment simply starts in the left
 * fragment's accept state. That is safe because a Thompson fragment's start has no incoming
 * edges and its accept has no outgoing edges, and it keeps the NFA small.
 *
 * States are numbered the way the Dragon Book does it: a construct's new start state is
 * numbered before its sub-expressions and its new accept state after them, so `(a|b)*abb`
 * gives the familiar states 0..10. The steps are then replayed bottom-up (children before
 * parents), each one adding the states and edges its rule introduces.
 */
export function thompson(tree: RegexNode): ThompsonResult {
  let counter = 0;
  const built = new Map<number, Built>();

  function build(node: RegexNode, startHint?: number): Built {
    const take = () => counter++;
    let b: Built;
    switch (node.kind) {
      case 'symbol':
      case 'epsilon': {
        const s = startHint ?? take();
        const f = take();
        const sym = node.kind === 'symbol' ? node.symbol : EPSILON;
        b = { start: s, accept: f, states: [s, f], own: [], edges: [{ from: s, to: f, symbol: sym }], sharedStart: false };
        b.own = startHint === undefined ? [s, f] : [f];
        break;
      }
      case 'concat': {
        const l = build(node.left, startHint);
        const r = build(node.right, l.accept);
        b = {
          start: l.start,
          accept: r.accept,
          states: [...l.states, ...r.states.filter((s) => s !== l.accept)],
          own: [],
          edges: [],
          sharedStart: false,
        };
        break;
      }
      case 'union': {
        const i = startHint ?? take();
        const l = build(node.left);
        const r = build(node.right);
        const f = take();
        b = {
          start: i,
          accept: f,
          states: [i, ...l.states, ...r.states, f],
          own: startHint === undefined ? [i, f] : [f],
          edges: [
            { from: i, to: l.start, symbol: EPSILON },
            { from: i, to: r.start, symbol: EPSILON },
            { from: l.accept, to: f, symbol: EPSILON },
            { from: r.accept, to: f, symbol: EPSILON },
          ],
          sharedStart: false,
        };
        break;
      }
      case 'star':
      case 'plus':
      case 'optional': {
        const i = startHint ?? take();
        const c = build(node.child);
        const f = take();
        const edges: NfaTransition[] = [{ from: i, to: c.start, symbol: EPSILON }];
        if (node.kind !== 'optional') edges.push({ from: c.accept, to: c.start, symbol: EPSILON });
        edges.push({ from: c.accept, to: f, symbol: EPSILON });
        if (node.kind !== 'plus') edges.push({ from: i, to: f, symbol: EPSILON });
        b = {
          start: i,
          accept: f,
          states: [i, ...c.states, f],
          own: startHint === undefined ? [i, f] : [f],
          edges,
          sharedStart: false,
        };
        break;
      }
    }
    b.sharedStart = startHint !== undefined && node.kind !== 'concat';
    built.set(node.id, b);
    return b;
  }

  const root = build(tree);

  const states: number[] = [];
  const transitions: NfaTransition[] = [];
  const steps: ThompsonStep[] = [];

  for (const node of postOrder(tree)) {
    const b = built.get(node.id)!;
    states.push(...b.own);
    transitions.push(...b.edges);
    steps.push({
      rule: node.kind,
      text: regexToString(node),
      title: RULE_TITLE[node.kind],
      detail: describe(node, b, built),
      states: [...states].sort((x, y) => x - y),
      transitions: [...transitions],
      fragment: [...b.states].sort((x, y) => x - y),
      newStates: [...b.own],
      newTransitions: [...b.edges],
      start: b.start,
      accept: b.accept,
    });
  }

  return {
    nfa: {
      states: [...states].sort((x, y) => x - y),
      start: root.start,
      accept: root.accept,
      transitions,
      alphabet: alphabetOf(tree),
    },
    steps,
  };
}

function describe(node: RegexNode, b: Built, built: Map<number, Built>): string {
  const shared = b.sharedStart
    ? ` It starts from state ${b.start}, the accept state of the expression to its left, which is how concatenation joins the two.`
    : '';
  switch (node.kind) {
    case 'symbol':
      return `State ${b.start} moves to state ${b.accept} on reading ${node.symbol}.${shared}`;
    case 'epsilon':
      return `State ${b.start} moves to state ${b.accept} on ε, without reading input.${shared}`;
    case 'concat': {
      const l = built.get(node.left.id)!;
      return `${regexToString(node.left)} ends in state ${l.accept}, and ${regexToString(node.right)} starts there, so the two run back to back. No new states are needed.`;
    }
    case 'union':
      return `State ${b.start} branches by ε into both alternatives, and both fall through by ε into state ${b.accept}.${shared}`;
    case 'star':
      return `ε-edges from ${b.start} either enter the fragment or skip to ${b.accept}, and the fragment's end can loop back to repeat it.${shared}`;
    case 'plus':
      return `Like the star but with no bypass from ${b.start} to ${b.accept}: the fragment runs at least once, then may loop.${shared}`;
    case 'optional':
      return `An ε bypass from ${b.start} to ${b.accept} lets the fragment run once or not at all.${shared}`;
  }
}
