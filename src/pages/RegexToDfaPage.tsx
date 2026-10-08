import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Info, WarningCircle } from '@phosphor-icons/react';
import { RegexSyntaxError, regexPipeline, type Pipeline } from '../algorithms/regex';
import ThompsonStage from './regex/ThompsonStage';
import SubsetStage from './regex/SubsetStage';
import MinimizeStage from './regex/MinimizeStage';
import SimulateStage from './regex/SimulateStage';
import TreeStage from './regex/TreeStage';
import { useReveal } from './regex/shared';
import { DEFAULT_REGEX, EXAMPLES, STAGES, isStage, type Stage } from './regex/examples';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

function tryPipeline(src: string) {
  try {
    return { pipeline: regexPipeline(src), error: null };
  } catch (e) {
    if (e instanceof RegexSyntaxError) return { pipeline: null, error: e };
    throw e;
  }
}

export default function RegexToDfaPage({ params }: { params?: URLSearchParams }) {
  const inputId = useId();
  const initial = useMemo(() => {
    const re = params?.get('re');
    const stage = params?.get('stage') ?? null;
    return { re: re ?? DEFAULT_REGEX, stage: isStage(stage) ? stage : 'nfa' };
  }, [params]);
  const [source, setSource] = useState(initial.re);
  const [stage, setStage] = useState<Stage>(initial.stage);
  const deferred = useDeferredValue(source);

  // Keep showing the last valid result while the user is mid-edit on an invalid one.
  const [lastGood, setLastGood] = useState<{ src: string; p: Pipeline }>(() => {
    const first = tryPipeline(initial.re);
    return first.pipeline ? { src: initial.re, p: first.pipeline } : { src: DEFAULT_REGEX, p: regexPipeline(DEFAULT_REGEX) };
  });
  const parsed = useMemo(() => tryPipeline(deferred), [deferred]);
  if (parsed.pipeline && lastGood.src !== deferred) setLastGood({ src: deferred, p: parsed.pipeline });
  const pipeline = parsed.pipeline ?? lastGood.p;
  const shownSrc = parsed.pipeline ? deferred : lastGood.src;

  // Mirror the expression and stage into the URL so the view can be shared or bookmarked.
  // replaceState does not fire hashchange, so this never remounts the page.
  useEffect(() => {
    const url = `#/regex-dfa?${new URLSearchParams({ re: shownSrc, stage }).toString()}`;
    if (window.location.hash !== url) window.history.replaceState(window.history.state, '', url);
  }, [shownSrc, stage]);

  const counts: Record<Stage, string> = {
    tree: `${pipeline.postfix.split(' ').length} nodes`,
    nfa: `${pipeline.thompson.nfa.states.length} states`,
    dfa: `${pipeline.subset.dfa.states.length} states`,
    min: `${pipeline.minimize.dfa.states.length} states`,
    test: 'run',
  };

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = STAGES.length - 1;
    const to = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    e.stopPropagation();
    setStage(STAGES[to].id);
    tabRefs.current[to]?.focus();
  };

  const revealRef = useReveal<HTMLDivElement>(`${stage}|${shownSrc}`);
  const activeIndex = STAGES.findIndex((s) => s.id === stage);
  const error = parsed.error;

  return (
    <div className="page regex-page">
      <PageHeader
        eyebrow={<StatusBadge status="available" label="Module · Regex to DFA" />}
        title="Regex to DFA"
        lede="Type a regular expression and follow it through a syntax tree, a Thompson NFA, subset construction and minimization, then test strings on the result."
      />

      <section className="regex-bar" aria-label="Expression">
        <form className="regex-form" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={inputId} className="field-label">
            Regular expression
          </label>
          <div className={`regex-input${error ? ' has-error' : ''}`}>
            <span className="regex-input-slash mono" aria-hidden>
              /
            </span>
            <input
              id={inputId}
              className="mono"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={`${inputId}-help`}
            />
            <span className="regex-input-slash mono" aria-hidden>
              /
            </span>
            <button type="button" className="ghost epsilon-button" onClick={() => setSource((s) => s + 'ε')} title="Insert ε" aria-label="Insert ε (empty string)">
              ε
            </button>
          </div>
          {error ? (
            <div className="field-error" id={`${inputId}-help`} role="alert">
              <WarningCircle size={16} weight="fill" aria-hidden />
              <div>
                <p>
                  {error.message}
                  {!error.message.includes('character') && <span className="muted"> (at character {error.position + 1})</span>}
                </p>
                {deferred.length > 0 && <ErrorPointer src={deferred} position={error.position} />}
              </div>
            </div>
          ) : (
            <p className="field-help" id={`${inputId}-help`}>
              <span className="mono">|</span> union, <span className="mono">*</span> zero or more,{' '}
              <span className="mono">+</span> one or more, <span className="mono">?</span> optional,{' '}
              <span className="mono">ε</span> or <span className="mono">\e</span> empty string
            </p>
          )}
          <div className="examples">
            <span className="examples-label" id={`${inputId}-ex`}>
              Examples
            </span>
            <div className="chips" role="group" aria-labelledby={`${inputId}-ex`}>
              {EXAMPLES.map((ex) => (
                <button
                  type="button"
                  key={ex}
                  className={`chip mono${ex === source ? ' active' : ''}`}
                  aria-pressed={ex === source}
                  onClick={() => setSource(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </form>

        <dl className="regex-facts" aria-label={`Summary for ${shownSrc}`}>
          <div>
            <dt>Alphabet</dt>
            <dd className="mono">{pipeline.alphabet.length ? `{${pipeline.alphabet.join(', ')}}` : '∅'}</dd>
          </div>
          <div>
            <dt>Postfix</dt>
            <dd className="mono">{pipeline.postfix}</dd>
          </div>
          <div>
            <dt>States</dt>
            <dd className="mono">
              {pipeline.thompson.nfa.states.length} NFA → {pipeline.subset.dfa.states.length} DFA → {pipeline.minimize.dfa.states.length} min
            </dd>
          </div>
        </dl>
      </section>

      {error && (
        <p className="stale-note">
          <Info size={16} aria-hidden />
          <span>
            Showing the last valid expression, <span className="mono">{shownSrc}</span>, until this one is fixed.
          </span>
        </p>
      )}

      <div className="stage-tabs" role="tablist" aria-label="Pipeline stages">
        {STAGES.map((s, i) => {
          const selected = stage === s.id;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={selected}
              aria-controls="stage-panel"
              tabIndex={selected ? 0 : -1}
              className={`stage-tab${selected ? ' active' : ''}${i < activeIndex ? ' before' : ''}`}
              onClick={() => setStage(s.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <span className="stage-tab-index mono" aria-hidden>
                {i + 1}
              </span>
              <span className="stage-tab-text">
                <span className="stage-tab-label">{s.label}</span>
                <span className="stage-tab-count mono">{counts[s.id]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div ref={revealRef} key={`${stage}|${shownSrc}`} id="stage-panel" role="tabpanel" aria-labelledby={`tab-${stage}`}>
        {stage === 'tree' && <TreeStage pipeline={pipeline} />}
        {stage === 'nfa' && <ThompsonStage result={pipeline.thompson} postfix={pipeline.postfix} />}
        {stage === 'dfa' && <SubsetStage result={pipeline.subset} nfa={pipeline.thompson.nfa} />}
        {stage === 'min' && <MinimizeStage result={pipeline.minimize} dfa={pipeline.subset.dfa} />}
        {stage === 'test' && <SimulateStage dfa={pipeline.minimize.dfa} />}
      </div>
    </div>
  );
}

/** The expression with the character the parser stopped at underlined (or a caret at the end). */
function ErrorPointer({ src, position }: { src: string; position: number }) {
  // `position` is a string index, so slice the string rather than its code points.
  const at = Math.min(position, src.length);
  return (
    <p className="error-pointer mono" aria-hidden>
      {src.slice(0, at)}
      {at < src.length ? <mark>{src[at]}</mark> : <mark className="caret">▏</mark>}
      {src.slice(at + 1)}
    </p>
  );
}
