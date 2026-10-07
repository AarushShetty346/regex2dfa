import { useEffect } from 'react';
import { ArrowCounterClockwise, CaretLeft, CaretRight, FastForward } from '@phosphor-icons/react';
import type { Stepper } from './useStepper';

interface StepControllerProps {
  stepper: Stepper;
  /** Optional label, e.g. "Leading/Trailing". */
  label?: string;
  /** Bind ← / → (and Home / End) to this controller while focus is not in a text field. */
  keyboard?: boolean;
}

/**
 * Next / Previous / Show All / Reset buttons plus a scrubber for any step list.
 * Pair it with `useStepper`; the parent renders the steps up to `stepper.shown`.
 */
export default function StepController({ stepper, label, keyboard = false }: StepControllerProps) {
  const { shown, total, atStart, atEnd, next, prev, showAll, reset, goTo } = stepper;

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'End') showAll();
      else if (e.key === 'Home') reset();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, next, prev, showAll, reset]);

  return (
    <div className="step-controller" role="group" aria-label={label ?? 'Step controls'}>
      <div className="step-buttons">
        <button type="button" className="icon-button" onClick={reset} disabled={atStart} aria-label="Reset" title="Reset (Home)">
          <ArrowCounterClockwise size={16} weight="bold" />
        </button>
        <button type="button" onClick={prev} disabled={atStart} title="Previous (←)">
          <CaretLeft size={16} weight="bold" />
          Previous
        </button>
        <button type="button" onClick={next} disabled={atEnd} className="primary" title="Next (→)">
          Next
          <CaretRight size={16} weight="bold" />
        </button>
        <button type="button" className="icon-button" onClick={showAll} disabled={atEnd} aria-label="Show all" title="Show all (End)">
          <FastForward size={16} weight="bold" />
        </button>
      </div>
      <input
        type="range"
        className="scrubber"
        min={0}
        max={total}
        value={shown}
        onChange={(e) => goTo(Number(e.target.value))}
        aria-label="Jump to step"
        style={{ ['--progress' as string]: total ? `${(shown / total) * 100}%` : '0%' }}
      />
      <span className="step-count mono">
        {shown}
        <span className="muted"> / {total}</span>
      </span>
    </div>
  );
}
