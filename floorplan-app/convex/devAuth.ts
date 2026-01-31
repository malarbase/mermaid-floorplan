import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const DEV_USER_AUTH_ID = "dev-user-1";

function isDevModeEnabled(): boolean {
  return process.env.DEV_AUTH_ENABLED === "true" || 
         process.env.NODE_ENV !== "production" ||
         process.env.CONVEX_CLOUD_ORIGIN?.includes("localhost") === true;
}

export async function getDevUserFromQuery(
  ctx: QueryCtx
): Promise<Doc<"users"> | null> {
  if (!isDevModeEnabled()) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", DEV_USER_AUTH_ID))
    .first();
}

export async function getOrCreateDevUser(
  ctx: MutationCtx
): Promise<Doc<"users">> {
  let devUser = await ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", DEV_USER_AUTH_ID))
    .first();

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

export async function requireUserForQuery(
  ctx: QueryCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (user) return user;
  }

  if (isDevModeEnabled()) {
    return await getDevUserFromQuery(ctx);
  }

  return null;
}

export async function requireUserForMutation(
  ctx: MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (user) return user;
  }

  return await getOrCreateDevUser(ctx);
}
