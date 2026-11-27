import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../theme-provider';
import { THEME_STORAGE_KEY } from '../theme';
import { ThemeSwitch } from '../theme-switch';

const html = document.documentElement;

function renderSwitch() {
  render(
    <ThemeProvider>
      <ThemeSwitch />
    </ThemeProvider>,
  );
  return userEvent.setup();
}

describe('ThemeSwitch', () => {
  it('follows the OS until it is clicked', () => {
    globalThis.prefersDarkScheme = true;
    renderSwitch();

    expect(html).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('flips between light and dark on each click and saves it', async () => {
    const user = renderSwitch();
    expect(html).not.toHaveClass('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );
    expect(html).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    );
    expect(html).not.toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('does not open a menu', async () => {
    const user = renderSwitch();

    await user.click(screen.getByRole('button', { name: /Switch to/ }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
