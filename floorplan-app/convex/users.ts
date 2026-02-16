import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { getCurrentUser as getAuthUser, requireUser } from './lib/auth';

// ============================================================================
// Constants for adaptive username reservation system
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

/** Base cooldown between username changes (7 days), doubles each change */
const BASE_COOLDOWN_DAYS = 7;
/** Maximum cooldown cap (180 days) */
const MAX_COOLDOWN_DAYS = 180;
/** Rolling window for counting recent changes (365 days) */
const COOLDOWN_WINDOW_MS = YEAR_MS;

/** Reservation = 50% of time held */
const RESERVATION_FACTOR = 0.5;
/** Minimum reservation period (7 days) */
const MIN_RESERVATION_DAYS = 7;
/** Maximum reservation period (90 days) */
const MAX_RESERVATION_DAYS = 90;

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Generate a temporary username from authId.
 * Format: "u_" + first 8 chars of a hash
 */
async function _generateTempUsername(authId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(authId + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `u_${hashHex.slice(0, 8)}`;
}

/**
 * Validate username format.
 * Must be 3-30 characters, alphanumeric with underscores, not starting with underscore.
 */
function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 30) return false;
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9_]{2,29}$/;
  return pattern.test(username);
}

/**
 * Calculate exponential cooldown based on recent change count.
 *
 * Formula: cooldown_days = min(BASE * 2^(n-1), MAX)
 * where n = number of changes in rolling 365-day window.
 *
 * | Changes in year | Cooldown |
 * |-----------------|----------|
 * | 1st             | 0 (free) |
 * | 2nd             | 7 days   |
 * | 3rd             | 14 days  |
 * | 4th             | 28 days  |
 * | 5th             | 56 days  |
 * | 6th             | 112 days |
 * | 7th+            | 180 days |
 */
function calculateCooldownMs(recentChangeCount: number): number {
  if (recentChangeCount <= 0) return 0;
  const cooldownDays = Math.min(
    BASE_COOLDOWN_DAYS * 2 ** (recentChangeCount - 1),
    MAX_COOLDOWN_DAYS,
  );
  return cooldownDays * DAY_MS;
}

/**
 * Calculate tenure-proportional reservation duration.
 *
 * Formula: reservation = clamp(days_held * 0.5, MIN, MAX)
 *
 * | Held for   | Reserved for |
 * |------------|-------------|
 * | < 14 days  | 7 days      |
 * | 1 month    | 15 days     |
 * | 2 months   | 30 days     |
 * | 6+ months  | 90 days     |
 */
function calculateReservationMs(heldSinceMs: number, nowMs: number): number {
  const daysHeld = (nowMs - heldSinceMs) / DAY_MS;
  const reservationDays = Math.max(
    MIN_RESERVATION_DAYS,
    Math.min(Math.floor(daysHeld * RESERVATION_FACTOR), MAX_RESERVATION_DAYS),
  );
  return reservationDays * DAY_MS;
}

/**
 * Count username changes within the rolling window.
 */
function countRecentChanges(
  usernameChanges: Array<{ changedAt: number }> | undefined,
  nowMs: number,
): number {
  if (!usernameChanges) return 0;
  const windowStart = nowMs - COOLDOWN_WINDOW_MS;
  return usernameChanges.filter((c) => c.changedAt > windowStart).length;
}

/**
 * Get cooldown expiry timestamp. Returns 0 if no cooldown active.
 */
function getCooldownExpiry(
  usernameChanges: Array<{ changedAt: number }> | undefined,
  lastUsernameChangeAt: number | undefined,
  nowMs: number,
): number {
  const recentCount = countRecentChanges(usernameChanges, nowMs);
  if (recentCount === 0 || !lastUsernameChangeAt) return 0;
  const cooldownMs = calculateCooldownMs(recentCount);
  return lastUsernameChangeAt + cooldownMs;
}

/**
 * Get the current authenticated user's profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});

/**
 * Get the ban status of the current authenticated user.
 *
 * Unlike getCurrentUser (which returns null for banned users),
 * this query bypasses the ban filter to read bannedUntil directly.
 * Used by the frontend BanGuard to detect and display ban status.
 *
 * Returns null if not authenticated.
 */
