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
 *
 * Reset sits apart from the forward controls so it is not hit by accident, and every button is
 * disabled (not hidden) when it would do nothing.
 */
export default function StepController({ stepper, label, keyboard = false }: StepControllerProps) {
  const { shown, total, atStart, atEnd, next, prev, showAll, reset, goTo } = stepper;

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (t?.closest('[role="tablist"]')) return; // arrows move between tabs there
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

  const progress = total ? (shown / total) * 100 : 0;

  return (
    <div className="step-controller" role="group" aria-label={label ?? 'Step controls'}>
      <div className="step-buttons">
        <button type="button" className="icon-button" onClick={reset} disabled={atStart} aria-label="Reset" title={keyboard ? 'Reset (Home)' : 'Reset'}>
          <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
        </button>
        <span className="step-divider" aria-hidden />
        <button type="button" onClick={prev} disabled={atStart} title={keyboard ? 'Previous (←)' : undefined}>
          <CaretLeft size={15} weight="bold" aria-hidden />
          Previous
        </button>
        <button type="button" onClick={next} disabled={atEnd} className="primary" title={keyboard ? 'Next (→)' : undefined}>
          Next
          <CaretRight size={15} weight="bold" aria-hidden />
        </button>
        <button type="button" className="show-all" onClick={showAll} disabled={atEnd} aria-label="Show all" title={keyboard ? 'Show all (End)' : 'Show all'}>
          <FastForward size={16} weight="bold" aria-hidden />
          <span className="show-all-text" aria-hidden>
            Show all
          </span>
        </button>
      </div>
      <div className="step-progress">
        <input
          type="range"
          className="scrubber"
          min={0}
          max={total}
          value={shown}
          onChange={(e) => goTo(Number(e.target.value))}
          aria-label="Jump to step"
          aria-valuetext={`Step ${shown} of ${total}`}
          style={{ ['--progress' as string]: `${progress}%` }}
        />
        <span className="step-count mono" aria-hidden>
          {String(shown).padStart(String(total).length, '0')}
          <span className="muted"> / {total}</span>
        </span>
      </div>
      {keyboard && (
        <p className="step-keys" aria-hidden>
          <kbd>←</kbd>
          <kbd>→</kbd> step · <kbd>Home</kbd> <kbd>End</kbd>
        </p>
      )}
    </div>
  );
}
