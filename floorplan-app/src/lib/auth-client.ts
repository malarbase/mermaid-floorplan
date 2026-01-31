import { createAuthClient } from "better-auth/solid";
import { createSignal, createMemo, onMount, type Accessor } from "solid-js";
import { getMockSession, type MockUser } from "./mock-auth";

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
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:3000",
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
}

export interface SessionData {
  data: { user: SessionUser } | null;
  isPending: boolean;
  error: Error | null;
}

/**
 * Session hook that supports dev authentication bypass.
 * In development, checks localStorage for mock session first.
 * In production or when no mock session exists, uses Better Auth.
 */
export function useSession(): Accessor<SessionData> {
  // In development, check for mock session from localStorage
  // This allows the dev-login page to bypass OAuth
  if (import.meta.env.DEV) {
    const [mockUser, setMockUser] = createSignal<MockUser | null>(null);
    const [isChecked, setIsChecked] = createSignal(false);
    
    // Check localStorage on mount (client-side only)
    onMount(() => {
      const user = getMockSession();
      setMockUser(user);
      setIsChecked(true);
    });
    
    // Use real auth hook for when no mock session exists
    const realSession = realUseSession();
    
    return createMemo(() => {
      // Still checking localStorage
      if (!isChecked()) {
        return { data: null, isPending: true, error: null };
      }
      
      // Mock session exists - use it
      const mock = mockUser();
      if (mock) {
        return { data: { user: mock as SessionUser }, isPending: false, error: null };
      }
      
      // No mock session - fall back to real auth
      // Map the Better Auth response to our common interface
      const session = realSession();
      return {
        data: session.data ? { user: session.data.user as unknown as SessionUser } : null,
        isPending: session.isPending,
        error: session.error ?? null,
      };
    });
  }
  
  // Production: always use real Better Auth session
  // Map the Better Auth response to our common interface
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
export const {
  signIn,
  signOut,
  signUp,
} = authClient;

// Type exports
export type Session = Accessor<SessionData>;
