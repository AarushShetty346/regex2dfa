import { useMemo, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { parseGrammar } from '../../../algorithms/grammar/parseGrammar';
import type { Grammar } from '../../../algorithms/grammar/types';
import { computeLeadingTrailing, type LeadingTrailingResult } from '../../../algorithms/operator-precedence/leadingTrailing';
import { buildPrecedenceTable, type PrecedenceTableResult } from '../../../algorithms/operator-precedence/precedenceTable';
import { SAMPLE_GRAMMARS } from '../../../algorithms/operator-precedence/samples';
import { validateOperatorGrammar } from '../../../algorithms/operator-precedence/validate';
import { cx } from '../../../ui/primitives';
import GrammarEditor from './GrammarEditor';
import SetsView from './SetsView';
import TableView from './TableView';
import TraceView from './TraceView';

type Analysis =
  | { status: 'malformed'; grammar: null; errors: string[] }
  | { status: 'not-operator'; grammar: Grammar; errors: string[] }
  | { status: 'ok'; grammar: Grammar; errors: []; sets: LeadingTrailingResult; table: PrecedenceTableResult };

/**
 * Run the whole pipeline for a grammar text. Cheap for classroom-sized grammars, so it re-runs
 * on every edit; each section gets fresh step lists and its step bar resets.
 */
function analyze(text: string): Analysis {
  const parsed = parseGrammar(text);
  if (!parsed.grammar) return { status: 'malformed', grammar: null, errors: parsed.errors.map((e) => e.message) };
  const issues = validateOperatorGrammar(parsed.grammar);
  if (issues.length > 0) return { status: 'not-operator', grammar: parsed.grammar, errors: issues.map((i) => i.message) };
  const sets = computeLeadingTrailing(parsed.grammar);
  const table = buildPrecedenceTable(parsed.grammar, sets);
  return { status: 'ok', grammar: parsed.grammar, errors: [], sets, table };
}

export default function OperatorPrecedence() {
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
    <ol className="sections">
      <Section n={1} title="Grammar" summary="Productions, start symbol and terminals">
        <GrammarEditor
          text={text}
          onChange={setText}
          grammar={analysis.grammar}
          errors={analysis.errors}
          errorTitle={analysis.status === 'malformed' ? 'The grammar could not be read:' : 'Not an operator grammar:'}
        />
      </Section>
      <Section n={2} title="Leading and Trailing sets" summary="First and last terminals each non-terminal can produce" blocked={blockedReason}>
        {analysis.status === 'ok' && <SetsView grammar={analysis.grammar} result={analysis.sets} />}
      </Section>
      <Section n={3} title="Precedence table" summary="One relation per pair of terminals" blocked={blockedReason}>
        {analysis.status === 'ok' && <TableView result={analysis.table} />}
      </Section>
      <Section n={4} title="Parse a string" summary="Shift-reduce, driven by the table" blocked={parseBlockedReason}>
        {analysis.status === 'ok' && <TraceView grammar={analysis.grammar} table={analysis.table.table} defaultInput="id + id * id" />}
      </Section>
    </ol>
  );
}

interface SectionProps {
  n: number;
  title: string;
  summary: string;
  /** When set, the section is locked and shows this reason instead of its content. */
  blocked?: string;
  children?: ReactNode;
}

/** One numbered stage of the page, drawn as a step on a vertical rail. */
function Section({ n, title, summary, blocked, children }: SectionProps) {
  const id = `op-step-${n}`;
  return (
    <li className={cx('section', blocked && 'is-locked')}>
      <span className="section-n mono" aria-hidden>
        {n}
      </span>
      <section className="card section-card" aria-labelledby={id}>
        <header className="section-head">
          <h2 id={id} className="card-title">
            <span className="sr-only">{`Step ${n}: `}</span>
            {title}
          </h2>
          <p className="section-summary">{summary}</p>
        </header>
        {blocked ? (
          <p className="section-locked">
            <Lock size={16} aria-hidden />
            <span>{blocked}</span>
          </p>
        ) : (
          children
        )}
      </section>
    </li>
  );
}
