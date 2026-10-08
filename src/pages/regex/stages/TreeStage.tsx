import { useMemo } from 'react';
import { EPSILON, type Pipeline, type RegexNode } from '../../../algorithms/regex';
import DiagramPanel from '../../../graph/DiagramPanel';
import type { GraphEdge, GraphNode } from '../../../lib/graph/layout';
import { Facts, Narration, Workbench } from '../workbench';

const OP_LABEL: Record<RegexNode['kind'], string> = {
  symbol: '',
  epsilon: EPSILON,
  concat: '•',
  union: '|',
  star: '*',
  plus: '+',
  optional: '?',
};

export default function TreeStage({ pipeline }: { pipeline: Pipeline }) {
  const graph = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    // Pre-order (parent, then left before right) so children stay in reading order.
    const visit = (n: RegexNode) => {
      const leaf = n.kind === 'symbol' || n.kind === 'epsilon';
      nodes.push({ id: `t${n.id}`, label: n.kind === 'symbol' ? n.symbol : OP_LABEL[n.kind], tone: leaf ? 'idle' : 'set' });
      const kids = n.kind === 'concat' || n.kind === 'union' ? [n.left, n.right] : 'child' in n ? [n.child] : [];
      for (const k of kids) edges.push({ from: `t${n.id}`, to: `t${k.id}`, label: '' });
      kids.forEach(visit);
    };
    visit(pipeline.tree);
    return { nodes, edges };
  }, [pipeline]);

  const { thompson, subset, minimize, alphabet, postfix } = pipeline;

  return (
    <Workbench
      canvas={
        <DiagramPanel
          nodes={graph.nodes}
          edges={graph.edges}
          direction="tree"
          label="Syntax tree of the regular expression"
          maxScale={1}
          title="Syntax tree"
          meta="• is concatenation"
        />
      }
      inspector={
        <>
          <Narration kicker="Syntax tree" title="Operators bind tighter as you go down">
            Star, plus and optional bind tightest, then concatenation (shown as •), then union. Reading the tree bottom-up gives the
            postfix order Thompson's construction follows.
          </Narration>
          <Facts
            items={[
              { term: 'Postfix', value: postfix, mono: true },
              { term: 'Alphabet', value: alphabet.length ? `{${alphabet.join(', ')}}` : '∅', mono: true },
              {
                term: 'Pipeline',
                value: (
                  <>
                    <span className="mono">{thompson.nfa.states.length}</span> NFA states, then{' '}
                    <span className="mono">{subset.dfa.states.length}</span> DFA states, then{' '}
                    <span className="mono">{minimize.dfa.states.length}</span> after minimization
                  </>
                ),
              },
            ]}
          />
        </>
      }
    />
  );
}
