import { useId } from 'react';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import type { Grammar } from '../../algorithms/grammar/types';
import { SAMPLE_GRAMMARS } from '../../algorithms/operator-precedence/samples';

interface GrammarInputProps {
  text: string;
  onChange: (text: string) => void;
  grammar: Grammar | null;
  /** Malformed-input errors, or operator-grammar violations. */
  errors: string[];
  errorTitle: string;
}

export default function GrammarInput({ text, onChange, grammar, errors, errorTitle }: GrammarInputProps) {
  const id = useId();
  return (
    <div className="grammar-input">
      <div className="grammar-toolbar">
        <label className="inline-field">
          <span className="field-label">Load sample</span>
          <select
            value=""
            onChange={(e) => {
              const sample = SAMPLE_GRAMMARS.find((s) => s.id === e.target.value);
              if (sample) onChange(sample.text);
            }}
          >
            <option value="" disabled>
              Choose a grammar…
            </option>
            {SAMPLE_GRAMMARS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        id={`${id}-grammar`}
        className="grammar-textarea"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        spellCheck={false}
        aria-label="Grammar"
        aria-invalid={errors.length > 0 ? true : undefined}
        aria-describedby={`${id}-hint`}
      />
      <p className="hint muted" id={`${id}-hint`}>
        One production per line, <code>-&gt;</code> or <code>→</code>, alternatives with{' '}
        <code>|</code>. Separate tokens with spaces (<code>E + T</code>, not <code>E+T</code>).
        Uppercase-initial tokens are non-terminals; the first left-hand side is the start symbol.
      </p>

      {errors.length > 0 ? (
        <div className="banner banner-error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden className="banner-icon" />
          <strong>{errorTitle}</strong>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : (
        grammar && (
          <div className="banner banner-ok">
            <CheckCircle size={16} weight="fill" aria-hidden className="banner-icon" />
            <strong>Valid operator grammar.</strong> Start symbol <code>{grammar.start}</code> ·
            non-terminals <code>{grammar.nonTerminals.join(' ')}</code> · terminals{' '}
            <code>{grammar.terminals.join(' ')}</code>
          </div>
        )
      )}
    </div>
  );
}
