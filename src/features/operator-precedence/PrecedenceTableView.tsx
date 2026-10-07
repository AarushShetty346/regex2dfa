import type {
  Conflict,
  PrecedenceTableResult,
  TableCells,
} from '../../algorithms/operator-precedence/precedenceTable';
import StepController from '../../components/stepper/StepController';
import StepExplanation from '../../components/stepper/StepExplanation';
import { useStepper } from '../../components/stepper/useStepper';

interface Props {
  result: PrecedenceTableResult;
}

export default function PrecedenceTableView({ result }: Props) {
  const { steps, table } = result;
  const stepper = useStepper(steps.length, result);
  const step = stepper.current >= 0 ? steps[stepper.current] : undefined;
  const cells: TableCells = step?.snapshot.cells ?? emptyCells(table.symbols);
  const conflictsSoFar = step?.snapshot.conflicts ?? [];
  const hl = step?.highlight;

  return (
    <div>
      <p className="muted hint">
        Rows are the topmost terminal on the stack, columns are the next input symbol.{' '}
        <span className="legend">⋖ yields · ≐ same handle · ⋗ takes precedence</span>. Built from the
        final Leading/Trailing sets above.
      </p>
      <StepController stepper={stepper} label="Precedence table steps" />

      <div className="table-scroll">
        <table className="prec-table">
          <thead>
            <tr>
              <th className="corner" title="row = stack top, column = input">
                stack \ input
              </th>
              {table.symbols.map((c) => (
                <th key={c} className={hl?.col === c ? 'hl-header' : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.symbols.map((r) => (
              <tr key={r}>
                <th scope="row" className={hl?.row === r ? 'hl-header' : undefined}>
                  {r}
                </th>
                {table.symbols.map((c) => {
                  const entries = cells[r][c];
                  const classes = [
                    entries.length > 1 ? 'cell-conflict' : '',
                    hl?.row === r && hl.col === c ? 'cell-current' : '',
                    hl && (hl.row === r || hl.col === c) ? 'cell-crosshair' : '',
                  ].join(' ');
                  return (
                    <td
                      key={c}
                      className={classes.trim() || undefined}
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
        <StepExplanation
          title={step.description}
          reason={step.conflictWith ? undefined : step.reason}
          tone={step.conflictWith ? 'error' : 'info'}
        >
          {step.conflictWith && (
            <ul className="conflict-reasons">
              {[...step.conflictWith, { relation: step.relation, reason: step.reason }].map((e, i) => (
                <li key={i}>
                  <strong>{e.relation}</strong>: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </StepExplanation>
      ) : (
        <StepExplanation title="Press Next to add one relation at a time, or Show All for the full table." />
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
      <div className="banner banner-ok" role="status">
        <strong>Valid operator-precedence grammar.</strong> Every cell holds at most one relation.
      </div>
    );
  }
  return (
    <div className="banner banner-error" role="status">
      <strong>Not an operator-precedence grammar.</strong>{' '}
      {final ? 'Conflicting cells:' : 'Conflicts found so far:'}
      <ul>
        {conflicts.map((c) => (
          <li key={`${c.row}|${c.col}`}>
            ({c.row}, {c.col}): {c.entries.map((e) => e.relation).join(' and ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function emptyCells(symbols: string[]): TableCells {
  return Object.fromEntries(symbols.map((r) => [r, Object.fromEntries(symbols.map((c) => [c, []]))]));
}
