import { createAuthClient } from 'better-auth/solid';
import type { FunctionReference } from 'convex/server';
import { useQuery } from 'convex-solidjs';
import { type Accessor, createMemo, createSignal, onMount } from 'solid-js';
import { isDevLoggedIn } from './mock-auth';

/**
 * Client-side auth utilities for Solid.js components.
 *
 * Usage:
 * ```tsx
 * import { authClient, useSession } from "~/lib/auth-client";
 *
 * function MyComponent() {
 *   const session = useSession();
 *
 *   if (session().isPending) return <div>Loading...</div>;
 *   if (!session().data) return <div>Not logged in</div>;
 *
 *   return <div>Hello, {session().data?.user.name}!</div>;
 * }
 *
 * // Sign in with Google
 * authClient.signIn.social({ provider: "google" });
 *
 * // Sign out
 * authClient.signOut();
 * ```
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? 'http://localhost:3000',
});

// Re-export the real useSession for non-mock mode
const realUseSession = authClient.useSession;

// Common user interface that works for both mock and real auth
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  username?: string;
  isAdmin?: boolean;
}

export interface SessionData {
  data: { user: SessionUser } | null;
  isPending: boolean;
  error: Error | null;
}

// Type-safe API reference for the Convex query used in dev mode
const usersApi = {
  getCurrentUser: 'users:getCurrentUser' as unknown as FunctionReference<'query'>,
};

/**
 * Session hook that supports dev authentication bypass.
 *
 * In development:
 *   - Checks the dev-logged-in flag from localStorage
 *   - If logged in, queries Convex `users:getCurrentUser` for the real dev user data
 *   - This means Convex is the single source of truth — username changes,
 *     profile updates, etc. are automatically reflected without manual sync
 *   - If not logged in, returns null (visitor)
 *
 * In production:
 *   - Uses Better Auth session (real OAuth)
 */
export function useSession(): Accessor<SessionData> {
  // Dev mode: derive session from Convex dev user
  if (import.meta.env.DEV) {
    const [devLoggedIn, setDevLoggedIn] = createSignal(false);
    const [isChecked, setIsChecked] = createSignal(false);

    // Check localStorage flag on mount (client-side only)
    onMount(() => {
      setDevLoggedIn(isDevLoggedIn());
      setIsChecked(true);
    });

    // Query Convex for the actual dev user (only when logged in)
    const convexUser = useQuery(
      usersApi.getCurrentUser,
      () => ({}),
      () => ({ enabled: devLoggedIn() }),
    );

    // Use real auth hook as fallback when not using dev login
    const realSession = realUseSession();

    return createMemo(() => {
      // Still checking localStorage
      if (!isChecked()) {
        return { data: null, isPending: true, error: null };
      }

      // Dev logged in — use Convex user data as session
      if (devLoggedIn()) {
        const user = convexUser.data() as
          | {
              _id: string;
              authId: string;
              username: string;
              displayName?: string;
              avatarUrl?: string | null;
              isAdmin?: boolean;
            }
          | null
          | undefined;

        if (user === undefined) {
          // Query still loading
          return { data: null, isPending: true, error: null };
        }

        if (!user) {
          // Dev user not found in Convex (shouldn't happen normally)
          return { data: null, isPending: false, error: null };
        }

        return {
          data: {
            user: {
              id: user.authId,
              email: `${user.username}@dev.local`,
              name: user.displayName ?? user.username,
              username: user.username,
              image: user.avatarUrl,
              isAdmin: user.isAdmin,
            } as SessionUser,
          },
          isPending: false,
          error: null,
        };
      }

      // Not dev-logged-in — fall back to real auth
      const session = realSession();
      return {
        data: session.data ? { user: session.data.user as unknown as SessionUser } : null,
        isPending: session.isPending,
        error: session.error ?? null,
      };
    });
  }

  // Production: always use real Better Auth session
  const realSession = realUseSession();
  return createMemo(() => {
    const session = realSession();
    return {
      data: session.data ? { user: session.data.user as unknown as SessionUser } : null,
      isPending: session.isPending,
      error: session.error ?? null,
    };
  });
}

// Re-export other auth methods
export const { signIn, signOut, signUp } = authClient;

// Type exports
export type Session = Accessor<SessionData>;
