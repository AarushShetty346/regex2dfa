import { GitFork, House, Layers, ListTree, Regex } from 'lucide-react';
import type { TopicId } from '../app/routes';

const ICONS = { home: House, 'regex-dfa': Regex, 'bottom-up': Layers, 'first-follow': ListTree, 'top-down': GitFork } as const;

export function TopicIcon({ id, size = 18 }: { id: TopicId; size?: number }) {
  const Icon = ICONS[id];
  return <Icon size={size} aria-hidden strokeWidth={1.75} />;
}
