import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  applyTheme,
  darkSchemeQuery,
  readStoredTheme,
  type Theme,
  type ThemeContextValue,
} from '@/lib/theme';

function subscribeToSystemScheme(onChange: () => void) {
  const media = window.matchMedia(darkSchemeQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function systemPrefersDark() {
  return window.matchMedia(darkSchemeQuery).matches;
}

/**
 * Light / dark / system theme. The choice is saved in localStorage; `system`
 * follows the OS setting, including live changes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const prefersDark = useSyncExternalStore(
    subscribeToSystemScheme,
    systemPrefersDark,
  );
  const resolvedTheme =
    theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    applyTheme(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next) => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Storage can be unavailable (private mode); the choice still
          // applies for this visit.
        }
        setThemeState(next);
      },
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
