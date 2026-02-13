import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { requireUser } from './lib/auth';

/**
 * Generate a signed upload URL for Convex file storage.
 * Used by the client to upload thumbnail images directly.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Require authentication to upload files
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Update a project's thumbnail and camera state from an uploaded storage file.
 * Resolves the storage ID to a serving URL and patches the project.
 * Camera state is saved alongside so the viewer can restore the exact view.
 */
export const saveThumbnail = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
    cameraState: v.optional(
      v.object({
        position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        target: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        mode: v.union(v.literal('perspective'), v.literal('orthographic')),
        fov: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    // Only the owner can update the thumbnail
    if (project.userId !== user._id) {
      throw new Error('Not authorized');
    }

    // Resolve storage ID to a serving URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error('Failed to resolve storage URL');

    // Update thumbnail and optionally camera state
    const patch: Record<string, unknown> = { thumbnail: url };
    if (args.cameraState) {
      patch.cameraState = args.cameraState;
    }
    await ctx.db.patch(args.projectId, patch);

    return { success: true, url };
  },
});
