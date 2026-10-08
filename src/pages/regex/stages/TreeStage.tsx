import { useMemo } from 'react';
import { postOrder, type DirectResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { Narration, SetText, StepLog, Workbench } from '../workbench';
import { children, treeGraph } from './parts';

/** Augmented syntax tree (r)#, with nullable, firstpos and lastpos computed node by node. */
export default function TreeStage({ direct }: { direct: DirectResult }) {
  const steps = direct.functionSteps;
  const stepper = useStepper(steps.length, direct);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;
  const order = useMemo(() => postOrder(direct.tree), [direct]);
  const byId = useMemo(() => new Map(order.map((n) => [n.id, n])), [order]);

  const graph = useMemo(() => {
    const done = new Set(steps.slice(0, stepper.shown).map((s) => s.nodeId));
    const kids = new Set(step ? children(byId.get(step.nodeId)!).map((k) => k.id) : []);
    return treeGraph(direct, (n) => {
      if (!step) return n.kind === 'symbol' || n.kind === 'epsilon' ? 'idle' : 'set';
      if (n.id === step.nodeId) return 'new';
      if (kids.has(n.id)) return 'focus';
      return done.has(n.id) ? 'idle' : 'muted';
    });
  }, [direct, steps, step, stepper.shown, byId]);

  const computed = steps.slice(0, stepper.shown);
  const posOf = new Map(direct.positions.map((p) => [p.nodeId, p.pos]));
  const nodeName = (id: number) => {
    const n = byId.get(id)!;
    if (n.kind === 'symbol') return `${n.symbol} (${posOf.get(id)})`;
    return { epsilon: 'ε', concat: '•', union: '|', star: '*', plus: '+', optional: '?' }[n.kind];
  };

  return (
    <Workbench
      canvas={
        <DiagramPanel
          nodes={graph.nodes}
          edges={graph.edges}
          direction="tree"
          label="Augmented syntax tree of the regular expression"
          maxScale={1}
          title="Augmented syntax tree (r)#"
          meta={`${direct.positions.length} positions · • is concatenation`}
          legend={
            step ? (
              <>
                <Key kind="new">node being computed</Key>
                <Key kind="focus">its children</Key>
                <Key kind="muted">not computed yet</Key>
              </>
            ) : undefined
          }
        />
      }
      controls={<StepBar stepper={stepper} label="nullable, firstpos and lastpos steps" keyboard docked />}
      inspector={
        <>
          {step ? (
            <Narration kicker="nullable · firstpos · lastpos" title={step.title}>
              {step.detail}
            </Narration>
          ) : (
            <Narration kicker="Direct method" title="Augment the expression with an end marker">
              The expression is wrapped as (r)#. Each symbol leaf gets a position, numbered left to right, and # gets the last one, so
              reaching it means the input matched. Press Next to compute nullable, firstpos and lastpos for every node, bottom-up.
            </Narration>
          )}
          <div className="table-scroll" data-lenis-prevent tabIndex={0} aria-label="nullable, firstpos and lastpos table">
            <table className="table table-compact">
              <caption>Node functions</caption>
              <thead>
                <tr>
                  <th scope="col">Node</th>
                  <th scope="col">nullable</th>
                  <th scope="col">firstpos</th>
                  <th scope="col">lastpos</th>
                </tr>
              </thead>
              <tbody>
                {computed.length === 0 && (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      Rows appear as nodes are computed.
                    </td>
                  </tr>
                )}
                {computed.map((s) => (
                  <tr key={s.nodeId} className={s === step ? 'is-active' : undefined}>
                    <th scope="row" className="mono">
                      {nodeName(s.nodeId)}
                    </th>
                    <td className="mono">{s.facts.nullable ? 'true' : 'false'}</td>
                    <td>
                      <SetText set={s.facts.firstpos} />
                    </td>
                    <td>
                      <SetText set={s.facts.lastpos} />
                    </td>
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
