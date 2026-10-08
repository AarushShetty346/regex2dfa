import { useId } from 'react';
import { Menu } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import { ChevronDown, FileText } from 'lucide-react';
import type { Grammar } from '../../../algorithms/grammar/types';
import { SAMPLE_GRAMMARS } from '../../../algorithms/operator-precedence/samples';
import { Callout } from '../../../ui/primitives';

interface GrammarEditorProps {
  text: string;
  onChange: (text: string) => void;
  grammar: Grammar | null;
  /** Malformed-input errors, or operator-grammar violations. */
  errors: string[];
  errorTitle: string;
}

export default function GrammarEditor({ text, onChange, grammar, errors, errorTitle }: GrammarEditorProps) {
  const id = useId();
  const lines = Math.max(text.split('\n').length, 6);

  return (
    <div className="grammar">
      <div className="grammar-bar">
        <label htmlFor={`${id}-grammar`} className="field-label">
          Productions
        </label>
        <Menu.Root
          positioning={{ placement: 'bottom-end' }}
          onSelect={(d) => {
            const sample = SAMPLE_GRAMMARS.find((s) => s.id === d.value);
            if (sample) onChange(sample.text);
          }}
        >
          <Menu.Trigger className="btn btn-secondary btn-sm">
            <FileText size={15} aria-hidden />
            Load sample
            <ChevronDown size={15} aria-hidden />
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content className="menu">
                {SAMPLE_GRAMMARS.map((s) => (
                  <Menu.Item key={s.id} value={s.id} className="menu-item">
                    <span>{s.label}</span>
                    <code className="menu-item-code">{s.text.split('\n')[0]}</code>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </div>

      <div className="code-editor">
        <div className="code-gutter mono" aria-hidden>
          {Array.from({ length: lines }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <textarea
          id={`${id}-grammar`}
          className="code-area mono"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={lines}
          spellCheck={false}
          autoCapitalize="off"
          aria-label="Grammar"
          aria-invalid={errors.length > 0 ? true : undefined}
          aria-describedby={`${id}-hint`}
          data-lenis-prevent
        />
      </div>
      <p className="hint" id={`${id}-hint`}>
        One production per line, <code>-&gt;</code> or <code>→</code>, alternatives with <code>|</code>. Separate tokens with spaces (
        <code>E + T</code>, not <code>E+T</code>). Uppercase-initial tokens are non-terminals; the first left-hand side is the start symbol.
      </p>

      {errors.length > 0 ? (
        <Callout tone="danger" role="alert">
          <strong>{errorTitle}</strong>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Callout>
      ) : (
        grammar && (
          <div className="grammar-summary">
            <span className="grammar-ok">Valid operator grammar</span>
            <dl>
              <div>
                <dt>Start</dt>
                <dd>
                  <code>{grammar.start}</code>
                </dd>
              </div>
              <div>
                <dt>Non-terminals</dt>
                <dd>
                  <code>{grammar.nonTerminals.join(' ')}</code>
                </dd>
              </div>
              <div>
                <dt>Terminals</dt>
                <dd>
                  <code>{grammar.terminals.join(' ')}</code>
                </dd>
              </div>
            </dl>
          </div>
        )
      )}
    </div>
  );
}
