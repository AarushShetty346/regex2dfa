import type { GraphEdge, GraphNode } from './layout';

export interface NodeRow {
  id: string;
  label: string;
  start: boolean;
  accepting: boolean;
  /** Outgoing edges, parallel edges merged into one label (as drawn). */
  out: { label: string; to: string }[];
}

/**
 * A text version of a graph: one row per node with its outgoing edges, in the order the nodes
 * were given. Parallel edges are merged into one comma-separated label, exactly as the drawing
 * merges them, so the list and the picture always agree.
 */
export function describeGraph(nodes: GraphNode[], edges: GraphEdge[]): NodeRow[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, Map<string, string[]>>();
  for (const e of edges) {
    if (!out.has(e.from)) out.set(e.from, new Map());
    const targets = out.get(e.from)!;
    if (!targets.has(e.to)) targets.set(e.to, []);
    targets.get(e.to)!.push(e.label);
  }
  return nodes.map((n) => ({
    id: n.id,
    label: n.label,
    start: !!n.start,
    accepting: !!n.accepting,
    out: [...(out.get(n.id) ?? new Map<string, string[]>())].map(([to, labels]) => ({
      label: labels.filter(Boolean).join(', '),
      to: byId.get(to)?.label ?? to,
    })),
  }));
}

/** Zoom steps offered by the graph toolbar, as multiples of the layout's natural size. */
export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/** Next zoom step above (dir 1) or below (dir -1) `current`, clamped to the ends. */
export function nextZoom(current: number, dir: 1 | -1): number {
  if (dir === 1) return ZOOM_STEPS.find((z) => z > current + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01) ?? ZOOM_STEPS[0];
}
