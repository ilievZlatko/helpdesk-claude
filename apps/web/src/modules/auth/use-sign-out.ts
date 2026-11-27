import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authClient } from './auth-client';

/**
 * Signs out, drops all cached server data (so the next user starts clean),
 * and goes to /login, even if the sign-out request fails.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async function signOut() {
    try {
      await authClient.signOut();
    } finally {
      queryClient.clear();
      void navigate('/login', { replace: true });
    }
  };
}
