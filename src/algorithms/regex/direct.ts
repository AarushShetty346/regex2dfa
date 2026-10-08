/**
 * Direct construction of a DFA from a regular expression (Dragon Book §3.9.5).
 *
 * 1. Augment the expression to (r)#, so reaching the end marker # means "accept".
 * 2. Number every symbol leaf with a position, left to right (# gets the last one).
 * 3. Compute nullable, firstpos and lastpos for every node, bottom-up.
 * 4. Compute followpos from the concatenation and star (and plus) nodes.
 * 5. Build the DFA: each state is a set of positions, starting from firstpos(root).
 *
 * No NFA is built. Each phase returns its own step list so the UI can replay it.
 */
import { postOrder, type RegexNode } from './parse';
import { setText, stateName, type DFA, type DfaState, type DfaTransition } from './dfa';

export const END_MARKER = '#';

export interface Position {
  pos: number;
  symbol: string;
  /** Id of the leaf in the augmented tree. */
  nodeId: number;
  /** True for the end marker #. */
  end: boolean;
}

export interface NodeFacts {
  nullable: boolean;
  firstpos: number[];
  lastpos: number[];
}

/** One node's nullable, firstpos and lastpos, in post-order. */
export interface FunctionStep {
  nodeId: number;
  title: string;
  detail: string;
  facts: NodeFacts;
}

/** One concatenation or star/plus node adding entries to followpos. */
export interface FollowStep {
  nodeId: number;
  title: string;
  detail: string;
  /** Positions whose followpos grows (lastpos of the left child, or of the starred node). */
  from: number[];
  /** What gets added to each of them. */
  add: number[];
  /** followpos after this step, indexed by position (index 0 unused). */
  followpos: number[][];
}

export type DirectDfaStep =
  | { kind: 'start'; title: string; detail: string; created: number; dfa: DFA }
  | {
      kind: 'move';
      title: string;
      detail: string;
      from: number;
      symbol: string;
      /** Positions in the source state that hold the symbol. */
      used: number[];
      /** Union of followpos over `used`. */
      result: number[];
      /** 'empty' when no position holds the symbol, so the DFA gets no edge. */
      outcome: 'new' | 'existing' | 'empty';
      target: number | null;
      dfa: DFA;
    };

export interface DirectResult {
  /** The augmented tree (r)#. */
  tree: RegexNode;
  positions: Position[];
  endPos: number;
  facts: Record<number, NodeFacts>;
  functionSteps: FunctionStep[];
  /** Final followpos, indexed by position (index 0 unused). */
  followpos: number[][];
  followSteps: FollowStep[];
  dfa: DFA;
  dfaSteps: DirectDfaStep[];
}

const union = (...sets: number[][]) => [...new Set(sets.flat())].sort((a, b) => a - b);

/** Short label for a node in step titles, e.g. "a (position 3)" or "• node". */
export function nodeLabel(n: RegexNode, posOf: Map<number, number>): string {
  switch (n.kind) {
    case 'symbol':
      return `${n.symbol} (position ${posOf.get(n.id)})`;
    case 'epsilon':
      return 'ε leaf';
    case 'concat':
      return '• node';
    case 'union':
      return '| node';
    case 'star':
      return '* node';
    case 'plus':
      return '+ node';
    case 'optional':
      return '? node';
  }
}

