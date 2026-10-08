import { useRef, useState, type ReactNode } from 'react';
import { ToggleGroup } from '@ark-ui/react/toggle-group';
import { Maximize, Network, TableProperties, ZoomIn, ZoomOut } from 'lucide-react';
import StateDiagram from './StateDiagram';
import { describeGraph, nextZoom } from '../lib/graph/describe';
import type { GraphEdge, GraphNode } from '../lib/graph/layout';
import { IconButton, cx } from '../ui/primitives';

interface DiagramPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  direction?: 'LR' | 'TB' | 'tree';
  /** Accessible description of the drawing. */
  label: string;
  maxScale?: number;
  /** Title shown in the panel's toolbar. */
  title?: ReactNode;
  /** Secondary text next to the title, e.g. "after step 4". */
  meta?: ReactNode;
  /** Key shown under the drawing. */
  legend?: ReactNode;
  /** Shorter canvas, for reference drawings. */
  compact?: boolean;
}

/**
 * A diagram with its tools: a Diagram/Table switch (the table lists the same states and
 * transitions as text), zoom, and fit. When zoomed past the frame, the canvas scrolls and can
 * be dragged with the mouse.
 */
export default function DiagramPanel({ nodes, edges, direction = 'LR', label, maxScale, title, meta, legend, compact = false }: DiagramPanelProps) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [view, setView] = useState<'diagram' | 'table'>('diagram');
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  /** On-screen scale right now; measured from the drawing when it is fitted to the frame. */
  const currentScale = () => {
    if (zoom) return zoom;
    const svg = scrollRef.current?.querySelector('svg');
    const vb = svg?.viewBox.baseVal;
    return svg && vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
  };
  const zoomBy = (dir: 1 | -1) => setZoom(nextZoom(currentScale(), dir));
  const endDrag = () => {
    drag.current = null;
    scrollRef.current?.classList.remove('is-dragging');
  };

  const isTree = direction === 'tree';
  const rows = view === 'table' ? describeGraph(nodes, edges) : [];

  return (
    <div className={cx('diagram-panel', compact && 'is-compact')}>
      <div className="diagram-bar">
        <div className="diagram-title">
          {title && <span className="diagram-name">{title}</span>}
          {meta && <span className="diagram-meta">{meta}</span>}
        </div>
        <div className="diagram-tools">
          <ToggleGroup.Root
            className="seg"
            value={[view]}
            onValueChange={(d) => d.value[0] && setView(d.value[0] as 'diagram' | 'table')}
            aria-label="Show as"
          >
            <ToggleGroup.Item value="diagram" className="seg-item" aria-label="Diagram">
              <Network size={15} aria-hidden />
              <span className="seg-text">Diagram</span>
            </ToggleGroup.Item>
            <ToggleGroup.Item value="table" className="seg-item" aria-label="Table">
              <TableProperties size={15} aria-hidden />
              <span className="seg-text">Table</span>
            </ToggleGroup.Item>
          </ToggleGroup.Root>
          {view === 'diagram' && (
            <div className="zoom" role="group" aria-label="Zoom">
              <IconButton label="Zoom out" onClick={() => zoomBy(-1)}>
                <ZoomOut size={16} aria-hidden />
              </IconButton>
              <output className="zoom-value" aria-live="polite">
                {zoom ? `${Math.round(zoom * 100)}%` : 'Fit'}
              </output>
              <IconButton label="Zoom in" onClick={() => zoomBy(1)}>
                <ZoomIn size={16} aria-hidden />
              </IconButton>
              <IconButton label="Fit to view" onClick={() => setZoom(null)} disabled={zoom === null}>
                <Maximize size={15} aria-hidden />
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {view === 'diagram' ? (
        <div
          ref={scrollRef}
          className={cx('diagram-canvas', zoom !== null && 'is-zoomed')}
          data-lenis-prevent
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
            if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
            drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
            el.setPointerCapture(e.pointerId);
            el.classList.add('is-dragging');
          }}
          onPointerMove={(e) => {
            const el = scrollRef.current;
            if (!el || !drag.current) return;
            el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
            el.scrollTop = drag.current.top - (e.clientY - drag.current.y);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <StateDiagram nodes={nodes} edges={edges} direction={direction} label={label} maxScale={maxScale} zoom={zoom} />
        </div>
      ) : (
        <div className="diagram-table" data-lenis-prevent>
          <table className="table">
            <caption className="sr-only">{label}, as a table</caption>
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
                    <td>
                      {[r.start && 'start', r.accepting && 'accepting'].filter(Boolean).join(', ') || <span className="subtle">-</span>}
                    </td>
                  )}
                  <td className="mono">
                    {r.out.length === 0 ? (
                      <span className="subtle">{isTree ? 'leaf' : 'none'}</span>
                    ) : (
                      <span className="token-row">
                        {r.out.map((o, i) => (
                          <span key={i} className="token">
                            {isTree ? o.to : `${o.label} → ${o.to}`}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {legend && <div className="legend">{legend}</div>}
    </div>
  );
}

type LegendKind = 'start' | 'accept' | 'new' | 'focus' | 'eps' | 'set' | 'muted';

/** One legend entry: a small glyph drawn the same way as the diagram, plus text. */
export function Key({ kind, children }: { kind: LegendKind; children: ReactNode }) {
  return (
    <span className="key">
      <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden className={`key-glyph key-${kind}`}>
        {kind === 'start' && <path d="M2 8 H18 M14 4 L18 8 L14 12" />}
        {kind === 'accept' && (
          <>
            <circle cx="12" cy="8" r="6.5" />
            <circle cx="12" cy="8" r="3.5" />
          </>
        )}
        {(kind === 'new' || kind === 'focus' || kind === 'set' || kind === 'muted') && <circle cx="12" cy="8" r="6" />}
        {kind === 'eps' && <path d="M2 8 H22" />}
      </svg>
      {children}
    </span>
  );
}
