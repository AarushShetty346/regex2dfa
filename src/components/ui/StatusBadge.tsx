import type { TopicStatus } from '../../app/routes';

const TEXT: Record<TopicStatus, string> = { available: 'Available', planned: 'Planned' };

/** Small, text-labelled status marker (never colour alone). */
export default function StatusBadge({ status, label }: { status: TopicStatus; label?: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      <i aria-hidden className="status-dot" />
      {label ?? TEXT[status]}
    </span>
  );
}
