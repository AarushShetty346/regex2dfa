import type { DFA, DfaState } from './subset';

export interface MinimizeStep {
  kind: 'initial' | 'refine' | 'stable' | 'result';
  title: string;
  detail: string;
  /** Partition after this step: groups of DFA state ids. */
  partition: number[][];
  /**
   * For `refine`/`stable`: each state's signature, i.e. the index (into the previous
   * partition) of the group each symbol leads to, or null when there is no transition.
   */
  signatures?: { state: number; targets: (number | null)[] }[];
  /** Groups of the previous partition that this step split. */
  split?: number[][];
  previous?: number[][];
  /** Present on the final step. */
  minimal?: DFA;
}

export interface MinimizeResult {
  dfa: DFA;
  steps: MinimizeStep[];
  /** For each original DFA state id, the id of its state in the minimized DFA. */
  groupOf: number[];
}

const sortGroups = (p: number[][]) =>
  p.map((g) => [...g].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);

/**
 * Partition refinement (Moore's algorithm).
 *
 * Start from {accepting, non-accepting}; then repeatedly split any group whose states
 * disagree on which group some symbol leads to. A missing transition counts as going to an
 * implicit dead state, so it is its own "group". When a round splits nothing, every group
 * is a set of equivalent states and becomes one state of the minimal DFA.
 */
export function minimizeDfa(dfa: DFA): MinimizeResult {
  const name = (id: number) => dfa.states[id].name;
  const groupText = (g: number[]) => `{${g.map(name).join(', ')}}`;
  const delta = new Map<string, number>();
  for (const t of dfa.transitions) delta.set(`${t.from}|${t.symbol}`, t.to);

  const steps: MinimizeStep[] = [];
  const accepting = dfa.states.filter((s) => s.accepting).map((s) => s.id);
  const rest = dfa.states.filter((s) => !s.accepting).map((s) => s.id);
  let partition = sortGroups([accepting, rest].filter((g) => g.length > 0));

  steps.push({
    kind: 'initial',
    title: 'Split accepting from non-accepting',
    detail:
      partition.length === 1
        ? `Every state is ${accepting.length ? 'accepting' : 'non-accepting'}, so the first partition is a single group ${groupText(partition[0])}.`
        : `An accepting state can never be equivalent to a non-accepting one, so start with ${partition.map(groupText).join(' and ')}.`,
    partition,
  });

  for (let round = 1; ; round++) {
    const groupIndex = new Map<number, number>();
    partition.forEach((g, i) => g.forEach((s) => groupIndex.set(s, i)));

    const signatures = dfa.states.map((s) => ({
      state: s.id,
      targets: dfa.alphabet.map((a) => {
        const to = delta.get(`${s.id}|${a}`);
        return to === undefined ? null : groupIndex.get(to)!;
      }),
    }));
    const sigKey = (id: number) => signatures[id].targets.map((t) => (t === null ? '-' : t)).join(',');

    const next: number[][] = [];
    const split: number[][] = [];
    for (const g of partition) {
      const buckets = new Map<string, number[]>();
      for (const s of g) {
        const k = sigKey(s);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(s);
      }
      if (buckets.size > 1) split.push(g);
      next.push(...buckets.values());
    }
    const nextSorted = sortGroups(next);
    const previous = partition;

    if (split.length === 0) {
      steps.push({
        kind: 'stable',
        title: `Round ${round}: no group splits`,
        detail: 'Within every group, all states send each symbol to the same group. The partition is stable, so these groups are the states of the minimal DFA.',
        partition,
        signatures,
        split,
        previous,
      });
      break;
    }

    steps.push({
      kind: 'refine',
      title: `Round ${round}: split ${split.length === 1 ? 'one group' : `${split.length} groups`}`,
      detail:
        split
          .map((g) => `${groupText(g)} splits because its states disagree on where some symbol leads`)
          .join('; ') + `. The partition is now ${nextSorted.map(groupText).join(' ')}.`,
      partition: nextSorted,
      signatures,
      split,
      previous,
    });
    partition = nextSorted;
  }

  // Build the minimal DFA: one state per group, ordered so the start state's group is first.
  const ordered = [...partition].sort((a, b) => {
    if (a.includes(dfa.start)) return -1;
    if (b.includes(dfa.start)) return 1;
    return a[0] - b[0];
  });
  const groupOf: number[] = [];
  ordered.forEach((g, i) => g.forEach((s) => (groupOf[s] = i)));

  const allSingle = dfa.states.every((s) => s.name.length === 1);
  const states: DfaState[] = ordered.map((g, i) => ({
    id: i,
    name: g.map(name).join(allSingle ? '' : ','),
    nfaStates: [],
    accepting: dfa.states[g[0]].accepting,
  }));
  const seen = new Set<string>();
  const transitions = [];
  for (const t of dfa.transitions) {
    const from = groupOf[t.from];
    const to = groupOf[t.to];
    const key = `${from}|${t.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    transitions.push({ from, to, symbol: t.symbol });
  }
  const minimal: DFA = { states, start: 0, transitions, alphabet: dfa.alphabet };

  const merged = ordered.filter((g) => g.length > 1);
  steps.push({
    kind: 'result',
    title: `Minimal DFA: ${states.length} state${states.length === 1 ? '' : 's'}`,
    detail:
      merged.length === 0
        ? 'No two states were equivalent, so the DFA was already minimal.'
        : `Merged ${merged.map(groupText).join(', ')}. ${dfa.states.length} states became ${states.length}.`,
    partition,
    minimal,
  });

  return { dfa: minimal, steps, groupOf };
}
