import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { EPSILON } from '../algorithms/regex';
import { layoutGraph, type GraphEdge, type GraphNode, type Point } from '../lib/graph/layout';

export interface StateDiagramProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** 'tree' keeps children in the order their edges are given (syntax trees). */
  direction?: 'LR' | 'TB' | 'tree';
  /** Accessible description of what the diagram shows. */
  label: string;
  /** Largest on-screen scale relative to the layout, so tiny graphs don't balloon. */
  maxScale?: number;
  /** Fixed scale from the zoom controls. Omit to fit the container. */
  zoom?: number | null;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ACTIVE = new Set(['focus', 'new', 'ok', 'error']);

/** Width of an edge label's backing pill, from its character count (labels are monospace). */
const pillWidth = (label: string) => Math.max(18, label.length * 7.4 + 10);

/**
 * SVG renderer for automata and syntax trees, laid out by dagre (see lib/graph/layout).
 *
 * GSAP is used only to show change between two steps: surviving states glide to their new
 * position, new states grow in, and new transitions draw from source to target. Elements are
 * keyed by id so React keeps them across steps.
 */
export default function StateDiagram({ nodes, edges, direction = 'LR', label, maxScale = 1.5, zoom = null }: StateDiagramProps) {
  const uid = useId().replace(/[:«»]/g, '');
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
      layout.nodes.forEach((n, i) => {
        const el = svg.querySelector<SVGGElement>(`[data-node="${CSS.escape(n.id)}"]`);
        if (!el) return;
        const old = before.get(n.id);
        if (old) {
          if (old.x !== n.x || old.y !== n.y)
            gsap.fromTo(el, { x: old.x - n.x, y: old.y - n.y }, { x: 0, y: 0, duration: 0.45, ease: 'expo.out' });
        } else {
          gsap.fromTo(
            el,
            { scale: 0.4, opacity: 0, transformOrigin: '50% 50%' },
            {
              scale: 1,
              opacity: 1,
              duration: 0.4,
              delay: first ? Math.min(i * 0.02, 0.3) : 0.1,
              ease: 'back.out(2)',
              clearProps: 'opacity,scale,transform',
            },
          );
        }
      });
      for (const e of layout.edges) {
        const path = svg.querySelector<SVGPathElement>(`[data-edge="${CSS.escape(e.id)}"]`);
        const tag = svg.querySelector<SVGGElement>(`[data-edge-tag="${CSS.escape(e.id)}"]`);
        if (!path) continue;
        const old = beforeEdges.get(e.id);
        if (old === e.d) continue;
        const eps = e.label.split(', ').every((s) => s === EPSILON);
        if (old === undefined && !eps && !first) {
          const len = path.getTotalLength();
          gsap.fromTo(
            path,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 0.45, delay: 0.18, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' },
          );
        } else {
          gsap.fromTo(path, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: first ? 0.05 : 0.2, clearProps: 'opacity' });
        }
        if (tag) gsap.fromTo(tag, { opacity: 0 }, { opacity: 1, duration: 0.25, delay: first ? 0.15 : 0.4, clearProps: 'opacity' });
      }
    }, svg);
    return () => ctx.revert();
  }, [layout]);

  const w = Math.max(layout.width, 1);
  const h = Math.max(layout.height, 1);
  const arrow = (tone: string) => `url(#${uid}-tip-${tone})`;

  return (
    <svg
      ref={svgRef}
      className="diagram"
      viewBox={`0 0 ${w} ${h}`}
      style={zoom ? { width: w * zoom, maxWidth: 'none' } : { maxWidth: w * maxScale, minWidth: Math.min(w * 0.68, 560) }}
      role="img"
      aria-label={label}
    >
      <defs>
        {(['idle', 'focus', 'new', 'muted'] as const).map((tone) => (
          <marker
            key={tone}
            id={`${uid}-tip-${tone}`}
            viewBox="0 0 12 12"
            refX="10.5"
            refY="6"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.5 L 11 6 L 1 10.5 L 3.5 6 z" className={`tip tip-${tone}`} />
          </marker>
        ))}
      </defs>

      <g className="d-edges">
        {layout.edges.map((e) => {
          const tone = e.tone ?? 'idle';
          const eps = e.label.split(', ').every((s) => s === EPSILON);
          return (
            <path key={e.id} data-edge={e.id} d={e.d} className={`d-edge d-edge-${tone}${eps ? ' is-eps' : ''}`} markerEnd={arrow(tone)} />
          );
        })}
      </g>

      <g className="d-tags">
        {layout.edges.map((e) =>
          e.label ? (
            <g key={e.id} data-edge-tag={e.id} className={`d-tag d-tag-${e.tone ?? 'idle'}`}>
              <rect
                x={e.labelAt.x - pillWidth(e.label) / 2}
                y={e.labelAt.y - 9}
                width={pillWidth(e.label)}
                height={18}
                rx={5}
              />
              <text data-edge-label={e.id} x={e.labelAt.x} y={e.labelAt.y} dominantBaseline="central" textAnchor="middle">
                {e.label}
              </text>
            </g>
          ) : null,
        )}
      </g>

      <g className="d-nodes">
        {layout.nodes.map((n) => {
          const tone = n.tone ?? 'idle';
          const lead = tone === 'muted' ? 'muted' : 'idle';
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
              <g
                data-node={n.id}
                className={`d-node d-node-${tone}${n.group !== undefined ? ` d-group grp-${n.group % 6}` : ''}`}
              >
                {n.start && (
                  <path
                    data-start
                    d={direction === 'LR' ? `M ${-n.r - 34} 0 L ${-n.r - 3} 0` : `M 0 ${-n.r - 34} L 0 ${-n.r - 3}`}
                    className={`d-edge d-edge-${lead} d-start`}
                    markerEnd={arrow(lead)}
                  />
                )}
                {ACTIVE.has(tone) && <circle r={n.r + 6} className="d-halo" />}
                <circle r={n.r} className="d-body" />
                {n.accepting && <circle r={n.r - 4.5} className="d-accept" data-accepting />}
                <text className="d-label" dominantBaseline="central" textAnchor="middle">
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
