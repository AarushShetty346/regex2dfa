import type { Conflict, PrecedenceTableResult, TableCells } from '../../../algorithms/operator-precedence/precedenceTable';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { Callout, cx } from '../../../ui/primitives';
import { Explain } from './parts';

export default function TableView({ result }: { result: PrecedenceTableResult }) {
  const { steps, table } = result;
  const stepper = useStepper(steps.length, result);
  const step = stepper.current >= 0 ? steps[stepper.current] : undefined;
  const cells: TableCells = step?.snapshot.cells ?? emptyCells(table.symbols);
  const conflictsSoFar = step?.snapshot.conflicts ?? [];
  const hl = step?.highlight;

  return (
    <div className="op-view">
      <p className="hint">
        Rows are the topmost terminal on the stack, columns are the next input symbol.{' '}
        <span className="relations">
          <span>
            <b>⋖</b> yields
          </span>
          <span>
            <b>≐</b> same handle
          </span>
          <span>
            <b>⋗</b> takes precedence
          </span>
        </span>
        . Built from the final Leading/Trailing sets above.
      </p>
      <StepBar stepper={stepper} label="Precedence table steps" />

      <div className="table-scroll" tabIndex={0} aria-label="Precedence table" data-lenis-prevent>
        <table className="table matrix">
          <thead>
            <tr>
              <th className="matrix-corner" title="row = stack top, column = input">
                stack \ input
              </th>
              {table.symbols.map((c) => (
                <th key={c} className={cx('mono', hl?.col === c && 'is-axis')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.symbols.map((r) => (
              <tr key={r}>
                <th scope="row" className={cx('mono', hl?.row === r && 'is-axis')}>
                  {r}
                </th>
                {table.symbols.map((c) => {
                  const entries = cells[r][c];
                  return (
                    <td
                      key={c}
                      className={
                        cx(
                          entries.length > 1 && 'is-conflict',
                          hl?.row === r && hl.col === c && 'is-target',
                          hl && (hl.row === r || hl.col === c) && 'is-cross',
                        ) || undefined
                      }
                      title={entries.map((e) => e.reason).join('\n')}
                    >
                      {entries.map((e) => e.relation).join(' ')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {step ? (
        <Explain title={step.description} reason={step.conflictWith ? undefined : step.reason} tone={step.conflictWith ? 'error' : 'info'}>
          {step.conflictWith && (
            <ul className="conflict-list">
              {[...step.conflictWith, { relation: step.relation, reason: step.reason }].map((e, i) => (
                <li key={i}>
                  <strong>{e.relation}</strong>: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </Explain>
      ) : (
        <Explain kicker="Not started" title="Press Next to add one relation at a time, or Show all for the full table." />
      )}

      {(stepper.atEnd || conflictsSoFar.length > 0) && (
        <Verdict conflicts={stepper.atEnd ? table.conflicts : conflictsSoFar} final={stepper.atEnd} />
      )}
    </div>
  );
}

function Verdict({ conflicts, final }: { conflicts: Conflict[]; final: boolean }) {
  if (conflicts.length === 0) {
    return (
      <Callout tone="success" role="status">
        <strong>Valid operator-precedence grammar.</strong> Every cell holds at most one relation.
      </Callout>
    );
  }
  return (
    <Callout tone="danger" role="status">
      <strong>Not an operator-precedence grammar.</strong> {final ? 'Conflicting cells:' : 'Conflicts found so far:'}
      <ul>
        {conflicts.map((c) => (
          <li key={`${c.row}|${c.col}`}>
            ({c.row}, {c.col}): {c.entries.map((e) => e.relation).join(' and ')}
          </li>
        ))}
      </ul>
    </Callout>
  );
}

function emptyCells(symbols: string[]): TableCells {
  return Object.fromEntries(symbols.map((r) => [r, Object.fromEntries(symbols.map((c) => [c, []]))]));
}
