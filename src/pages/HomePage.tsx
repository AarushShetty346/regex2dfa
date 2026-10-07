import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight } from '@phosphor-icons/react';
import { regexPipeline, simulate } from '../algorithms/regex';
import AutomatonGraph from '../components/graph/AutomatonGraph';
import type { GraphEdge, GraphNode } from '../components/graph/layout';

const DEMO_REGEX = '(a|b)*abb';
const DEMO_INPUT = 'babb';

/** The hero's live preview: the real minimal DFA for (a|b)*abb reading a string, on a loop. */
function DemoAutomaton() {
  const dfa = useMemo(() => regexPipeline(DEMO_REGEX).minimize.dfa, []);
  const run = useMemo(() => simulate(dfa, DEMO_INPUT), [dfa]);
  const frames = run.steps.length + 2; // start, each char, a pause on the verdict
  const [frame, setFrame] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? frames - 1 : 0,
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames), 1100);
    return () => window.clearInterval(id);
  }, [frames]);

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
    <figure className="hero-demo">
      <div className="canvas">
        <AutomatonGraph nodes={nodes} edges={edges} label={`Minimal DFA for ${DEMO_REGEX} reading ${DEMO_INPUT}`} />
      </div>
      <figcaption>
        <span className="mono">{DEMO_REGEX}</span>
        <span className="tape tape-inline" aria-label="Input">
          {[...DEMO_INPUT].map((c, i) => (
            <span key={i} className={`tape-cell mono ${i < consumed - 1 ? 'read' : i === consumed - 1 ? 'current' : 'todo'}`}>
              {c}
            </span>
          ))}
        </span>
        <span className={`demo-verdict ${finished ? 'show' : ''}`}>accepted</span>
      </figcaption>
    </figure>
  );
}

const TOPICS = [
  {
    href: '#/regex-dfa',
    title: 'Regex to DFA',
    body: 'Syntax tree, Thompson NFA, subset construction, minimization, and a string tester.',
    ready: true,
  },
  {
    href: '#/bottom-up',
    title: 'Bottom-up parsing',
    body: 'Operator precedence parsing, with LR parsing to follow.',
    ready: true,
  },
  {
    href: '#/first-follow',
    title: 'First & Follow',
    body: 'Set computation for context-free grammars.',
    ready: false,
  },
  {
    href: '#/top-down',
    title: 'Top-down parsing',
    body: 'LL(1) tables and predictive parsing.',
    ready: false,
  },
];

export default function HomePage() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-hero]', { opacity: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.08 });
      gsap.from('.hero-demo', { opacity: 0, scale: 0.97, duration: 1, ease: 'power3.out', delay: 0.2 });
      gsap.from('.topic', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', stagger: 0.07, delay: 0.35 });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div className="home" ref={ref}>
      <section className="hero">
        <div className="hero-copy">
          <h1 data-hero>
            Compiler algorithms,
            <br />
            one step at a time.
          </h1>
          <p className="lede" data-hero>
            Type a regex or a grammar and follow every state, set and table the textbook algorithm builds.
          </p>
          <div className="hero-actions" data-hero>
            <a className="button hero-cta" href="#/regex-dfa">
              Open Regex to DFA
              <ArrowRight size={16} weight="bold" />
            </a>
            <a className="button hero-cta" href="#/bottom-up">
              Open Bottom-up parsing
              <ArrowRight size={16} weight="bold" />
            </a>
          </div>
        </div>
        <DemoAutomaton />
      </section>

      <section className="topics" aria-label="Topics">
        {TOPICS.map((t, i) => (
          <a key={t.href} href={t.href} className={`topic topic-${i}${t.ready ? '' : ' topic-soon'}`}>
            <h2>{t.title}</h2>
            <p>{t.body}</p>
            <span className="topic-foot">
              {t.ready ? (
                <>
                  Open <ArrowRight size={14} weight="bold" />
                </>
              ) : (
                'Coming soon'
              )}
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}
