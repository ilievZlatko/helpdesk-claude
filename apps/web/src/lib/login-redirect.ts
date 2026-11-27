import { useLocation, type Location } from 'react-router';

/** Router state passed to /login so it can return to the page that was asked for. */
export type LoginLocationState = { from?: Location } | null;

/** Where to go after signing in: the page that sent the user to /login, or home. */
export function useRedirectAfterLogin(): string {
  const state = useLocation().state as LoginLocationState;
  const from = state?.from;
  return from ? `${from.pathname}${from.search}${from.hash}` : '/';
}
