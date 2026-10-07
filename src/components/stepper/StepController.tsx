import type { Stepper } from './useStepper';

interface StepControllerProps {
  stepper: Stepper;
  /** Optional label, e.g. "Leading/Trailing". */
  label?: string;
}

/**
 * Next / Previous / Show All / Reset buttons for any step list.
 * Pair it with `useStepper`; the parent renders the steps up to `stepper.shown`.
 */
export default function StepController({ stepper, label }: StepControllerProps) {
  const { shown, total, atStart, atEnd, next, prev, showAll, reset } = stepper;
  return (
    <div className="step-controller" role="group" aria-label={label ?? 'Step controls'}>
      <button type="button" onClick={prev} disabled={atStart}>
        ◀ Previous
      </button>
      <button type="button" onClick={next} disabled={atEnd} className="primary">
        Next ▶
      </button>
      <button type="button" onClick={showAll} disabled={atEnd}>
        Show All
      </button>
      <button type="button" onClick={reset} disabled={atStart}>
        Reset
      </button>
      <span className="step-count">
        Step {shown} / {total}
      </span>
    </div>
  );
}
