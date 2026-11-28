import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole, UserStatus, type UserListItem } from '@helpdesk/shared';
import { apiErrorResponse, apiResponse, mockApiGet } from '@/test/api-mocks';
import { UsersList } from '../users-list';

const admin: UserListItem = {
  id: 'u_admin',
  name: 'Helpdesk Admin',
  email: 'admin@example.com',
  role: UserRole.Admin,
  status: UserStatus.Active,
  image: null,
  createdAt: '2026-11-02T12:00:00.000Z',
};
const liam: UserListItem = {
  id: 'u_liam',
  name: 'Liam Chen',
  email: 'liam.chen@example.com',
  role: UserRole.Agent,
  status: UserStatus.Deactivated,
  image: null,
  createdAt: '2026-11-20T12:00:00.000Z',
};

function mockUsers(users: unknown[]) {
  return mockApiGet().mockResolvedValue(apiResponse({ users }));
}

function renderList(currentUserId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <UsersList currentUserId={currentUserId} />
    </QueryClientProvider>,
  );
}

/** The table's body rows (the header row is left out). */
async function bodyRows() {
  await screen.findByRole('table');
  return screen.getAllByRole('row').slice(1);
}

function roleCell(row: HTMLElement) {
  return within(row).getAllByRole('cell')[1]!;
}

describe('UsersList', () => {
  it('fetches the users from the API', async () => {
    const get = mockUsers([admin]);
    renderList();

    await screen.findByRole('table');
    expect(get).toHaveBeenCalledWith('/api/users');
  });

  it('shows each user with their email, role, status and date added', async () => {
    mockUsers([admin, liam]);
    renderList();

    const [adminRow, liamRow] = await bodyRows();
    expect(within(adminRow!).getByText('Helpdesk Admin')).toBeInTheDocument();
    expect(
      within(adminRow!).getByText('admin@example.com'),
    ).toBeInTheDocument();
    // The Role column (index 1); small screens show the role in the User cell instead.
    expect(within(roleCell(adminRow!)).getByText('Admin')).toBeInTheDocument();
    expect(within(adminRow!).getByText('Active')).toBeInTheDocument();
    expect(within(adminRow!).getByText('Nov 2, 2026')).toBeInTheDocument();

    expect(within(liamRow!).getByText('Liam Chen')).toBeInTheDocument();
    expect(within(roleCell(liamRow!)).getByText('Agent')).toBeInTheDocument();
    expect(within(liamRow!).getByText('Deactivated')).toBeInTheDocument();
  });

  it('keeps the order the API returns', async () => {
    mockUsers([liam, admin]);
    renderList();

    const rows = await bodyRows();
    expect(
      rows.map((row) => within(row).getAllByRole('cell')[0]!.textContent),
    ).toEqual([
      expect.stringContaining('Liam Chen'),
      expect.stringContaining('Helpdesk Admin'),
    ]);
  });

  it('marks the signed-in user', async () => {
    mockUsers([admin, liam]);
    renderList('u_admin');

    const [adminRow, liamRow] = await bodyRows();
    expect(within(adminRow!).getByText('(you)')).toBeInTheDocument();
    expect(within(liamRow!).queryByText('(you)')).not.toBeInTheDocument();
  });

  it('shows a loading state until the users arrive', async () => {
    mockUsers([admin]);
    renderList();

    expect(screen.getByLabelText('Loading users')).toBeInTheDocument();
    await screen.findByRole('table');
    expect(screen.queryByLabelText('Loading users')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when loading fails', async () => {
    const get = mockApiGet()
      .mockRejectedValueOnce(apiErrorResponse(500))
      .mockResolvedValue(apiResponse({ users: [admin] }));
    renderList();

    expect(
      await screen.findByText('Could not load users.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Helpdesk Admin')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('treats a response that does not match the schema as an error', async () => {
    mockUsers([{ ...admin, role: 'superuser' }]);
    renderList();

    expect(
      await screen.findByText('Could not load users.'),
    ).toBeInTheDocument();
  });

  it('says so when there are no users', async () => {
    mockUsers([]);
    renderList();

    expect(await screen.findByText('No users yet.')).toBeInTheDocument();
  });
});
