import { useMemo } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { regexPipeline } from '../../algorithms/regex';
import { TOPICS, topicHref } from '../../app/routes';
import { EXAMPLES, STAGES, type Stage } from '../../lib/regexExamples';
import { Badge } from '../../ui/primitives';
import { Reveal, SplitHeading } from '../../ui/bits/motion';
import SpotlightCard from '../../ui/bits/SpotlightCard';
import { TopicIcon } from '../../ui/TopicIcon';
import LiveDemo, { DEMO_REGEX } from './LiveDemo';

export default function HomePage() {
  const demo = useMemo(() => regexPipeline(DEMO_REGEX), []);
  const counts: Record<Stage, string> = {
    tree: `${demo.postfix.split(' ').length} nodes`,
    nfa: `${demo.thompson.nfa.states.length} states`,
    dfa: `${demo.subset.dfa.states.length} states`,
    min: `${demo.minimize.dfa.states.length} states`,
    test: 'accept / reject',
  };
  const modules = TOPICS.filter((t) => t.id !== 'home');

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="hero-kicker-dot" aria-hidden />
            Interactive compiler-design lab
          </p>
          <SplitHeading className="hero-title" text="Compiler algorithms, traced one step at a time." />
          <Reveal as="p" className="hero-lede" delay={0.25} distance={12}>
            Type a regular expression or a grammar and follow every state, set and table the textbook algorithm builds. Everything runs in
            your browser.
          </Reveal>
          <Reveal className="hero-actions" delay={0.35} distance={12}>
            <a className="btn btn-primary btn-lg" href={topicHref('regex-dfa')}>
              Open Regex to DFA
              <ArrowRight size={18} aria-hidden />
            </a>
            <a className="btn btn-secondary btn-lg" href={topicHref('bottom-up')}>
              Bottom-up parsing
            </a>
          </Reveal>
        </div>
        <Reveal className="hero-demo" delay={0.15} distance={20}>
          <LiveDemo />
        </Reveal>
      </section>

      <section className="home-block" aria-labelledby="pipeline-title">
        <Reveal as="header" className="block-head">
          <p className="block-kicker">Regex to DFA</p>
          <h2 id="pipeline-title">Five stages, one tab each</h2>
          <p className="muted">
            Counts are for <code>{DEMO_REGEX}</code>. Each stage opens in the workspace with that expression.
          </p>
        </Reveal>
        <Reveal as="ol" className="pipeline" stagger={0.07}>
          {STAGES.map((s, i) => (
            <li key={s.id}>
              <a href={topicHref('regex-dfa', { re: DEMO_REGEX, stage: s.id })} className="pipeline-step">
                <span className="pipeline-n mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="pipeline-name">{s.label}</span>
                <span className="pipeline-does">{s.does}</span>
                <span className="pipeline-count mono">{counts[s.id]}</span>
              </a>
            </li>
          ))}
        </Reveal>
      </section>

      <section className="home-block" aria-labelledby="modules-title">
        <Reveal as="header" className="block-head">
          <p className="block-kicker">Modules</p>
          <h2 id="modules-title">What you can use today, and what is next</h2>
        </Reveal>
        <Reveal as="ul" className="module-grid" stagger={0.07}>
          {modules.map((t) => {
            const available = t.status === 'available';
            const body = (
              <>
                <span className="module-top">
                  <span className="module-icon">
                    <TopicIcon id={t.id} size={20} />
                  </span>
                  <Badge tone={available ? 'success' : 'muted'}>{available ? 'Available' : 'Planned'}</Badge>
                </span>
                <span className="module-name">{t.label}</span>
                <span className="module-summary">{t.summary}</span>
                <span className="module-tags">
                  {t.covers.map((c) => (
                    <span key={c} className="tag">
                      {c}
                    </span>
                  ))}
                </span>
                {'pending' in t && <span className="module-pending">{t.pending}</span>}
                {available && (
                  <span className="module-cta">
                    Open <ArrowUpRight size={16} aria-hidden />
                  </span>
                )}
              </>
            );
            return (
              <li key={t.id}>
                <SpotlightCard className={available ? 'module' : 'module is-planned'}>
                  {available ? (
                    <a className="module-link" href={topicHref(t.id)}>
                      {body}
                    </a>
                  ) : (
                    <div className="module-link">{body}</div>
                  )}
                </SpotlightCard>
              </li>
            );
          })}
        </Reveal>
      </section>

      <section className="home-block" aria-labelledby="examples-title">
        <Reveal as="header" className="block-head">
          <p className="block-kicker">Examples</p>
          <h2 id="examples-title">Start from an expression</h2>
          <p className="muted">Opens the workspace with the expression filled in.</p>
        </Reveal>
        <Reveal as="ul" className="example-list" stagger={0.05}>
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <a className="example-link mono" href={topicHref('regex-dfa', { re: ex, stage: 'nfa' })}>
                <span>{ex}</span>
                <ArrowRight size={16} aria-hidden />
              </a>
            </li>
          ))}
        </Reveal>
      </section>
    </div>
  );
}
