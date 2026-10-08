/** Example expressions offered on the Regex to DFA page and the home page. */
export const EXAMPLES = ['(a|b)*abb', 'a(b|c)*d+', '(0|1(01*0)*1)*', '(ab|ba)?c*', '(a|ε)b+a?'];

export const DEFAULT_REGEX = '(a|b)*abb';

export type Stage = 'tree' | 'nfa' | 'dfa' | 'min' | 'test';

export const STAGES: { id: Stage; label: string; short: string; does: string }[] = [
  { id: 'tree', label: 'Syntax tree', short: 'Parse', does: 'Parse the expression by operator precedence.' },
  { id: 'nfa', label: 'Thompson NFA', short: 'Construct', does: 'Build an ε-NFA, one small machine per operator.' },
  { id: 'dfa', label: 'Subset construction', short: 'Determinize', does: 'Turn sets of NFA states into DFA states.' },
  { id: 'min', label: 'Minimize', short: 'Minimize', does: 'Merge states no input string can tell apart.' },
  { id: 'test', label: 'Test strings', short: 'Run', does: 'Feed a string through the minimal DFA.' },
];

export function isStage(s: string | null): s is Stage {
  return STAGES.some((x) => x.id === s);
}
