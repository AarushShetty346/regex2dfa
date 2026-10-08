import { alphabetOf, parseRegex, toPostfix, type RegexNode } from './parse';
import { directConstruction, type DirectResult } from './direct';

export * from './parse';
export * from './dfa';
export * from './direct';
export * from './simulate';

export interface Pipeline {
  /** The expression as typed, before augmenting. */
  tree: RegexNode;
  postfix: string;
  alphabet: string[];
  direct: DirectResult;
}

/** Regex → augmented syntax tree → nullable/firstpos/lastpos → followpos → DFA (the direct method). */
export function regexPipeline(input: string): Pipeline {
  const tree = parseRegex(input);
  const alphabet = alphabetOf(tree);
  return { tree, postfix: toPostfix(tree), alphabet, direct: directConstruction(tree, alphabet) };
}
