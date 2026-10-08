import { useMemo } from 'react';
import { EPSILON, type NFA, type SubsetResult } from '../../algorithms/regex';
import GraphFrame, { LegendItem } from '../../components/graph/GraphFrame';
import type { GraphEdge, GraphNode } from '../../components/graph/layout';
import StepController from '../../components/stepper/StepController';
import { useStepper } from '../../components/stepper/useStepper';
import { EmptyCanvas, SetText, StageLayout, StateName, StepCard, StepList } from './shared';

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
    <StageLayout
      canvas={
        dfaGraph ? (
          <GraphFrame
            nodes={dfaGraph.nodes}
            edges={dfaGraph.edges}
            label={`DFA after step ${stepper.shown}`}
            caption={
              <>
                DFA under construction <span className="muted">· {dfaGraph.nodes.length} states so far</span>
              </>
            }
            legend={
              <>
                <LegendItem kind="new">new state or edge</LegendItem>
                <LegendItem kind="focus">state being expanded</LegendItem>
                <LegendItem kind="accept">contains the NFA accept state</LegendItem>
              </>
            }
          />
        ) : (
          <EmptyCanvas
            title="No DFA states yet"
            hint="Press Next to take the ε-closure of the NFA start state. That set is the first DFA state."
          />
        )
      }
      controller={<StepController stepper={stepper} label="Subset construction steps" keyboard />}
      below={
        <section className="panel nfa-reference" data-reveal aria-labelledby="nfa-ref-title">
          <header className="panel-header">
            <h2 id="nfa-ref-title" className="panel-subtitle">Thompson NFA, for reference</h2>
            <p className="muted">
              {step?.kind === 'move' ? (
                <>
                  Edges on <span className="mono">{step.symbol}</span> out of {step.dfa.states[step.from].name}, then
                  their ε-closure
                </>
              ) : step ? (
                'The ε-closure of the start state'
              ) : (
                'Highlights follow each step'
              )}
            </p>
          </header>
          <GraphFrame
            compact
            nodes={nfaGraph.nodes}
            edges={nfaGraph.edges}
            label="Thompson NFA with the current sets highlighted"
            maxScale={1.1}
            legend={
              <>
                <LegendItem kind="new">reached on the symbol</LegendItem>
                <LegendItem kind="set">in the ε-closure</LegendItem>
                <LegendItem kind="eps">ε-edge</LegendItem>
              </>
            }
          />
        </section>
      }
      rail={
        <>
          {step ? (
            <StepCard kicker={step.kind === 'start' ? 'Initial state' : 'Transition'} title={step.title} detail={step.detail} />
          ) : (
            <StepCard
              kicker="Subset construction"
              title="Each DFA state is a set of NFA states"
              detail="Start from the ε-closure of the NFA's start. For every DFA state and every symbol, follow the symbol's edges, then close over ε. New sets become new DFA states."
            />
          )}
          <div className="table-wrap" data-lenis-prevent tabIndex={0} aria-label="Dtran transition table">
            <table className="dtran">
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
                    <td colSpan={2 + nfa.alphabet.length} className="muted table-empty">
                      Rows appear as states are discovered.
                    </td>
                  </tr>
                )}
                {visibleStates.map((s) => (
                  <tr key={s.id} className={step?.kind === 'move' && step.from === s.id ? 'row-active' : undefined}>
                    <th scope="row" className="mono">
                      <StateName name={s.name} start={s.id === step?.dfa.start} accepting={s.accepting} />
                    </th>
                    <td>
                      <SetText set={s.nfaStates} />
                    </td>
                    {nfa.alphabet.map((a) => (
                      <td
                        key={a}
                        className={`mono${step?.kind === 'move' && step.from === s.id && step.symbol === a ? ' cell-active' : ''}`}
                      >
                        {cell(s.id, a) || <span className="muted">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <StepList
            items={steps.map((s) => ({ title: s.title }))}
            shown={stepper.shown}
            onSelect={stepper.goTo}
          />
        </>
      }
    />
  );
}
