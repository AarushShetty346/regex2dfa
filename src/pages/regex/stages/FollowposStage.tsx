import { useMemo } from 'react';
import type { DirectResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { Narration, StepLog, Workbench } from '../workbench';
import { FollowTable, treeGraph } from './parts';

/** followpos, filled in from every concatenation and star/plus node. */
export default function FollowposStage({ direct }: { direct: DirectResult }) {
  const steps = direct.followSteps;
  const stepper = useStepper(steps.length, direct);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;
  const empty = useMemo(() => direct.followpos.map(() => [] as number[]), [direct]);

  const graph = useMemo(() => {
    const from = new Set(step?.from ?? []);
    const add = new Set(step?.add ?? []);
    return treeGraph(direct, (n, pos) => {
      if (!step) return 'idle';
      if (n.id === step.nodeId) return 'focus';
      if (pos !== undefined && add.has(pos)) return 'new';
      if (pos !== undefined && from.has(pos)) return 'set';
      return 'muted';
    });
  }, [direct, step]);

  return (
    <Workbench
      canvas={
        <DiagramPanel
          nodes={graph.nodes}
          edges={graph.edges}
          direction="tree"
          label="Augmented syntax tree with the current followpos rule highlighted"
          maxScale={1}
          title="followpos rules"
          meta="only • and * (or +) nodes add entries"
          legend={
            step ? (
              <>
                <Key kind="focus">node applying the rule</Key>
                <Key kind="set">positions whose followpos grows</Key>
                <Key kind="new">positions added</Key>
              </>
            ) : undefined
          }
        />
      }
      controls={<StepBar stepper={stepper} label="followpos steps" keyboard docked />}
      inspector={
        <>
          {step ? (
            <Narration kicker="followpos" title={step.title}>
              {step.detail}
            </Narration>
          ) : (
            <Narration kicker="followpos" title="Which positions can come next">
              followpos(i) is the set of positions that can follow position i in some match. Only two rules add to it: at a concatenation,
              lastpos of the left side is followed by firstpos of the right; at a star or plus, lastpos of the node loops back to its
              firstpos.
            </Narration>
          )}
          <FollowTable direct={direct} followpos={step ? step.followpos : empty} active={step?.from} />
          <StepLog items={steps.map((s) => ({ title: s.title }))} shown={stepper.shown} onSelect={stepper.goTo} />
        </>
      }
    />
  );
}
