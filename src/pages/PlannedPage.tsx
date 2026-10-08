import { ArrowRight, Hammer } from 'lucide-react';
import { TOPICS, topicHref, type Topic } from '../app/routes';
import { Badge, PageIntro } from '../ui/primitives';
import { TopicIcon } from '../ui/TopicIcon';

/** Page for a module that is planned but not built yet. It says so plainly and points elsewhere. */
export default function PlannedPage({ topic }: { topic: Topic }) {
  const available = TOPICS.filter((t) => t.status === 'available' && t.id !== 'home');
  return (
    <div className="page page-narrow">
      <PageIntro kicker={<Badge tone="muted">Planned</Badge>} title={topic.label}>
        {'summary' in topic ? topic.summary : undefined}
      </PageIntro>
      <section className="card planned-card" aria-labelledby="planned-title">
        <span className="planned-icon" aria-hidden>
          <Hammer size={20} />
        </span>
        <h2 id="planned-title" className="card-title">
          This module has not been built yet
        </h2>
        <p className="muted">
          {'covers' in topic && topic.covers ? `It will cover ${topic.covers.join(' and ').toLowerCase()}. ` : ''}
          Nothing on this page is interactive until it ships. These modules work today:
        </p>
        <ul className="link-cards">
          {available.map((t) => (
            <li key={t.id}>
              <a href={topicHref(t.id)} className="link-card">
                <TopicIcon id={t.id} />
                <span>{t.label}</span>
                <ArrowRight size={16} aria-hidden className="link-card-arrow" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
