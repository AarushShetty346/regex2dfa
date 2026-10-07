import { alphabetOf, parseRegex, toPostfix, type RegexNode } from './parse';
import { thompson, type ThompsonResult } from './thompson';
import { subsetConstruction, type SubsetResult } from './subset';
import { minimizeDfa, type MinimizeResult } from './minimize';

export * from './parse';
export * from './thompson';
export * from './subset';
export * from './minimize';
export * from './simulate';

export interface Pipeline {
  tree: RegexNode;
  postfix: string;
  alphabet: string[];
  thompson: ThompsonResult;
  subset: SubsetResult;
  minimize: MinimizeResult;
}

/** Regex → syntax tree → Thompson NFA → subset-construction DFA → minimal DFA. */
export function regexPipeline(input: string): Pipeline {
  const tree = parseRegex(input);
  const t = thompson(tree);
  const s = subsetConstruction(t.nfa);
  return {
    tree,
    postfix: toPostfix(tree),
    alphabet: alphabetOf(tree),
    thompson: t,
    subset: s,
    minimize: minimizeDfa(s.dfa),
  };
}
