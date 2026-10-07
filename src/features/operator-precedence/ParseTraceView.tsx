import { useMemo, useState, type ReactNode } from 'react';
import { formatProduction, isNonTerminal, type Grammar } from '../../algorithms/grammar/types';
import { parseString, type ParseStep } from '../../algorithms/operator-precedence/parseString';
import type { PrecedenceTable } from '../../algorithms/operator-precedence/precedenceTable';
import StepController from '../../components/stepper/StepController';
import { useStepper } from '../../components/stepper/useStepper';

interface Props {
  grammar: Grammar;
  table: PrecedenceTable;
  defaultInput?: string;
}

export default function ParseTraceView({ grammar, table, defaultInput = '' }: Props) {
  const [input, setInput] = useState(defaultInput);
  const result = useMemo(() => parseString(grammar, table, input), [grammar, table, input]);
  const stepper = useStepper(result.steps.length, result);
  const last = result.steps[result.steps.length - 1];

  return (
    <div>
      <div className="parse-form">
        <label>
          Input string:{' '}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. id + id * id"
            spellCheck={false}
            className="mono"
          />
        </label>
        <span className="muted">$ is appended automatically.</span>
      </div>

      <details className="info-note">
        <summary>ℹ️ How handles are found and matched (skeletal reduction)</summary>
        <p>
          When the top terminal ⋗ the input, the handle ends at the top of the stack. The parser
          walks down the stack over terminals related by ≐ until it finds a terminal that ⋖ the
          last one it passed; the handle is everything above that terminal, including the
          non-terminals next to it.
        </p>
        <p>
          Because the parser only compares terminals, it never applies unit productions like{' '}
          <code>E → T</code> (they contain no terminal to trigger a reduction). So handles are
          matched by their <strong>terminal skeleton</strong>: every non-terminal is treated as
          the same placeholder <code>N</code>. The handle <code>F + F</code> has skeleton{' '}
          <code>N + N</code>, which matches <code>E → E + T</code>. The pushed non-terminal is that
          production's left-hand side.
        </p>
      </details>

      {result.error ? (
        <div className="banner banner-error" role="alert">
          <strong>Rejected before parsing.</strong> {result.error}
        </div>
      ) : (
        <>
          <StepController stepper={stepper} label="Parse steps" />
          <div className="table-scroll">
            <table className="trace-table">
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
                  <tr key={i} className={i === stepper.current ? 'row-current' : undefined}>
                    <td>{i + 1}</td>
                    <td className="mono">{renderStack(s)}</td>
                    <td className="mono">{s.before.input.join(' ')}</td>
                    <td className="mono">
                      {s.topTerminal} {s.relation ?? '·'} {s.lookahead}
                    </td>
                    <td>{renderAction(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stepper.current >= 0 && (
            <p className="step-reason">{result.steps[stepper.current].reason}</p>
          )}
          {stepper.atEnd && last && (
            <div className={`banner ${result.accepted ? 'banner-ok' : 'banner-error'}`} role="status">
              <strong>{result.accepted ? 'ACCEPT' : 'REJECT'}.</strong>{' '}
              {result.accepted
                ? `"${result.tokens.join(' ')}" is in the language.`
                : last.action.type === 'reject' && last.action.message}
            </div>
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
 * future handle starts, so it is drawn right after the lower terminal (before any
 * non-terminal that will belong to that handle). A ≐ is drawn right before the upper
 * terminal.
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

  // The relation between the top terminal and the input. A ⋖ follows the same rule as above
  // (it marks where the next handle starts, which includes any non-terminal on top);
  // ≐ and ⋗ are simply appended after the last symbol.
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
      return `Shift ${a.symbol}`;
    case 'reduce':
      return (
        <>
          Reduce <span className="handle">{a.handle.join(' ')}</span> by{' '}
          <code>{formatProduction(a.production)}</code>
        </>
      );
    case 'accept':
      return <strong className="text-ok">ACCEPT</strong>;
    case 'reject':
      return (
        <span className="text-error">
          <strong>REJECT</strong>: {a.message}
        </span>
      );
  }
}
