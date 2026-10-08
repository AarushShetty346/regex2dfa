import dagre from '@dagrejs/dagre';

export type NodeTone = 'idle' | 'focus' | 'new' | 'set' | 'muted' | 'ok' | 'error';
export type EdgeTone = 'idle' | 'focus' | 'new' | 'muted';

export interface GraphNode {
  id: string;
  label: string;
  accepting?: boolean;
  start?: boolean;
  tone?: NodeTone;
  /** Optional categorical fill index (used to colour partition groups). */
  group?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  tone?: EdgeTone;
}

export interface Point {
  x: number;
  y: number;
}

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  r: number;
}

export interface PositionedEdge extends GraphEdge {
  id: string;
  d: string;
  labelAt: Point;
}

export interface Layout {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
}

const TONE_RANK: Record<EdgeTone, number> = { muted: 0, idle: 1, focus: 2, new: 3 };

export function nodeRadius(label: string) {
  return 19 + Math.max(0, label.length - 2) * 4.5;
}

const MARGIN = 44;

/**
 * Lay a graph out with dagre (node positions and routing for long edges), then draw the
 * edges ourselves: endpoints clipped to the node circles, a smooth curve through dagre's
 * bend points, a bowed arc for two-way pairs so they don't overlap, and loops above nodes.
 */
export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: 'LR' | 'TB' | 'tree' = 'LR',
): Layout {
  if (direction === 'tree') return layoutTree(nodes, edges);
  // Merge parallel edges (same from/to) into one with a combined label.
  const merged = new Map<string, GraphEdge>();
  for (const e of edges) {
    const key = `${e.from}->${e.to}`;
    const prev = merged.get(key);
    if (!prev) merged.set(key, { ...e });
    else {
      prev.label = `${prev.label}, ${e.label}`;
      if (TONE_RANK[e.tone ?? 'idle'] > TONE_RANK[prev.tone ?? 'idle']) prev.tone = e.tone;
    }
  }
  const list = [...merged.values()];

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 34 : 22,
    ranksep: direction === 'LR' ? 50 : 40,
    edgesep: 18,
    marginx: MARGIN,
    marginy: MARGIN,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    const r = nodeRadius(n.label);
    g.setNode(n.id, { width: r * 2, height: r * 2 });
  }
  list.forEach((e, i) => {
    if (e.from === e.to) return; // loops are drawn by hand
    g.setEdge(e.from, e.to, { width: e.label.length * 8 + 8, height: 18, labelpos: 'c' }, `e${i}`);
  });
  dagre.layout(g);

  const pos = new Map<string, PositionedNode>();
  const out: PositionedNode[] = nodes.map((n) => {
    const v = g.node(n.id);
    const p = { ...n, x: v.x, y: v.y, r: nodeRadius(n.label) };
    pos.set(n.id, p);
    return p;
  });

  const has = new Set(list.map((e) => `${e.from}->${e.to}`));
  const positioned: PositionedEdge[] = list.map((e, i) => {
    const a = pos.get(e.from)!;
    const b = pos.get(e.to)!;
    const id = `${e.from}->${e.to}`;

    if (e.from === e.to) {
      const top = a.y - a.r;
      const d = `M ${a.x - 9} ${top + 2} C ${a.x - 34} ${top - 44}, ${a.x + 34} ${top - 44}, ${a.x + 9} ${top + 2}`;
      return { ...e, id, d, labelAt: { x: a.x, y: top - 40 } };
    }

    if (has.has(`${e.to}->${e.from}`)) {
      // Two-way pair: bow each edge to its own left side.
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dy / len;
      const ny = -dx / len;
      const bow = 26;
      const c = { x: (a.x + b.x) / 2 + nx * bow, y: (a.y + b.y) / 2 + ny * bow };
      const p0 = clip(a, c);
      const p1 = clip(b, c);
      return {
        ...e,
        id,
        d: `M ${p0.x} ${p0.y} Q ${c.x} ${c.y} ${p1.x} ${p1.y}`,
        labelAt: { x: (p0.x + 2 * c.x + p1.x) / 4, y: (p0.y + 2 * c.y + p1.y) / 4 },
      };
    }

    const de = g.edge({ v: e.from, w: e.to, name: `e${i}` }) as { points: Point[]; x?: number; y?: number };
    const inner = de.points.slice(1, -1);
    const p0 = clip(a, inner[0] ?? b);
    const p1 = clip(b, inner[inner.length - 1] ?? a);
    const pts = [p0, ...inner, p1];
    const label = de.x !== undefined && de.y !== undefined ? { x: de.x, y: de.y } : midpoint(pts);
    return { ...e, id, d: smooth(pts), labelAt: label };
  });

  const gg = g.graph() as { width?: number; height?: number };
  return { nodes: out, edges: positioned, width: gg.width ?? 0, height: gg.height ?? 0 };
}

/**
 * Tidy top-down layout for a tree whose edges go parent → child in left-to-right order.
 * (dagre is free to reorder siblings, which would swap the operands of a syntax tree.)
 */
function layoutTree(nodes: GraphNode[], edges: GraphEdge[]): Layout {
  const kids = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    if (!kids.has(e.from)) kids.set(e.from, []);
    kids.get(e.from)!.push(e.to);
    hasParent.add(e.to);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const root = nodes.find((n) => !hasParent.has(n.id));
  const pos = new Map<string, PositionedNode>();
  const STEP_X = 52;
  const STEP_Y = 78;
  let leaf = 0;
  let maxX = 0;
  let maxY = 0;
  const place = (id: string, depth: number): number => {
    const children = kids.get(id) ?? [];
    const xs = children.map((c) => place(c, depth + 1));
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : MARGIN + 20 + STEP_X * leaf++;
    const n = byId.get(id)!;
    const y = MARGIN + 20 + depth * STEP_Y;
    pos.set(id, { ...n, x, y, r: nodeRadius(n.label) });
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    return x;
  };
  if (root) place(root.id, 0);

  const positioned: PositionedEdge[] = edges.map((e) => {
    const a = pos.get(e.from)!;
    const b = pos.get(e.to)!;
    const p0 = clip(a, b);
    const p1 = clip(b, a);
    return { ...e, id: `${e.from}->${e.to}`, d: smooth([p0, p1]), labelAt: midpoint([p0, p1]) };
  });
  return {
    nodes: nodes.map((n) => pos.get(n.id)!).filter(Boolean),
    edges: positioned,
    width: maxX + MARGIN + 20,
    height: maxY + MARGIN + 20,
  };
}

function clip(n: PositionedNode, toward: Point): Point {
  const dx = toward.x - n.x;
  const dy = toward.y - n.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: n.x + (dx / len) * n.r, y: n.y + (dy / len) * n.r };
}

function midpoint(pts: Point[]): Point {
  const a = pts[Math.floor((pts.length - 1) / 2)];
  const b = pts[Math.ceil((pts.length - 1) / 2)];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** A smooth path through the points: straight for two, quadratic midpoint spline otherwise. */
function smooth(pts: Point[]): string {
  const f = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  if (pts.length === 2) return `M ${f(pts[0])} L ${f(pts[1])}`;
  let d = `M ${f(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
    d += ` Q ${f(pts[i])} ${i === pts.length - 2 ? f(pts[i + 1]) : f(m)}`;
  }
  return d;
}
