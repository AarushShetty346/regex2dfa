import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { EPSILON } from '../../algorithms/regex';
import { layoutGraph, type GraphEdge, type GraphNode, type Point } from './layout';

interface AutomatonGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** 'tree' keeps children in the order their edges are given (syntax trees). */
  direction?: 'LR' | 'TB' | 'tree';
  /** Accessible description of what the graph shows. */
  label: string;
  /** Largest on-screen scale relative to the layout, so tiny graphs don't balloon. */
  maxScale?: number;
  /** Fixed scale relative to the layout (from the zoom controls). Omit to fit the container. */
  zoom?: number | null;
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * SVG renderer for state diagrams and syntax trees.
 *
 * Motion is used only to show what changed between two steps: nodes that already existed
 * glide to their new place, new nodes pop in, and new edges draw themselves from source to
 * target. Everything is keyed by node id / edge id so React reuses elements across steps.
 */
export default function AutomatonGraph({
  nodes,
  edges,
  direction = 'LR',
  label,
  maxScale = 1.5,
  zoom = null,
}: AutomatonGraphProps) {
  const uid = useId().replace(/:/g, '');
  const layout = useMemo(() => layoutGraph(nodes, edges, direction), [nodes, edges, direction]);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevNodes = useRef(new Map<string, Point>());
  const prevEdges = useRef(new Map<string, string>());

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const before = prevNodes.current;
    const beforeEdges = prevEdges.current;
    const first = before.size === 0;
    prevNodes.current = new Map(layout.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    prevEdges.current = new Map(layout.edges.map((e) => [e.id, e.d]));
    if (reduceMotion()) return;

    const ctx = gsap.context(() => {
      const ease = 'power3.out';
      for (const n of layout.nodes) {
        const el = svg.querySelector<SVGGElement>(`[data-node="${CSS.escape(n.id)}"]`);
        if (!el) continue;
        const old = before.get(n.id);
        if (old) {
          if (old.x !== n.x || old.y !== n.y)
            gsap.fromTo(el, { x: old.x - n.x, y: old.y - n.y }, { x: 0, y: 0, duration: 0.4, ease });
        } else {
          gsap.fromTo(
            el,
            { scale: 0.3, opacity: 0, transformOrigin: '50% 50%' },
            { scale: 1, opacity: 1, duration: 0.36, delay: first ? 0 : 0.12, ease: 'back.out(1.7)' },
          );
        }
      }
      for (const e of layout.edges) {
        const path = svg.querySelector<SVGPathElement>(`[data-edge="${CSS.escape(e.id)}"]`);
        const text = svg.querySelector<SVGTextElement>(`[data-edge-label="${CSS.escape(e.id)}"]`);
        if (!path) continue;
        const old = beforeEdges.get(e.id);
        if (old === e.d) continue;
        const isNew = old === undefined;
        const dashed = e.label.split(', ').every((s) => s === EPSILON);
        if (isNew && !dashed && !first) {
          const len = path.getTotalLength();
          gsap.fromTo(
            path,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 0.4, delay: 0.2, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' },
          );
        } else {
          gsap.fromTo(path, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: first ? 0 : 0.25 });
        }
        if (text) gsap.fromTo(text, { opacity: 0 }, { opacity: 1, duration: 0.24, delay: first ? 0.1 : 0.4 });
      }
    }, svg);
    return () => ctx.revert();
  }, [layout]);

  const { width, height } = layout;
  const marker = (tone: string) => `url(#${uid}-arrow-${tone})`;

  return (
    <svg
      ref={svgRef}
      className="graph"
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      style={
        zoom
          ? { width: Math.max(width, 1) * zoom, maxWidth: 'none' }
          : { maxWidth: Math.max(width, 1) * maxScale, minWidth: Math.min(width * 0.68, 560) }
      }
      role="img"
      aria-label={label}
    >
      <defs>
        {(['idle', 'focus', 'new', 'muted'] as const).map((tone) => (
          <marker
            key={tone}
            id={`${uid}-arrow-${tone}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" className={`arrow arrow-${tone}`} />
          </marker>
        ))}
      </defs>

      <g className="edges">
        {layout.edges.map((e) => {
          const eps = e.label.split(', ').every((s) => s === EPSILON);
          const tone = e.tone ?? 'idle';
          return (
            <path
              key={e.id}
              data-edge={e.id}
              d={e.d}
              className={`edge edge-${tone}${eps ? ' edge-eps' : ''}`}
              markerEnd={marker(tone)}
            />
          );
        })}
      </g>

      <g className="edge-labels">
        {layout.edges.map((e) => (
          <text
            key={e.id}
            data-edge-label={e.id}
            x={e.labelAt.x}
            y={e.labelAt.y}
            className={`edge-label edge-label-${e.tone ?? 'idle'}`}
            dominantBaseline="central"
            textAnchor="middle"
          >
            {e.label}
          </text>
        ))}
      </g>

      <g className="nodes">
        {layout.nodes.map((n) => {
          const tone = n.tone ?? 'idle';
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
              <g
                data-node={n.id}
                className={`node node-${tone}${n.group !== undefined ? ` node-group group-${n.group % 6}` : ''}`}
              >
                {n.start && (
                  <path
                    data-start
                    d={direction === 'LR' ? `M ${-n.r - 30} 0 L ${-n.r - 3} 0` : `M 0 ${-n.r - 30} L 0 ${-n.r - 3}`}
                    className={`edge edge-${tone === 'muted' ? 'muted' : 'idle'}`}
                    markerEnd={marker(tone === 'muted' ? 'muted' : 'idle')}
                  />
                )}
                {(tone === 'focus' || tone === 'new' || tone === 'ok' || tone === 'error') && (
                  // A halo marks the active state by shape as well as colour.
                  <circle r={n.r + 5} className="node-halo" />
                )}
                <circle r={n.r} className="node-body" />
                {n.accepting && <circle r={n.r - 4} className="node-ring" />}
                <text className="node-label" dominantBaseline="central" textAnchor="middle">
                  {n.label}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
