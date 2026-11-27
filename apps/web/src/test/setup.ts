import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

/**
 * jsdom has no matchMedia. Default to a light OS preference; a test can set
 * `prefersDarkScheme = true` (before rendering) to simulate a dark OS.
 */
declare global {
  var prefersDarkScheme: boolean;
}
globalThis.prefersDarkScheme = false;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches:
        query === '(prefers-color-scheme: dark)' &&
        globalThis.prefersDarkScheme,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  globalThis.prefersDarkScheme = false;
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});
