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
const getAuthBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return import.meta.env.VITE_BETTER_AUTH_URL ?? 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
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

export function useSession(): Accessor<SessionData> {
  const realSession = realUseSession();

  // Track dev persona changes (only utilized in dev, but declared here to obey hooks rules)
  const [authVersion, setAuthVersion] = createSignal(0);
  const [devLoggedIn, setDevLoggedIn] = createSignal(false);
  const [isChecked, setIsChecked] = createSignal(false);

  onMount(() => {
    if (import.meta.env.DEV) {
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
    } else {
      setIsChecked(true);
    }
  });

  // Convex user query — only enabled when there's evidence of authentication.
  // Avoids unnecessary subscriptions for unauthenticated visitors.
  const convexUser = useQuery(
    api.users.getCurrentUser,
    () => {
      if (import.meta.env.DEV) void authVersion();
      return {};
    },
    () => ({
      enabled: !!realSession()?.data?.user || (import.meta.env.DEV && devLoggedIn()),
    }),
  );

  return createMemo(() => {
    const rs = realSession();
    const cUser = convexUser.data() as
      | {
          authId: string;
          username: string;
          displayName?: string;
          avatarUrl?: string | null;
          isAdmin?: boolean;
        }
      | null
      | undefined;

    // 1. Valid Better Auth Session (Primary Prod flow, also hits Dev if OAuth used)
    if (rs.data?.user) {
      return {
        data: {
          user: {
            ...rs.data.user,
            username: cUser?.username,
            isAdmin: cUser?.isAdmin ?? false,
            // Convex provides canonical avatar if available
            image: cUser?.avatarUrl ?? rs.data.user.image,
          } as unknown as SessionUser,
        },
        // We ensure `isPending` stays true until Convex completes the user load
        isPending: rs.isPending || cUser === undefined,
        error: rs.error ?? null,
      };
    }

    // 2. Production fallback: Not logged in
    if (!import.meta.env.DEV) {
      return {
        data: null,
        isPending: rs.isPending || !isChecked(),
        error: rs.error ?? null,
      };
    }

    // 3. Dev Mode fallback: Check mock JWT when BA isn't fully active
    if (!isChecked() || rs.isPending) {
      return { data: null, isPending: true, error: null };
    }
    if (!devLoggedIn()) {
      return { data: null, isPending: false, error: null };
    }

    // Dev mode Mock waiting for Convex mapping
    if (cUser === undefined) {
      return { data: null, isPending: true, error: null };
    }
    // Convex query finished but returned null (no such user)
    if (!cUser) {
      return { data: null, isPending: false, error: null };
    }

    // Construct mock session completely out of Convex data
    return {
      data: {
        user: {
          id: cUser.authId,
          email: `${cUser.username}@dev.local`,
          name: cUser.displayName ?? cUser.username,
          username: cUser.username,
          image: cUser.avatarUrl,
          isAdmin: cUser.isAdmin ?? false,
        } as SessionUser,
      },
      isPending: false,
      error: null,
    };
  });
}

// Re-export other auth methods
export const { signIn, signOut, signUp } = authClient;

// Type exports
export type Session = Accessor<SessionData>;
