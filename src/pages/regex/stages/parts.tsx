import { EPSILON, type DirectResult, type RegexNode } from '../../../algorithms/regex';
import type { GraphEdge, GraphNode, NodeTone } from '../../../lib/graph/layout';
import { SetText } from '../workbench';

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n: number) => [...String(n)].map((d) => SUBSCRIPT[+d]).join('');

const OP_LABEL: Record<Exclude<RegexNode['kind'], 'symbol'>, string> = {
  epsilon: EPSILON,
  concat: '•',
  union: '|',
  star: '*',
  plus: '+',
  optional: '?',
};

export function children(n: RegexNode): RegexNode[] {
  if (n.kind === 'concat' || n.kind === 'union') return [n.left, n.right];
  if (n.kind === 'star' || n.kind === 'plus' || n.kind === 'optional') return [n.child];
  return [];
}

/** The augmented tree as a graph: leaves read "a₁", "#₆"; `tone` picks each node's highlight. */
export function treeGraph(direct: DirectResult, tone: (n: RegexNode, pos: number | undefined) => NodeTone) {
  const posOf = new Map(direct.positions.map((p) => [p.nodeId, p.pos]));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  // Pre-order (parent, then left before right) so children stay in reading order.
  const visit = (n: RegexNode) => {
    const pos = posOf.get(n.id);
    nodes.push({ id: `t${n.id}`, label: n.kind === 'symbol' ? `${n.symbol}${sub(pos!)}` : OP_LABEL[n.kind], tone: tone(n, pos) });
    for (const k of children(n)) edges.push({ from: `t${n.id}`, to: `t${k.id}`, label: '' });
    children(n).forEach(visit);
  };
  visit(direct.tree);
  return { nodes, edges };
}

interface FollowTableProps {
  direct: DirectResult;
  followpos: number[][];
  /** Rows to mark as active (e.g. positions whose followpos just grew). */
  active?: number[];
  caption?: string;
}

/** Position, symbol and followpos for every position of the augmented expression. */
export function FollowTable({ direct, followpos, active = [], caption = 'followpos' }: FollowTableProps) {
  return (
    <div className="table-scroll" data-lenis-prevent tabIndex={0} aria-label="followpos table">
      <table className="table table-compact">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Symbol</th>
            <th scope="col">followpos</th>
          </tr>
        </thead>
        <tbody>
          {direct.positions.map((p) => (
            <tr key={p.pos} className={active.includes(p.pos) ? 'is-active' : undefined}>
              <th scope="row" className="mono">
                {p.pos}
              </th>
              <td className="mono">{p.end ? '# (end)' : p.symbol}</td>
              <td>{p.end ? <span className="subtle">-</span> : <SetText set={followpos[p.pos]} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
