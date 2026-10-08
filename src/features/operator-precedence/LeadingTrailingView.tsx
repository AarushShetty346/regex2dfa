import type { Grammar } from '../../algorithms/grammar/types';
import type {
  LeadingTrailingResult,
  LeadingTrailingSnapshot,
  SetKind,
} from '../../algorithms/operator-precedence/leadingTrailing';
import StepController from '../../components/stepper/StepController';
import StepExplanation from '../../components/stepper/StepExplanation';
import { useStepper } from '../../components/stepper/useStepper';

interface Props {
  grammar: Grammar;
  result: LeadingTrailingResult;
}

export default function LeadingTrailingView({ grammar, result }: Props) {
  const stepper = useStepper(result.steps.length, result);
  const step = stepper.current >= 0 ? result.steps[stepper.current] : undefined;
  const snapshot: LeadingTrailingSnapshot = step?.snapshot ?? {
    leading: Object.fromEntries(grammar.nonTerminals.map((nt) => [nt, []])),
    trailing: Object.fromEntries(grammar.nonTerminals.map((nt) => [nt, []])),
  };
  const hl = step?.highlight;

  const cell = (kind: SetKind, nt: string) => {
    const isTarget = hl?.set === kind && hl.nonTerminal === nt;
    const isSource = hl?.set === kind && hl.fromNonTerminal === nt;
    return (
      <td className={isTarget ? 'cell-current' : isSource ? 'cell-source' : undefined}>
        {'{ '}
        {snapshot[kind][nt].map((t, i) => (
          <span key={t}>
            {i > 0 && ', '}
            <span className={isTarget && hl?.terminal === t ? 'chip-new' : undefined}>{t}</span>
          </span>
        ))}
        {' }'}
      </td>
    );
  };

  return (
    <div>
      <StepController stepper={stepper} label="Leading/Trailing steps" />
      <div className="table-scroll" tabIndex={0} aria-label="Leading and Trailing sets" data-lenis-prevent>
        <table className="sets-table">
          <thead>
            <tr>
              <th>Non-terminal</th>
              <th>Leading</th>
              <th>Trailing</th>
            </tr>
          </thead>
          <tbody>
            {grammar.nonTerminals.map((nt) => (
              <tr key={nt}>
                <th scope="row">{nt}</th>
                {cell('leading', nt)}
                {cell('trailing', nt)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {step ? (
        <StepExplanation
          title={`${step.set === 'leading' ? 'Leading' : 'Trailing'} · pass ${step.pass} · ${step.description}`}
          reason={step.reason}
          tone={step.kind === 'fixed-point' ? 'ok' : 'info'}
        />
      ) : (
        <StepExplanation kicker="Not started" title="Press Next to add terminals one at a time, or Show all for the final sets." />
      )}

      {stepper.shown > 0 && (
        <details className="step-log">
          <summary>Step log ({stepper.shown} shown)</summary>
          <ol>
            {result.steps.slice(0, stepper.shown).map((s, i) => (
              <li key={i} className={i === stepper.current ? 'current' : undefined}>
                <strong>{s.description}.</strong> {s.reason}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
