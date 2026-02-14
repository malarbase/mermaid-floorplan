/**
 * Dev-only Convex mutations for multi-user development authentication.
 *
 * These mutations are guarded by IS_DEV_MODE and will throw in production.
 * They are called from the dev-login page to create/update dev user docs.
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { IS_DEV_MODE } from './lib/auth';

/**
 * Ensure a dev user exists in the database, creating or updating as needed.
 *
 * Called from the dev-login page after generating a JWT for the selected persona.
 * This creates the user document that Convex queries will look up via the authId.
 */
export const ensureDevUser = mutation({
  args: {
    authId: v.string(),
    username: v.string(),
    displayName: v.string(),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!IS_DEV_MODE) {
      throw new Error('ensureDevUser is only available in development');
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_auth_id', (q) => q.eq('authId', args.authId))
      .first();

    if (existing) {
      // Update fields that may have changed (e.g., toggling admin)
      await ctx.db.patch(existing._id, {
        username: args.username,
        displayName: args.displayName,
        isAdmin: args.isAdmin ?? false,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new dev user
    const userId = await ctx.db.insert('users', {
      authId: args.authId,
      username: args.username,
      displayName: args.displayName,
      isAdmin: args.isAdmin ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Get the current dev user by authId.
 *
 * This is the dev equivalent of getCurrentUser — it bypasses ctx.auth
 * and looks up the user directly by authId (passed from the client's
 * localStorage). Guarded by IS_DEV_MODE so it throws in production.
 *
 * This keeps the production getCurrentUser completely free of dev conditionals.
 */
export const getDevCurrentUser = query({
  args: {
    authId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!IS_DEV_MODE) {
      throw new Error('getDevCurrentUser is only available in development');
    }

    return ctx.db
      .query('users')
      .withIndex('by_auth_id', (q) => q.eq('authId', args.authId))
      .first();
  },
});
