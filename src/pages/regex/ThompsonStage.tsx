import { useMemo } from 'react';
import type { ThompsonResult } from '../../algorithms/regex';
import GraphFrame, { LegendItem } from '../../components/graph/GraphFrame';
import type { GraphEdge, GraphNode } from '../../components/graph/layout';
import StepController from '../../components/stepper/StepController';
import { useStepper } from '../../components/stepper/useStepper';
import { EmptyCanvas, StageLayout, StepCard, StepList } from './shared';

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
      tone: freshEdges.has(`${t.from}-${t.symbol}-${t.to}`)
        ? 'new'
        : inFrag.has(t.from) && inFrag.has(t.to)
          ? 'idle'
          : 'muted',
    }));
    return { nodes, edges };
  }, [step]);

  return (
    <StageLayout
      canvas={
        graph ? (
          <GraphFrame
            nodes={graph.nodes}
            edges={graph.edges}
            label={`Thompson NFA after step ${stepper.shown}`}
            caption={
              <>
                Thompson NFA <span className="muted">· after step {stepper.shown}</span>
              </>
            }
            legend={<Legend />}
          />
        ) : (
          <EmptyCanvas
            title="Nothing built yet"
            hint={`Press Next to apply the first of ${steps.length} rules. Rules run in postfix order: ${postfix}`}
          />
        )
      }
      controller={<StepController stepper={stepper} label="Thompson construction steps" keyboard />}
      rail={
        <>
          {step ? (
            <StepCard
              kicker={step.title}
              title={<span className="mono">{step.text}</span>}
              detail={step.detail}
            />
          ) : (
            <StepCard
              kicker="Thompson's construction"
              title="One small NFA per operator"
              detail="Each symbol becomes a two-state machine. Union, concatenation and the repetition operators glue smaller machines together with ε-edges, bottom-up through the syntax tree."
            />
          )}
          <StepList
            items={steps.map((s) => ({ title: <span className="mono">{s.text}</span>, meta: s.title }))}
            shown={stepper.shown}
            onSelect={stepper.goTo}
          />
        </>
      }
    />
  );
}

function Legend() {
  return (
    <>
      <LegendItem kind="new">added this step</LegendItem>
      <LegendItem kind="focus">current fragment</LegendItem>
      <LegendItem kind="muted">earlier fragments</LegendItem>
      <LegendItem kind="eps">ε-edge</LegendItem>
      <LegendItem kind="accept">accepting</LegendItem>
    </>
  );
}