export const getBanStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
      .first();

    if (!user) return null;

    const isBanned = !!user.bannedUntil && user.bannedUntil > Date.now();
    return {
      isBanned,
      bannedUntil: isBanned ? user.bannedUntil : undefined,
    };
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
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
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
  args: { userId: v.id('users') },
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
    const user = await requireUser(ctx);

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
 * Returns reservation expiry info for grace period usernames.
 */
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalizedUsername = args.username.toLowerCase();

    // Check format validity
    if (!isValidUsername(normalizedUsername)) {
      return { available: false, reason: 'invalid_format' as const };
    }

    // Check if username is taken by current user
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', normalizedUsername))
      .first();

    if (existingUser) {
      return { available: false, reason: 'taken' as const };
    }

    // Check if username is in reservation period
    const now = Date.now();
    const releasedUsername = await ctx.db
      .query('releasedUsernames')
      .withIndex('by_username', (q) => q.eq('username', normalizedUsername))
      .first();

    if (releasedUsername && releasedUsername.expiresAt > now) {
      // Username is reserved - only original owner can reclaim
      const currentUser = await getAuthUser(ctx);

      // Try to get the original user to compare authId (for backwards compatibility)
      const originalUser = await ctx.db.get(releasedUsername.originalUserId);

      // Compare by authId if available (stable across user recreation), fallback to _id
      const isOriginalOwner =
        currentUser &&
        ((releasedUsername.originalUserAuthId &&
          currentUser.authId === releasedUsername.originalUserAuthId) ||
          (originalUser && currentUser.authId === originalUser.authId) ||
          currentUser._id === releasedUsername.originalUserId);

      if (isOriginalOwner) {
        return { available: true, reason: 'reclaim' as const };
      }

      const daysRemaining = Math.ceil((releasedUsername.expiresAt - now) / DAY_MS);
      return {
        available: false,
        reason: 'grace_period' as const,
        daysRemaining,
      };
    }

    return { available: true, reason: 'available' as const };
  },
});

/**
 * Set username for the current user.
 * Implements adaptive anti-DOS protections:
 *
 * 1. **Exponential cooldown**: Each change in a rolling year increases the wait
 *    before the next change (7d → 14d → 28d → 56d → 112d → 180d cap).
 * 2. **Tenure-proportional reservation**: Old username is reserved for
 *    50% of the time held (min 7 days, max 90 days).
 * 3. **Single reservation limit**: Only the most recent old username is reserved.
 *    Previous reservations are immediately released.
 * 4. **Free undo**: Reclaiming your most recently released username doesn't
 *    count as a change and has no cooldown penalty.
 *
 * First-time setup (from temp username) bypasses all cooldowns.
 */
export const setUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const normalizedUsername = args.username.toLowerCase();
    const now = Date.now();

    if (!isValidUsername(normalizedUsername)) {
      throw new Error('Invalid username format');
    }

    // No-op if same username
    if (user.username === normalizedUsername) {
      return { success: true, username: normalizedUsername };
    }

    // Check if username is taken by another user
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', normalizedUsername))
      .first();

    if (existingUser && existingUser._id !== user._id) {
      throw new Error('Username already taken');
    }

    // Check if target username is reserved by someone else
    const targetReservation = await ctx.db
      .query('releasedUsernames')
      .withIndex('by_username', (q) => q.eq('username', normalizedUsername))
      .first();

    if (targetReservation && targetReservation.expiresAt > now) {
      if (targetReservation.originalUserId !== user._id) {
        throw new Error('Username is reserved by another user');
      }
    }

    // Determine if this is first-time setup (temp username → real username)
    const isFirstTimeSetup = user.username.startsWith('u_') && !user.usernameSetAt;

    // Determine if this is an "undo" (reclaiming most recently released username)
    const myReservation = await ctx.db
      .query('releasedUsernames')
      .withIndex('by_original_user', (q) => q.eq('originalUserId', user._id))
      .first();
    const isUndo =
      myReservation &&
      myReservation.username === normalizedUsername &&
      myReservation.expiresAt > now;

    // --- Cooldown check (skip for first-time setup and undo) ---
    if (!isFirstTimeSetup && !isUndo) {
      const recentCount = countRecentChanges(user.usernameChanges, now);
      const cooldownExpiry = getCooldownExpiry(
        user.usernameChanges,
        user.lastUsernameChangeAt,
        now,
      );

      if (now < cooldownExpiry) {
        const daysRemaining = Math.ceil((cooldownExpiry - now) / DAY_MS);
        throw new Error(
          `Username change cooldown: please wait ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. ` +
            `You've changed your username ${recentCount} time${recentCount === 1 ? '' : 's'} this year.`,
        );
      }
    }

    // --- Release old reservation (single reservation limit) ---
    // Delete ALL existing reservations for this user before creating a new one
    const existingReservations = await ctx.db
      .query('releasedUsernames')
      .withIndex('by_original_user', (q) => q.eq('originalUserId', user._id))
      .collect();
    for (const reservation of existingReservations) {
      await ctx.db.delete(reservation._id);
    }

    // --- Also clean up the target reservation if reclaiming ---
    if (targetReservation && targetReservation.expiresAt > now) {
      // Already deleted above if it was ours; delete if it somehow wasn't caught
      const stillExists = await ctx.db.get(targetReservation._id);
      if (stillExists) {
        await ctx.db.delete(targetReservation._id);
      }
    }

    // --- Create tenure-proportional reservation for current username ---
    if (!isFirstTimeSetup) {
      const heldSince = user.usernameSetAt ?? user.createdAt;
      const reservationMs = calculateReservationMs(heldSince, now);

      await ctx.db.insert('releasedUsernames', {
        username: user.username,
        originalUserId: user._id,
        originalUserAuthId: user.authId,
        releasedAt: now,
        expiresAt: now + reservationMs,
      });
    }

    // --- Record change history (skip for first-time setup and undo) ---
    const usernameChanges = user.usernameChanges ?? [];
    if (!isFirstTimeSetup && !isUndo) {
      usernameChanges.push({
        username: user.username,
        changedAt: now,
        heldSince: user.usernameSetAt ?? user.createdAt,
      });
    }

    // --- Update user ---
    await ctx.db.patch(user._id, {
      username: normalizedUsername,
      usernameSetAt: now,
      updatedAt: now,
      usernameChanges,
      ...(isFirstTimeSetup || isUndo ? {} : { lastUsernameChangeAt: now }),
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
    const user = await requireUser(ctx);
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
    const user = await getAuthUser(ctx);
    if (!user) return false;
    return user.username.startsWith('u_') && !user.usernameSetAt;
  },
});

