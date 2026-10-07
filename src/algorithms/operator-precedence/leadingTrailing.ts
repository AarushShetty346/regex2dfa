import { formatProduction, isNonTerminal, type Grammar, type Production } from '../grammar/types';
import type { Step } from '../steps';

export type SetKind = 'leading' | 'trailing';

/** Non-terminal → terminals, always ordered like `Grammar.terminals` for stable display. */
export type TerminalSets = Record<string, string[]>;

export interface LeadingTrailingSnapshot {
  leading: TerminalSets;
  trailing: TerminalSets;
}

/**
 * Which rule added a terminal. Written for Leading; Trailing is the mirror image.
 *  - 'direct'   A → a…    (Trailing: A → …a)
 *  - 'after-nt' A → B a…  (Trailing: A → …a B)
 *  - 'inherit'  A → B…    (Trailing: A → …B), copies Leading(B) into Leading(A)
 */
export type LeadingTrailingRule = 'direct' | 'after-nt' | 'inherit';

export interface LeadingTrailingHighlight {
  set: SetKind;
  nonTerminal: string;
  /** The terminal just added (absent on the fixed-point step). */
  terminal?: string;
  productionId?: number;
  /** For 'inherit': the non-terminal whose set was copied from. */
  fromNonTerminal?: string;
}

interface BaseStep extends Step<LeadingTrailingSnapshot, LeadingTrailingHighlight> {
  set: SetKind;
  /** 1-based pass over all productions. */
  pass: number;
}

/** One terminal added to one set. */
export interface AddTerminalStep extends BaseStep {
  kind: 'add';
  nonTerminal: string;
  terminal: string;
  production: Production;
  rule: LeadingTrailingRule;
  fromNonTerminal?: string;
}

/** Marks the end of a phase: a full pass added nothing, so the sets are final. */
export interface FixedPointStep extends BaseStep {
  kind: 'fixed-point';
}

export type LeadingTrailingStep = AddTerminalStep | FixedPointStep;

export interface LeadingTrailingResult {
  steps: LeadingTrailingStep[];
  leading: TerminalSets;
  trailing: TerminalSets;
}

/**
 * Compute Leading and Trailing for every non-terminal, as a step log.
 *
 * Leading is computed to a fixed point first, then Trailing. Each phase repeatedly
 * sweeps all productions in order; a sweep that adds nothing ends the phase. Repeated
 * sweeps are needed because the 'inherit' rule reads Leading(B), which may still be
 * incomplete when A's production is visited (e.g. E → T is seen before T's productions).
 *
 * Trailing is literally "Leading of the reversed body": the last terminal of a body is the
 * first terminal of the body read backwards. So both phases share one implementation that
 * only differs in the direction it reads the body and in the wording of the explanations.
 *
 * Assumes an operator grammar (validated beforehand): no ε-bodies and no adjacent
 * non-terminals, so the first terminal of a body is always in position 0 or 1.
 */
export function computeLeadingTrailing(grammar: Grammar): LeadingTrailingResult {
  const sets: Record<SetKind, Record<string, Set<string>>> = {
    leading: emptySets(grammar),
    trailing: emptySets(grammar),
  };
  const steps: LeadingTrailingStep[] = [];

  const snapshot = (): LeadingTrailingSnapshot => ({
    leading: toOrdered(sets.leading, grammar),
    trailing: toOrdered(sets.trailing, grammar),
  });

  for (const kind of ['leading', 'trailing'] as const) {
    const target = sets[kind];
    let pass = 0;
    let changed = true;

    while (changed) {
      pass++;
      changed = false;

      for (const production of grammar.productions) {
        // Read the body from the side this set cares about.
        const body = kind === 'leading' ? production.rhs : [...production.rhs].reverse();
        if (body.length === 0) continue;
        const A = production.lhs;
        const [first, second] = body;

        const add = (terminal: string, rule: LeadingTrailingRule, from?: string) => {
          if (target[A].has(terminal)) return;
          target[A].add(terminal);
          changed = true;
          steps.push({
            kind: 'add',
            set: kind,
            pass,
            nonTerminal: A,
            terminal,
            production,
            rule,
            fromNonTerminal: from,
            description: `Add ${terminal} to ${setName(kind, A)}`,
            reason: explain(kind, production, terminal, rule, from),
            highlight: {
              set: kind,
              nonTerminal: A,
              terminal,
              productionId: production.id,
              fromNonTerminal: from,
            },
            snapshot: snapshot(),
          });
        };

        if (!isNonTerminal(first)) {
          add(first, 'direct');
        } else {
          if (second !== undefined && !isNonTerminal(second)) add(second, 'after-nt');
          // A → A… would only copy A's set into itself, so skip it. B's terminals are read
          // in grammar order so the step sequence is deterministic.
          if (first !== A) {
            for (const t of orderedTerminals(sets[kind][first], grammar)) add(t, 'inherit', first);
          }
        }
      }
    }

    const label = kind === 'leading' ? 'Leading' : 'Trailing';
    steps.push({
      kind: 'fixed-point',
      set: kind,
      pass,
      description: `${label} sets are complete`,
      reason: `Pass ${pass} over all productions added nothing new, so a fixed point is reached.`,
      highlight: { set: kind, nonTerminal: '' },
      snapshot: snapshot(),
    });
  }

  const final = snapshot();
  return { steps, leading: final.leading, trailing: final.trailing };
}

function setName(kind: SetKind, nt: string): string {
  return `${kind === 'leading' ? 'Leading' : 'Trailing'}(${nt})`;
}

function explain(
  kind: SetKind,
  production: Production,
  terminal: string,
  rule: LeadingTrailingRule,
  from?: string,
): string {
  const p = formatProduction(production);
  const target = setName(kind, production.lhs);
  const leading = kind === 'leading';
  switch (rule) {
    case 'direct':
      return leading
        ? `${terminal} ∈ ${target} because ${p} starts with the terminal ${terminal} (rule A → a…).`
        : `${terminal} ∈ ${target} because ${p} ends with the terminal ${terminal} (rule A → …a).`;
    case 'after-nt':
      return leading
        ? `${terminal} ∈ ${target} because in ${p} the first terminal ${terminal} comes right after a leading non-terminal (rule A → B a…).`
        : `${terminal} ∈ ${target} because in ${p} the last terminal ${terminal} comes right before a trailing non-terminal (rule A → …a B).`;
    case 'inherit':
      return leading
        ? `${terminal} ∈ ${target} because ${p} starts with ${from} and ${terminal} ∈ Leading(${from}) (rule A → B…: Leading(B) ⊆ Leading(A)).`
        : `${terminal} ∈ ${target} because ${p} ends with ${from} and ${terminal} ∈ Trailing(${from}) (rule A → …B: Trailing(B) ⊆ Trailing(A)).`;
  }
}

function emptySets(grammar: Grammar): Record<string, Set<string>> {
  return Object.fromEntries(grammar.nonTerminals.map((nt) => [nt, new Set<string>()]));
}

function orderedTerminals(set: Set<string>, grammar: Grammar): string[] {
  return grammar.terminals.filter((t) => set.has(t));
}

function toOrdered(sets: Record<string, Set<string>>, grammar: Grammar): TerminalSets {
  return Object.fromEntries(
    grammar.nonTerminals.map((nt) => [nt, orderedTerminals(sets[nt], grammar)]),
  );
}
