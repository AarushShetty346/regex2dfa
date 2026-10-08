import { useId, useMemo, useState } from 'react';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { simulate, type DFA } from '../../algorithms/regex';
import GraphFrame, { LegendItem } from '../../components/graph/GraphFrame';
import type { GraphEdge, GraphNode, NodeTone } from '../../components/graph/layout';
import StepController from '../../components/stepper/StepController';
import { useStepper } from '../../components/stepper/useStepper';
import { StageLayout, StepCard } from './shared';

/** Breadth-first search for the shortest accepted string, used as a starting example. */
export function shortestAccepted(dfa: DFA): string | null {
  const seen = new Map<number, string>([[dfa.start, '']]);
  const queue = [dfa.start];
  while (queue.length) {
    const s = queue.shift()!;
    if (dfa.states[s].accepting) return seen.get(s)!;
    for (const t of dfa.transitions.filter((x) => x.from === s).sort((a, b) => a.symbol.localeCompare(b.symbol))) {
      if (!seen.has(t.to)) {
        seen.set(t.to, seen.get(s)! + t.symbol);
        queue.push(t.to);
      }
    }
  }
  return null;
}

export default function SimulateStage({ dfa }: { dfa: DFA }) {
  const inputId = useId();
  const [input, setInput] = useState(() => shortestAccepted(dfa) ?? '');
  const run = useMemo(() => simulate(dfa, input), [dfa, input]);
  const stepper = useStepper(run.steps.length, run);
  const done = stepper.atEnd;
  const last = stepper.current >= 0 ? run.steps[stepper.current] : null;
  const stuck = last !== null && last.to === null;
  const current = last ? (last.to ?? last.from) : dfa.start;

  const graph = useMemo(() => {
    const finalTone: NodeTone = run.accepted ? 'ok' : 'error';
    const nodes: GraphNode[] = dfa.states.map((s) => ({
      id: `d${s.id}`,
      label: s.name,
      start: s.id === dfa.start,
      accepting: s.accepting,
      tone: s.id === current ? (done || stuck ? finalTone : 'focus') : 'idle',
    }));
    const edges: GraphEdge[] = dfa.transitions.map((t) => ({
      from: `d${t.from}`,
      to: `d${t.to}`,
      label: t.symbol,
      tone: last && last.to !== null && t.from === last.from && t.to === last.to && t.symbol === last.symbol ? 'new' : 'idle',
    }));
    return { nodes, edges };
  }, [dfa, current, last, done, stuck, run.accepted]);

  const chars = [...input];
  const name = (id: number) => dfa.states[id].name;
  const examples = useMemo(() => {
    const s = shortestAccepted(dfa);
    const out = new Set<string>();
    if (s !== null) out.add(s === '' ? '' : s);
    const a = dfa.alphabet;
    if (a.length) {
      out.add(a.join('').repeat(2));
      out.add(a[0].repeat(3));
      if (s) out.add(a[a.length - 1] + s);
    }
    return [...out].slice(0, 4);
  }, [dfa]);

  let card: { kicker: string; title: string; detail: string };
  if (!last) {
    card = {
      kicker: 'Ready',
      title: `Start in ${name(dfa.start)}`,
      detail: input.length
        ? `Press Next to read "${chars[0]}".`
        : `The empty string is ${dfa.states[dfa.start].accepting ? 'accepted' : 'rejected'}: the start state is ${dfa.states[dfa.start].accepting ? '' : 'not '}accepting.`,
    };
  } else if (last.to === null) {
    card = {
      kicker: `Character ${last.index + 1}`,
      title: `${name(last.from)} has no edge on "${last.symbol}"`,
      detail: dfa.alphabet.includes(last.symbol)
        ? 'The DFA falls into the dead state, so the string is rejected no matter what follows.'
        : `"${last.symbol}" is not in the alphabet {${dfa.alphabet.join(', ')}}, so the string is rejected.`,
    };
  } else {
    card = {
      kicker: `Character ${last.index + 1} of ${chars.length}`,
      title: `${name(last.from)} on ${last.symbol} goes to ${name(last.to)}`,
      detail: done
        ? `Input finished in ${name(last.to)}, which is ${dfa.states[last.to].accepting ? 'accepting' : 'not accepting'}.`
        : `Next character: "${chars[last.index + 1]}".`,
    };
  }

  return (
    <StageLayout
      canvas={
        <GraphFrame
          nodes={graph.nodes}
          edges={graph.edges}
          label="Minimal DFA running on the test string"
          caption={
            <>
              Minimal DFA <span className="muted">· current state {name(current)}</span>
            </>
          }
          legend={
            <>
              <LegendItem kind="focus">current state</LegendItem>
              <LegendItem kind="new">edge just taken</LegendItem>
              <LegendItem kind="accept">accepting</LegendItem>
            </>
          }
        />
      }
      controller={<StepController stepper={stepper} label="Simulation steps" keyboard />}
      rail={
        <>
          <section className="tester" aria-label="String tester">
            <div className="field">
              <label htmlFor={inputId} className="field-label">
                Test string
              </label>
              <input
                id={inputId}
                className="mono text-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="empty string"
              />
              <div className="chips" role="group" aria-label="Example strings">
                {examples.map((ex) => (
                  <button type="button" key={ex} className="chip mono" onClick={() => setInput(ex)}>
                    {ex === '' ? 'ε' : ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="tape-block">
              <span className="field-label" aria-hidden>
                Input tape
              </span>
              <div className="tape" role="group" aria-label="Input tape">
                {chars.length === 0 && <span className="tape-cell tape-empty mono">ε</span>}
                {chars.map((c, i) => {
                  const state = !last ? 'todo' : i < last.index ? 'read' : i === last.index ? (last.to === null ? 'fail' : 'current') : 'todo';
                  return (
                    <span key={i} className={`tape-cell mono ${state}`}>
                      {c === ' ' ? '␣' : c}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          <StepCard kicker={card.kicker} title={card.title} detail={card.detail} />

          {(done || stuck) && (
            <p className={`verdict ${run.accepted ? 'ok' : 'error'}`} role="status">
              {run.accepted ? <CheckCircle size={20} weight="fill" aria-hidden /> : <XCircle size={20} weight="fill" aria-hidden />}
              {run.accepted ? 'Accepted' : 'Rejected'}
            </p>
          )}
        </>
      }
    />
  );
}
