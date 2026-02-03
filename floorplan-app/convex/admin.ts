import { v } from "convex/values";
import { mutation as rawMutation, query } from "./_generated/server";
import { requireAdmin, requireSuperAdmin, isSuperAdmin } from "./lib/auth";
import { customMutation, customCtx } from "convex-helpers/server/customFunctions";
import { triggers } from "./lib/auditLog";

const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

export const setFeatured = mutation({
  args: {
    projectId: v.id("projects"),
    isFeatured: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    
    await ctx.db.patch(args.projectId, {
      isFeatured: args.isFeatured,
    });
    
    return { success: true };
  },
});

export const promoteToAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }
    
    if (targetUser.isAdmin) {
      throw new Error("User is already an admin");
    }
    
    await ctx.db.patch(args.userId, {
      isAdmin: true,
    });
    
    return { success: true };
  },
});

export const demoteFromAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const superAdmin = await requireSuperAdmin(ctx);
    
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }
    
    if (!targetUser.isAdmin) {
      throw new Error("User is not an admin");
    }
    
    if (targetUser._id === superAdmin._id) {
      throw new Error("Cannot demote yourself");
    }
    
    if (isSuperAdmin(targetUser)) {
      throw new Error("Cannot demote super admin");
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

    let projects = await ctx.db.query("projects").collect();

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.displayName.toLowerCase().includes(searchLower) ||
          p.slug.toLowerCase().includes(searchLower)
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
          ownerUsername: owner?.username ?? "Unknown",
          viewCount: p.viewCount ?? 0,
          forkCount: p.forkCount ?? 0,
          isFeatured: p.isFeatured ?? false,
          isPublic: p.isPublic,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      })
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

    let users = await ctx.db.query("users").collect();

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchLower) ||
          (u.displayName?.toLowerCase().includes(searchLower) ?? false)
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
      email: isSuper ? (u as any).email : undefined, // Only super admin sees emails
      isAdmin: u.isAdmin ?? false,
      isSuperAdmin: isSuperAdmin(u),
      createdAt: u.createdAt,
    }));
  },
});

/**
 * Get admin statistics
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const projects = await ctx.db.query("projects").collect();
    const users = await ctx.db.query("users").collect();

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
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // CASCADE: Delete related data
    
    // 1. Delete versions
    const versions = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    // 2. Delete snapshots
    const snapshots = await ctx.db
      .query("snapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    // 3. Delete project access
    const accessEntries = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const access of accessEntries) {
      await ctx.db.delete(access._id);
    }

    // 4. Delete share links
    const shareLinks = await ctx.db
      .query("shareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const link of shareLinks) {
      await ctx.db.delete(link._id);
    }

    // 5. Delete project topics
    const projectTopics = await ctx.db
      .query("projectTopics")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
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
 * Super Admin: Start impersonating a user
 * Returns the target user ID for frontend to switch context
 */
export const startImpersonation = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const superAdmin = await requireSuperAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Cannot impersonate another super admin
    if (isSuperAdmin(targetUser)) {
      throw new Error("Cannot impersonate super admin");
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
