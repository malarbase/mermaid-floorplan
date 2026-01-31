import { toSolidStartHandler } from "better-auth/solid-start";
import { auth } from "~/lib/auth";

/**
 * Better Auth API routes handler.
 * 
 * This handles all auth-related API requests:
 * - POST /api/auth/sign-in/social - Start OAuth flow
 * - GET /api/auth/callback/:provider - OAuth callback
 * - POST /api/auth/sign-out - Sign out
 * - GET /api/auth/session - Get current session
 * 
 * The toSolidStartHandler wrapper converts the Better Auth handler
 * to work with SolidStart's API route format.
 */
export const { GET, POST, PUT, PATCH, DELETE } = toSolidStartHandler(auth);
