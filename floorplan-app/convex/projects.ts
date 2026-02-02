import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireUserForMutation, requireUserForQuery } from "./devAuth";
import * as crypto from "crypto";

/**
 * Generate content hash (first 8 chars of SHA256)
 * Used for permalink generation
 */
async function contentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 8);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUserForQuery(ctx);
    if (!user) return [];

    return ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const listPublicByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) return [];

    return ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .collect();
  },
});

/**
 * Get project by username and project slug
 */
export const getBySlug = query({
  args: { username: v.string(), projectSlug: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) return null;

    const project = await ctx.db
      .query("projects")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", args.projectSlug)
      )
      .first();

    if (!project) return null;

    if (!project.isPublic) {
      const currentUser = await requireUserForQuery(ctx);
      if (!currentUser) return null;

      if (currentUser._id !== project.userId) {
        const access = await ctx.db
          .query("projectAccess")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) => q.eq(q.field("userId"), currentUser._id))
          .first();

        if (!access) return null;
      }
    }

    // Get fork source info if this is a forked project
    let forkedFrom: { project: typeof project; owner: typeof user } | null = null;
    if (project.forkedFrom) {
      const sourceProject = await ctx.db.get(project.forkedFrom);
      if (sourceProject) {
        const sourceOwner = await ctx.db.get(sourceProject.userId);
        if (sourceOwner) {
          forkedFrom = { project: sourceProject, owner: sourceOwner };
        }
      }
    }

    return { project, owner: user, forkedFrom };
  },
});

/**
 * Create new project with initial snapshot and "main" version
 */
export const create = mutation({
  args: {
    slug: v.string(),
    displayName: v.string(),
    content: v.string(),
    isPublic: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);

    // Check slug uniqueness for this user
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user._id).eq("slug", args.slug)
      )
      .first();

    if (existing) {
      throw new Error("Project with this slug already exists");
    }

    const now = Date.now();
    const hash = await contentHash(args.content);

    // Create project
    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      slug: args.slug,
      displayName: args.displayName,
      description: args.description,
      isPublic: args.isPublic,
      defaultVersion: "main",
      createdAt: now,
      updatedAt: now,
    });

    // Create initial snapshot
    const snapshotId = await ctx.db.insert("snapshots", {
      projectId,
      contentHash: hash,
      content: args.content,
      message: "Initial version",
      authorId: user.authId,
      createdAt: now,
    });

    // Create "main" version pointing to snapshot
    await ctx.db.insert("versions", {
      projectId,
      name: "main",
      snapshotId,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

/**
 * Save changes (create new snapshot, update version)
 */
export const save = mutation({
  args: {
    projectId: v.id("projects"),
    versionName: v.string(),
    content: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const isOwner = project.userId === user._id;
    if (!isOwner) {
      const access = await ctx.db
        .query("projectAccess")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), user._id),
            q.eq(q.field("role"), "editor")
          )
        )
        .first();

      if (!access) throw new Error("Not authorized");
    }

    const now = Date.now();
    const hash = await contentHash(args.content);

    // Get current version to find parent snapshot
    const version = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) =>
        q.eq("projectId", args.projectId).eq("name", args.versionName)
      )
      .first();

    // Create new snapshot
    const snapshotId = await ctx.db.insert("snapshots", {
      projectId: args.projectId,
      contentHash: hash,
      content: args.content,
      message: args.message,
      parentId: version?.snapshotId,
      authorId: user._id,
      createdAt: now,
    });

    // Update or create version to point to new snapshot
    if (version) {
      await ctx.db.patch(version._id, { snapshotId, updatedAt: now });
    } else {
      await ctx.db.insert("versions", {
        projectId: args.projectId,
        name: args.versionName,
        snapshotId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update project timestamp
    await ctx.db.patch(args.projectId, { updatedAt: now });

    return { snapshotId, hash };
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);
    if (!user) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Delete all related data
    const versions = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    const snapshots = await ctx.db
      .query("snapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    const accessList = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const access of accessList) {
      await ctx.db.delete(access._id);
    }

    const shareLinks = await ctx.db
      .query("shareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const link of shareLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete project
    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

/**
 * Get snapshot by hash (for permalinks)
 */
export const getByHash = query({
  args: { projectId: v.id("projects"), hash: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("snapshots")
      .withIndex("by_hash", (q) =>
        q.eq("projectId", args.projectId).eq("contentHash", args.hash)
      )
      .first();
  },
});

/**
 * Get version by name (includes snapshot content)
 */
export const getVersion = query({
  args: { projectId: v.id("projects"), versionName: v.string() },
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) =>
        q.eq("projectId", args.projectId).eq("name", args.versionName)
      )
      .first();

    if (!version) return null;

    const snapshot = await ctx.db.get(version.snapshotId);
    return { version, snapshot };
  },
});

/**
 * Get all versions for a project
 */
export const listVersions = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

const sessionViewCache = new Map<string, { timestamp: number }>();
const DEBOUNCE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Track view for a project with debouncing.
 * 1 view per session per hour (uses session token hash as identifier)
 */
export const trackView = mutation({
  args: {
    projectId: v.id("projects"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const sessionHash = crypto
      .createHash("sha256")
      .update(args.sessionToken)
      .digest("hex");
    const cacheKey = `${args.projectId}-${sessionHash}`;
    const now = Date.now();

    const lastView = sessionViewCache.get(cacheKey);
    if (lastView && now - lastView.timestamp < DEBOUNCE_WINDOW_MS) {
      return {
        success: true,
        debounced: true,
        viewCount: project.viewCount ?? 0,
      };
    }

    const newViewCount = (project.viewCount ?? 0) + 1;
    await ctx.db.patch(args.projectId, { viewCount: newViewCount });

    sessionViewCache.set(cacheKey, { timestamp: now });

    return {
      success: true,
      viewCount: newViewCount,
    };
  },
});

/**
 * Get snapshot history for a project
 */
export const getHistory = query({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("snapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Update project settings (name, visibility, etc.)
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    defaultVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const updates: Partial<typeof project> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.defaultVersion !== undefined)
      updates.defaultVersion = args.defaultVersion;

    await ctx.db.patch(args.projectId, updates);

    return { success: true };
  },
});

/**
 * Create a new version (branch) from current snapshot
 */
export const createVersion = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    fromVersion: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUserForMutation(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const isOwner = project.userId === user._id;
    if (!isOwner) {
      const access = await ctx.db
        .query("projectAccess")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), user._id),
            q.eq(q.field("role"), "editor")
          )
        )
        .first();

      if (!access) throw new Error("Not authorized");
    }

    // Check version name doesn't exist
    const existing = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) =>
        q.eq("projectId", args.projectId).eq("name", args.name)
      )
      .first();

    if (existing) throw new Error("Version with this name already exists");

    // Get source version
    const sourceVersionName = args.fromVersion ?? project.defaultVersion;
    const sourceVersion = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) =>
        q.eq("projectId", args.projectId).eq("name", sourceVersionName)
      )
      .first();

    if (!sourceVersion) throw new Error("Source version not found");

    const now = Date.now();

    // Create new version pointing to same snapshot
    const versionId = await ctx.db.insert("versions", {
      projectId: args.projectId,
      name: args.name,
      snapshotId: sourceVersion.snapshotId,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return versionId;
  },
});
