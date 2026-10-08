import { useMemo } from 'react';
import type { ThompsonResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import type { GraphEdge, GraphNode } from '../../../lib/graph/layout';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { CanvasEmpty, Narration, StepLog, Workbench } from '../workbench';

export default function ThompsonStage({ result, postfix }: { result: ThompsonResult; postfix: string }) {
  const { steps } = result;
  const stepper = useStepper(steps.length, result);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;

  const graph = useMemo(() => {
    if (!step) return null;
    const inFrag = new Set(step.fragment);
    const fresh = new Set(step.newStates);
    const freshEdges = new Set(step.newTransitions.map((t) => `${t.from}-${t.symbol}-${t.to}`));
    const nodes: GraphNode[] = step.states.map((s) => ({
      id: `q${s}`,
      label: String(s),
      start: s === step.start,
      accepting: s === step.accept,
      tone: fresh.has(s) ? 'new' : inFrag.has(s) ? 'focus' : 'muted',
    }));
    const edges: GraphEdge[] = step.transitions.map((t) => ({
      from: `q${t.from}`,
      to: `q${t.to}`,
      label: t.symbol,
      tone: freshEdges.has(`${t.from}-${t.symbol}-${t.to}`) ? 'new' : inFrag.has(t.from) && inFrag.has(t.to) ? 'idle' : 'muted',
    }));
    return { nodes, edges };
  }, [step]);

  return (
    <Workbench
      canvas={
        graph ? (
          <DiagramPanel
            nodes={graph.nodes}
            edges={graph.edges}
            label={`Thompson NFA after step ${stepper.shown}`}
            title="Thompson NFA"
            meta={`after step ${stepper.shown}`}
            legend={
              <>
                <Key kind="new">added this step</Key>
                <Key kind="focus">current fragment</Key>
                <Key kind="muted">earlier fragments</Key>
                <Key kind="eps">ε-edge</Key>
                <Key kind="accept">accepting</Key>
              </>
            }
          />
        ) : (
          <CanvasEmpty
            title="Nothing built yet"
            hint={`Press Next to apply the first of ${steps.length} rules. Rules run in postfix order: ${postfix}`}
          />
        )
      }
      controls={<StepBar stepper={stepper} label="Thompson construction steps" keyboard docked />}
      inspector={
        <>
          {step ? (
            <Narration kicker={step.title} title={<span className="mono">{step.text}</span>}>
              {step.detail}
            </Narration>
          ) : (
            <Narration kicker="Thompson's construction" title="One small NFA per operator">
              Each symbol becomes a two-state machine. Union, concatenation and the repetition operators glue smaller machines together
              with ε-edges, bottom-up through the syntax tree.
            </Narration>
          )}
          <StepLog
            items={steps.map((s) => ({ title: <span className="mono">{s.text}</span>, meta: s.title }))}
            shown={stepper.shown}
            onSelect={stepper.goTo}
          />
        </>
      }
    />
  );
}
