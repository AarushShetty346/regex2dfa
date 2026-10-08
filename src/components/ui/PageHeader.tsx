import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: string;
  lede?: ReactNode;
  /** Right-aligned slot (status, method switcher). */
  aside?: ReactNode;
}

/** Title block shared by every page. The h1 takes focus after navigation (see App). */
export default function PageHeader({ eyebrow, title, lede, aside }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 tabIndex={-1}>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {aside && <div className="page-header-aside">{aside}</div>}
    </header>
  );
}
