import { createAuthClient } from "better-auth/solid";

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
 *   if (session.isPending()) return <div>Loading...</div>;
 *   if (!session.data()) return <div>Not logged in</div>;
 *   
 *   return <div>Hello, {session.data()?.user.name}!</div>;
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

// Re-export commonly used hooks and methods
export const {
  useSession,
  signIn,
  signOut,
  signUp,
} = authClient;

// Type exports
export type Session = ReturnType<typeof useSession>;
