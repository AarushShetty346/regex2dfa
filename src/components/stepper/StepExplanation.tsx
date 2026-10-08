import type { ReactNode } from 'react';

interface StepExplanationProps {
  /** The step's `description`, or a prompt when no step is shown yet. */
  title: string;
  /** The step's `reason`. */
  reason?: string;
  tone?: 'info' | 'error' | 'ok';
  /** Small label above the title; defaults to one derived from `tone`. */
  kicker?: string;
  children?: ReactNode;
}

const KICKER = { info: 'Current step', error: 'Conflict', ok: 'Done' } as const;

/** "What happened and why" panel shown under a step controller. Reusable by any algorithm. */
export default function StepExplanation({ title, reason, tone = 'info', kicker, children }: StepExplanationProps) {
  return (
    <div className={`step-explanation tone-${tone}`} aria-live="polite">
      <p className="step-explanation-kicker">{kicker ?? KICKER[tone]}</p>
      <div className="step-explanation-title">{title}</div>
      {reason && <div className="step-explanation-reason">{reason}</div>}
      {children}
    </div>
  );
}
