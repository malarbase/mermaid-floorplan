import { v } from 'convex/values';
import { customCtx, customMutation } from 'convex-helpers/server/customFunctions';
import { query, mutation as rawMutation } from './_generated/server';
import { adminAuditLog, triggers } from './lib/auditLog';
import { isSuperAdmin, requireAdmin, requireSuperAdmin } from './lib/auth';
import { createNotification } from './notifications';

const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

export const setFeatured = mutation({
  args: {
    projectId: v.id('projects'),
    isFeatured: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    await ctx.db.patch(args.projectId, {
      isFeatured: args.isFeatured,
    });

    if (args.isFeatured) {
      await createNotification(ctx, {
        userId: project.userId,
        type: 'project.featured',
        title: `Your project "${project.displayName}" was featured!`,
        metadata: { projectId: args.projectId },
      });
    }

    return { success: true };
  },
});

export const promoteToAdmin = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser.isAdmin) {
      throw new Error('User is already an admin');
    }

    await ctx.db.patch(args.userId, {
      isAdmin: true,
    });

    await createNotification(ctx, {
      userId: args.userId,
      type: 'admin.promoted',
      title: 'You have been promoted to admin',
    });

    return { success: true };
  },
});

export const demoteFromAdmin = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const superAdmin = await requireSuperAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (!targetUser.isAdmin) {
      throw new Error('User is not an admin');
    }

    if (targetUser._id === superAdmin._id) {
      throw new Error('Cannot demote yourself');
    }

    if (isSuperAdmin(targetUser)) {
      throw new Error('Cannot demote super admin');
    }

    await ctx.db.patch(args.userId, {
      isAdmin: false,
    });

    return { success: true };
  },
});

/**
 * Admin Queries
 */

/**
 * List all projects with optional search and pagination
 */
export const listAllProjects = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let projects = await ctx.db.query('projects').collect();

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.displayName.toLowerCase().includes(searchLower) ||
          p.slug.toLowerCase().includes(searchLower),
      );
    }

    // Apply limit
    const limit = args.limit ?? 50;
    const limitedProjects = projects.slice(0, limit);

    // Enrich with owner username
    const enriched = await Promise.all(
      limitedProjects.map(async (p) => {
        const owner = await ctx.db.get(p.userId);
        return {
          _id: p._id,
          displayName: p.displayName,
          slug: p.slug,
          ownerUsername: owner?.username ?? 'Unknown',
          viewCount: p.viewCount ?? 0,
          forkCount: p.forkCount ?? 0,
          isFeatured: p.isFeatured ?? false,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    );

    return enriched;
  },
});

/**
 * List all users with optional search and pagination
 */
export const listAllUsers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAdmin(ctx);
    const isSuper = isSuperAdmin(currentUser);

    let users = await ctx.db.query('users').collect();

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchLower) ||
          (u.displayName?.toLowerCase().includes(searchLower) ?? false),
      );
    }

    // Apply limit
    const limit = args.limit ?? 50;
    const limitedUsers = users.slice(0, limit);

    // Map to safe fields (email only for super admin)
    return limitedUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      displayName: u.displayName,
      email: isSuper ? (u as Record<string, unknown>).email : undefined, // Only super admin sees emails
      isAdmin: u.isAdmin ?? false,
      isSuperAdmin: isSuperAdmin(u),
      bannedUntil: u.bannedUntil,
      createdAt: u.createdAt,
    }));
  },
});

/**
 * Get current user's admin status
 * Used by admin UI to determine super admin capabilities
 */
export const getCurrentUserAdminStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    return {
      isAdmin: user.isAdmin ?? false,
      isSuperAdmin: isSuperAdmin(user),
    };
  },
});

/**
 * Get admin statistics
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const projects = await ctx.db.query('projects').collect();
    const users = await ctx.db.query('users').collect();

    return {
      totalProjects: projects.length,
      featuredProjects: projects.filter((p) => p.isFeatured).length,
      totalUsers: users.length,
      adminUsers: users.filter((u) => u.isAdmin).length,
    };
  },
});

/**
 * Super Admin: Delete project with cascade (delete all related data)
 */
export const deleteProject = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // CASCADE: Delete related data

    // 1. Delete versions
    const versions = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    // 2. Delete snapshots
    const snapshots = await ctx.db
      .query('snapshots')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    // 3. Delete project access
    const accessEntries = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const access of accessEntries) {
      await ctx.db.delete(access._id);
    }

    // 4. Delete share links
    const shareLinks = await ctx.db
      .query('shareLinks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const link of shareLinks) {
      await ctx.db.delete(link._id);
    }

    // 5. Delete project topics
    const projectTopics = await ctx.db
      .query('projectTopics')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const topic of projectTopics) {
      await ctx.db.delete(topic._id);
    }

    // 6. Finally delete the project itself
    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

/**
 * Warn a user (admin moderation action)
 */
