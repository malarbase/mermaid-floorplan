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
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const convexSiteUrl = (
  process.env.CONVEX_SITE_URL ??
  import.meta.env.CONVEX_SITE_URL ??
  import.meta.env.VITE_CONVEX_SITE_URL ??
  'http://localhost:3211'
).replace(/\/$/, '');

const convexUrl = (
  process.env.CONVEX_URL ??
  import.meta.env.CONVEX_URL ??
  import.meta.env.VITE_CONVEX_URL ??
  'http://localhost:3210'
).replace(/\/$/, '');

console.log('--- SOLIDSTART PROXY DEBUG ---');
console.log('CWD:', process.cwd());
console.log('CONVEX_SITE_URL resolved to:', convexSiteUrl);
console.log('CONVEX_URL resolved to:', convexUrl);
console.log('------------------------------');

const { handler } = convexBetterAuthSolidStart({
  convexUrl,
  convexSiteUrl,
});

export const { GET, POST, PUT, PATCH, DELETE } = handler;
