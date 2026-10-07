import type { DFA } from './subset';

export interface SimulationStep {
  /** Index of the character consumed by this step. */
  index: number;
  symbol: string;
  from: number;
  /** null when the DFA has no transition: the input is rejected right there. */
  to: number | null;
}

export interface Simulation {
  steps: SimulationStep[];
  /** State the run ended in, or null if it got stuck. */
  final: number | null;
  accepted: boolean;
}

/** Run `input` through `dfa` one character at a time. */
export function simulate(dfa: DFA, input: string): Simulation {
  const steps: SimulationStep[] = [];
  let state: number | null = dfa.start;
  const chars = [...input];
  for (let i = 0; i < chars.length && state !== null; i++) {
    const t = dfa.transitions.find((x) => x.from === state && x.symbol === chars[i]);
    steps.push({ index: i, symbol: chars[i], from: state, to: t ? t.to : null });
    state = t ? t.to : null;
  }
  return {
    steps,
    final: state,
    accepted: state !== null && dfa.states[state].accepting,
  };
}
