import { useDeferredValue, useId, useMemo, useState } from 'react';
import { Graph, Path, Shuffle, TreeStructure, Play, WarningCircle } from '@phosphor-icons/react';
import { RegexSyntaxError, regexPipeline, type Pipeline } from '../algorithms/regex';
import ThompsonStage from './regex/ThompsonStage';
import SubsetStage from './regex/SubsetStage';
import MinimizeStage from './regex/MinimizeStage';
import SimulateStage from './regex/SimulateStage';
import TreeStage from './regex/TreeStage';
import { useReveal } from './regex/shared';

type Stage = 'tree' | 'nfa' | 'dfa' | 'min' | 'test';

const EXAMPLES = ['(a|b)*abb', 'a(b|c)*d+', '(0|1(01*0)*1)*', '(ab|ba)?c*', '(a|ε)b+a?'];

const DEFAULT_REGEX = '(a|b)*abb';

export default function RegexToDfaPage() {
  const inputId = useId();
  const [source, setSource] = useState(DEFAULT_REGEX);
  const [stage, setStage] = useState<Stage>('nfa');
  const deferred = useDeferredValue(source);

  // Keep showing the last valid result while the user is mid-edit on an invalid one.
  const [lastGood, setLastGood] = useState<{ src: string; p: Pipeline }>(() => ({
    src: DEFAULT_REGEX,
    p: regexPipeline(DEFAULT_REGEX),
  }));
  const parsed = useMemo(() => {
    try {
      return { pipeline: regexPipeline(deferred), error: null };
    } catch (e) {
      if (e instanceof RegexSyntaxError) return { pipeline: null, error: e };
      throw e;
    }
  }, [deferred]);
  if (parsed.pipeline && lastGood.src !== deferred) setLastGood({ src: deferred, p: parsed.pipeline });
  const pipeline = parsed.pipeline ?? lastGood.p;
  const shownSrc = parsed.pipeline ? deferred : lastGood.src;

  const stages: { id: Stage; label: string; count: string; icon: React.ReactNode }[] = [
    { id: 'tree', label: 'Syntax tree', count: `${pipeline.postfix.split(' ').length} nodes`, icon: <TreeStructure size={18} /> },
    { id: 'nfa', label: 'Thompson NFA', count: `${pipeline.thompson.nfa.states.length} states`, icon: <Shuffle size={18} /> },
    { id: 'dfa', label: 'Subset construction', count: `${pipeline.subset.dfa.states.length} states`, icon: <Graph size={18} /> },
    { id: 'min', label: 'Minimize', count: `${pipeline.minimize.dfa.states.length} states`, icon: <Path size={18} /> },
    { id: 'test', label: 'Test strings', count: 'run', icon: <Play size={18} /> },
  ];

  const revealRef = useReveal<HTMLDivElement>(`${stage}|${shownSrc}`);

  return (
    <div className="page regex-page">
      <header className="regex-header">
        <div className="regex-intro">
          <h1>Regex to DFA</h1>
          <p className="lede">
            Type a regular expression and watch it become a Thompson NFA, then a DFA, then the smallest DFA for the
            same language.
          </p>
        </div>

        <form className="regex-form" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={inputId}>Regular expression</label>
          <div className={`regex-input${parsed.error ? ' has-error' : ''}`}>
            <input
              id={inputId}
              className="mono"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={parsed.error ? true : undefined}
              aria-describedby={`${inputId}-help`}
            />
            <button type="button" className="ghost" onClick={() => setSource((s) => s + 'ε')} title="Insert ε">
              ε
            </button>
          </div>
          {parsed.error ? (
            <p className="field-error" id={`${inputId}-help`} role="alert">
              <WarningCircle size={16} weight="fill" />
              <span>
                {parsed.error.message}
                {!parsed.error.message.includes('character') && (
                  <span className="muted"> (at character {parsed.error.position + 1})</span>
                )}
              </span>
            </p>
          ) : (
            <p className="field-help" id={`${inputId}-help`}>
              <span className="mono">|</span> union, <span className="mono">*</span> zero or more,{' '}
              <span className="mono">+</span> one or more, <span className="mono">?</span> optional,{' '}
              <span className="mono">ε</span> or <span className="mono">\e</span> empty string
            </p>
          )}
          <div className="chips" aria-label="Examples">
            {EXAMPLES.map((ex) => (
              <button
                type="button"
                key={ex}
                className={`chip mono${ex === source ? ' active' : ''}`}
                onClick={() => setSource(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      </header>

      <nav className="pipeline" aria-label="Pipeline stages">
        {stages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`pipeline-step${stage === s.id ? ' active' : ''}`}
            aria-pressed={stage === s.id}
            onClick={() => setStage(s.id)}
          >
            <span className="pipeline-icon">{s.icon}</span>
            <span className="pipeline-text">
              <span className="pipeline-label">{s.label}</span>
              <span className="pipeline-count mono">{s.count}</span>
            </span>
            {i < stages.length - 1 && <span className="pipeline-join" aria-hidden />}
          </button>
        ))}
      </nav>

      <div ref={revealRef} key={`${stage}|${shownSrc}`}>
        {stage === 'tree' && <TreeStage pipeline={pipeline} />}
        {stage === 'nfa' && <ThompsonStage result={pipeline.thompson} postfix={pipeline.postfix} />}
        {stage === 'dfa' && <SubsetStage result={pipeline.subset} nfa={pipeline.thompson.nfa} />}
        {stage === 'min' && <MinimizeStage result={pipeline.minimize} dfa={pipeline.subset.dfa} />}
        {stage === 'test' && <SimulateStage dfa={pipeline.minimize.dfa} />}
      </div>
    </div>
  );
}
