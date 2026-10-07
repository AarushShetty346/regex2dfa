import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import BottomUpParsingPage from './pages/BottomUpParsingPage';
import ComingSoon from './components/ComingSoon';

/**
 * Topics shown in the sidebar. `ready: false` topics render a "Coming soon" page.
 * To add a topic: add an entry here and a case in `renderPage` below.
 */
export const TOPICS = [
  { id: 'home', label: 'Home', ready: true },
  { id: 'first-follow', label: 'First & Follow', ready: false },
  { id: 'top-down', label: 'Top-Down Parsing (LL)', ready: false },
  { id: 'bottom-up', label: 'Bottom-Up Parsing', ready: true },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];

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
    const onHash = () => setPage(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Topics">
        <div className="brand">Compiler Visualizer</div>
        <ul>
          {TOPICS.map((t) => (
            <li key={t.id}>
              <a href={`#/${t.id}`} className={page === t.id ? 'active' : ''}>
                {t.label}
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
    case 'bottom-up':
      return <BottomUpParsingPage />;
    default:
      return <ComingSoon title={TOPICS.find((t) => t.id === page)!.label} />;
  }
}
