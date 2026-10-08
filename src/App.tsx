import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { FlowArrow, House, List, ListChecks, Stack, TreeView, X } from '@phosphor-icons/react';
import HomePage from './pages/HomePage';
import BottomUpParsingPage from './pages/BottomUpParsingPage';
import RegexToDfaPage from './pages/RegexToDfaPage';
import ComingSoon from './components/ComingSoon';
import { TOPICS, parseHash, topicById, topicHref, type Route, type TopicId } from './app/routes';

const ICONS: Record<TopicId, React.ReactNode> = {
  home: <House size={18} aria-hidden />,
  'regex-dfa': <FlowArrow size={18} aria-hidden />,
  'bottom-up': <Stack size={18} aria-hidden />,
  'first-follow': <ListChecks size={18} aria-hidden />,
  'top-down': <TreeView size={18} aria-hidden />,
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  // Remount the page when the hash changes from outside (links, back/forward), so a page that
  // reads its query (e.g. ?re=) starts from it. Pages that rewrite their own query use
  // history.replaceState, which does not fire hashchange.
  const [navKey, setNavKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      setNavKey((k) => k + 1);
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Title per page, and move focus to the new page's heading so screen-reader and keyboard
  // users land at the start of the content after navigating.
  useEffect(() => {
    const label = topicById(route.page).label;
    document.title = route.page === 'home' ? 'Compiler Visualizer' : `${label} · Compiler Visualizer`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  }, [route.page, navKey]);

  // Smooth wheel scrolling for the page. Skipped when the user prefers reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12 });
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        Skip to content
      </a>
      <header className="shell-nav">
        <div className="shell-bar">
          <a className="brand" href={topicHref('home')}>
            <BrandMark />
            <span className="brand-name">Compiler Visualizer</span>
          </a>
          <button
            type="button"
            className="menu-toggle icon-button"
            aria-expanded={menuOpen}
            aria-controls="topic-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={18} aria-hidden /> : <List size={18} aria-hidden />}
          </button>
        </div>
        <nav id="topic-nav" className={`topic-nav${menuOpen ? ' open' : ''}`} aria-label="Modules">
          {(['available', 'planned'] as const).map((status) => (
            <div key={status} className="nav-group">
              <p className="nav-group-label" id={`nav-${status}`}>
                {status === 'available' ? 'Available' : 'Planned'}
              </p>
              <ul aria-labelledby={`nav-${status}`}>
                {TOPICS.filter((t) => t.status === status).map((t) => {
                  const active = route.page === t.id;
                  return (
                    <li key={t.id}>
                      <a href={topicHref(t.id)} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                        {ICONS[t.id]}
                        <span className="nav-label">{t.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="nav-foot">Runs entirely in your browser.</p>
        </nav>
      </header>
      <main id="main" className="content" tabIndex={-1}>
        {renderPage(route, navKey)}
      </main>
    </div>
  );
}

function renderPage({ page, params }: Route, navKey: number) {
  switch (page) {
    case 'home':
      return <HomePage />;
    case 'regex-dfa':
      return <RegexToDfaPage key={navKey} params={params} />;
    case 'bottom-up':
      return <BottomUpParsingPage />;
    default:
      return <ComingSoon topic={topicById(page)} />;
  }
}

/** Two concentric states: the accepting-state convention, used as the product mark. */
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden className="brand-mark">
      <circle cx="16" cy="16" r="13" className="brand-outer" />
      <circle cx="16" cy="16" r="8" className="brand-inner" />
    </svg>
  );
}