export const warnUser = mutation({
  args: {
    userId: v.id('users'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser._id === admin._id) {
      throw new Error('Cannot warn yourself');
    }

    if (isSuperAdmin(targetUser)) {
      throw new Error('Cannot warn a super admin');
    }

    const history = targetUser.moderationHistory ?? [];
    history.push({
      action: 'warn' as const,
      reason: args.reason,
      actorId: admin._id,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.userId, { moderationHistory: history });

    await createNotification(ctx, {
      userId: args.userId,
      type: 'warning',
      title: 'You received a warning from an administrator',
      message: args.reason,
    });

    return { success: true };
  },
});

/**
 * Ban a user (admin moderation action)
 */
export const banUser = mutation({
  args: {
    userId: v.id('users'),
    reason: v.string(),
    duration: v.union(v.literal('1d'), v.literal('7d'), v.literal('30d'), v.literal('permanent')),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser._id === admin._id) {
      throw new Error('Cannot ban yourself');
    }

    if (isSuperAdmin(targetUser)) {
      throw new Error('Cannot ban a super admin');
    }

    const durationMs: Record<string, number> = {
      '1d': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      permanent: Number.MAX_SAFE_INTEGER,
    };

    const bannedUntil =
      args.duration === 'permanent'
        ? Number.MAX_SAFE_INTEGER
        : Date.now() + durationMs[args.duration];

    const history = targetUser.moderationHistory ?? [];
    history.push({
      action: 'ban' as const,
      reason: args.reason,
      duration: args.duration,
      actorId: admin._id,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.userId, {
      bannedUntil,
      bannedAt: Date.now(),
      moderationHistory: history,
    });

    const durationLabel =
      args.duration === 'permanent'
        ? 'permanently'
        : `for ${args.duration.replace('d', ' day(s)')}`;
    await createNotification(ctx, {
      userId: args.userId,
      type: 'ban',
      title: `Your account has been suspended ${durationLabel}`,
      message: args.reason,
      metadata: { duration: args.duration },
    });

    return { success: true };
  },
});

/**
 * Unban a user (admin moderation action)
 */
export const unbanUser = mutation({
  args: {
    userId: v.id('users'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    const history = targetUser.moderationHistory ?? [];
    history.push({
      action: 'unban' as const,
      reason: args.reason,
      actorId: admin._id,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.userId, {
      bannedUntil: undefined,
      bannedAt: undefined,
      moderationHistory: history,
    });

    await createNotification(ctx, {
      userId: args.userId,
      type: 'ban_lifted',
      title: 'Your account suspension has been lifted',
      message: args.reason,
    });

    return { success: true };
  },
});

/**
 * Admin: Update a user's display name
 */
export const updateUserDisplayName = mutation({
  args: {
    userId: v.id('users'),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const trimmed = args.displayName.trim();
    if (!trimmed) {
      throw new Error('Display name cannot be empty');
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    await ctx.db.patch(args.userId, {
      displayName: trimmed,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * List all projects belonging to a specific user
 */
export const listUserProjects = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return projects.map((p) => ({
      _id: p._id,
      displayName: p.displayName,
      slug: p.slug,
      isPublic: p.isPublic,
      isFeatured: p.isFeatured ?? false,
      viewCount: p.viewCount ?? 0,
      forkCount: p.forkCount ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

/**
 * Get moderation history for a user, enriched with actor usernames
 */
export const getUserModerationHistory = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    const history = targetUser.moderationHistory ?? [];

    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        const actor = await ctx.db.get(entry.actorId);
        return {
          ...entry,
          actorUsername: actor?.username ?? 'Unknown',
        };
      }),
    );

    const isBanned = !!targetUser.bannedUntil && targetUser.bannedUntil > Date.now();

    return {
      history: enrichedHistory,
      banStatus: {
        isBanned,
        bannedUntil: isBanned ? targetUser.bannedUntil : undefined,
      },
    };
  },
});

/**
 * Get audit log history
 * Wraps convex-table-history to provide a list of admin actions
 */
export const getAuditLog = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const maxTs = Date.now();
    const limit = args.limit ?? 100;

    const history = await adminAuditLog.listHistory(ctx, maxTs, {
      numItems: limit,
      cursor: null,
    });

    return history.page.map((entry) => {
      let action = 'updated';
      let target = 'Unknown';
      let details = '';

      if (entry.isDeleted) {
        action = 'deleted';
      }

      if (entry.doc) {
        if ('displayName' in entry.doc) {
          target = `Project: ${entry.doc.displayName}`;
          if (entry.doc.isFeatured) {
            details = 'Featured status active';
          }
        } else if ('username' in entry.doc) {
          target = `User: ${entry.doc.username}`;
          if (entry.doc.isAdmin) {
            details = 'Admin privileges active';
          }
        }
      } else {
        target = `ID: ${entry.id}`;
      }

      return {
        ts: entry.ts,
        action,
        actor: formatActor(entry.attribution),
        target,
        details: details || 'Property update',
        rawAction: action,
        table: entry.doc ? ('displayName' in entry.doc ? 'projects' : 'users') : 'unknown',
      };
    });
  },
});

function formatActor(attribution: Record<string, unknown> | string | null | undefined): string {
  if (!attribution) return 'System';
  if (typeof attribution === 'object') {
    if (attribution.name) return String(attribution.name);
    if (attribution.email) return String(attribution.email);
    const tokenId = attribution.tokenIdentifier;
    if (typeof tokenId === 'string') {
      return tokenId.split('|').pop() || 'Unknown';
    }
  }
  return String(attribution);
}

/**
 * Super Admin: Start impersonating a user
 * Returns the target user ID for frontend to switch context
 */
export const startImpersonation = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const superAdmin = await requireSuperAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Cannot impersonate another super admin
    if (isSuperAdmin(targetUser)) {
      throw new Error('Cannot impersonate super admin');
    }

    // For MVP: Frontend-only impersonation
    // Return target user info for client to store
    return {
      success: true,
      targetUserId: args.userId,
      targetUsername: targetUser.username,
      superAdminId: superAdmin._id,
    };
  },
});

/**
 * Super Admin: End impersonation session
 * Signal to frontend to return to super admin context
 */
export const endImpersonation = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    // For MVP: Just a signal to frontend
    return { success: true };
  },
});
