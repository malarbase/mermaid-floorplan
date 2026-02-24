import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth/minimal';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { query } from './_generated/server';
import authConfig from './auth.config';
import { IS_DEV_MODE } from './lib/auth';

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>, request?: Request) => {
  const requestOrigin = request?.headers.get('origin');
  const customHost = request?.headers.get('x-custom-forwarded-host') || request?.headers.get('x-forwarded-host');
  const origin = requestOrigin ?? (customHost ? (customHost.startsWith('http') ? customHost : `https://${customHost}`) : null);
  let validOrigin = false;
  let dynamicBaseUrl = siteUrl;

  if (origin) {
    try {
      const urlString = origin.startsWith('http') ? origin : `https://${origin}`;
      const url = new URL(urlString);

      const allowedSuffixes = process.env.ALLOWED_ORIGIN_SUFFIXES
        ? process.env.ALLOWED_ORIGIN_SUFFIXES.split(',')
        : ['.vercel.app', '.convex.site'];

      validOrigin = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || allowedSuffixes.some(suffix => url.hostname.endsWith(suffix));

      if (validOrigin) {
        dynamicBaseUrl = urlString;
      }
    } catch (e) {
      // invalid URL
    }
  }

  const trustedOrigins = validOrigin && origin ? [dynamicBaseUrl] : [];

  return betterAuth({
    baseURL: dynamicBaseUrl,
    trustedOrigins,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [convex({ authConfig })],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => authComponent.getAuthUser(ctx),
});

// ---------------------------------------------------------------------------
// Session queries — separate prod/dev handlers, selected once at deploy time.
// IS_DEV_MODE is evaluated from process.env at module load, so the ternary
// picks the handler once and all subsequent query invocations go straight to
// the chosen implementation with zero conditional overhead.
// ---------------------------------------------------------------------------

/** Shared helper: map raw component session docs to the ActiveSession shape. */
function toActiveSessions(page: Record<string, unknown>[]) {
  return page.map((session) => ({
    id: session._id as string,
    token: session.token as string,
    userId: session.userId as string,
    userAgent: (session.userAgent as string | null) ?? null,
    ipAddress: (session.ipAddress as string | null) ?? null,
    createdAt: session.createdAt as number,
    updatedAt: session.updatedAt as number,
    expiresAt: session.expiresAt as number,
  }));
}

/**
 * Resolve the Better Auth user ID for the current identity (dev-only).
 *
 * Dev JWTs use a dev identifier like "testuser" as identity.subject,
 * but BA sessions reference the internal BA user _id. This helper
 * resolves the BA user by the email convention ({subject}@dev.local).
 *
 * Returns null if no BA user exists yet (pre-login).
 */
// biome-ignore lint/suspicious/noExplicitAny: Complex Convex ctx type for dev auth
async function resolveDevBaUserId(ctx: any, subject: string): Promise<string | null> {
  const email = `${subject}@dev.local`;
  const userResult = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'user' as const,
    where: [{ field: 'email', value: email }],
  });
  return userResult ? ((userResult as Record<string, unknown>)._id as string) : null;
}

/**
 * List all active (non-expired) sessions for the current user.
 *
 * Returns session data via a Convex real-time subscription so that the
 * sessions list on the settings page updates instantly when a session is
 * added or revoked — no HTTP polling needed.
 */
export const listActiveSessions = query({
  args: {},
  handler: IS_DEV_MODE
    ? // -- Dev handler: resolve BA user by email, then list sessions ----------
    async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return [];

      const baUserId = (await resolveDevBaUserId(ctx, identity.subject)) ?? identity.subject;

      const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'session' as const,
        where: [
          { field: 'userId', value: baUserId },
          { field: 'expiresAt', operator: 'gt' as const, value: Date.now() },
        ],
        paginationOpts: { cursor: null, numItems: 50 },
      });
      return toActiveSessions(result.page ?? []);
    }
    : // -- Prod handler: identity.subject IS the BA user _id ------------------
    async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return [];

      const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'session' as const,
        where: [
          { field: 'userId', value: identity.subject },
          { field: 'expiresAt', operator: 'gt' as const, value: Date.now() },
        ],
        paginationOpts: { cursor: null, numItems: 50 },
      });
      return toActiveSessions(result.page ?? []);
    },
});

/**
 * Real-time session validity check.
 *
 * Returns true if the caller has a valid Better Auth session, false otherwise.
 * Used by the client-side SessionGuard via Convex subscription so that session
 * revocation is detected instantly (no polling needed).
 */
export const isSessionValid = query({
  args: {},
  handler: IS_DEV_MODE
    ? // -- Dev handler: sessionId lookup + email-based fallback ---------------
    async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return false;

      // Dev JWTs with sessionId (two-phase login) — precise lookup
      const sessionId = (identity as Record<string, unknown>).sessionId as string | undefined;
      if (sessionId) {
        const session = await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'session',
          where: [
            { field: '_id', value: sessionId },
            { field: 'expiresAt', operator: 'gt', value: Date.now() },
          ],
        });
        return !!session;
      }

      // Legacy dev JWTs without sessionId — check if any session exists
      const baUserId = await resolveDevBaUserId(ctx, identity.subject);
      if (!baUserId) return null; // No BA user yet — indeterminate

      const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'session' as const,
        where: [
          { field: 'userId', value: baUserId },
          { field: 'expiresAt', operator: 'gt' as const, value: Date.now() },
        ],
        paginationOpts: { cursor: null, numItems: 1 },
      });
      return (result.page ?? []).length > 0;
    }
    : // -- Prod handler: sessionId is always present in BA JWT ----------------
    async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return false;

      const sessionId = (identity as Record<string, unknown>).sessionId as string | undefined;
      if (!sessionId) return false; // Shouldn't happen in production

      const session = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: 'session',
        where: [
          { field: '_id', value: sessionId },
          { field: 'expiresAt', operator: 'gt', value: Date.now() },
        ],
      });
      return !!session;
    },
});
