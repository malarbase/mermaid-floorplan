import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import type { Doc } from '../_generated/dataModel';
import { type MutationCtx, mutation, type QueryCtx, query } from '../_generated/server';

// Detect development mode.
// Used by convex/dev.ts to guard dev-only mutations.
export const IS_DEV_MODE =
  process.env.DEV_AUTH_ENABLED === 'true' ||
  process.env.CONVEX_DEPLOYMENT?.startsWith('dev:') === true || // Self-hosted dev (e.g., "dev:local")
  process.env.INSTANCE_NAME === 'local-dev' || // Self-hosted Convex instance name
  process.env.NODE_ENV !== 'production' ||
  process.env.CONVEX_CLOUD_ORIGIN?.includes('localhost') === true;

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
 * Get the current user from the auth identity.
 *
 * Works identically in dev and production:
 * - Dev: JWT from mock-auth.ts -> Convex customJwt provider -> real identity
 * - Prod: Better Auth OAuth -> Convex auth provider -> real identity
 *
 * Returns null if not authenticated.
 */
export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await getUserByIdentity(ctx, identity);
  if (user && isUserBanned(user)) return null;
  return user;
}

/**
 * Get the authenticated user (alias for getCurrentUser).
 * Both dev and production use the same auth identity path.
 */
export async function getStrictAuthUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  return getCurrentUser(ctx);
}

/**
 * Require an authenticated user for mutations.
 * Throws 'Unauthenticated' if no auth identity exists (dev or production).
 */
export async function requireUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user) {
      if (isUserBanned(user)) throw new Error('Account suspended');
      return user;
    }
  }

  throw new Error('Unauthenticated');
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

/**
 * Check if a user is currently banned (timed or permanent).
 * Uses bannedUntil timestamp: undefined = not banned, MAX_SAFE_INTEGER = permanent.
 */
export function isUserBanned(user: Doc<'users'>): boolean {
  return !!user.bannedUntil && user.bannedUntil > Date.now();
}

export function isSuperAdmin(user: Doc<'users'>): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return false;
  // Check if email field exists on user (for future compatibility)
  const userEmail = (user as unknown as { email?: string }).email;
  return userEmail === superAdminEmail;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Admin access required');

  const user = await getUserByIdentity(ctx, identity);
  if (user && (user.isAdmin || isSuperAdmin(user))) return user;

  throw new Error('Admin access required');
}

export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Super admin access required');

  const user = await getUserByIdentity(ctx, identity);
  if (user && isSuperAdmin(user)) return user;

  throw new Error('Super admin access required');
}
