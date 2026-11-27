import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App';
import { ThemeProvider } from '@/modules/theme/theme-provider';

type FakeSession = {
  user: { name: string; email: string; role: string; image: string | null };
};

// Stand-in for better-auth's client. `useSession` reads `auth.session`, so a
// test changes who is signed in by setting it; navigation re-renders pick it up.
const auth = vi.hoisted(() => ({
  session: null as FakeSession | null,
  signInEmail: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/modules/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: auth.session,
      isPending: false,
      refetch: () => Promise.resolve(),
    }),
    signIn: { email: auth.signInEmail },
    signOut: auth.signOut,
  },
}));

const maya: FakeSession = {
  user: {
    name: 'Maya Thompson',
    email: 'maya.thompson@example.com',
    role: 'agent',
    image: null,
  },
};

function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

function mockHealthOk() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({ status: 'ok', timestamp: new Date().toISOString() }),
  );
}

beforeEach(() => {
  auth.session = null;
  auth.signInEmail.mockReset();
  auth.signOut.mockReset();
});

describe('login', () => {
  it('sends signed-out users to the login page', () => {
    renderApp('/');

    expect(
      screen.getByText('Welcome back', { selector: '[data-slot=card-title]' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('signs in and shows the home page with the user in the nav bar', async () => {
    mockHealthOk();
    auth.signInEmail.mockImplementation(() => {
      auth.session = maya;
      return Promise.resolve({ data: {}, error: null });
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(screen.getByLabelText('Email'), 'maya@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const nav = await screen.findByRole('navigation');
    expect(
      within(nav).getByRole('button', { name: 'Open user menu' }),
    ).toHaveTextContent('MT');
    expect(
      screen.getByRole('heading', { name: 'Welcome, Maya Thompson' }),
    ).toBeInTheDocument();
    expect(auth.signInEmail).toHaveBeenCalledWith({
      email: 'maya@example.com',
      password: 'secret',
    });
  });

  it('sends signed-in users away from the login page', async () => {
    mockHealthOk();
    auth.session = maya;
    renderApp('/login');

    expect(
      await screen.findByRole('heading', { name: 'Welcome, Maya Thompson' }),
    ).toBeInTheDocument();
  });
});

describe('sign out', () => {
  it('signs out and returns to the login page', async () => {
    mockHealthOk();
    auth.session = maya;
    auth.signOut.mockImplementation(() => {
      auth.session = null;
      return Promise.resolve({ data: { success: true }, error: null });
    });
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('button', { name: 'Open user menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('home page', () => {
  beforeEach(() => {
    auth.session = maya;
  });

  it('shows the API status when the health check succeeds', async () => {
    mockHealthOk();
    renderApp('/');

    expect(await screen.findByText('ok')).toBeInTheDocument();
  });

  it('shows "unreachable" when the API is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 503 }),
    );
    renderApp('/');

    expect(await screen.findByText('unreachable')).toBeInTheDocument();
  });
});

describe('settings page', () => {
  beforeEach(() => {
    auth.session = maya;
  });

  it('opens from the user menu and shows the profile', async () => {
    mockHealthOk();
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('button', { name: 'Open user menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Settings' }));

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByText('maya.thompson@example.com')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('changes the theme from the Appearance section', async () => {
    const user = userEvent.setup();
    renderApp('/settings');

    const dark = screen.getByRole('radio', { name: 'Dark' });
    expect(dark).toHaveAttribute('aria-checked', 'false');

    await user.click(dark);

    expect(dark).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveClass('dark');
  });
});
