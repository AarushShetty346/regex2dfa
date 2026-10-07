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
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'transform' },
      );
    }, el);
    return () => ctx.revert();
  }, [key]);
  return ref;
}

interface StageLayoutProps {
  canvas: ReactNode;
  /** Extra panel under the main canvas (e.g. the NFA reference during subset construction). */
  below?: ReactNode;
  controller?: ReactNode;
  rail: ReactNode;
}

export function StageLayout({ canvas, below, controller, rail }: StageLayoutProps) {
  return (
    <div className="stage">
      <div className="stage-main">
        <div className="canvas" data-reveal>
          {canvas}
        </div>
        {controller && <div data-reveal>{controller}</div>}
        {below}
      </div>
      <aside className="stage-rail" data-reveal>
        {rail}
      </aside>
    </div>
  );
}

export function EmptyCanvas({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="canvas-empty">
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
    <section className="step-card" aria-live="polite">
      <p className="step-kicker">{kicker}</p>
      <h3 className="step-title">{title}</h3>
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
    <ol className="step-list" ref={listRef} data-lenis-prevent>
      {items.map((it, i) => {
        const state = i < shown - 1 ? 'done' : i === shown - 1 ? 'current' : 'todo';
        return (
          <li key={i} className={`step-item ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <button type="button" onClick={() => onSelect(i + 1)}>
              <span className="step-index mono">{String(i + 1).padStart(2, '0')}</span>
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
