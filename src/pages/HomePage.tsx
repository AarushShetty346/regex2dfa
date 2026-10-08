import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, Pause, Play } from '@phosphor-icons/react';
import { regexPipeline, simulate } from '../algorithms/regex';
import AutomatonGraph from '../components/graph/AutomatonGraph';
import type { GraphEdge, GraphNode } from '../components/graph/layout';
import StatusBadge from '../components/ui/StatusBadge';
import { TOPICS, topicHref } from '../app/routes';
import { EXAMPLES, STAGES, type Stage } from './regex/examples';

const DEMO_REGEX = '(a|b)*abb';
const DEMO_INPUT = 'babb';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The hero's live preview: the real minimal DFA for (a|b)*abb reading a string, on a loop. */
function DemoAutomaton() {
  const dfa = useMemo(() => regexPipeline(DEMO_REGEX).minimize.dfa, []);
  const run = useMemo(() => simulate(dfa, DEMO_INPUT), [dfa]);
  const frames = run.steps.length + 2; // start, each char, a pause on the verdict
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [frame, setFrame] = useState(() => (reducedMotion() ? frames - 1 : 0));

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames), 1100);
    return () => window.clearInterval(id);
  }, [frames, playing]);

  const consumed = Math.min(frame, run.steps.length);
  const last = consumed > 0 ? run.steps[consumed - 1] : null;
  const current = last?.to ?? dfa.start;
  const finished = frame >= run.steps.length;

  const nodes: GraphNode[] = dfa.states.map((s) => ({
    id: `d${s.id}`,
    label: s.name,
    start: s.id === dfa.start,
    accepting: s.accepting,
    tone: s.id === current ? (finished ? 'ok' : 'focus') : 'idle',
  }));
  const edges: GraphEdge[] = dfa.transitions.map((t) => ({
    from: `d${t.from}`,
    to: `d${t.to}`,
    label: t.symbol,
    tone: last && t.from === last.from && t.to === last.to && t.symbol === last.symbol ? 'new' : 'idle',
  }));

  return (
    <figure className="hero-demo" data-demo>
      <div className="demo-head">
        <span className="demo-title">
          <span className="live-dot" aria-hidden />
          Minimal DFA for <span className="mono">{DEMO_REGEX}</span>
        </span>
        <button
          type="button"
          className="tool"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause the demo' : 'Play the demo'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={14} weight="fill" aria-hidden /> : <Play size={14} weight="fill" aria-hidden />}
        </button>
      </div>
      <div className="demo-canvas">
        <AutomatonGraph nodes={nodes} edges={edges} label={`Minimal DFA for ${DEMO_REGEX} reading ${DEMO_INPUT}`} />
      </div>
      <figcaption className="demo-foot">
        <span className="demo-label">Input</span>
        <span className="tape tape-inline" aria-label={`Input ${DEMO_INPUT}`}>
          {[...DEMO_INPUT].map((c, i) => (
            <span key={i} className={`tape-cell mono ${i < consumed - 1 ? 'read' : i === consumed - 1 ? 'current' : 'todo'}`}>
              {c}
            </span>
          ))}
        </span>
        <span className="demo-state mono">
          state <strong>{dfa.states[current].name}</strong>
        </span>
        <span className={`demo-verdict ${finished ? 'show' : ''}`}>{finished ? 'accepted' : ''}</span>
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  const ref = useRef<HTMLDivElement>(null);
  const demo = useMemo(() => regexPipeline(DEMO_REGEX), []);
  const counts: Record<Stage, string> = {
    tree: `${demo.postfix.split(' ').length} nodes`,
    nfa: `${demo.thompson.nfa.states.length} states`,
    dfa: `${demo.subset.dfa.states.length} states`,
    min: `${demo.minimize.dfa.states.length} states`,
    test: 'accept / reject',
  };
  const modules = TOPICS.filter((t) => t.id !== 'home');

  useLayoutEffect(() => {
    if (!ref.current || reducedMotion()) return;
    const ctx = gsap.context(() => {
      // fromTo with explicit end values and clearProps, so StrictMode's second run (or a CSS
      // transition on the same element) can never strand an element mid-animation.
      const done = { opacity: 1, y: 0, clearProps: 'opacity,transform' };
      gsap.fromTo('[data-hero]', { opacity: 0, y: 10 }, { ...done, duration: 0.45, ease: 'power2.out', stagger: 0.05 });
      gsap.fromTo('.hero-demo', { opacity: 0 }, { ...done, duration: 0.5, ease: 'power2.out', delay: 0.1 });
      gsap.fromTo('[data-rise]', { opacity: 0, y: 8 }, { ...done, duration: 0.4, ease: 'power2.out', stagger: 0.04, delay: 0.2 });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div className="home" ref={ref}>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow" data-hero>
            Interactive compiler-design lab
          </p>
          <h1 data-hero tabIndex={-1}>
            Compiler algorithms, traced one step at a time.
          </h1>
          <p className="lede" data-hero>
            Type a regular expression or a grammar and follow every state, set and table the textbook algorithm builds. Everything
            runs in your browser.
          </p>
          <div className="hero-actions" data-hero>
            <a className="button primary large" href={topicHref('regex-dfa')}>
              Open Regex to DFA
              <ArrowRight size={16} weight="bold" aria-hidden />
            </a>
            <a className="button large" href={topicHref('bottom-up')}>
              Bottom-up parsing
            </a>
          </div>
        </div>
        <DemoAutomaton />
      </section>

      <section className="home-section" aria-labelledby="pipeline-title">
        <header className="section-head" data-rise>
          <h2 id="pipeline-title">The Regex to DFA pipeline</h2>
          <p className="muted">
            Five stages, each a tab in the workspace. Counts are for <span className="mono">{DEMO_REGEX}</span>.
          </p>
        </header>
        <ol className="pipeline-diagram">
          {STAGES.map((s, i) => (
            <li key={s.id} data-rise>
              <a href={topicHref('regex-dfa', { re: DEMO_REGEX, stage: s.id })} className="pipeline-node">
                <span className="pipeline-index mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="pipeline-name">{s.label}</span>
                <span className="pipeline-does">{s.does}</span>
                <span className="pipeline-count mono">{counts[s.id]}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section" aria-labelledby="modules-title">
        <header className="section-head" data-rise>
          <h2 id="modules-title">Modules</h2>
          <p className="muted">What you can use today, and what is planned.</p>
        </header>
        <ul className="module-list">
          {modules.map((t, i) => {
            const available = t.status === 'available';
            const body = (
              <>
                <span className="module-index mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="module-main">
                  <span className="module-name">{t.label}</span>
                  <span className="module-summary">{t.summary}</span>
                  <span className="module-tags">
                    {t.covers.map((c) => (
                      <span key={c} className="tag">
                        {c}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="module-side">
                  <StatusBadge status={t.status} />
                  {'pending' in t && <span className="module-pending">{t.pending}</span>}
                  {available && (
                    <span className="module-open">
                      Open <ArrowRight size={14} weight="bold" aria-hidden />
                    </span>
                  )}
                </span>
              </>
            );
            return (
              <li key={t.id} data-rise>
                {available ? (
                  <a className="module-row" href={topicHref(t.id)}>
                    {body}
                  </a>
                ) : (
                  <div className="module-row is-planned">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="examples-title">
        <header className="section-head" data-rise>
          <h2 id="examples-title">Start from an example</h2>
          <p className="muted">Opens the workspace with the expression filled in.</p>
        </header>
        <ul className="example-links" data-rise>
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <a className="chip mono" href={topicHref('regex-dfa', { re: ex, stage: 'nfa' })}>
                {ex}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
