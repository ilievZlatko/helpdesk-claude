import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { THEME_STORAGE_KEY } from '@/lib/theme';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

const html = document.documentElement;

describe('theme', () => {
  it('follows a light OS setting by default', () => {
    renderToggle();

    expect(html).not.toHaveClass('dark');
    expect(html.style.colorScheme).toBe('light');
  });

  it('follows a dark OS setting by default', () => {
    globalThis.prefersDarkScheme = true;
    renderToggle();

    expect(html).toHaveClass('dark');
    expect(html.style.colorScheme).toBe('dark');
  });

  it('uses the saved theme over the OS setting', () => {
    globalThis.prefersDarkScheme = true;
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderToggle();

    expect(html).not.toHaveClass('dark');
  });

  it('switches to dark from the menu and saves the choice', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Change theme' }));
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Dark' }),
    );

    expect(html).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('marks the current theme in the menu', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Change theme' }));

    expect(
      await screen.findByRole('menuitemradio', { name: 'Dark' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: 'System' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    globalThis.prefersDarkScheme = true;
    renderToggle();

    expect(html).toHaveClass('dark');
  });
});
