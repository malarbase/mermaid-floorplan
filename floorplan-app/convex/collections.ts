import { v } from "convex/values";
import { authenticatedMutation } from "./lib/auth";

export const create = authenticatedMutation({
  args: {
    slug: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = ctx.user;

    if (!user.isAdmin) {
      throw new Error("Only admins can create collections");
    }

    const now = Date.now();
    const collectionId = await ctx.db.insert("collections", {
      slug: args.slug,
      displayName: args.displayName,
      description: args.description,
      projectIds: [],
      createdAt: now,
      updatedAt: now,
    });

    return collectionId;
  },
});

export const update = authenticatedMutation({
  args: {
    collectionId: v.id("collections"),
    slug: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = ctx.user;

    if (!user.isAdmin) {
      throw new Error("Only admins can update collections");
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.collectionId, {
      slug: args.slug,
      displayName: args.displayName,
      description: args.description,
      updatedAt: now,
    });

    return args.collectionId;
  },
});

export const delete_ = authenticatedMutation({
  args: {
    collectionId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const user = ctx.user;

    if (!user.isAdmin) {
      throw new Error("Only admins can delete collections");
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    await ctx.db.delete(args.collectionId);

    return { success: true };
  },
});

// Re-export as 'delete' for API compatibility (reserved keyword workaround)
export { delete_ as delete };

export const addProject = authenticatedMutation({
  args: {
    collectionId: v.id("collections"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = ctx.user;

    if (!user.isAdmin) {
      throw new Error("Only admins can add projects to collections");
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const projectIds = collection.projectIds;
    if (!projectIds.includes(args.projectId)) {
      projectIds.push(args.projectId);

      const now = Date.now();
      await ctx.db.patch(args.collectionId, {
        projectIds,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const removeProject = authenticatedMutation({
  args: {
    collectionId: v.id("collections"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = ctx.user;

    if (!user.isAdmin) {
      throw new Error("Only admins can remove projects from collections");
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const projectIds = collection.projectIds.filter(
      (id) => id !== args.projectId
    );

    const now = Date.now();
    await ctx.db.patch(args.collectionId, {
      projectIds,
      updatedAt: now,
    });

    return { success: true };
  },
});
