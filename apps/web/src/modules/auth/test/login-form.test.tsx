import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../login-form';

const auth = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/modules/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false, refetch: auth.refetch }),
    signIn: { email: auth.signInEmail },
  },
}));

beforeEach(() => {
  auth.signInEmail.mockReset();
  auth.refetch.mockReset().mockResolvedValue(undefined);
});

function renderForm() {
  const onSuccess = vi.fn();
  render(<LoginForm onSuccess={onSuccess} />);
  return { onSuccess, user: userEvent.setup() };
}

async function submit(
  user: ReturnType<typeof userEvent.setup>,
  email = 'maya@example.com',
  password = 'secret',
) {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('shows validation errors and does not call the API', async () => {
    const { user, onSuccess } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter a valid email address'),
    ).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(auth.signInEmail).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('signs in, loads the session, then calls onSuccess', async () => {
    auth.signInEmail.mockResolvedValue({ data: {}, error: null });
    const { user, onSuccess } = renderForm();

    await submit(user);

    expect(auth.signInEmail).toHaveBeenCalledWith({
      email: 'maya@example.com',
      password: 'secret',
    });
    expect(auth.refetch).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'Invalid email or password.'],
    [429, 'Too many sign-in attempts. Try again later.'],
    [500, 'Something went wrong. Please try again.'],
    [403, 'Something went wrong. Please try again.'],
  ])('shows a message for a %i response', async (status, message) => {
    auth.signInEmail.mockResolvedValue({
      data: null,
      error: { status, message: 'error' },
    });
    const { user, onSuccess } = renderForm();

    await submit(user);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('tells a banned user their account is disabled', async () => {
    auth.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 403, code: 'BANNED_USER', message: 'error' },
    });
    const { user, onSuccess } = renderForm();

    await submit(user);

    expect(
      await screen.findByText(
        'Your account has been disabled. Contact your administrator.',
      ),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('has a page heading', () => {
    renderForm();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
  });

  it('shows a message when the server cannot be reached', async () => {
    auth.signInEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    const { user, onSuccess } = renderForm();

    await submit(user);

    expect(
      await screen.findByText('Could not reach the server. Please try again.'),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
