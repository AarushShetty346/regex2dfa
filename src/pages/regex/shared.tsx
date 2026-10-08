import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

/** Fade-and-rise children in whenever `key` changes (stage switch, new regex). */
export function useReveal<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-reveal]'),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.04, clearProps: 'opacity,transform' },
      );
    }, el);
    return () => ctx.revert();
  }, [key]);
  return ref;
}

interface StageLayoutProps {
  /** The main drawing (usually a GraphFrame). */
  canvas: ReactNode;
  /** Extra panel under the main canvas (e.g. the NFA reference during subset construction). */
  below?: ReactNode;
  controller?: ReactNode;
  rail: ReactNode;
}

/**
 * Workbench layout for one stage: the canvas dominates, with the step controls docked under
 * it; the explanation rail sits to the right on wide screens and below on narrow ones.
 */
export function StageLayout({ canvas, below, controller, rail }: StageLayoutProps) {
  return (
    <div className="stage">
      <div className="stage-main">
        <section className="canvas-panel" data-reveal aria-label="Visualization">
          {canvas}
          {controller && <div className="canvas-dock">{controller}</div>}
        </section>
        {below}
      </div>
      <aside className="stage-rail" data-reveal aria-label="Explanation">
        {rail}
      </aside>
    </div>
  );
}

export function EmptyCanvas({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="canvas-empty">
      <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden className="canvas-empty-mark">
        <path d="M1 12 H10" />
        <circle cx="20" cy="12" r="9" />
        <path d="M29 12 H39" strokeDasharray="3 3" />
      </svg>
      <p className="canvas-empty-title">{title}</p>
      <p className="muted">{hint}</p>
    </div>
  );
}

interface StepCardProps {
  kicker: string;
  title: ReactNode;
  detail: ReactNode;
}

/** The narration for the step that is currently highlighted. */
export function StepCard({ kicker, title, detail }: StepCardProps) {
  return (
    <section className="step-card" aria-live="polite" aria-atomic="true">
      <p className="step-kicker">{kicker}</p>
      <h2 className="step-title">{title}</h2>
      <p className="step-detail">{detail}</p>
    </section>
  );
}

interface StepListProps {
  items: { title: ReactNode; meta?: ReactNode }[];
  shown: number;
  onSelect: (shown: number) => void;
}

/** Every step of the algorithm; revealed ones are clickable, the current one is marked. */
export function StepList({ items, shown, onSelect }: StepListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    const cur = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !cur) return;
    const top = cur.offsetTop; // .step-list is position: relative, so this is relative to the list
    if (top < list.scrollTop || top + cur.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTo({ top: top - list.clientHeight / 3, behavior: 'smooth' });
  }, [shown]);

  return (
    <ol className="step-list" ref={listRef} data-lenis-prevent aria-label="All steps">
      {items.map((it, i) => {
        const state = i < shown - 1 ? 'done' : i === shown - 1 ? 'current' : 'todo';
        return (
          <li key={i} className={`step-item ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <button type="button" onClick={() => onSelect(i + 1)}>
              <span className="step-index mono" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="sr-only">{`Step ${i + 1}${state === 'current' ? ' (current)' : state === 'done' ? ' (done)' : ''}: `}</span>
              <span className="step-item-title">{it.title}</span>
              {it.meta && <span className="step-item-meta mono">{it.meta}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function SetText({ set }: { set: number[] }) {
  return <span className="mono set-text">{`{${set.join(', ')}}`}</span>;
}

/** A state name with start/accepting markers drawn as shapes (with text for screen readers). */
export function StateName({ name, start, accepting }: { name: string; start?: boolean; accepting?: boolean }) {
  return (
    <span className="state-name">
      {start && <span className="start-mark" role="img" aria-label="start" title="start state" />}
      {name}
      {accepting && <span className="accept-mark" role="img" aria-label="accepting" title="accepting state" />}
    </span>
  );
}
