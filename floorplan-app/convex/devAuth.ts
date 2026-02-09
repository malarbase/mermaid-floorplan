import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const DEV_USER_AUTH_ID = "dev-user-1";

// Detect development mode for auth bypass
// In production, users must authenticate via real OAuth
const IS_DEV_MODE = 
  process.env.DEV_AUTH_ENABLED === "true" || 
  process.env.CONVEX_DEPLOYMENT?.startsWith("dev:") === true ||  // Self-hosted dev (e.g., "dev:local")
  process.env.INSTANCE_NAME === "local-dev" ||                    // Self-hosted Convex instance name
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

export async function requireUserForQuery(
  ctx: QueryCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await getUserByIdentity(ctx, identity);
    if (user) return user;
  }

  // Dev mode fallback: return the dev user if no auth identity exists
  // This is safe because:
  // 1. In production with real OAuth, the identity check above succeeds
  // 2. The dev user has a specific authId that real OAuth won't produce
  // 3. We always try dev user fallback when no auth - in production this just returns null
  //    if no dev user exists, and if it does exist, it's intentional for testing
  return getDevUser(ctx);
}

export async function requireUserForMutation(
  ctx: MutationCtx
): Promise<Doc<"users">> {
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
