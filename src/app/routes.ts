/**
 * Topics and hash routing. URLs look like `#/regex-dfa` or `#/regex-dfa?re=a*&stage=min`.
 *
 * We avoid a router dependency on purpose: the app only has a handful of pages, and the hash
 * keeps URLs shareable and back-button friendly without any server configuration (the site is
 * served from GitHub Pages under /regex2dfa/).
 */

export type TopicStatus = 'available' | 'planned';

export const TOPICS = [
  { id: 'home', label: 'Home', status: 'available' },
  {
    id: 'regex-dfa',
    label: 'Regex to DFA',
    status: 'available',
    summary: 'Turn a regular expression into its smallest DFA, then run strings through it.',
    covers: ['Syntax tree', 'Thompson NFA', 'Subset construction', 'Minimization', 'String tester'],
  },
  {
    id: 'bottom-up',
    label: 'Bottom-up parsing',
    status: 'available',
    summary: 'Operator precedence parsing of a grammar you type, from Leading/Trailing sets to a parse trace.',
    covers: ['Leading & Trailing', 'Precedence table', 'Shift-reduce trace'],
    pending: 'LR parsing is planned',
  },
  {
    id: 'first-follow',
    label: 'First & Follow',
    status: 'planned',
    summary: 'Set computation for context-free grammars.',
    covers: ['First sets', 'Follow sets'],
  },
  {
    id: 'top-down',
    label: 'Top-down parsing (LL)',
    status: 'planned',
    summary: 'LL(1) tables and predictive parsing.',
    covers: ['LL(1) table', 'Predictive parse'],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  status: TopicStatus;
  summary?: string;
  covers?: readonly string[];
  pending?: string;
}[];

export type Topic = (typeof TOPICS)[number];
export type TopicId = Topic['id'];

export interface Route {
  page: TopicId;
  params: URLSearchParams;
}

/** Read a hash such as `#/regex-dfa?re=ab` into a page id and its query. Unknown pages go home. */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const q = raw.indexOf('?');
  const id = q === -1 ? raw : raw.slice(0, q);
  const params = new URLSearchParams(q === -1 ? '' : raw.slice(q + 1));
  const topic = TOPICS.find((t) => t.id === id);
  return { page: topic ? topic.id : 'home', params };
}

/** Build a hash link, e.g. `topicHref('regex-dfa', { re: 'a*' })` → `#/regex-dfa?re=a*`. */
export function topicHref(id: TopicId, params?: Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : '';
  return `#/${id}${query ? `?${query}` : ''}`;
}

export function topicById(id: TopicId): Topic {
  return TOPICS.find((t) => t.id === id)!;
}
