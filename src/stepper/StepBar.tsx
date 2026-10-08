import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsRight, RotateCcw } from 'lucide-react';
import type { Stepper } from '../lib/stepper/useStepper';
import { Button, IconButton, Kbd, cx } from '../ui/primitives';

interface StepBarProps {
  stepper: Stepper;
  /** Name of the control group, e.g. "Thompson construction steps". */
  label?: string;
  /** Bind ← → Home End to this bar while focus is not in a text field or a tab list. */
  keyboard?: boolean;
  /** Docked under a diagram (flush) or standing alone in a section. */
  docked?: boolean;
}

/**
 * Transport controls for a precomputed list of algorithm steps: reset, previous, next,
 * show all, and a scrubber. Buttons that would do nothing are disabled rather than hidden,
 * and Reset sits apart from Next so it is not hit by accident.
 */
export default function StepBar({ stepper, label, keyboard = false, docked = false }: StepBarProps) {
  const { shown, total, atStart, atEnd, next, prev, showAll, reset, goTo } = stepper;

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (t?.closest('[role="tablist"], [role="radiogroup"], [role="menu"]')) return; // arrows belong to those widgets
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

  const pct = total ? (shown / total) * 100 : 0;
  const pad = String(total).length;

  return (
    <div className={cx('stepbar', docked && 'is-docked')} role="group" aria-label={label ?? 'Step controls'}>
      <div className="stepbar-buttons">
        <IconButton label="Reset" hint={keyboard ? 'Reset (Home)' : 'Reset'} onClick={reset} disabled={atStart} variant="secondary">
          <RotateCcw size={16} aria-hidden />
        </IconButton>
        <span className="stepbar-gap" aria-hidden />
        <Button onClick={prev} disabled={atStart} title={keyboard ? 'Previous (←)' : undefined}>
          <ChevronLeft size={16} aria-hidden />
          Previous
        </Button>
        <Button variant="primary" onClick={next} disabled={atEnd} title={keyboard ? 'Next (→)' : undefined}>
          Next
          <ChevronRight size={16} aria-hidden />
        </Button>
        <Button variant="ghost" onClick={showAll} disabled={atEnd} aria-label="Show all" title={keyboard ? 'Show all (End)' : undefined}>
          <ChevronsRight size={16} aria-hidden />
          <span className="stepbar-all" aria-hidden>
            Show all
          </span>
        </Button>
      </div>
      <div className="stepbar-track">
        <input
          type="range"
          className="scrubber"
          min={0}
          max={total}
          value={shown}
          onChange={(e) => goTo(Number(e.target.value))}
          aria-label="Jump to step"
          aria-valuetext={`Step ${shown} of ${total}`}
          style={{ ['--fill' as string]: `${pct}%` }}
        />
        <span className="stepbar-count mono" aria-hidden>
          <strong>{String(shown).padStart(pad, '0')}</strong>
          <span className="subtle">/{total}</span>
        </span>
      </div>
      {keyboard && (
        <p className="stepbar-keys" aria-hidden>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd> step <Kbd>Home</Kbd>
          <Kbd>End</Kbd> jump
        </p>
      )}
    </div>
  );
}
