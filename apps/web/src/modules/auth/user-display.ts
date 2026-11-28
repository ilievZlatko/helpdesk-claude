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

/**
 * Avatar colours for telling users apart in lists. Light: a pale tint with
 * 700 text; dark: a translucent tint with 200 text, both readable (WCAG AA).
 * Full class strings, so Tailwind sees them.
 */
export const avatarColors = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/25 dark:text-cyan-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-200',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/25 dark:text-fuchsia-200',
] as const;

/**
 * A colour from `avatarColors` for a user, picked by hashing `key` (their
 * email) with 32-bit FNV-1a: always the same for the same user, and spread
 * evenly across the palette. Colours can repeat once there are more users
 * than colours.
 */
export function avatarColor(key: string): string {
  let hash = 0x811c9dc5;
  for (const char of key.toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return avatarColors[(hash >>> 0) % avatarColors.length]!;
}
