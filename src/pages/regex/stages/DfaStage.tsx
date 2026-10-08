import { useMemo } from 'react';
import type { DirectResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import type { GraphEdge, GraphNode } from '../../../lib/graph/layout';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { CanvasEmpty, Narration, SetText, StateName, StepLog, Workbench } from '../workbench';
import { FollowTable } from './parts';

/** DFA states are sets of positions; transitions are unions of followpos. */
export default function DfaStage({ direct }: { direct: DirectResult }) {
  const steps = direct.dfaSteps;
  const { alphabet } = direct.dfa;
  const stepper = useStepper(steps.length, direct);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;

  const graph = useMemo(() => {
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

  const visibleStates = step ? step.dfa.states : [];
  const cell = (from: number, a: string) => {
    if (!step) return null;
    const t = step.dfa.transitions.find((x) => x.from === from && x.symbol === a);
    return t ? step.dfa.states[t.to].name : '';
  };

  return (
    <Workbench
      canvas={
        graph ? (
          <DiagramPanel
            nodes={graph.nodes}
            edges={graph.edges}
            label={`DFA after step ${stepper.shown}`}
            title="DFA under construction"
            meta={`${graph.nodes.length} states so far`}
            legend={
              <>
                <Key kind="new">new state or edge</Key>
                <Key kind="focus">state being expanded</Key>
                <Key kind="accept">contains the # position</Key>
              </>
            }
          />
        ) : (
          <CanvasEmpty title="No DFA states yet" hint="Press Next to take firstpos of the root. That set of positions is the start state." />
        )
      }
      controls={<StepBar stepper={stepper} label="DFA construction steps" keyboard docked />}
      below={
        <section className="canvas-card is-secondary" data-enter aria-label="followpos, for reference">
          <FollowTable
            direct={direct}
            followpos={direct.followpos}
            active={step?.kind === 'move' ? step.used : []}
            caption="followpos, for reference"
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
            <Narration kicker="Direct method" title="Each DFA state is a set of positions">
              Start from firstpos of the root. For every state and symbol, take the positions in the state that hold the symbol and union
              their followpos. New sets become new states; any set containing the # position is accepting.
            </Narration>
          )}
          <div className="table-scroll" data-lenis-prevent tabIndex={0} aria-label="Dtran transition table">
            <table className="table table-compact">
              <caption>Dtran</caption>
              <thead>
                <tr>
                  <th scope="col">State</th>
                  <th scope="col">Positions</th>
                  {alphabet.map((a) => (
                    <th scope="col" key={a} className="mono">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleStates.length === 0 && (
                  <tr>
                    <td colSpan={2 + alphabet.length} className="table-empty">
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
                      <SetText set={s.positions} />
                    </td>
                    {alphabet.map((a) => (
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
