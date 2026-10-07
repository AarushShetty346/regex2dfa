import { useState } from 'react';
import ComingSoon from '../components/ComingSoon';

type Method = 'operator-precedence' | 'lr';

const METHODS: { id: Method; label: string }[] = [
  { id: 'operator-precedence', label: 'Operator Precedence Parsing' },
  { id: 'lr', label: 'LR Parsing (coming soon)' },
];

export default function BottomUpParsingPage() {
  const [method, setMethod] = useState<Method>('operator-precedence');

  return (
    <div className="page">
      <header className="page-header">
        <h1>Bottom-Up Parsing</h1>
        <label className="method-select">
          Method:{' '}
          <select value={method} onChange={(e) => setMethod(e.target.value as Method)}>
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {method === 'operator-precedence' ? (
        <ComingSoon title="Operator Precedence Parsing" note="Under construction on this branch." />
      ) : (
        <ComingSoon
          title="LR Parsing"
          note="LR(0) / SLR / LALR / CLR parsing will be added in a later iteration."
        />
      )}
    </div>
  );
}
