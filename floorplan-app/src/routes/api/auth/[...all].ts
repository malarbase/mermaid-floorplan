import { convexBetterAuthSolidStart } from 'convex-better-auth-solid-start';

/**
 * Better Auth API routes — proxy to Convex HTTP actions.
 *
 * Better Auth now runs inside Convex via @convex-dev/better-auth.
 * SolidStart acts as a thin proxy, forwarding all auth requests
 * to the Convex HTTP router where Better Auth handles them.
 *
 * Handles:
 * - POST /api/auth/sign-in/social - Start OAuth flow
 * - POST /api/auth/sign-in/email - Email/password sign in
 * - POST /api/auth/sign-up/email - Email/password sign up
 * - GET /api/auth/callback/:provider - OAuth callback
 * - POST /api/auth/sign-out - Sign out
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/convex/token - Get Convex JWT
 */
// In Vite/Vinxi, process.env does NOT contain VITE_ vars on the server.
// Use import.meta.env which Vite injects for both client and SSR.
const convexSiteUrl =
  import.meta.env.VITE_CONVEX_SITE_URL ?? process.env.CONVEX_SITE_URL ?? 'http://localhost:3211';

const { handler } = convexBetterAuthSolidStart({
  convexUrl: import.meta.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL ?? 'http://localhost:3210',
  convexSiteUrl,
});

export const { GET, POST, PUT, PATCH, DELETE } = handler;
