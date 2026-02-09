import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import type { Doc } from '../_generated/dataModel';
import { type MutationCtx, mutation, type QueryCtx, query } from '../_generated/server';

const DEV_USER_AUTH_ID = 'dev-user-1';

// Detect development mode for auth bypass.
// In production, users must authenticate via real OAuth.
const IS_DEV_MODE =
  process.env.DEV_AUTH_ENABLED === 'true' ||
  process.env.CONVEX_DEPLOYMENT?.startsWith('dev:') === true || // Self-hosted dev (e.g., "dev:local")
  process.env.INSTANCE_NAME === 'local-dev' || // Self-hosted Convex instance name
  process.env.NODE_ENV !== 'production' ||
  process.env.CONVEX_CLOUD_ORIGIN?.includes('localhost') === true;

async function getDevUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_auth_id', (q) => q.eq('authId', DEV_USER_AUTH_ID))
    .first();
}

async function getOrCreateDevUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  let devUser = await getDevUser(ctx);

  if (!devUser) {
    const userId = await ctx.db.insert('users', {
      authId: DEV_USER_AUTH_ID,
      username: 'testuser',
      displayName: 'Test User',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    devUser = (await ctx.db.get(userId))!;
  }

  return devUser;
}

async function getUserByIdentity(
  ctx: QueryCtx,
  identity: { subject: string },
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
    .first();
}

/**
 * Get the current user, with dev-mode fallback to the dev user.
 *
 * In dev mode (Convex auth provider disabled), ctx.auth.getUserIdentity()
 * is always null, so this falls back to the dev user for convenience.
 * In production, returns null if no auth identity exists.
 *
 * NOTE: Do NOT use this for access control on private resources.
 * The dev fallback cannot distinguish "logged in" from "logged out" in dev mode,
 * because the Convex Better Auth integration is disabled locally.
 * Use getStrictAuthUser() for access control checks instead.
 */
export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user) return user;
  }

  if (!IS_DEV_MODE) {
    return null;
  }

  return getDevUser(ctx);
}

/**
 * Get the authenticated user WITHOUT dev-mode fallback.
 *
 * Use this for access control decisions (e.g., canAccessProject) where
 * "no auth identity = no access" must hold, even in dev mode.
 *
 * In production: returns the user if authenticated, null otherwise.
 * In dev mode: also returns null if no real Convex auth identity exists
 * (which is always the case when the Better Auth integration is disabled).
 */
export async function getStrictAuthUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return getUserByIdentity(ctx, identity);
}

/**
 * Require an authenticated user for mutations, with dev-mode fallback.
 * Throws 'Unauthenticated' in production if no auth identity exists.
 */
export async function requireUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user) return user;
  }

  if (!IS_DEV_MODE) {
    throw new Error('Unauthenticated');
  }

  return getOrCreateDevUser(ctx);
}

export const authenticatedQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    user: await getCurrentUser(ctx),
  })),
);

export const authenticatedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    user: await requireUser(ctx),
  })),
);

export const optionalAuthQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    user: await getCurrentUser(ctx),
  })),
);

export function isSuperAdmin(user: Doc<'users'>): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return false;
  // Check if email field exists on user (for future compatibility)
  const userEmail = (user as unknown as { email?: string }).email;
  return userEmail === superAdminEmail;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user && (user.isAdmin || isSuperAdmin(user))) return user;
  }

  if (!IS_DEV_MODE) {
    throw new Error('Admin access required');
  }

  const devUser = await getDevUser(ctx);
  if (devUser && (devUser.isAdmin || isSuperAdmin(devUser))) return devUser;

  throw new Error('Admin access required');
}

export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user && isSuperAdmin(user)) return user;
  }

  if (!IS_DEV_MODE) {
    throw new Error('Super admin access required');
  }

  const devUser = await getDevUser(ctx);
  if (devUser && isSuperAdmin(devUser)) return devUser;

  throw new Error('Super admin access required');
}
