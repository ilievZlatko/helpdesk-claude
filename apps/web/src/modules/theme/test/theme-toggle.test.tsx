import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../theme-provider';
import { THEME_STORAGE_KEY } from '../theme';
import { ThemeToggle } from '../theme-toggle';

const html = document.documentElement;

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
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
});
