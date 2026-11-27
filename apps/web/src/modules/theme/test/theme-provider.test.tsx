import { render } from '@testing-library/react';
import { THEME_STORAGE_KEY } from '../theme';
import { ThemeProvider } from '../theme-provider';

const html = document.documentElement;

function renderProvider() {
  return render(
    <ThemeProvider>
      <div />
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  it('follows a light OS setting by default', () => {
    renderProvider();

    expect(html).not.toHaveClass('dark');
    expect(html.style.colorScheme).toBe('light');
  });

  it('follows a dark OS setting by default', () => {
    globalThis.prefersDarkScheme = true;
    renderProvider();

    expect(html).toHaveClass('dark');
    expect(html.style.colorScheme).toBe('dark');
  });

  it('uses the saved theme over the OS setting', () => {
    globalThis.prefersDarkScheme = true;
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderProvider();

    expect(html).not.toHaveClass('dark');
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    globalThis.prefersDarkScheme = true;
    renderProvider();

    expect(html).toHaveClass('dark');
  });
});
