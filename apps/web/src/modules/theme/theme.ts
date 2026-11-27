import { createContext, useContext } from 'react';

export const themes = ['light', 'dark', 'system'] as const;
export type Theme = (typeof themes)[number];

/**
 * localStorage key for the chosen theme. The inline script in index.html
 * reads the same key to apply the theme before React loads (no light flash),
 * so keep them in sync.
 */
export const THEME_STORAGE_KEY = 'helpdesk-theme';

export const darkSchemeQuery = '(prefers-color-scheme: dark)';

export function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Puts the `dark` class (used by the `dark:` variant) on <html>, or removes it. */
export function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  // Native controls and scrollbars follow the page theme.
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export type ThemeContextValue = {
  /** What the user picked. */
  theme: Theme;
  /** What is shown: `system` resolved against the OS setting. */
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
