import type { ReactNode } from 'react';
import { LockSimple } from '@phosphor-icons/react';

interface SectionProps {
  number: number;
  title: string;
  /** When set, the section is shown greyed out with this explanation instead of its content. */
  disabledReason?: string;
  children?: ReactNode;
}

/** Numbered panel used for the four stages of the Operator Precedence page. */
export default function Section({ number, title, disabledReason, children }: SectionProps) {
  return (
    <section className={`panel op-section${disabledReason ? ' is-disabled' : ''}`} aria-labelledby={`op-section-${number}`}>
      <h2 className="section-title" id={`op-section-${number}`}>
        <span className="section-number mono">{String(number).padStart(2, '0')}</span> {title}
      </h2>
      {disabledReason ? (
        <p className="section-blocked">
          <LockSimple size={16} aria-hidden />
          <span>{disabledReason}</span>
        </p>
      ) : (
        children
      )}
    </section>
  );
}
