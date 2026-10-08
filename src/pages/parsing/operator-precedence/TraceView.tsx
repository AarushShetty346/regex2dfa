import { useId, useMemo, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { formatProduction, isNonTerminal, type Grammar } from '../../../algorithms/grammar/types';
import { parseString, type ParseStep } from '../../../algorithms/operator-precedence/parseString';
import type { PrecedenceTable } from '../../../algorithms/operator-precedence/precedenceTable';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { Callout } from '../../../ui/primitives';
import { Disclosure } from './parts';

interface Props {
  grammar: Grammar;
  table: PrecedenceTable;
  defaultInput?: string;
}

export default function TraceView({ grammar, table, defaultInput = '' }: Props) {
  const id = useId();
  const [input, setInput] = useState(defaultInput);
  const result = useMemo(() => parseString(grammar, table, input), [grammar, table, input]);
  const stepper = useStepper(result.steps.length, result);
  const last = result.steps[result.steps.length - 1];

  return (
    <div className="op-view">
      <div className="field">
        <label htmlFor={`${id}-input`} className="field-label">
          Input string
        </label>
        <div className="input-with-suffix">
          <input
            id={`${id}-input`}
            className="input mono"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. id + id * id"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
          <span className="input-suffix mono" aria-hidden>
            $
          </span>
        </div>
        <p className="hint">$ is appended automatically.</p>
      </div>

      <Disclosure
        className="note"
        summary={
          <>
            <Info size={16} aria-hidden /> How handles are found and matched (skeletal reduction)
          </>
        }
      >
        <p>
          When the top terminal ⋗ the input, the handle ends at the top of the stack. The parser walks down the stack over terminals related
          by ≐ until it finds a terminal that ⋖ the last one it passed; the handle is everything above that terminal, including the
          non-terminals next to it.
        </p>
        <p>
          Because the parser only compares terminals, it never applies unit productions like <code>E → T</code> (they contain no terminal
          to trigger a reduction). So handles are matched by their <strong>terminal skeleton</strong>: every non-terminal is treated as the
          same placeholder <code>N</code>. The handle <code>F + F</code> has skeleton <code>N + N</code>, which matches{' '}
          <code>E → E + T</code>. The pushed non-terminal is that production's left-hand side.
        </p>
      </Disclosure>

      {result.error ? (
        <Callout tone="danger" role="alert">
          <strong>Rejected before parsing.</strong> {result.error}
        </Callout>
      ) : (
        <>
          <StepBar stepper={stepper} label="Parse steps" />
          <div className="table-scroll" tabIndex={0} aria-label="Parse trace" data-lenis-prevent>
            <table className="table trace">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Stack</th>
                  <th>Input</th>
                  <th>Relation used</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.slice(0, stepper.shown).map((s, i) => (
                  <tr key={i} className={i === stepper.current ? 'is-active' : undefined}>
                    <td className="mono subtle">{i + 1}</td>
                    <td className="mono">{renderStack(s)}</td>
                    <td className="mono">{s.before.input.join(' ')}</td>
                    <td className="mono">
                      {s.topTerminal} {s.relation ?? '·'} {s.lookahead}
                    </td>
                    <td>{renderAction(s)}</td>
                  </tr>
                ))}
                {stepper.shown === 0 && (
                  <tr className="table-empty-row">
                    <td colSpan={5} className="table-empty">
                      Press Next to start the parse.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {stepper.current >= 0 && <p className="explain-reason trace-reason">{result.steps[stepper.current].reason}</p>}
          {stepper.atEnd && last && (
            <Callout tone={result.accepted ? 'success' : 'danger'} role="status">
              <strong>{result.accepted ? 'ACCEPT' : 'REJECT'}.</strong>{' '}
              {result.accepted ? `"${result.tokens.join(' ')}" is in the language.` : last.action.type === 'reject' && last.action.message}
            </Callout>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Draw the stack with precedence marks between terminals, e.g. "$ ⋖ F + ⋖ F * F ⋗".
 *
 * Each shifted terminal remembers its relation to the terminal below it. A ⋖ marks where a
 * future handle starts, so it is drawn right after the lower terminal (before any non-terminal
 * that will belong to that handle). A ≐ is drawn right before the upper terminal.
 */
function renderStack(step: ParseStep): ReactNode {
  const { stack } = step.before;
  const gapBefore: string[] = stack.map(() => '');
  let previousTerminal = 0;
  stack.forEach((entry, i) => {
    if (isNonTerminal(entry.symbol)) return;
    if (entry.relation === '⋖') gapBefore[previousTerminal + 1] = '⋖';
    else if (entry.relation) gapBefore[i] = entry.relation;
    previousTerminal = i;
  });

  // The relation between the top terminal and the input. A ⋖ follows the rule above (it marks
  // where the next handle starts, including any non-terminal on top); ≐ and ⋗ are appended.
  const top = step.highlight.topTerminalIndex;
  let trailing = step.relation;
  if (step.relation === '⋖' && top + 1 < stack.length) {
    gapBefore[top + 1] = '⋖';
    trailing = undefined;
  }

  const handle = step.highlight.handle;
  const inHandle = (i: number) => handle !== undefined && i >= handle.start && i <= handle.end;

  const parts: ReactNode[] = [];
  stack.forEach((entry, i) => {
    if (gapBefore[i]) parts.push(<span key={`r${i}`} className="rel">{` ${gapBefore[i]} `}</span>);
    else if (i > 0) parts.push(' ');
    parts.push(
      <span key={i} className={inHandle(i) ? 'handle' : undefined}>
        {entry.symbol}
      </span>,
    );
  });
  if (trailing) parts.push(<span key="end" className="rel">{` ${trailing}`}</span>);
  return parts;
}

function renderAction(step: ParseStep): ReactNode {
  const a = step.action;
  switch (a.type) {
    case 'shift':
      return <span className="action action-shift">Shift {a.symbol}</span>;
    case 'reduce':
      return (
        <span className="action action-reduce">
          Reduce <span className="handle">{a.handle.join(' ')}</span> by <code>{formatProduction(a.production)}</code>
        </span>
      );
    case 'accept':
      return <strong className="text-success">ACCEPT</strong>;
    case 'reject':
      return (
        <span className="text-danger">
          <strong>REJECT</strong>: {a.message}
        </span>
      );
  }
}
