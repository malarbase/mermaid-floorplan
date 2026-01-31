import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Generate a cryptographically secure random token for share links.
 */
async function generateShareToken(): Promise<string> {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const hashArray = Array.from(array);
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Role types for access control
 */
type AccessRole = "viewer" | "editor";

/**
 * Check if a user can access a project (query version).
 * Returns the access level or null if no access.
 */
export const checkAccess = query({
  args: {
    projectId: v.id("projects"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Public projects: anyone can view
    if (project.isPublic) {
      // Check if authenticated user has elevated access
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
          .first();

        if (user) {
          // Owner has full access
          if (project.userId === user._id) {
            return { role: "owner" as const, canEdit: true, canManage: true };
          }

          // Check projectAccess for collaborator role
          const access = await ctx.db
            .query("projectAccess")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

          if (access) {
            return {
              role: access.role,
              canEdit: access.role === "editor",
              canManage: false,
            };
          }
        }
      }

      // Default public access: viewer
      return { role: "viewer" as const, canEdit: false, canManage: false };
    }

    // Private project: check authentication
    const identity = await ctx.auth.getUserIdentity();

    // Check share link token first (works for both auth and non-auth)
    if (args.token) {
      const shareLink = await ctx.db
        .query("shareLinks")
        .withIndex("by_token", (q) => q.eq("token", args.token))
        .first();

      if (
        shareLink &&
        shareLink.projectId === args.projectId &&
        (!shareLink.expiresAt || shareLink.expiresAt > Date.now())
      ) {
        return {
          role: shareLink.role,
          canEdit: shareLink.role === "editor",
          canManage: false,
        };
      }
    }

    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!user) return null;

    // Owner has full access
    if (project.userId === user._id) {
      return { role: "owner" as const, canEdit: true, canManage: true };
    }

    // Check projectAccess for collaborator role
    const access = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (access) {
      return {
        role: access.role,
        canEdit: access.role === "editor",
        canManage: false,
      };
    }

    return null;
  },
});

/**
 * Get all collaborators for a project.
 * Only owner can view the full list.
 */
export const getCollaborators = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    // Only owner can see full collaborator list
    if (!user || project.userId !== user._id) {
      return [];
    }

    const accessList = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Fetch user details for each collaborator
    const collaborators = await Promise.all(
      accessList.map(async (access) => {
        const collaborator = await ctx.db.get(access.userId);
        const inviter = await ctx.db.get(access.invitedBy);
        return {
          _id: access._id,
          userId: access.userId,
          username: collaborator?.username ?? "unknown",
          displayName: collaborator?.displayName,
          avatarUrl: collaborator?.avatarUrl,
          role: access.role,
          invitedBy: inviter?.username ?? "unknown",
          createdAt: access.createdAt,
        };
      })
    );

    return collaborators;
  },
});

/**
 * Get all share links for a project.
 * Only owner can view share links.
 */
export const getShareLinks = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    // Only owner can see share links
    if (!user || project.userId !== user._id) {
      return [];
    }

    const links = await ctx.db
      .query("shareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return links.map((link) => ({
      _id: link._id,
      token: link.token,
      role: link.role,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      isExpired: link.expiresAt ? link.expiresAt < Date.now() : false,
    }));
  },
});

/**
 * Invite a user to collaborate on a project by username.
 * Only owner can invite collaborators.
 */
export const inviteByUsername = mutation({
  args: {
    projectId: v.id("projects"),
    username: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Only owner can invite
    if (project.userId !== currentUser._id) {
      throw new Error("Only project owner can invite collaborators");
    }

    // Find user to invite
    const invitee = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .first();

    if (!invitee) {
      throw new Error("User not found");
    }

    // Cannot invite yourself
    if (invitee._id === currentUser._id) {
      throw new Error("Cannot invite yourself");
    }

    // Check if already has access
    const existingAccess = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), invitee._id))
      .first();

    if (existingAccess) {
      // Update role if different
      if (existingAccess.role !== args.role) {
        await ctx.db.patch(existingAccess._id, { role: args.role });
        return { success: true, action: "updated", accessId: existingAccess._id };
      }
      return { success: true, action: "exists", accessId: existingAccess._id };
    }

    // Create access
    const accessId = await ctx.db.insert("projectAccess", {
      projectId: args.projectId,
      userId: invitee._id,
      role: args.role,
      invitedBy: currentUser._id,
      createdAt: Date.now(),
    });

    return { success: true, action: "created", accessId };
  },
});

/**
 * Remove a collaborator from a project.
 * Only owner can remove collaborators.
 */
export const removeCollaborator = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Only owner can remove collaborators
    if (project.userId !== currentUser._id) {
      throw new Error("Only project owner can remove collaborators");
    }

    // Find and remove access
    const access = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!access) {
      throw new Error("Collaborator not found");
    }

    await ctx.db.delete(access._id);

    return { success: true };
  },
});

/**
 * Update a collaborator's role.
 * Only owner can update roles.
 */
export const updateCollaboratorRole = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Only owner can update roles
    if (project.userId !== currentUser._id) {
      throw new Error("Only project owner can update collaborator roles");
    }

    // Find access
    const access = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!access) {
      throw new Error("Collaborator not found");
    }

    await ctx.db.patch(access._id, { role: args.role });

    return { success: true };
  },
});

/**
 * Create a share link for "anyone with link" access.
 * Only owner can create share links.
 */
