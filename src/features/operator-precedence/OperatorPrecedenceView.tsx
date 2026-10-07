import { useMemo, useState } from 'react';
import { parseGrammar } from '../../algorithms/grammar/parseGrammar';
import type { Grammar } from '../../algorithms/grammar/types';
import {
  computeLeadingTrailing,
  type LeadingTrailingResult,
} from '../../algorithms/operator-precedence/leadingTrailing';
import {
  buildPrecedenceTable,
  type PrecedenceTableResult,
} from '../../algorithms/operator-precedence/precedenceTable';
import { SAMPLE_GRAMMARS } from '../../algorithms/operator-precedence/samples';
import { validateOperatorGrammar } from '../../algorithms/operator-precedence/validate';
import GrammarInput from './GrammarInput';
import LeadingTrailingView from './LeadingTrailingView';
import ParseTraceView from './ParseTraceView';
import PrecedenceTableView from './PrecedenceTableView';
import Section from './Section';
import './operatorPrecedence.css';

type Analysis =
  | { status: 'malformed'; grammar: null; errors: string[] }
  | { status: 'not-operator'; grammar: Grammar; errors: string[] }
  | {
      status: 'ok';
      grammar: Grammar;
      errors: [];
      sets: LeadingTrailingResult;
      table: PrecedenceTableResult;
    };

/**
 * Run the whole pipeline for a grammar text. Pure and cheap for classroom-sized grammars,
 * so it simply re-runs on every edit; every section receives fresh step lists and its
 * step controller resets.
 */
function analyze(text: string): Analysis {
  const parsed = parseGrammar(text);
  if (!parsed.grammar) {
    return { status: 'malformed', grammar: null, errors: parsed.errors.map((e) => e.message) };
  }
  const issues = validateOperatorGrammar(parsed.grammar);
  if (issues.length > 0) {
    return { status: 'not-operator', grammar: parsed.grammar, errors: issues.map((i) => i.message) };
  }
  const sets = computeLeadingTrailing(parsed.grammar);
  const table = buildPrecedenceTable(parsed.grammar, sets);
  return { status: 'ok', grammar: parsed.grammar, errors: [], sets, table };
}

export default function OperatorPrecedenceView() {
  const [text, setText] = useState(SAMPLE_GRAMMARS[0].text);
  const analysis = useMemo(() => analyze(text), [text]);

  const blockedReason =
    analysis.status === 'malformed'
      ? 'Fix the grammar errors above first.'
      : analysis.status === 'not-operator'
        ? 'Operator precedence parsing needs an operator grammar (no adjacent non-terminals, no ε-productions).'
        : undefined;

  const parseBlockedReason =
    blockedReason ??
    (analysis.status === 'ok' && !analysis.table.table.isOperatorPrecedence
      ? `String parsing is disabled: the precedence table has conflicts in ${analysis.table.table.conflicts
          .map((c) => `(${c.row}, ${c.col})`)
          .join(', ')}, so the parser could not decide between shifting and reducing there. ` +
        'This usually means the grammar is ambiguous; rewrite it with one non-terminal per precedence level.'
      : undefined);

  return (
    <div className="op-view">
      <Section number={1} title="Grammar">
        <GrammarInput
          text={text}
          onChange={setText}
          grammar={analysis.grammar}
          errors={analysis.errors}
          errorTitle={analysis.status === 'malformed' ? 'The grammar could not be read:' : 'Not an operator grammar:'}
        />
      </Section>

      <Section number={2} title="Leading and Trailing sets" disabledReason={blockedReason}>
        {analysis.status === 'ok' && <LeadingTrailingView grammar={analysis.grammar} result={analysis.sets} />}
      </Section>

      <Section number={3} title="Precedence table" disabledReason={blockedReason}>
        {analysis.status === 'ok' && <PrecedenceTableView result={analysis.table} />}
      </Section>

      <Section number={4} title="Parse a string" disabledReason={parseBlockedReason}>
        {analysis.status === 'ok' && (
          <ParseTraceView grammar={analysis.grammar} table={analysis.table.table} defaultInput="id + id * id" />
        )}
      </Section>
    </div>
  );
}
