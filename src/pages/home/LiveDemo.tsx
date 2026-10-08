import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { regexPipeline, simulate } from '../../algorithms/regex';
import StateDiagram from '../../graph/StateDiagram';
import type { GraphEdge, GraphNode } from '../../lib/graph/layout';
import { IconButton, cx } from '../../ui/primitives';

export const DEMO_REGEX = '(a|b)*abb';
const DEMO_INPUT = 'babb';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The real DFA (direct method) for (a|b)*abb reading a string on a loop, with play/pause. */
export default function LiveDemo() {
  const dfa = useMemo(() => regexPipeline(DEMO_REGEX).direct.dfa, []);
  const run = useMemo(() => simulate(dfa, DEMO_INPUT), [dfa]);
  const frames = run.steps.length + 2; // start, one per character, then a pause on the verdict
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
    <figure className="demo" data-demo>
      <div className="demo-head">
        <span className="demo-live" aria-hidden />
        <span className="demo-title">
          DFA <code>{DEMO_REGEX}</code>
        </span>
        <IconButton label={playing ? 'Pause the demo' : 'Play the demo'} onClick={() => setPlaying((p) => !p)} variant="secondary">
          {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
        </IconButton>
      </div>
      <div className="demo-canvas">
        <StateDiagram nodes={nodes} edges={edges} label={`DFA for ${DEMO_REGEX} reading ${DEMO_INPUT}`} />
      </div>
      <figcaption className="demo-foot">
        <span className="tape is-inline" aria-label={`Input ${DEMO_INPUT}`}>
          {[...DEMO_INPUT].map((c, i) => (
            <span
              key={i}
              className={cx('tape-cell mono', i < consumed - 1 ? 'is-read' : i === consumed - 1 ? 'is-head' : 'is-todo')}
            >
              {c}
            </span>
          ))}
        </span>
        <span className="demo-state mono">
          state <strong>{dfa.states[current].name}</strong>
        </span>
        <span className={cx('demo-verdict', finished && 'is-on')}>{finished ? 'accepted' : ''}</span>
      </figcaption>
    </figure>
  );
}
