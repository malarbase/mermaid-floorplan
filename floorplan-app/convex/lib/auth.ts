import { customQuery, customMutation, customCtx } from "convex-helpers/server/customFunctions";
import { query, mutation } from "../_generated/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

const DEV_USER_AUTH_ID = "dev-user-1";

const IS_DEV_MODE =
  process.env.DEV_AUTH_ENABLED === "true" ||
  process.env.NODE_ENV !== "production" ||
  process.env.CONVEX_CLOUD_ORIGIN?.includes("localhost") === true;

async function getDevUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", DEV_USER_AUTH_ID))
    .first();
}

async function getOrCreateDevUser(ctx: MutationCtx): Promise<Doc<"users">> {
  let devUser = await getDevUser(ctx);

  if (!devUser) {
    const userId = await ctx.db.insert("users", {
      authId: DEV_USER_AUTH_ID,
      username: "testuser",
      displayName: "Test User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    devUser = (await ctx.db.get(userId))!;
  }

  return devUser;
}

async function getUserByIdentity(
  ctx: QueryCtx,
  identity: { subject: string }
): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
    .first();
}

async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user) return user;
  }

  return IS_DEV_MODE ? getDevUser(ctx) : null;
}

async function requireUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user) return user;
  }

  if (!IS_DEV_MODE) {
    throw new Error("Unauthenticated");
  }

  return getOrCreateDevUser(ctx);
}

export const authenticatedQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    user: await getCurrentUser(ctx),
  }))
);

export const authenticatedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    user: await requireUser(ctx),
  }))
);

export const optionalAuthQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    user: await getCurrentUser(ctx),
  }))
);

export function isSuperAdmin(user: Doc<"users">): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return false;
  // Check if email field exists on user (for future compatibility)
  const userEmail = (user as any).email;
  return userEmail === superAdminEmail;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user && (user.isAdmin || isSuperAdmin(user))) return user;
  }

  if (!IS_DEV_MODE) {
    throw new Error("Admin access required");
  }

  const devUser = await getDevUser(ctx);
  if (devUser && (devUser.isAdmin || isSuperAdmin(devUser))) return devUser;

  throw new Error("Admin access required");
}

export async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user && isSuperAdmin(user)) return user;
  }

  if (!IS_DEV_MODE) {
    throw new Error("Super admin access required");
  }

  const devUser = await getDevUser(ctx);
  if (devUser && isSuperAdmin(devUser)) return devUser;

  throw new Error("Super admin access required");
}
