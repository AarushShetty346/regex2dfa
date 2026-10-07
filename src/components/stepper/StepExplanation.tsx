import type { ReactNode } from 'react';

interface StepExplanationProps {
  /** The step's `description`, or a prompt when no step is shown yet. */
  title: string;
  /** The step's `reason`. */
  reason?: string;
  tone?: 'info' | 'error' | 'ok';
  children?: ReactNode;
}

/** "What happened and why" panel shown under a step controller. Reusable by any algorithm. */
export default function StepExplanation({ title, reason, tone = 'info', children }: StepExplanationProps) {
  return (
    <div className={`step-explanation tone-${tone}`} aria-live="polite">
      <div className="step-explanation-title">{title}</div>
      {reason && <div className="step-explanation-reason">{reason}</div>}
      {children}
    </div>
  );
}
