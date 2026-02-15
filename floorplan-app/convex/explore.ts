import { v } from 'convex/values';
import { query } from './_generated/server';

export const listTrending = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 24;

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_trending')
      .order('desc')
      .filter((q) => q.eq(q.field('isPublic'), true))
      .take(limit);

    return { projects };
  },
});

export const listByTopic = query({
  args: {
    topicSlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 24;

    const topic = await ctx.db
      .query('topics')
      .withIndex('by_slug', (q) => q.eq('slug', args.topicSlug))
      .first();

    if (!topic) {
      return { projects: [] };
    }

    const projectTopics = await ctx.db
      .query('projectTopics')
      .withIndex('by_topic', (q) => q.eq('topicId', topic._id))
      .take(limit);

    const projectIds = projectTopics.map((pt) => pt.projectId);

    const projects = await Promise.all(
      projectIds.map(async (id) => {
        const project = await ctx.db.get(id);
        return project;
      }),
    );

    const publicProjects = projects.filter((p) => p?.isPublic) as Array<
      NonNullable<(typeof projects)[0]>
    >;

    return { projects: publicProjects };
  },
});

export const listFeatured = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 24;

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_featured')
      .order('desc')
      .filter((q) => q.eq(q.field('isFeatured'), true))
      .take(limit);

    const enrichedProjects = await Promise.all(
      projects.map(async (p) => {
        const owner = await ctx.db.get(p.userId);

        // Get default version to find content
        const version = await ctx.db
          .query('versions')
          .withIndex('by_project_name', (q) =>
            q.eq('projectId', p._id).eq('name', p.defaultVersion),
          )
          .first();

        let content = '';
        if (version) {
          const snapshot = await ctx.db.get(version.snapshotId);
          content = snapshot?.content ?? '';
        }

        return {
          ...p,
          ownerName: owner?.username ?? 'Unknown',
          content,
        };
      }),
    );

    return { projects: enrichedProjects };
  },
});

export const getCollection = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query('collections')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (!collection) {
      return null;
    }

    const projects = await Promise.all(
      collection.projectIds.map(async (id) => {
        const project = await ctx.db.get(id);
        return project;
      }),
    );

    const existingProjects = projects.filter((p) => p !== null) as Array<
      NonNullable<(typeof projects)[0]>
    >;

    return {
      collection,
      projects: existingProjects,
    };
  },
});

export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const collections = await ctx.db.query('collections').collect();

    return { collections };
  },
});
