import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Menu as MenuIcon, X } from 'lucide-react';
import HomePage from './pages/home/HomePage';
import RegexPage from './pages/regex/RegexPage';
import BottomUpPage from './pages/parsing/BottomUpPage';
import PlannedPage from './pages/PlannedPage';
import { TOPICS, parseHash, topicById, topicHref, type Route } from './app/routes';
import { cx } from './ui/primitives';
import { TopicIcon } from './ui/TopicIcon';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  // Remount the page when the hash changes from outside (links, back/forward) so a page that
  // reads its query (?re=, ?stage=) starts from it. Pages that rewrite their own query use
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

  // A title per page, and focus on the new page's heading so keyboard and screen-reader users
  // start at the content after navigating.
  useEffect(() => {
    const label = topicById(route.page).label;
    document.title = route.page === 'home' ? 'Compiler Visualizer' : `${label} · Compiler Visualizer`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  }, [route.page, navKey]);

  // Smooth wheel scrolling, skipped for reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.14 });
    return () => lenis.destroy();
  }, []);

  const links = (onPick?: () => void) =>
    TOPICS.map((t) => {
      const active = route.page === t.id;
      return (
        <li key={t.id}>
          <a
            href={topicHref(t.id)}
            className={cx('nav-link', active && 'is-active', t.status === 'planned' && 'is-planned')}
            aria-current={active ? 'page' : undefined}
            onClick={onPick}
          >
            <TopicIcon id={t.id} size={16} />
            <span>{t.label}</span>
            {t.status === 'planned' && <span className="nav-soon">Soon</span>}
          </a>
        </li>
      );
    });

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={topicHref('home')} aria-label="Compiler Visualizer, home">
            <BrandMark />
            <span className="brand-text">
              <span className="brand-name">Compiler Visualizer</span>
              <span className="brand-sub">regex2dfa</span>
            </span>
          </a>

          <nav className="topnav" aria-label="Modules">
            <ul>{links()}</ul>
          </nav>

          <div className="topbar-actions">
            <Dialog.Root open={menuOpen} onOpenChange={(d) => setMenuOpen(d.open)}>
              <Dialog.Trigger className="icon-btn icon-btn-secondary menu-trigger" aria-label="Open menu">
                <MenuIcon size={18} aria-hidden />
              </Dialog.Trigger>
              <Portal>
                <Dialog.Backdrop className="drawer-backdrop" />
                <Dialog.Positioner className="drawer-positioner">
                  <Dialog.Content className="drawer">
                    <div className="drawer-head">
                      <Dialog.Title className="drawer-title">Modules</Dialog.Title>
                      <Dialog.CloseTrigger className="icon-btn icon-btn-ghost" aria-label="Close menu">
                        <X size={18} aria-hidden />
                      </Dialog.CloseTrigger>
                    </div>
                    <nav aria-label="Modules">
                      <ul className="drawer-links">{links(() => setMenuOpen(false))}</ul>
                    </nav>
                    <p className="drawer-foot">Everything runs in your browser.</p>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        {renderPage(route, navKey)}
      </main>

      <footer className="footer">
        <span>Compiler Visualizer · every algorithm runs locally in your browser.</span>
        <span className="footer-mono">regex → ε-NFA → DFA → min-DFA</span>
      </footer>
    </div>
  );
}

function renderPage({ page, params }: Route, navKey: number) {
  switch (page) {
    case 'home':
      return <HomePage />;
    case 'regex-dfa':
      return <RegexPage key={navKey} params={params} />;
    case 'bottom-up':
      return <BottomUpPage />;
    default:
      return <PlannedPage topic={topicById(page)} />;
  }
}

/** A start arrow into an accepting state: the smallest complete automaton, used as the mark. */
function BrandMark() {
  return (
    <svg viewBox="0 0 36 36" width="32" height="32" aria-hidden className="brand-mark">
      <rect x="0.5" y="0.5" width="35" height="35" rx="9" className="brand-tile" />
      <path d="M5 18 H12" className="brand-arrow" />
      <path d="M10 15 L13 18 L10 21" className="brand-arrow" />
      <circle cx="22" cy="18" r="8" className="brand-ring" />
      <circle cx="22" cy="18" r="4.5" className="brand-core" />
    </svg>
  );
}
