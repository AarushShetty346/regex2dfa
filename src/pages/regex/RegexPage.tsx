import { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { CircleAlert, History, Regex } from 'lucide-react';
import { RegexSyntaxError, regexPipeline, type Pipeline } from '../../algorithms/regex';
import { DEFAULT_REGEX, STAGES, isStage, type Stage } from '../../lib/regexExamples';
import { PageIntro, cx } from '../../ui/primitives';
import TreeStage from './stages/TreeStage';
import FollowposStage from './stages/FollowposStage';
import DfaStage from './stages/DfaStage';
import SimulateStage from './stages/SimulateStage';
import { useStageEntrance } from './workbench';

function tryPipeline(src: string) {
  try {
    return { pipeline: regexPipeline(src), error: null };
  } catch (e) {
    if (e instanceof RegexSyntaxError) return { pipeline: null, error: e };
    throw e;
  }
}

export default function RegexPage({ params }: { params?: URLSearchParams }) {
  const inputId = useId();
  const initial = useMemo(() => {
    const re = params?.get('re');
    const stage = params?.get('stage') ?? null;
    return { re: re ?? DEFAULT_REGEX, stage: isStage(stage) ? stage : 'tree' };
  }, [params]);
  const [source, setSource] = useState(initial.re);
  const [stage, setStage] = useState<Stage>(initial.stage);
  const deferred = useDeferredValue(source);

  // Keep showing the last valid result while the expression being typed is invalid.
  const [lastGood, setLastGood] = useState<{ src: string; p: Pipeline }>(() => {
    const first = tryPipeline(initial.re);
    return first.pipeline ? { src: initial.re, p: first.pipeline } : { src: DEFAULT_REGEX, p: regexPipeline(DEFAULT_REGEX) };
  });
  const parsed = useMemo(() => tryPipeline(deferred), [deferred]);
  if (parsed.pipeline && lastGood.src !== deferred) setLastGood({ src: deferred, p: parsed.pipeline });
  const pipeline = parsed.pipeline ?? lastGood.p;
  const shownSrc = parsed.pipeline ? deferred : lastGood.src;
  const error = parsed.error;

  // Mirror the expression and stage into the URL so the view can be shared or bookmarked.
  // replaceState does not fire hashchange, so the page is not remounted.
  useEffect(() => {
    const url = `#/regex-dfa?${new URLSearchParams({ re: shownSrc, stage }).toString()}`;
    if (window.location.hash !== url) window.history.replaceState(window.history.state, '', url);
  }, [shownSrc, stage]);

  const counts: Record<Stage, string> = {
    tree: `${pipeline.direct.positions.length} positions`,
    follow: `${pipeline.direct.followSteps.length} rules`,
    dfa: `${pipeline.direct.dfa.states.length} states`,
    test: 'run',
  };
  const stageRef = useStageEntrance<HTMLDivElement>(`${stage}|${shownSrc}`);

  return (
    <div className="page page-wide">
      <PageIntro kicker="Module 01 · Finite automata" title="Regex to DFA">
        Type a regular expression and build its DFA with the direct method: an augmented syntax tree, nullable, firstpos and lastpos,
        then followpos. Test strings on the result.
      </PageIntro>

      <section className="expr-card" aria-label="Expression">
        <form className="expr-form" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor={inputId} className="field-label">
            Regular expression
          </label>
          <div className={cx('expr-input', error && 'is-invalid')}>
            <Regex size={18} aria-hidden className="expr-icon" />
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
            <button
              type="button"
              className="expr-eps"
              onClick={() => setSource((s) => s + 'ε')}
              aria-label="Insert ε (empty string)"
              title="Insert ε"
            >
              ε
            </button>
          </div>
          {error ? (
            <div className="expr-error" id={`${inputId}-help`} role="alert">
              <CircleAlert size={16} aria-hidden />
              <div>
                <p>
                  {error.message}
                  {!error.message.includes('character') && <span className="subtle"> (at character {error.position + 1})</span>}
                </p>
                {deferred.length > 0 && <ErrorPointer src={deferred} position={error.position} />}
              </div>
            </div>
          ) : (
            <p className="expr-help" id={`${inputId}-help`}>
              <code>|</code> union <code>*</code> zero or more <code>+</code> one or more <code>?</code> optional <code>ε</code> or{' '}
              <code>\e</code> empty string
            </p>
          )}
        </form>

        <dl className="expr-stats" aria-label={`Summary for ${shownSrc}`}>
          <div className="stat">
            <dt>Alphabet</dt>
            <dd className="mono">{pipeline.alphabet.length ? `{${pipeline.alphabet.join(', ')}}` : '∅'}</dd>
          </div>
          <div className="stat">
            <dt>Postfix</dt>
            <dd className="mono">{pipeline.postfix}</dd>
          </div>
          <div className="stat stat-flow">
            <dt>DFA</dt>
            <dd className="mono">
              {pipeline.direct.positions.length} positions → {pipeline.direct.dfa.states.length} states
            </dd>
          </div>
        </dl>
      </section>

      {error && (
        <p className="stale-banner">
          <History size={16} aria-hidden />
          <span>
            Showing the last valid expression, <code>{shownSrc}</code>, until this one is fixed.
          </span>
        </p>
      )}

      <Tabs.Root
        className="stages"
        value={stage}
        onValueChange={(d) => isStage(d.value) && setStage(d.value)}
        lazyMount
        unmountOnExit
      >
        <Tabs.List className="stage-list" aria-label="Direct method stages">
          {STAGES.map((s, i) => (
            <Tabs.Trigger key={s.id} value={s.id} className="stage-tab">
              <span className="stage-n mono" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="stage-text">
                <span className="stage-name">{s.label}</span>
                <span className="stage-count mono">{counts[s.id]}</span>
              </span>
            </Tabs.Trigger>
          ))}
          <Tabs.Indicator className="stage-indicator" />
        </Tabs.List>
        {STAGES.map((s) => (
          <Tabs.Content key={s.id} value={s.id} className="stage-panel">
            {stage === s.id && (
              <div ref={stageRef} key={`${stage}|${shownSrc}`}>
                {s.id === 'tree' && <TreeStage direct={pipeline.direct} />}
                {s.id === 'follow' && <FollowposStage direct={pipeline.direct} />}
                {s.id === 'dfa' && <DfaStage direct={pipeline.direct} />}
                {s.id === 'test' && <SimulateStage dfa={pipeline.direct.dfa} />}
              </div>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

/** The expression with the character the parser stopped at marked (or a caret at the end). */
function ErrorPointer({ src, position }: { src: string; position: number }) {
  // `position` is a string index, so slice the string rather than its code points.
  const at = Math.min(position, src.length);
  return (
    <p className="error-pointer mono" aria-hidden>
      {src.slice(0, at)}
      {at < src.length ? <mark>{src[at]}</mark> : <mark className="is-caret">▏</mark>}
      {src.slice(at + 1)}
    </p>
  );
}
