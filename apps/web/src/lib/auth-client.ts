import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * better-auth client for the browser. With no `baseURL` it talks to
 * `<current origin>/api/auth`, which the Vite dev server proxies to the API,
 * so the session cookie stays first-party.
 *
 * `adminClient` adds `user.role` to the session type and the admin endpoints.
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});
