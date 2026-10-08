import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

/** Fade the panels of a stage in whenever `key` changes (new stage or new expression). */
export function useStageEntrance<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-enter]'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.42, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,transform' },
      );
    }, el);
    return () => ctx.revert();
  }, [key]);
  return ref;
}

interface WorkbenchProps {
  /** The main drawing, usually a DiagramPanel. */
  canvas: ReactNode;
  /** Step controls docked under the canvas. */
  controls?: ReactNode;
  /** Extra panel under the canvas (e.g. the NFA for reference). */
  below?: ReactNode;
  /** The inspector: narration, tables, step log. */
  inspector: ReactNode;
}

/** Canvas on the left with its controls; the inspector on the right (below on narrow screens). */
export function Workbench({ canvas, controls, below, inspector }: WorkbenchProps) {
  return (
    <div className="workbench">
      <div className="workbench-main">
        <section className="canvas-card" data-enter aria-label="Visualization">
          {canvas}
          {controls}
        </section>
        {below}
      </div>
      <aside className="inspector" data-enter aria-label="Explanation">
        {inspector}
      </aside>
    </div>
  );
}

/** Placeholder for a canvas before the first step. */
export function CanvasEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="canvas-empty">
      <svg width="88" height="40" viewBox="0 0 88 40" aria-hidden className="canvas-empty-art">
        <path d="M2 20 H22" />
        <circle cx="38" cy="20" r="14" />
        <path d="M54 20 H70" strokeDasharray="4 4" />
        <circle cx="80" cy="20" r="6" strokeDasharray="3 3" />
      </svg>
      <p className="canvas-empty-title">{title}</p>
      <p className="canvas-empty-hint">{hint}</p>
    </div>
  );
}

/** Narration for the highlighted step. Announced politely when it changes. */
export function Narration({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <section className="narration" aria-live="polite" aria-atomic="true">
      <p className="narration-kicker">{kicker}</p>
      <h2 className="narration-title">{title}</h2>
      <p className="narration-body">{children}</p>
    </section>
  );
}

interface StepLogProps {
  items: { title: ReactNode; meta?: ReactNode }[];
  shown: number;
  onSelect: (shown: number) => void;
}

/** Every step of the algorithm as a timeline; any step can be jumped to. */
export function StepLog({ items, shown, onSelect }: StepLogProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    const cur = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !cur) return;
    const top = cur.offsetTop; // the list is position: relative
    if (top < list.scrollTop || top + cur.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTo({ top: top - list.clientHeight / 3, behavior: 'smooth' });
  }, [shown]);

  return (
    <div className="steplog">
      <p className="inspector-label" id="steplog-label">
        All steps <span className="subtle">· {items.length}</span>
      </p>
      <ol className="steplog-list" ref={listRef} data-lenis-prevent aria-labelledby="steplog-label">
        {items.map((it, i) => {
          const state = i < shown - 1 ? 'done' : i === shown - 1 ? 'current' : 'todo';
          return (
            <li key={i} className={`steplog-item is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <button type="button" onClick={() => onSelect(i + 1)}>
                <span className="steplog-dot" aria-hidden />
                <span className="steplog-n mono" aria-hidden>
                  {i + 1}
                </span>
                <span className="sr-only">{`Step ${i + 1}${state === 'current' ? ' (current)' : state === 'done' ? ' (done)' : ''}: `}</span>
                <span className="steplog-title">{it.title}</span>
                {it.meta && <span className="steplog-meta">{it.meta}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SetText({ set }: { set: number[] }) {
  return <span className="mono set">{`{${set.join(', ')}}`}</span>;
}

/** A state name with start and accepting markers as shapes, named for screen readers. */
export function StateName({ name, start, accepting }: { name: string; start?: boolean; accepting?: boolean }) {
  return (
    <span className="state-name">
      {start && <span className="mark-start" role="img" aria-label="start" title="start state" />}
      {name}
      {accepting && <span className="mark-accept" role="img" aria-label="accepting" title="accepting state" />}
    </span>
  );
}

/** Label/value pairs shown in the inspector. */
export function Facts({ items }: { items: { term: string; value: ReactNode; mono?: boolean }[] }) {
  return (
    <dl className="facts">
      {items.map((f) => (
        <div key={f.term} className="fact">
          <dt>{f.term}</dt>
          <dd className={f.mono ? 'mono' : undefined}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
