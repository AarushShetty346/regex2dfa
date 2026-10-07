import type { ReactNode } from 'react';

interface SectionProps {
  number: number;
  title: string;
  /** When set, the section is shown greyed out with this explanation instead of its content. */
  disabledReason?: string;
  children?: ReactNode;
}

/** Numbered card used for the four stages of the Operator Precedence page. */
export default function Section({ number, title, disabledReason, children }: SectionProps) {
  return (
    <section className={`card op-section${disabledReason ? ' is-disabled' : ''}`}>
      <h2>
        <span className="section-number">{number}</span> {title}
      </h2>
      {disabledReason ? <p className="muted">{disabledReason}</p> : children}
    </section>
  );
}
