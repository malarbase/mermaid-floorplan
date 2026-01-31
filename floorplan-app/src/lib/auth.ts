import { betterAuth } from "better-auth";

/**
 * Server-side Better Auth configuration.
 * 
 * This creates the auth instance used by API routes.
 * Uses Convex as the database via @convex-dev/better-auth component.
 * 
 * Required environment variables:
 * - BETTER_AUTH_SECRET: A random secret for session encryption
 * - BETTER_AUTH_URL: Base URL of the app (e.g., http://localhost:3000)
 * - GOOGLE_CLIENT_ID: Google OAuth client ID  
 * - GOOGLE_CLIENT_SECRET: Google OAuth client secret
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: false, // Only OAuth for now
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache session for 5 minutes
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL ?? "",
  ].filter(Boolean),
});

export type Auth = typeof auth;
