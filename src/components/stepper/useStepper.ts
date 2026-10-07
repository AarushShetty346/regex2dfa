import { useCallback, useEffect, useState } from 'react';

/**
 * State for walking through a precomputed list of algorithm steps.
 *
 * `shown` is the number of steps currently revealed (0..total):
 *   - 0      → nothing revealed yet (initial state)
 *   - total  → everything revealed ("Show All")
 * The step being highlighted is therefore `steps[shown - 1]`.
 *
 * The hook knows nothing about what a step contains, so First/Follow, LR, etc.
 * can all reuse it. Whenever `total` changes (e.g. the user edits the grammar and a
 * new step list is computed), the position resets to 0, or to `total` if
 * `startRevealed` is true.
 */
export interface Stepper {
  shown: number;
  total: number;
  /** Index of the latest revealed step, or -1 when none is revealed. */
  current: number;
  atStart: boolean;
  atEnd: boolean;
  next: () => void;
  prev: () => void;
  showAll: () => void;
  reset: () => void;
}

export function useStepper(total: number, resetKey?: unknown, startRevealed = false): Stepper {
  const [shown, setShown] = useState(startRevealed ? total : 0);

  // Reset whenever the underlying step list changes. `resetKey` lets callers force a reset
  // even when the new list happens to have the same length (e.g. a different grammar).
  useEffect(() => {
    setShown(startRevealed ? total : 0);
  }, [total, resetKey, startRevealed]);

  const next = useCallback(() => setShown((s) => Math.min(s + 1, total)), [total]);
  const prev = useCallback(() => setShown((s) => Math.max(s - 1, 0)), []);
  const showAll = useCallback(() => setShown(total), [total]);
  const reset = useCallback(() => setShown(0), []);

  const clamped = Math.min(shown, total);
  return {
    shown: clamped,
    total,
    current: clamped - 1,
    atStart: clamped === 0,
    atEnd: clamped === total,
    next,
    prev,
    showAll,
    reset,
  };
}
