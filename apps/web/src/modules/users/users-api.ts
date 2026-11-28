import { useQuery } from '@tanstack/react-query';
import { userListResponseSchema, type UserListItem } from '@helpdesk/shared';
import { getJson } from '@/lib/api';

/** Query key for the user list; invalidate it after creating or editing users. */
export const usersQueryKey = ['users'] as const;

/** `GET /api/users` (admins only), validated against the shared schema. */
export async function fetchUsers(): Promise<UserListItem[]> {
  return (await getJson('/api/users', userListResponseSchema)).users;
}

/** All users, for the admin's user list. */
export function useUsers() {
  return useQuery({ queryKey: usersQueryKey, queryFn: fetchUsers });
}
