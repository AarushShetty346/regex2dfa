import { useMemo } from 'react';
import type { DFA, MinimizeResult } from '../../../algorithms/regex';
import DiagramPanel, { Key } from '../../../graph/DiagramPanel';
import type { GraphEdge, GraphNode } from '../../../lib/graph/layout';
import { useStepper } from '../../../lib/stepper/useStepper';
import StepBar from '../../../stepper/StepBar';
import { Narration, StepLog, Workbench } from '../workbench';

function dfaToGraph(dfa: DFA, groupOf?: (id: number) => number | undefined) {
  const nodes: GraphNode[] = dfa.states.map((s) => ({
    id: `d${s.id}`,
    label: s.name,
    start: s.id === dfa.start,
    accepting: s.accepting,
    group: groupOf?.(s.id),
  }));
  const edges: GraphEdge[] = dfa.transitions.map((t) => ({ from: `d${t.from}`, to: `d${t.to}`, label: t.symbol }));
  return { nodes, edges };
}

export default function MinimizeStage({ result, dfa }: { result: MinimizeResult; dfa: DFA }) {
  const { steps } = result;
  const stepper = useStepper(steps.length, result);
  const step = stepper.current >= 0 ? steps[stepper.current] : null;
  const name = (id: number) => dfa.states[id].name;
  const groupName = (g: number[]) => g.map(name).join(dfa.states.every((s) => s.name.length === 1) ? '' : ',');

  /**
   * A colour per group per step, stable across rounds: when a group splits, the part holding
   * its first state keeps the parent's colour and the other parts get fresh ones.
   */
  const colors = useMemo(() => {
    const out: number[][] = [];
    let fresh = 0;
    steps.forEach((s, i) => {
      if (i === 0) {
        out.push(s.partition.map(() => fresh++));
        return;
      }
      const prev = steps[i - 1].partition;
      const used = new Set<number>();
      out.push(
        s.partition.map((g) => {
          const parent = out[i - 1][prev.findIndex((p) => p.includes(g[0]))];
          if (parent !== undefined && !used.has(parent)) {
            used.add(parent);
            return parent;
          }
          return fresh++;
        }),
      );
    });
    return out;
  }, [steps]);
  const stepColors = stepper.current >= 0 ? colors[stepper.current] : [];
  const basisColors = stepper.current > 0 && step?.previous ? colors[stepper.current - 1] : stepColors;

  const graph = useMemo(() => {
    if (step?.minimal) {
      // Colour each merged state the way its group was coloured during refinement.
      const groups = step.partition;
      return dfaToGraph(step.minimal, (id) => stepColors[groups.findIndex((g) => g.includes(result.groupOf.indexOf(id)))]);
    }
    if (!step) return dfaToGraph(dfa);
    const idx = new Map<number, number>();
    step.partition.forEach((g, i) => g.forEach((s) => idx.set(s, stepColors[i])));
    return dfaToGraph(dfa, (id) => idx.get(id));
  }, [step, dfa, result.groupOf, stepColors]);

  // The partition this round started from, which the signature table refers to.
  const basis = step?.previous ?? step?.partition ?? [];

  return (
    <Workbench
      canvas={
        <DiagramPanel
          key={step?.minimal ? 'minimal' : 'original'}
          nodes={graph.nodes}
          edges={graph.edges}
          label={step?.minimal ? 'Minimal DFA' : 'DFA coloured by partition group'}
          title={step?.minimal ? 'Minimal DFA' : 'DFA from subset construction'}
          meta={step?.minimal ? `${graph.nodes.length} states` : 'fill = partition group'}
          legend={
            <>
              <Key kind="start">start</Key>
              <Key kind="accept">accepting</Key>
            </>
          }
        />
      }
      controls={<StepBar stepper={stepper} label="Minimization steps" keyboard docked />}
      inspector={
        <>
          {step ? (
            <Narration kicker={step.kind === 'result' ? 'Result' : 'Partition refinement'} title={step.title}>
              {step.detail}
            </Narration>
          ) : (
            <Narration kicker="Minimization" title="Merge states nobody can tell apart">
              Two states are equivalent if every input string leads both to acceptance or both to rejection. Refine a partition of the
              states until no group can be split.
            </Narration>
          )}

          {step && (
            <div className="partition">
              <p className="inspector-label">Partition</p>
              <div className="partition-groups" aria-label="Current partition">
                {step.partition.map((g, i) => (
                  <span key={i} className={`group-tag grp-${stepColors[i] % 6}`}>
                    {groupName(g)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step?.signatures && (
            <div className="table-scroll" data-lenis-prevent tabIndex={0} aria-label="Signature table">
              <table className="table table-compact">
                <caption>Where each symbol leads, using the groups from before this round</caption>
                <thead>
                  <tr>
                    <th scope="col">State</th>
                    {dfa.alphabet.map((a) => (
                      <th scope="col" key={a} className="mono">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {basis.flatMap((g, gi) =>
                    g.map((s, si) => {
                      const sig = step.signatures![s];
                      const splitting = step.split?.some((x) => x.includes(s));
                      return (
                        <tr key={s} className={`${si === 0 && gi > 0 ? 'is-group-start ' : ''}${splitting ? 'is-active' : ''}`}>
                          <th scope="row" className="mono">
                            <i className={`group-dot grp-${basisColors[gi] % 6}`} /> {name(s)}
                          </th>
                          {sig.targets.map((t, ti) => (
                            <td key={ti} className="mono">
                              {t === null ? (
                                <span className="subtle">∅</span>
                              ) : (
                                <span className={`group-tag is-small grp-${basisColors[t] % 6}`}>{groupName(basis[t])}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          )}

          <StepLog items={steps.map((s) => ({ title: s.title }))} shown={stepper.shown} onSelect={stepper.goTo} />
        </>
      }
    />
  );
}
