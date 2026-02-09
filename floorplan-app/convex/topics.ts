import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { requireUser } from './lib/auth';

export const assignToProject = mutation({
  args: {
    projectId: v.id('projects'),
    topicId: v.id('topics'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const isOwner = project.userId === user._id;
    const isAdmin = user.isAdmin ?? false;
    if (!isOwner && !isAdmin) {
      throw new Error('Only project owner or admin can assign topics');
    }

    const topic = await ctx.db.get(args.topicId);
    if (!topic) throw new Error('Topic not found');

    const existing = await ctx.db
      .query('projectTopics')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('topicId'), args.topicId))
      .first();

    if (existing) {
      throw new Error('Topic already assigned to project');
    }

    const currentTopics = await ctx.db
      .query('projectTopics')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    if (currentTopics.length >= 5) {
      throw new Error('Maximum 5 topics per project');
    }

    await ctx.db.insert('projectTopics', {
      projectId: args.projectId,
      topicId: args.topicId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.topicId, {
      projectCount: (topic.projectCount ?? 0) + 1,
    });

    return { success: true };
  },
});

export const removeFromProject = mutation({
  args: {
    projectId: v.id('projects'),
    topicId: v.id('topics'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const isOwner = project.userId === user._id;
    const isAdmin = user.isAdmin ?? false;
    if (!isOwner && !isAdmin) {
      throw new Error('Only project owner or admin can remove topics');
    }

    const topic = await ctx.db.get(args.topicId);
    if (!topic) throw new Error('Topic not found');

    const projectTopic = await ctx.db
      .query('projectTopics')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('topicId'), args.topicId))
      .first();

    if (!projectTopic) {
      throw new Error('Topic not assigned to project');
    }

    await ctx.db.delete(projectTopic._id);

    await ctx.db.patch(args.topicId, {
      projectCount: Math.max(0, (topic.projectCount ?? 1) - 1),
    });

    return { success: true };
  },
});
