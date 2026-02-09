import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUserForQuery, requireUserForMutation } from "./devAuth";

/**
 * Generate a temporary username from authId.
 * Format: "u_" + first 8 chars of a hash
 */
async function generateTempUsername(authId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(authId + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `u_${hashHex.slice(0, 8)}`;
}

/**
 * Validate username format.
 * Must be 3-30 characters, alphanumeric with underscores, not starting with underscore.
 */
function isValidUsername(username: string): boolean {
  // Must be 3-30 characters
  if (username.length < 3 || username.length > 30) return false;
  // Must match pattern: start with letter/number, rest can include underscores
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9_]{2,29}$/;
  return pattern.test(username);
}

/**
 * Get the current authenticated user's profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await requireUserForQuery(ctx);
  },
});

/**
 * Get user profile by username.
 * Returns null if user doesn't exist.
 */
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) return null;

    // Return public profile data only
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Get user profile by ID.
 * Returns null if user doesn't exist.
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Return public profile data only
    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Create or get user profile after authentication.
 * Called when a user logs in for the first time or returns.
 * If user doesn't exist, creates one with temp username.
 */
export const getOrCreateUser = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);

    // Update display name and avatar if provided and user hasn't set them
    const updates: Record<string, unknown> = {};
    if (args.displayName && !user.displayName) {
      updates.displayName = args.displayName;
    }
    if (args.avatarUrl && !user.avatarUrl) {
      updates.avatarUrl = args.avatarUrl;
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await ctx.db.patch(user._id, updates);
    }
    return user;
  },
});

/**
 * Check if a username is available.
 * Checks both current users and released usernames within grace period.
 */
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalizedUsername = args.username.toLowerCase();

    // Check format validity
    if (!isValidUsername(normalizedUsername)) {
      return { available: false, reason: "invalid_format" };
    }

    // Check if username is taken by current user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (existingUser) {
      return { available: false, reason: "taken" };
    }

    // Check if username is in grace period (released within last 90 days)
    const now = Date.now();
    const releasedUsername = await ctx.db
      .query("releasedUsernames")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (releasedUsername && releasedUsername.expiresAt > now) {
      // Username is in grace period - only original owner can reclaim
      // Use requireUserForQuery to handle both real auth and dev mode
      const currentUser = await requireUserForQuery(ctx);
      
      // Try to get the original user to compare authId (for backwards compatibility)
      const originalUser = await ctx.db.get(releasedUsername.originalUserId);
      
      // Compare by authId if available (stable across user recreation), fallback to _id
      const isOriginalOwner = currentUser && (
        // Prefer authId comparison via stored field
        (releasedUsername.originalUserAuthId && currentUser.authId === releasedUsername.originalUserAuthId) ||
        // Or compare via looking up the original user's authId (for old records)
        (originalUser && currentUser.authId === originalUser.authId) ||
        // Fallback to _id for direct match
        currentUser._id === releasedUsername.originalUserId
      );
      
      if (isOriginalOwner) {
        return { available: true, reason: "reclaim" };
      }
      return { available: false, reason: "grace_period" };
    }

    return { available: true, reason: "available" };
  },
});

/**
 * Set username for the current user.
 * Used for first-time username selection or username changes.
 */
export const setUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);
    const normalizedUsername = args.username.toLowerCase();

    if (!isValidUsername(normalizedUsername)) {
      throw new Error("Invalid username format");
    }

    // Check if same username
    if (user.username === normalizedUsername) {
      return { success: true, username: normalizedUsername };
    }

    // Check if username is available
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (existingUser && existingUser._id !== user._id) {
      throw new Error("Username already taken");
    }

    // Check grace period
    const now = Date.now();
    const releasedUsername = await ctx.db
      .query("releasedUsernames")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (releasedUsername && releasedUsername.expiresAt > now) {
      // Only original owner can reclaim during grace period
      if (releasedUsername.originalUserId !== user._id) {
        throw new Error("Username is in grace period");
      }
      // Remove from released usernames if reclaiming
      await ctx.db.delete(releasedUsername._id);
    }

    // If user has a non-temp username, add old one to released
    const isExistingTempUsername = user.username.startsWith("u_") && !user.usernameSetAt;
    if (!isExistingTempUsername) {
      const GRACE_PERIOD_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
      await ctx.db.insert("releasedUsernames", {
        username: user.username,
        originalUserId: user._id,
        originalUserAuthId: user.authId, // Stable identifier for reclaim check
        releasedAt: now,
        expiresAt: now + GRACE_PERIOD_MS,
      });
    }

    // Update username
    await ctx.db.patch(user._id, {
      username: normalizedUsername,
      usernameSetAt: now,
      updatedAt: now,
    });

    return { success: true, username: normalizedUsername };
  },
});

