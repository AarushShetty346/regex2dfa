export interface SampleGrammar {
  id: string;
  label: string;
  text: string;
}

/** Reference grammars: the first is the page default; all are used by the unit tests. */
export const SAMPLE_GRAMMARS: SampleGrammar[] = [
  {
    id: 'valid-expr',
    label: 'Valid OPG: arithmetic expressions',
    text: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
  },
  {
    id: 'adjacent-nt',
    label: 'Not an operator grammar: adjacent non-terminals',
    text: 'E -> E A E | id\nA -> + | *',
  },
  {
    id: 'epsilon',
    label: 'Not an operator grammar: ε-production',
    text: 'S -> a S | ε',
  },
  {
    id: 'ambiguous',
    label: 'Operator grammar with precedence conflicts (ambiguous)',
    text: 'E -> E + E | E * E | id',
  },
];

export function sampleText(id: string): string {
  const sample = SAMPLE_GRAMMARS.find((s) => s.id === id);
  if (!sample) throw new Error(`Unknown sample grammar "${id}"`);
  return sample.text;
}
