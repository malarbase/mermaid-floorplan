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
