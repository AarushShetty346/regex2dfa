import { EPSILON } from './parse';
import type { NFA } from './thompson';

export interface DfaState {
  id: number;
  /** Display name: A, B, C, ... */
  name: string;
  /** The NFA states this DFA state stands for (sorted). Empty for minimized DFAs. */
  nfaStates: number[];
  accepting: boolean;
}

export interface DfaTransition {
  from: number;
  to: number;
  symbol: string;
}

export interface DFA {
  states: DfaState[];
  start: number;
  transitions: DfaTransition[];
  alphabet: string[];
}

export type SubsetStep =
  | {
      kind: 'start';
      title: string;
      detail: string;
      closure: number[];
      created: number;
      dfa: DFA;
    }
  | {
      kind: 'move';
      title: string;
      detail: string;
      from: number;
      symbol: string;
      /** States reachable from `from` on `symbol` (before ε-closure). */
      move: number[];
      closure: number[];
      /** 'empty' when no NFA state moves on the symbol, so the DFA gets no edge. */
      outcome: 'new' | 'existing' | 'empty';
      target: number | null;
      dfa: DFA;
    };

export interface SubsetResult {
  dfa: DFA;
  steps: SubsetStep[];
}

/** A, B, ..., Z, then A1, B1, ... */
export function stateName(i: number): string {
  const letter = String.fromCharCode(65 + (i % 26));
  const round = Math.floor(i / 26);
  return round === 0 ? letter : `${letter}${round}`;
}

export function setText(s: number[]): string {
  return `{${s.join(', ')}}`;
}

export function epsilonClosure(nfa: NFA, from: Iterable<number>): number[] {
  const seen = new Set(from);
  const stack = [...seen];
  while (stack.length) {
    const s = stack.pop()!;
    for (const t of nfa.transitions) {
      if (t.from === s && t.symbol === EPSILON && !seen.has(t.to)) {
        seen.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return [...seen].sort((a, b) => a - b);
}

export function move(nfa: NFA, from: number[], symbol: string): number[] {
  const out = new Set<number>();
  for (const t of nfa.transitions) if (t.symbol === symbol && from.includes(t.from)) out.add(t.to);
  return [...out].sort((a, b) => a - b);
}

/** Subset construction: each DFA state is the ε-closure of a set of NFA states. */
export function subsetConstruction(nfa: NFA): SubsetResult {
  const states: DfaState[] = [];
  const transitions: DfaTransition[] = [];
  const steps: SubsetStep[] = [];
  const byKey = new Map<string, number>();
  const snapshot = (): DFA => ({
    states: states.map((s) => ({ ...s })),
    start: 0,
    transitions: transitions.map((t) => ({ ...t })),
    alphabet: nfa.alphabet,
  });

  const add = (set: number[]) => {
    const id = states.length;
    states.push({ id, name: stateName(id), nfaStates: set, accepting: set.includes(nfa.accept) });
    byKey.set(set.join(','), id);
    return id;
  };

  const start = epsilonClosure(nfa, [nfa.start]);
  add(start);
  steps.push({
    kind: 'start',
    title: `Start state A = ε-closure({${nfa.start}})`,
    detail: `Everything reachable from NFA state ${nfa.start} by ε-edges alone is ${setText(start)}. That set becomes DFA state A${states[0].accepting ? ', which is accepting because it contains the NFA accept state' : ''}.`,
    closure: start,
    created: 0,
    dfa: snapshot(),
  });

  // States are processed in creation order, so `next` is the first unmarked state.
  for (let next = 0; next < states.length; next++) {
    const d = states[next];
    for (const a of nfa.alphabet) {
      const m = move(nfa, d.nfaStates, a);
      const closure = m.length ? epsilonClosure(nfa, m) : [];
      let outcome: 'new' | 'existing' | 'empty';
      let target: number | null = null;
      let detail: string;

      if (m.length === 0) {
        outcome = 'empty';
        detail = `No state in ${setText(d.nfaStates)} has an edge on ${a}, so ${d.name} has no ${a}-transition (it would go to the dead state).`;
      } else {
        const key = closure.join(',');
        const existing = byKey.get(key);
        target = existing ?? add(closure);
        outcome = existing === undefined ? 'new' : 'existing';
        transitions.push({ from: d.id, to: target, symbol: a });
        const name = states[target].name;
        detail =
          `move(${d.name}, ${a}) = ${setText(m)}, and its ε-closure is ${setText(closure)}. ` +
          (outcome === 'new'
            ? `That set is new, so it becomes DFA state ${name}${states[target].accepting ? ' (accepting)' : ''}.`
            : `That set is already state ${name}, so the edge goes there.`);
      }

      steps.push({
        kind: 'move',
        title: `Dtran[${d.name}, ${a}] = ${target === null ? '∅' : states[target].name}`,
        detail,
        from: d.id,
        symbol: a,
        move: m,
        closure,
        outcome,
        target,
        dfa: snapshot(),
      });
    }
  }

  return { dfa: snapshot(), steps };
}
