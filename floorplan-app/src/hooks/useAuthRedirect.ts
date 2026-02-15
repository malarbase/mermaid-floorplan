/**
 * Shared hook for protected route authentication.
 * Extracts session state and redirects unauthenticated users to login.
 *
 * Used by: dashboard.tsx, new.tsx, settings.tsx, and other protected routes.
 */

import { useNavigate } from '@solidjs/router';
import { createEffect, createMemo } from 'solid-js';
import { useSession } from '~/lib/auth-client';

/**
 * Returns reactive session state and automatically redirects to login
 * if the user is not authenticated.
 *
 * @param redirectTo - URL to redirect to when not authenticated (default: '/login')
 *
 * @example
 * ```ts
 * const { user, isLoading } = useAuthRedirect('/login?redirect=/new');
 * ```
 */
export function useAuthRedirect(redirectTo = '/login') {
  const sessionSignal = useSession();
  const navigate = useNavigate();

  const session = createMemo(() => sessionSignal());
  const isLoading = createMemo(() => session()?.isPending ?? true);
  const user = createMemo(() => session()?.data?.user);

  // Redirect to login if not authenticated
  createEffect(() => {
    if (!isLoading() && !user()) {
      navigate(redirectTo, { replace: true });
    }
  });

  return { session, user, isLoading };
}
