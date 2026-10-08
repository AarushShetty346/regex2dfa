import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'regex2dfa-theme';

/** The theme index.html applied before first paint (saved choice, else the system setting). */
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Light/dark switch. The choice is remembered per browser when storage is available. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f6f8fb' : '#0b1222');
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    setThemeState(next);
  }, []);
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
