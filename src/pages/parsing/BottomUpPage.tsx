import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { Badge, PageIntro } from '../../ui/primitives';
import OperatorPrecedence from './operator-precedence/OperatorPrecedence';

type Method = 'operator-precedence' | 'lr';

const METHODS: { id: Method; label: string; ready: boolean }[] = [
  { id: 'operator-precedence', label: 'Operator precedence', ready: true },
  { id: 'lr', label: 'LR parsing', ready: false },
];

export default function BottomUpPage() {
  const [method, setMethod] = useState<Method>('operator-precedence');

  return (
    <div className="page">
      <PageIntro kicker="Module 02 · Syntax analysis" title="Bottom-up parsing">
        Enter an operator grammar, build its Leading and Trailing sets and precedence table, then watch a shift-reduce parse of a string.
      </PageIntro>

      <Tabs.Root value={method} onValueChange={(d) => setMethod(d.value as Method)} lazyMount unmountOnExit>
        <Tabs.List className="pill-tabs" aria-label="Parsing method">
          {METHODS.map((m) => (
            <Tabs.Trigger key={m.id} value={m.id} className="pill-tab">
              {m.label}
              {!m.ready && <Badge tone="muted">Planned</Badge>}
            </Tabs.Trigger>
          ))}
          <Tabs.Indicator className="pill-indicator" />
        </Tabs.List>
        <Tabs.Content value="operator-precedence">
          <OperatorPrecedence />
        </Tabs.Content>
        <Tabs.Content value="lr">
          <section className="card planned-card">
            <h2 className="card-title">LR parsing is planned</h2>
            <p className="muted">LR(0) / SLR / LALR / CLR parsing will be added in a later iteration. Nothing here is interactive yet.</p>
          </section>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