/**
 * Update user profile (display name, avatar).
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Check if current user has a temporary username (needs to set one).
 */
export const hasTempUsername = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserForQuery(ctx);
    if (!user) return false;
    return user.username.startsWith("u_") && !user.usernameSetAt;
  },
});

/**
 * Suggest a username based on the user's social profile.
 * Tries the display name first, then variations.
 */
export const suggestUsername = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserForQuery(ctx);
    if (!user) return [];

    const name = user.displayName || user.username || "user";

    // Generate base username from name
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);

    if (!baseUsername || baseUsername.length < 3) {
      // Generate random username if name is too short
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      return [`user_${randomSuffix}`];
    }

    const suggestions: string[] = [];

    // Try base username first
    const baseAvailable = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", baseUsername))
      .first();

    if (!baseAvailable) {
      suggestions.push(baseUsername);
    }

    // Try with numbers
    for (let i = 1; i <= 5; i++) {
      const candidate = `${baseUsername}${i}`;
      const taken = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", candidate))
        .first();

      if (!taken && isValidUsername(candidate)) {
        suggestions.push(candidate);
        if (suggestions.length >= 5) break;
      }
    }

    // Try with random suffix if needed
    if (suggestions.length < 3) {
      const randomSuffix = Math.random().toString(36).slice(2, 6);
      const candidate = `${baseUsername.slice(0, 15)}_${randomSuffix}`;
      if (isValidUsername(candidate)) {
        suggestions.push(candidate);
      }
    }

    return suggestions.slice(0, 5);
  },
});

/**
 * Get the user who previously owned a username (for redirect pages).
 * Returns null if username was never released or grace period expired.
 */
export const getPreviousOwner = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalizedUsername = args.username.toLowerCase();

    const released = await ctx.db
      .query("releasedUsernames")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (!released) return null;

    const originalOwner = await ctx.db.get(released.originalUserId);
    if (!originalOwner) return null;

    return {
      oldUsername: normalizedUsername,
      newUsername: originalOwner.username,
      displayName: originalOwner.displayName,
    };
  },
});

/**
 * Clean up expired released usernames.
 * Should be called periodically by a scheduled function.
 */
export const cleanupExpiredUsernames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all expired entries
    const expired = await ctx.db
      .query("releasedUsernames")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete expired entries
    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: expired.length };
  },
});

/**
 * Fix existing releasedUsernames records by adding originalUserAuthId.
 * This is a one-time maintenance mutation for backwards compatibility.
 * If the original user no longer exists, assigns the current user's authId.
 */
export const fixReleasedUsernameAuthIds = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserForMutation(ctx);
    
    // Get all released usernames without originalUserAuthId
    const releasedUsernames = await ctx.db
      .query("releasedUsernames")
      .collect();
    
    let fixed = 0;
    for (const released of releasedUsernames) {
      if (!released.originalUserAuthId) {
        // Try to get the original user
        const originalUser = await ctx.db.get(released.originalUserId);
        
        // Use original user's authId if found, otherwise use current user's authId
        // (assumes current user is the original owner in dev mode)
        const authId = originalUser?.authId ?? user.authId;
        
        await ctx.db.patch(released._id, { originalUserAuthId: authId });
        fixed++;
      }
    }
    
    return { fixed, total: releasedUsernames.length };
  },
});
