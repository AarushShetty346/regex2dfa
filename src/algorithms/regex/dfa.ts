/** DFA types and helpers shared by the direct construction, the simulator and the UI. */

export interface DfaState {
  id: number;
  /** Display name: A, B, C, ... */
  name: string;
  /** The positions of the augmented regex this DFA state stands for (sorted). */
  positions: number[];
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

/** A, B, ..., Z, then A1, B1, ... */
export function stateName(i: number): string {
  const letter = String.fromCharCode(65 + (i % 26));
  const round = Math.floor(i / 26);
  return round === 0 ? letter : `${letter}${round}`;
}

export function setText(s: number[]): string {
  return `{${s.join(', ')}}`;
}
