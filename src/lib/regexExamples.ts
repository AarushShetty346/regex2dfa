export const DEFAULT_REGEX = '(a|b)*abb';

export type Stage = 'tree' | 'follow' | 'dfa' | 'test';

/** The direct method (regex to DFA without an NFA), one tab per phase. */
export const STAGES: { id: Stage; label: string }[] = [
  { id: 'tree', label: 'Syntax tree' },
  { id: 'follow', label: 'followpos' },
  { id: 'dfa', label: 'DFA' },
  { id: 'test', label: 'Test strings' },
];

export function isStage(s: string | null): s is Stage {
  return STAGES.some((x) => x.id === s);
}
