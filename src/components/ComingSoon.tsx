import { ArrowRight } from '@phosphor-icons/react';
import { TOPICS, topicHref, type Topic } from '../app/routes';
import PageHeader from './ui/PageHeader';
import StatusBadge from './ui/StatusBadge';

/** Page for a module that is planned but not built yet. It says so plainly and points elsewhere. */
export default function ComingSoon({ topic }: { topic: Topic }) {
  const available = TOPICS.filter((t) => t.status === 'available' && t.id !== 'home');
  return (
    <div className="page page-narrow">
      <PageHeader
        eyebrow={<StatusBadge status="planned" />}
        title={topic.label}
        lede={'summary' in topic ? topic.summary : undefined}
      />
      <section className="panel planned-panel" aria-labelledby="planned-title">
        <h2 id="planned-title" className="panel-title">
          This module has not been built yet
        </h2>
        <p className="muted">
          {'covers' in topic && topic.covers ? `It will cover ${topic.covers.join(' and ').toLowerCase()}. ` : ''}
          Nothing on this page is interactive until it ships. These modules work today:
        </p>
        <ul className="link-list">
          {available.map((t) => (
            <li key={t.id}>
              <a href={topicHref(t.id)}>
                <span>{t.label}</span>
                <ArrowRight size={14} weight="bold" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
