import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@/modules/theme/theme-provider';
import { UserMenu } from '../user-menu';

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock('@/modules/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: {
          name: 'Maya Thompson',
          email: 'maya.thompson@example.com',
          role: 'admin',
          image: null,
        },
      },
      isPending: false,
    }),
    signOut: auth.signOut,
  },
}));

beforeEach(() => {
  auth.signOut.mockReset().mockResolvedValue({ data: { success: true } });
});

function renderMenu() {
  const queryClient = new QueryClient();
  const clear = vi.spyOn(queryClient, 'clear');
  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<UserMenu />} />
            <Route path="/settings" element={<p>Settings page</p>} />
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { user: userEvent.setup(), clear };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open user menu' }));
  return screen.findByRole('menu');
}

describe('UserMenu', () => {
  it("shows the user's initials on the avatar", () => {
    renderMenu();

    expect(
      screen.getByRole('button', { name: 'Open user menu' }),
    ).toHaveTextContent('MT');
  });

  it('shows who is signed in as a static header, not a menu item', async () => {
    const { user } = renderMenu();
    await openMenu(user);

    expect(screen.getByText('Maya Thompson')).toBeInTheDocument();
    expect(screen.getByText('maya.thompson@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Maya Thompson/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Settings', 'Theme', 'Sign out']);
  });

  it('goes to the settings page', async () => {
    const { user } = renderMenu();
    await openMenu(user);

    await user.click(screen.getByRole('menuitem', { name: 'Settings' }));

    expect(await screen.findByText('Settings page')).toBeInTheDocument();
  });

  it('switches the theme from the Theme submenu', async () => {
    const { user } = renderMenu();
    await openMenu(user);

    screen.getByRole('menuitem', { name: 'Theme' }).focus();
    await user.keyboard('{ArrowRight}');
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Dark' }),
    );

    expect(document.documentElement).toHaveClass('dark');
  });

  it('signs out, clears cached data, and goes to the login page', async () => {
    const { user, clear } = renderMenu();
    await openMenu(user);

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });
});
