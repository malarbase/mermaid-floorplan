import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/solid';
import { useQuery } from 'convex-solidjs';
import { type Accessor, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { api } from '../../convex/_generated/api';
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
  plugins: [convexClient()],
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

/**
 * Session hook that works identically in dev and production.
 *
 * In development:
 *   - JWT from mock-auth.ts is verified by Convex's customJwt provider
 *   - ctx.auth.getUserIdentity() returns a real identity
 *   - getCurrentUser query works via the standard auth path
 *   - Listens for localStorage changes to re-query when personas switch
 *
 * In production:
 *   - Uses Better Auth session (real OAuth)
 */
export function useSession(): Accessor<SessionData> {
  // Dev mode: derive session from getCurrentUser (backed by JWT auth).
  // ConvexProvider.tsx calls setAuth() with the dev JWT, so
  // ctx.auth.getUserIdentity() works identically to production.
  if (import.meta.env.DEV) {
    const [devLoggedIn, setDevLoggedIn] = createSignal(false);
    const [isChecked, setIsChecked] = createSignal(false);
    const [authVersion, setAuthVersion] = createSignal(0);

    onMount(() => {
      setDevLoggedIn(isDevLoggedIn());
      setIsChecked(true);

      const onStorageChange = (e: StorageEvent) => {
        if (e.key === 'dev-auth-token') {
          setDevLoggedIn(isDevLoggedIn());
          setAuthVersion((v) => v + 1);
        }
      };
      window.addEventListener('storage', onStorageChange);
      onCleanup(() => window.removeEventListener('storage', onStorageChange));
    });

    // Query Convex for the current user — works via JWT auth in dev
    const convexUser = useQuery(
      api.users.getCurrentUser,
      () => {
        void authVersion();
        return {};
      },
      () => ({ enabled: devLoggedIn() }),
    );

    return createMemo(() => {
      if (!isChecked()) {
        return { data: null, isPending: true, error: null };
      }

      if (!devLoggedIn()) {
        return { data: null, isPending: false, error: null };
      }

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

      // undefined = query hasn't returned yet; null = no user found
      if (user === undefined) {
        return { data: null, isPending: true, error: null };
      }

      if (!user) {
        // getCurrentUser returned null — JWT not verified or no user document
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