/**
 * Get username change cooldown status for the current user.
 * Returns cooldown info including:
 * - Whether the user can change their username now
 * - How long until the cooldown expires (if active)
 * - How many changes they've made recently
 * - How long their current username reservation would last
 * - Their most recent released username (for undo)
 */
export const getUsernameCooldown = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) {
      return null;
    }

    const now = Date.now();
    const isTemp = user.username.startsWith('u_') && !user.usernameSetAt;

    // First-time setup has no cooldown
    if (isTemp) {
      return {
        canChange: true,
        isFirstTimeSetup: true,
        cooldownExpiresAt: null,
        daysRemaining: 0,
        recentChangeCount: 0,
        currentReservationDays: 0,
        mostRecentReleasedUsername: null,
      };
    }

    const recentCount = countRecentChanges(user.usernameChanges, now);
    const cooldownExpiry = getCooldownExpiry(user.usernameChanges, user.lastUsernameChangeAt, now);
    const canChange = now >= cooldownExpiry;

    // Calculate how long current username would be reserved if changed
    const heldSince = user.usernameSetAt ?? user.createdAt;
    const reservationMs = calculateReservationMs(heldSince, now);
    const currentReservationDays = Math.round(reservationMs / DAY_MS);

    // Find most recent released username (for undo display)
    const myReservation = await ctx.db
      .query('releasedUsernames')
      .withIndex('by_original_user', (q) => q.eq('originalUserId', user._id))
      .first();

    const mostRecentReleasedUsername =
      myReservation && myReservation.expiresAt > now ? myReservation.username : null;

    return {
      canChange,
      isFirstTimeSetup: false,
      cooldownExpiresAt: canChange ? null : cooldownExpiry,
      daysRemaining: canChange ? 0 : Math.ceil((cooldownExpiry - now) / DAY_MS),
      recentChangeCount: recentCount,
      currentReservationDays,
      mostRecentReleasedUsername,
    };
  },
});

/**
 * Suggest a username based on the user's social profile.
 * Tries the display name first, then variations.
 */
export const suggestUsername = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    const name = user.displayName || user.username || 'user';

    // Generate base username from name
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);

    if (!baseUsername || baseUsername.length < 3) {
      // Generate random username if name is too short
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      return [`user_${randomSuffix}`];
    }

    const suggestions: string[] = [];

    // Try base username first
    const baseAvailable = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', baseUsername))
      .first();

    if (!baseAvailable) {
      suggestions.push(baseUsername);
    }

    // Try with numbers
    for (let i = 1; i <= 5; i++) {
      const candidate = `${baseUsername}${i}`;
      const taken = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', candidate))
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
      .query('releasedUsernames')
      .withIndex('by_username', (q) => q.eq('username', normalizedUsername))
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
      .query('releasedUsernames')
      .filter((q) => q.lt(q.field('expiresAt'), now))
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
    const user = await requireUser(ctx);

    // Get all released usernames without originalUserAuthId
    const releasedUsernames = await ctx.db.query('releasedUsernames').collect();

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
