import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { FlowArrow, House, ListChecks, Stack, TreeView } from '@phosphor-icons/react';
import HomePage from './pages/HomePage';
import BottomUpParsingPage from './pages/BottomUpParsingPage';
import RegexToDfaPage from './pages/RegexToDfaPage';
import ComingSoon from './components/ComingSoon';

/**
 * Topics shown in the sidebar. `ready: false` topics render a "Coming soon" page.
 * To add a topic: add an entry here and a case in `renderPage` below.
 */
export const TOPICS = [
  { id: 'home', label: 'Home', ready: true },
  { id: 'regex-dfa', label: 'Regex to DFA', ready: true },
  { id: 'first-follow', label: 'First & Follow', ready: false },
  { id: 'top-down', label: 'Top-Down Parsing (LL)', ready: false },
  { id: 'bottom-up', label: 'Bottom-Up Parsing', ready: true },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];

const ICONS: Record<TopicId, React.ReactNode> = {
  home: <House size={18} />,
  'regex-dfa': <FlowArrow size={18} />,
  'first-follow': <ListChecks size={18} />,
  'top-down': <TreeView size={18} />,
  'bottom-up': <Stack size={18} />,
};

/**
 * Minimal hash-based navigation (#/bottom-up). We avoid a router dependency on purpose:
 * the app only has a handful of pages, and the hash keeps URLs shareable and
 * back-button friendly without any server configuration.
 */
function readHash(): TopicId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return (TOPICS.find((t) => t.id === id)?.id ?? 'home') as TopicId;
}

export default function App() {
  const [page, setPage] = useState<TopicId>(readHash);

  useEffect(() => {
    const onHash = () => {
      setPage(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Smooth wheel scrolling for the page. Skipped when the user prefers reduced motion.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12 });
    return () => lenis.destroy();
  }, []);

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Topics">
        <a className="brand" href="#/home">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
            <circle cx="16" cy="16" r="13" className="brand-outer" />
            <circle cx="16" cy="16" r="8.5" className="brand-inner" />
          </svg>
          <span>
            Compiler
            <br />
            Visualizer
          </span>
        </a>
        <ul>
          {TOPICS.map((t) => (
            <li key={t.id}>
              <a href={`#/${t.id}`} className={page === t.id ? 'active' : ''} aria-current={page === t.id ? 'page' : undefined}>
                {ICONS[t.id]}
                <span className="nav-label">{t.label}</span>
                {!t.ready && <span className="badge">soon</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="content">{renderPage(page)}</main>
    </div>
  );
}

function renderPage(page: TopicId) {
  switch (page) {
    case 'home':
      return <HomePage />;
    case 'regex-dfa':
      return <RegexToDfaPage />;
    case 'bottom-up':
      return <BottomUpParsingPage />;
    default:
      return <ComingSoon title={TOPICS.find((t) => t.id === page)!.label} />;
  }
}
