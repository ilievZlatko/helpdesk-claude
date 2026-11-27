import { UserRole } from '@helpdesk/shared';

/**
 * Up to two initials for an avatar: first and last word of the name
 * ("Maya Thompson" → "MT", "Cher" → "C"). Falls back to the email's first
 * letter, then "?".
 */
export function userInitials(name: string | null | undefined, email?: string) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return (email?.[0] ?? '?').toUpperCase();
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const roleLabels: Record<string, string> = {
  [UserRole.Admin]: 'Admin',
  [UserRole.Agent]: 'Agent',
};

/** Human label for a role ("admin" → "Admin"); unknown roles pass through. */
export function roleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  return roleLabels[role] ?? role;
}
