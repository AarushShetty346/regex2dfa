import { useRef, useState, type KeyboardEvent } from 'react';
import OperatorPrecedenceView from '../features/operator-precedence/OperatorPrecedenceView';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

type Method = 'operator-precedence' | 'lr';

const METHODS: { id: Method; label: string; ready: boolean }[] = [
  { id: 'operator-precedence', label: 'Operator precedence', ready: true },
  { id: 'lr', label: 'LR parsing', ready: false },
];

export default function BottomUpParsingPage() {
  const [method, setMethod] = useState<Method>('operator-precedence');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();
    const to = (i + (e.key === 'ArrowRight' ? 1 : -1) + METHODS.length) % METHODS.length;
    setMethod(METHODS[to].id);
    refs.current[to]?.focus();
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={<StatusBadge status="available" label="Module · Bottom-up parsing" />}
        title="Bottom-up parsing"
        lede="Enter an operator grammar, build its Leading and Trailing sets and precedence table, then watch a shift-reduce parse of a string."
      />

      <div className="method-tabs" role="tablist" aria-label="Parsing method">
        {METHODS.map((m, i) => (
          <button
            key={m.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`method-${m.id}`}
            aria-selected={method === m.id}
            aria-controls="method-panel"
            tabIndex={method === m.id ? 0 : -1}
            className={`method-tab${method === m.id ? ' active' : ''}`}
            onClick={() => setMethod(m.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {m.label}
            {!m.ready && <StatusBadge status="planned" />}
          </button>
        ))}
      </div>

      <div id="method-panel" role="tabpanel" aria-labelledby={`method-${method}`}>
        {method === 'operator-precedence' ? (
          <OperatorPrecedenceView />
        ) : (
          <section className="panel planned-panel">
            <h2 className="panel-title">LR parsing is planned</h2>
            <p className="muted">LR(0) / SLR / LALR / CLR parsing will be added in a later iteration. Nothing here is interactive yet.</p>
          </section>
        )}
      </div>
    </div>
  );
}
