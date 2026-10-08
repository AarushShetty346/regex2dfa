import { useMemo } from 'react';
import { EPSILON, type NFA, type SubsetResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import type { GraphEdge, GraphNode } from '../../../lib/graph/layout';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { CanvasEmpty, Narration, SetText, StateName, StepLog, Workbench } from '../workbench';

export default function SubsetStage({ result, nfa }: { result: SubsetResult; nfa: NFA }) {
  const { steps } = result;
  const stepper = useStepper(steps.length, result);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;

  const dfaGraph = useMemo(() => {
    if (!step) return null;
    const { dfa } = step;
    const focus = step.kind === 'start' ? step.created : step.from;
    const target = step.kind === 'move' ? step.target : null;
    const isNew = step.kind === 'start' || (step.kind === 'move' && step.outcome === 'new');
    const nodes: GraphNode[] = dfa.states.map((s) => ({
      id: `d${s.id}`,
      label: s.name,
      start: s.id === dfa.start,
      accepting: s.accepting,
      tone: s.id === target && isNew ? 'new' : s.id === focus || s.id === target ? 'focus' : 'idle',
    }));
    const edges: GraphEdge[] = dfa.transitions.map((t) => ({
      from: `d${t.from}`,
      to: `d${t.to}`,
      label: t.symbol,
      tone: step.kind === 'move' && t.from === step.from && t.symbol === step.symbol ? 'new' : 'idle',
    }));
    return { nodes, edges };
  }, [step]);

  const nfaGraph = useMemo(() => {
    const closure = new Set(step?.closure ?? []);
    const moved = new Set(step?.kind === 'move' ? step.move : []);
    const source = new Set(step?.kind === 'move' ? step.dfa.states[step.from].nfaStates : []);
    const nodes: GraphNode[] = nfa.states.map((s) => ({
      id: `q${s}`,
      label: String(s),
      start: s === nfa.start,
      accepting: s === nfa.accept,
      tone: moved.has(s) ? 'new' : closure.has(s) ? 'set' : step ? 'muted' : 'idle',
    }));
    const edges: GraphEdge[] = nfa.transitions.map((t) => {
      const symbolEdge = step?.kind === 'move' && t.symbol === step.symbol && source.has(t.from);
      const closureEdge = t.symbol === EPSILON && closure.has(t.from) && closure.has(t.to);
      return {
        from: `q${t.from}`,
        to: `q${t.to}`,
        label: t.symbol,
        tone: symbolEdge ? 'new' : closureEdge ? 'focus' : step ? 'muted' : 'idle',
      };
    });
    return { nodes, edges };
  }, [nfa, step]);

  const visibleStates = step ? step.dfa.states : [];
  const cell = (from: number, a: string) => {
    if (!step) return null;
    const t = step.dfa.transitions.find((x) => x.from === from && x.symbol === a);
    return t ? step.dfa.states[t.to].name : '';
  };

  return (
    <Workbench
      canvas={
        dfaGraph ? (
          <DiagramPanel
            nodes={dfaGraph.nodes}
            edges={dfaGraph.edges}
            label={`DFA after step ${stepper.shown}`}
            title="DFA under construction"
            meta={`${dfaGraph.nodes.length} states so far`}
            legend={
              <>
                <Key kind="new">new state or edge</Key>
                <Key kind="focus">state being expanded</Key>
                <Key kind="accept">contains the NFA accept state</Key>
              </>
            }
          />
        ) : (
          <CanvasEmpty title="No DFA states yet" hint="Press Next to take the ε-closure of the NFA start state. That set is the first DFA state." />
        )
      }
      controls={<StepBar stepper={stepper} label="Subset construction steps" keyboard docked />}
      below={
        <section className="canvas-card is-secondary" data-enter aria-labelledby="nfa-ref-title">
          <DiagramPanel
            compact
            nodes={nfaGraph.nodes}
            edges={nfaGraph.edges}
            label="Thompson NFA with the current sets highlighted"
            maxScale={1.1}
            title={<span id="nfa-ref-title">Thompson NFA, for reference</span>}
            meta={
              step?.kind === 'move' ? (
                <>
                  edges on <span className="mono">{step.symbol}</span> out of {step.dfa.states[step.from].name}, then their ε-closure
                </>
              ) : step ? (
                'the ε-closure of the start state'
              ) : (
                'highlights follow each step'
              )
            }
            legend={
              <>
                <Key kind="new">reached on the symbol</Key>
                <Key kind="set">in the ε-closure</Key>
                <Key kind="eps">ε-edge</Key>
              </>
            }
          />
        </section>
      }
      inspector={
        <>
          {step ? (
            <Narration kicker={step.kind === 'start' ? 'Initial state' : 'Transition'} title={step.title}>
              {step.detail}
            </Narration>
          ) : (
            <Narration kicker="Subset construction" title="Each DFA state is a set of NFA states">
              Start from the ε-closure of the NFA's start. For every DFA state and every symbol, follow the symbol's edges, then close over
              ε. New sets become new DFA states.
            </Narration>
          )}
          <div className="table-scroll" data-lenis-prevent tabIndex={0} aria-label="Dtran transition table">
            <table className="table table-compact">
              <caption>Dtran</caption>
              <thead>
                <tr>
                  <th scope="col">State</th>
                  <th scope="col">NFA states</th>
                  {nfa.alphabet.map((a) => (
                    <th scope="col" key={a} className="mono">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleStates.length === 0 && (
                  <tr>
                    <td colSpan={2 + nfa.alphabet.length} className="table-empty">
                      Rows appear as states are discovered.
                    </td>
                  </tr>
                )}
                {visibleStates.map((s) => (
                  <tr key={s.id} className={step?.kind === 'move' && step.from === s.id ? 'is-active' : undefined}>
                    <th scope="row" className="mono">
                      <StateName name={s.name} start={s.id === step?.dfa.start} accepting={s.accepting} />
                    </th>
                    <td>
                      <SetText set={s.nfaStates} />
                    </td>
                    {nfa.alphabet.map((a) => (
                      <td key={a} className={`mono${step?.kind === 'move' && step.from === s.id && step.symbol === a ? ' is-hit' : ''}`}>
                        {cell(s.id, a) || <span className="subtle">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <StepLog items={steps.map((s) => ({ title: s.title }))} shown={stepper.shown} onSelect={stepper.goTo} />
        </>
      }
    />
  );
}