export const createShareLink = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Only owner can create share links
    if (project.userId !== currentUser._id) {
      throw new Error("Only project owner can create share links");
    }

    const token = await generateShareToken();
    const now = Date.now();

    const linkId = await ctx.db.insert("shareLinks", {
      projectId: args.projectId,
      token,
      role: args.role,
      expiresAt: args.expiresInDays
        ? now + args.expiresInDays * 24 * 60 * 60 * 1000
        : undefined,
      createdAt: now,
    });

    return { success: true, linkId, token };
  },
});

/**
 * Revoke (delete) a share link.
 * Only owner can revoke share links.
 */
export const revokeShareLink = mutation({
  args: { linkId: v.id("shareLinks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Share link not found");

    const project = await ctx.db.get(link.projectId);
    if (!project) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Only owner can revoke share links
    if (project.userId !== currentUser._id) {
      throw new Error("Only project owner can revoke share links");
    }

    await ctx.db.delete(args.linkId);

    return { success: true };
  },
});

/**
 * Validate a share link token and get project info.
 * Used when accessing a project via share link.
 */
export const validateShareLink = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) {
      return { valid: false, reason: "not_found" as const };
    }

    // Check expiration
    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { valid: false, reason: "expired" as const };
    }

    const project = await ctx.db.get(link.projectId);
    if (!project) {
      return { valid: false, reason: "project_not_found" as const };
    }

    const owner = await ctx.db.get(project.userId);

    return {
      valid: true,
      projectId: project._id,
      projectSlug: project.slug,
      projectName: project.displayName,
      ownerUsername: owner?.username ?? "unknown",
      role: link.role,
    };
  },
});

/**
 * Get projects the current user has access to (as collaborator, not owner).
 */
export const getSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!user) return [];

    const accessList = await ctx.db
      .query("projectAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch project details for each
    const projects = await Promise.all(
      accessList.map(async (access) => {
        const project = await ctx.db.get(access.projectId);
        if (!project) return null;

        const owner = await ctx.db.get(project.userId);

        return {
          project: {
            _id: project._id,
            slug: project.slug,
            displayName: project.displayName,
            description: project.description,
            isPublic: project.isPublic,
            updatedAt: project.updatedAt,
          },
          owner: {
            username: owner?.username ?? "unknown",
            displayName: owner?.displayName,
          },
          role: access.role,
          sharedAt: access.createdAt,
        };
      })
    );

    return projects.filter((p) => p !== null);
  },
});

/**
 * Fork a project (create a copy owned by the current user).
 * Requires at least viewer access to the source project.
 */
export const forkProject = mutation({
  args: {
    projectId: v.id("projects"),
    slug: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const sourceProject = await ctx.db.get(args.projectId);
    if (!sourceProject) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Check access (public or has explicit access)
    let hasAccess = sourceProject.isPublic;
    if (!hasAccess) {
      if (sourceProject.userId === currentUser._id) {
        hasAccess = true;
      } else {
        const access = await ctx.db
          .query("projectAccess")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .filter((q) => q.eq(q.field("userId"), currentUser._id))
          .first();
        hasAccess = !!access;
      }
    }

    if (!hasAccess) {
      throw new Error("No access to fork this project");
    }

    // Check slug uniqueness for new owner
    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", currentUser._id).eq("slug", args.slug)
      )
      .first();

    if (existingProject) {
      throw new Error("You already have a project with this slug");
    }

    // Get default version snapshot from source
    const defaultVersion = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) =>
        q.eq("projectId", args.projectId).eq("name", sourceProject.defaultVersion)
      )
      .first();

    if (!defaultVersion) {
      throw new Error("Source project has no default version");
    }

    const sourceSnapshot = await ctx.db.get(defaultVersion.snapshotId);
    if (!sourceSnapshot) {
      throw new Error("Source snapshot not found");
    }

    const now = Date.now();

    // Create forked project
    const newProjectId = await ctx.db.insert("projects", {
      userId: currentUser._id,
      slug: args.slug,
      displayName: args.displayName ?? sourceProject.displayName,
      description: sourceProject.description,
      isPublic: false, // Forks start as private
      defaultVersion: "main",
      forkedFrom: args.projectId,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial snapshot (copy content)
    const newSnapshotId = await ctx.db.insert("snapshots", {
      projectId: newProjectId,
      contentHash: sourceSnapshot.contentHash,
      content: sourceSnapshot.content,
      message: `Forked from ${sourceProject.displayName}`,
      authorId: identity.subject,
      createdAt: now,
    });

    // Create main version
    await ctx.db.insert("versions", {
      projectId: newProjectId,
      name: "main",
      snapshotId: newSnapshotId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, projectId: newProjectId };
  },
});

/**
 * Get fork information for a project.
 * Returns the source project info if this project is a fork.
 */
export const getForkSource = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.forkedFrom) return null;

    const sourceProject = await ctx.db.get(project.forkedFrom);
    if (!sourceProject) {
      // Source was deleted
      return { deleted: true, projectId: project.forkedFrom };
    }

    const owner = await ctx.db.get(sourceProject.userId);

    return {
      deleted: false,
      projectId: sourceProject._id,
      slug: sourceProject.slug,
      displayName: sourceProject.displayName,
      ownerUsername: owner?.username ?? "unknown",
      isPublic: sourceProject.isPublic,
    };
  },
});

/**
 * Leave a shared project (remove your own access).
 * Cannot be used by the project owner.
 */
export const leaveProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Owner cannot leave their own project
    if (project.userId === currentUser._id) {
      throw new Error("Owner cannot leave their own project. Transfer or delete instead.");
    }

    // Find and remove access
    const access = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), currentUser._id))
      .first();

    if (!access) {
      throw new Error("You don't have access to this project");
    }

    await ctx.db.delete(access._id);

    return { success: true };
  },
});
