import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { getCurrentUser, requireUser } from './lib/auth';

/**
 * Internal helper -- inserts a notification row.
 * Called by other mutations in the same transaction.
 *
 * IMPORTANT: This must never throw. A failure here would roll back the
 * parent mutation (e.g. inviteByUsername). It receives all data as arguments
 * and performs a single db.insert.
 */
export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: string; // Id<'users'> but typed loosely for cross-file ease
    type: string;
    title: string;
    message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert('notifications', {
    userId: args.userId as any,
    type: args.type,
    title: args.title,
    message: args.message,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Lightweight query the bell icon subscribes to.
 * Returns the count of unread notifications for the current user.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', (q) => q.eq('userId', user._id).eq('readAt', undefined))
      .collect();

    return unread.length;
  },
});

/**
 * Returns recent notifications (read + unread) for the dropdown.
 */
export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 20;

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);

    return notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));
  },
});

/**
 * Returns unread warning/ban notifications for the WarningBanner.
 * Returns at most the latest one.
 */
export const getUnreadWarnings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', (q) => q.eq('userId', user._id).eq('readAt', undefined))
      .order('desc')
      .collect();

    const warning = unread.find((n) => n.type === 'warning' || n.type === 'ban');
    if (!warning) return null;

    return {
      _id: warning._id,
      type: warning.type,
      title: warning.title,
      message: warning.message,
      createdAt: warning.createdAt,
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mark a single notification as read.
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) return;

    if (!notification.readAt) {
      await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    }
  },
});

/**
 * Mark all unread notifications for the current user as read.
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', (q) => q.eq('userId', user._id).eq('readAt', undefined))
      .collect();

    const now = Date.now();
    for (const n of unread) {
      await ctx.db.patch(n._id, { readAt: now });
    }

    return { marked: unread.length };
  },
});

/**
 * Dismiss a warning notification (alias for markAsRead, used by the banner).
 */
export const dismissWarning = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) return;

    if (!notification.readAt) {
      await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    }
  },
});
