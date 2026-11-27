import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@/modules/theme/theme-provider';
import { AppLayout } from '../app-layout';

const auth = vi.hoisted(() => ({ role: 'agent', signOut: vi.fn() }));

vi.mock('@/modules/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: {
          name: 'Maya Thompson',
          email: 'maya.thompson@example.com',
          role: auth.role,
          image: null,
        },
      },
      isPending: false,
    }),
    signOut: auth.signOut,
  },
}));

beforeEach(() => {
  auth.role = 'agent';
  auth.signOut.mockReset().mockResolvedValue({ data: { success: true } });
});

function renderLayout(path = '/') {
  render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<p>Home page</p>} />
              <Route path="users" element={<p>Users page</p>} />
            </Route>
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return userEvent.setup();
}

function sidebarLinks() {
  const nav = screen.getByRole('navigation', { name: 'Main' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('AppLayout sidebar', () => {
  it('shows the app logo and name', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: 'Helpdesk' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('shows agents the items they may use (no Users)', () => {
    renderLayout();

    expect(sidebarLinks()).toEqual(['Home']);
  });

  it('shows admins the Users item, which opens the users page', async () => {
    auth.role = 'admin';
    const user = renderLayout();

    expect(sidebarLinks()).toEqual(['Home', 'Users']);

    await user.click(screen.getByRole('link', { name: 'Users' }));

    expect(await screen.findByText('Users page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('collapses and expands from the header toggle', async () => {
    const user = renderLayout();
    const sidebar = document.querySelector('[data-slot="sidebar"][data-state]');
    expect(sidebar).toHaveAttribute('data-state', 'expanded');

    // The header button (the sidebar's edge rail has the same label).
    const toggle = screen
      .getAllByRole('button', { name: 'Toggle Sidebar' })
      .find((button) => button.dataset.sidebar === 'trigger')!;

    await user.click(toggle);
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    await user.click(toggle);
    expect(sidebar).toHaveAttribute('data-state', 'expanded');
  });

  it('keeps the user menu in the header', () => {
    renderLayout();

    expect(
      screen.getByRole('button', { name: 'Open user menu' }),
    ).toHaveTextContent('MT');
  });

  it('signs out from the bottom of the sidebar', async () => {
    const user = renderLayout();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});

describe('AppLayout header', () => {
  it('has a search field (not wired up yet)', () => {
    renderLayout();

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute(
      'placeholder',
      'Search…',
    );
  });

  it('opens an empty notifications panel from the bell', async () => {
    const user = renderLayout();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });
});
