import type { ReactNode } from 'react';
import { Collapsible } from '@ark-ui/react/collapsible';
import { ChevronRight } from 'lucide-react';
import { cx } from '../../../ui/primitives';

interface ExplainProps {
  /** The step's description, or a prompt before the first step. */
  title: string;
  /** The step's reason. */
  reason?: string;
  tone?: 'info' | 'error' | 'ok';
  /** Small label above the title; defaults to one derived from the tone. */
  kicker?: string;
  children?: ReactNode;
}

const KICKER = { info: 'Current step', error: 'Conflict', ok: 'Done' } as const;

/** What the current step did and why. */
export function Explain({ title, reason, tone = 'info', kicker, children }: ExplainProps) {
  return (
    <div className={cx('explain', `is-${tone}`)} aria-live="polite">
      <p className="explain-kicker">{kicker ?? KICKER[tone]}</p>
      <div className="explain-title">{title}</div>
      {reason && <div className="explain-reason">{reason}</div>}
      {children}
    </div>
  );
}

/** A disclosure built on Ark UI's Collapsible. */
export function Disclosure({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Collapsible.Root className={cx('disclosure', className)}>
      <Collapsible.Trigger className="disclosure-trigger">
        <ChevronRight size={16} aria-hidden className="disclosure-chevron" />
        {summary}
      </Collapsible.Trigger>
      <Collapsible.Content className="disclosure-content">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
