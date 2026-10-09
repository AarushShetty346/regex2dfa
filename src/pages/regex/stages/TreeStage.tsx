import { useMemo } from 'react';
import { postOrder, regexToString, type DirectResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { CanvasEmpty, Narration, StepLog, Workbench } from '../workbench';
import { children, treeGraph } from './parts';

/** The augmented syntax tree (r)#, built node by node from the postfix form with a stack of subtrees. */
export default function TreeStage({ direct }: { direct: DirectResult }) {
  const steps = direct.buildSteps;
  const stepper = useStepper(steps.length, direct);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;
  const byId = useMemo(() => new Map(postOrder(direct.tree).map((n) => [n.id, n])), [direct]);

  const graph = useMemo(() => {
    if (!step) return null;
    const built = new Set(steps.slice(0, stepper.shown).map((s) => s.nodeId));
    const kids = new Set(children(byId.get(step.nodeId)!).map((k) => k.id));
    const full = treeGraph(direct, (n) => (n.id === step.nodeId ? 'new' : kids.has(n.id) ? 'focus' : 'idle'));
    const nodes = full.nodes.filter((n) => built.has(Number(n.id.slice(1))));
    const ids = new Set(nodes.map((n) => n.id));
    const edges = full.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    return { nodes, edges };
  }, [direct, steps, step, stepper.shown, byId]);

  return (
    <Workbench
      canvas={
        graph ? (
          <DiagramPanel
            nodes={graph.nodes}
            edges={graph.edges}
            direction="tree"
            label={`Syntax tree after step ${stepper.shown}`}
            maxScale={1}
            title="Syntax tree under construction"
            meta={`${graph.nodes.length} of ${steps.length} nodes · • is concatenation`}
            legend={
              <>
                <Key kind="new">node just created</Key>
                <Key kind="focus">its children</Key>
              </>
            }
          />
        ) : (
          <CanvasEmpty
            title="No syntax tree yet"
            hint="Press Next to read the postfix form one token at a time. Each symbol becomes a leaf; each operator joins the subtrees on top of the stack."
          />
        )
      }
      controls={<StepBar stepper={stepper} label="Syntax tree construction steps" keyboard docked />}
      inspector={
        <>
          {step ? (
            <Narration kicker="Syntax tree" title={step.title}>
              {step.detail}
            </Narration>
          ) : (
            <Narration kicker="Direct method" title="Build the augmented syntax tree (r)#">
              The expression is read in postfix form, <span className="mono">{direct.buildSteps.map((s) => s.token).join(' ')}</span>, with
              the end marker # and a final • added. Symbols become leaves numbered left to right; operators take the subtrees on top of the
              stack as their children. Press Next to create the tree node by node.
            </Narration>
          )}
          <div className="table-scroll" data-lenis-prevent tabIndex={0} aria-label="Stack of subtrees">
            <table className="table table-compact">
              <caption>Stack of subtrees</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Subtree</th>
                </tr>
              </thead>
              <tbody>
                {!step && (
                  <tr>
                    <td colSpan={2} className="table-empty">
                      Subtrees appear as nodes are created.
                    </td>
                  </tr>
                )}
                {step &&
                  [...step.stack].reverse().map((id, i) => (
                    <tr key={id} className={id === step.nodeId ? 'is-active' : undefined}>
                      <th scope="row" className="mono">
                        {i === 0 ? 'top' : step.stack.length - i}
                      </th>
                      <td className="mono">{regexToString(byId.get(id)!)}</td>
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
