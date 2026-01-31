import { createClient } from "@convex-dev/better-auth";
import { components } from "./_generated/api";

/**
 * Better Auth client for Convex.
 * 
 * This integrates Better Auth with Convex as the database backend.
 * The auth schema is managed by the Better Auth component.
 * 
 * Required environment variables:
 * - GOOGLE_CLIENT_ID: Google OAuth client ID
 * - GOOGLE_CLIENT_SECRET: Google OAuth client secret
 * - BETTER_AUTH_SECRET: Secret for session encryption
 * 
 * Usage in Convex functions:
 * ```ts
 * import { betterAuth } from "./auth";
 * 
 * export const myQuery = query({
 *   handler: async (ctx) => {
 *     const user = await betterAuth.getAuthUser(ctx);
 *     if (!user) throw new Error("Unauthenticated");
 *     // ... use user
 *   },
 * });
 * ```
 */
export const betterAuth = createClient(components.betterAuth);

// Re-export useful utilities for Convex functions
export const { getAuthUser, safeGetAuthUser } = betterAuth;
