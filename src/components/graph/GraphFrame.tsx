import { useRef, useState, type ReactNode } from 'react';
import { ArrowsIn, ListBullets, MagnifyingGlassMinus, MagnifyingGlassPlus, ShareNetwork } from '@phosphor-icons/react';
import AutomatonGraph from './AutomatonGraph';
import { describeGraph, nextZoom } from './describe';
import type { GraphEdge, GraphNode } from './layout';

interface GraphFrameProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  direction?: 'LR' | 'TB' | 'tree';
  /** Accessible description of what the graph shows. */
  label: string;
  maxScale?: number;
  /** Short caption shown in the toolbar, e.g. "Thompson NFA · step 4". */
  caption?: ReactNode;
  /** Legend shown under the drawing. */
  legend?: ReactNode;
  compact?: boolean;
  /** Changing this key returns the view to "fit" (e.g. a new regex). */
  resetKey?: unknown;
}

/**
 * The graph canvas: drawing plus a toolbar for zoom, fit-to-view and a text view of the same
 * nodes and edges. Zooming makes the drawing larger than the frame; the frame then scrolls
 * (touch and trackpad) and can be dragged with the mouse.
 */
export default function GraphFrame({
  nodes,
  edges,
  direction = 'LR',
  label,
  maxScale,
  caption,
  legend,
  compact = false,
  resetKey,
}: GraphFrameProps) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setZoom(null);
  }
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  /** Current on-screen scale, measured when the graph is fitted to the frame. */
  const currentScale = () => {
    if (zoom) return zoom;
    const svg = scrollRef.current?.querySelector('svg');
    const vb = svg?.viewBox.baseVal;
    return svg && vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
  };
  const zoomBy = (dir: 1 | -1) => setZoom(nextZoom(currentScale(), dir));

  const rows = view === 'list' ? describeGraph(nodes, edges) : [];
  const isTree = direction === 'tree';

  return (
    <div className={`graph-frame${compact ? ' compact' : ''}`}>
      <div className="graph-toolbar">
        <div className="graph-caption">{caption}</div>
        <div className="graph-tools" role="group" aria-label="Graph view">
          <div className="segmented" role="group" aria-label="Show as">
            <button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')} title="Diagram">
              <ShareNetwork size={15} aria-hidden />
              <span className="tool-label">Diagram</span>
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} title="Text list">
              <ListBullets size={15} aria-hidden />
              <span className="tool-label">List</span>
            </button>
          </div>
          {view === 'graph' && (
            <div className="zoom-tools">
              <button type="button" className="tool" onClick={() => zoomBy(-1)} aria-label="Zoom out" title="Zoom out">
                <MagnifyingGlassMinus size={15} aria-hidden />
              </button>
              <span className="zoom-readout mono" aria-live="polite">
                {zoom ? `${Math.round(zoom * 100)}%` : 'Fit'}
              </span>
              <button type="button" className="tool" onClick={() => zoomBy(1)} aria-label="Zoom in" title="Zoom in">
                <MagnifyingGlassPlus size={15} aria-hidden />
              </button>
              <button
                type="button"
                className="tool"
                onClick={() => setZoom(null)}
                disabled={zoom === null}
                aria-label="Fit to view"
                title="Fit to view"
              >
                <ArrowsIn size={15} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      {view === 'graph' ? (
        <div
          ref={scrollRef}
          className={`graph-scroll${zoom ? ' zoomed' : ''}`}
          data-lenis-prevent
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
            if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
            drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
            el.setPointerCapture(e.pointerId);
            el.classList.add('dragging');
          }}
          onPointerMove={(e) => {
            const el = scrollRef.current;
            if (!el || !drag.current) return;
            el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
            el.scrollTop = drag.current.top - (e.clientY - drag.current.y);
          }}
          onPointerUp={() => {
            drag.current = null;
            scrollRef.current?.classList.remove('dragging');
          }}
          onPointerCancel={() => {
            drag.current = null;
            scrollRef.current?.classList.remove('dragging');
          }}
        >
          <AutomatonGraph nodes={nodes} edges={edges} direction={direction} label={label} maxScale={maxScale} zoom={zoom} />
        </div>
      ) : (
        <div className="graph-list" data-lenis-prevent>
          <table className="data-table">
            <caption className="sr-only">{label}, as a list</caption>
            <thead>
              <tr>
                <th scope="col">{isTree ? 'Node' : 'State'}</th>
                {!isTree && <th scope="col">Role</th>}
                <th scope="col">{isTree ? 'Children' : 'Transitions'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="mono">
                    {r.label || '·'}
                  </th>
                  {!isTree && (
                    <td className="role-cell">
                      {[r.start && 'start', r.accepting && 'accepting'].filter(Boolean).join(', ') || <span className="muted">-</span>}
                    </td>
                  )}
                  <td className="mono">
                    {r.out.length === 0 ? (
                      <span className="muted">{isTree ? 'leaf' : 'none'}</span>
                    ) : (
                      r.out.map((o, i) => (
                        <span key={i} className="transition-chip">
                          {isTree ? o.to : `${o.label} → ${o.to}`}
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {legend && <div className="graph-legend-row">{legend}</div>}
    </div>
  );
}

/** Legend entries shared by the stages. Shapes, not only colours, carry the meaning. */
export function LegendItem({ kind, children }: { kind: 'start' | 'accept' | 'new' | 'focus' | 'eps' | 'set' | 'muted'; children: ReactNode }) {
  return (
    <span className="legend-item">
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden className={`legend-glyph legend-${kind}`}>
        {kind === 'start' && <path d="M1 7 H16 M12 3 L16 7 L12 11" />}
        {kind === 'accept' && (
          <>
            <circle cx="11" cy="7" r="6" />
            <circle cx="11" cy="7" r="3.5" />
          </>
        )}
        {(kind === 'new' || kind === 'focus' || kind === 'set' || kind === 'muted') && <circle cx="11" cy="7" r="5.5" />}
        {kind === 'eps' && <path d="M1 7 H21" />}
      </svg>
      {children}
    </span>
  );
}