export function directConstruction(tree: RegexNode, alphabet: string[]): DirectResult {
  // 1. Augment: (r)#. Fresh ids continue after the largest id in the tree.
  const maxId = Math.max(...postOrder(tree).map((n) => n.id));
  const marker: RegexNode = { kind: 'symbol', id: maxId + 1, symbol: END_MARKER };
  const root: RegexNode = { kind: 'concat', id: maxId + 2, left: tree, right: marker };
  const order = postOrder(root);

  // 2. Positions, left to right (post-order visits leaves in reading order).
  const positions: Position[] = [];
  const posOf = new Map<number, number>();
  for (const n of order) {
    if (n.kind !== 'symbol') continue;
    const pos = positions.length + 1;
    positions.push({ pos, symbol: n.symbol, nodeId: n.id, end: n === marker });
    posOf.set(n.id, pos);
  }
  const endPos = positions.length;

  // 3. nullable, firstpos, lastpos.
  const facts: Record<number, NodeFacts> = {};
  const functionSteps: FunctionStep[] = [];
  for (const n of order) {
    let f: NodeFacts;
    let detail: string;
    switch (n.kind) {
      case 'symbol': {
        const p = posOf.get(n.id)!;
        f = { nullable: false, firstpos: [p], lastpos: [p] };
        detail = `A leaf with position ${p} matches exactly one symbol, so it is not nullable and firstpos = lastpos = {${p}}.`;
        break;
      }
      case 'epsilon':
        f = { nullable: true, firstpos: [], lastpos: [] };
        detail = 'An ε leaf matches only the empty string: nullable, with empty firstpos and lastpos.';
        break;
      case 'union': {
        const [l, r] = [facts[n.left.id], facts[n.right.id]];
        f = { nullable: l.nullable || r.nullable, firstpos: union(l.firstpos, r.firstpos), lastpos: union(l.lastpos, r.lastpos) };
        detail = 'For c1 | c2: nullable if either side is, and firstpos and lastpos are the unions of the two sides.';
        break;
      }
      case 'concat': {
        const [l, r] = [facts[n.left.id], facts[n.right.id]];
        f = {
          nullable: l.nullable && r.nullable,
          firstpos: l.nullable ? union(l.firstpos, r.firstpos) : l.firstpos,
          lastpos: r.nullable ? union(l.lastpos, r.lastpos) : r.lastpos,
        };
        detail =
          `For c1 • c2: nullable only if both are. firstpos is firstpos(c1)${l.nullable ? ' ∪ firstpos(c2), because c1 is nullable' : ', because c1 is not nullable'}; ` +
          `lastpos is lastpos(c2)${r.nullable ? ' ∪ lastpos(c1), because c2 is nullable' : ', because c2 is not nullable'}.`;
        break;
      }
      case 'star':
      case 'plus':
      case 'optional': {
        const c = facts[n.child.id];
        f = { nullable: n.kind === 'plus' ? c.nullable : true, firstpos: c.firstpos, lastpos: c.lastpos };
        detail =
          n.kind === 'plus'
            ? 'For c+: nullable only if c is; firstpos and lastpos are those of c.'
            : `For c${n.kind === 'star' ? '*' : '?'}: always nullable; firstpos and lastpos are those of c.`;
        break;
      }
    }
    facts[n.id] = f;
    functionSteps.push({
      nodeId: n.id,
      title: `${nodeLabel(n, posOf)}: firstpos ${setText(f.firstpos)}, lastpos ${setText(f.lastpos)}`,
      detail,
      facts: f,
    });
  }

  // 4. followpos.
  const follow: number[][] = Array.from({ length: endPos + 1 }, () => []);
  const followSteps: FollowStep[] = [];
  for (const n of order) {
    let from: number[];
    let add: number[];
    let rule: string;
    if (n.kind === 'concat') {
      from = facts[n.left.id].lastpos;
      add = facts[n.right.id].firstpos;
      rule = `Concatenation: every position in lastpos(c1) = ${setText(from)} can be followed by any position in firstpos(c2) = ${setText(add)}.`;
    } else if (n.kind === 'star' || n.kind === 'plus') {
      from = facts[n.id].lastpos;
      add = facts[n.id].firstpos;
      rule = `${n.kind === 'star' ? 'Star' : 'Plus'}: the loop lets every position in lastpos ${setText(from)} be followed by any position in firstpos ${setText(add)}.`;
    } else continue;
    for (const i of from) follow[i] = union(follow[i], add);
    followSteps.push({
      nodeId: n.id,
      title: from.length && add.length ? `followpos(${from.join(', ')}) ∪= ${setText(add)}` : `${nodeLabel(n, posOf)} adds nothing`,
      detail: rule,
      from,
      add,
      followpos: follow.map((s) => [...s]),
    });
  }

  // 5. DFA states are sets of positions.
  const states: DfaState[] = [];
  const transitions: DfaTransition[] = [];
  const dfaSteps: DirectDfaStep[] = [];
  const byKey = new Map<string, number>();
  const snapshot = (): DFA => ({
    states: states.map((s) => ({ ...s, positions: [...s.positions] })),
    start: 0,
    transitions: transitions.map((t) => ({ ...t })),
    alphabet,
  });
  const add = (set: number[]) => {
    const id = states.length;
    states.push({ id, name: stateName(id), positions: set, accepting: set.includes(endPos) });
    byKey.set(set.join(','), id);
    return id;
  };

  const start = facts[root.id].firstpos;
  add(start);
  dfaSteps.push({
    kind: 'start',
    title: `Start state A = firstpos(root) = ${setText(start)}`,
    detail:
      `The first symbol of any match must come from firstpos of the root, ${setText(start)}. That set is DFA state A` +
      (states[0].accepting ? `, which is accepting because it contains the end marker's position ${endPos}.` : '.'),
    created: 0,
    dfa: snapshot(),
  });

  for (let next = 0; next < states.length; next++) {
    const s = states[next];
    for (const a of alphabet) {
      const used = s.positions.filter((p) => !positions[p - 1].end && positions[p - 1].symbol === a);
      const result = union(...used.map((p) => follow[p]));
      let outcome: 'new' | 'existing' | 'empty';
      let target: number | null = null;
      let detail: string;
      if (used.length === 0) {
        outcome = 'empty';
        detail = `No position in ${setText(s.positions)} holds ${a}, so ${s.name} has no ${a}-transition (it would go to the dead state).`;
      } else {
        const existing = byKey.get(result.join(','));
        target = existing ?? add(result);
        outcome = existing === undefined ? 'new' : 'existing';
        transitions.push({ from: s.id, to: target, symbol: a });
        const name = states[target].name;
        detail =
          `In ${s.name}, the positions holding ${a} are ${setText(used)}. The union of their followpos is ${setText(result)}. ` +
          (outcome === 'new'
            ? `That set is new, so it becomes DFA state ${name}${states[target].accepting ? `, accepting because it contains position ${endPos} (#)` : ''}.`
            : `That set is already state ${name}, so the edge goes there.`);
      }
      dfaSteps.push({
        kind: 'move',
        title: `Dtran[${s.name}, ${a}] = ${target === null ? '∅' : states[target].name}`,
        detail,
        from: s.id,
        symbol: a,
        used,
        result,
        outcome,
        target,
        dfa: snapshot(),
      });
    }
  }

  return { tree: root, positions, endPos, facts, functionSteps, followpos: follow, followSteps, dfa: snapshot(), dfaSteps };
}
