import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { getCurrentUser, requireUser } from './lib/auth';

/**
 * Check if the current user can access a project.
 * Public projects are accessible to everyone.
 * Private projects require the user to be the owner or have projectAccess.
 *
 * In production: getCurrentUser returns null for unauthenticated requests,
 * so private projects are properly protected on the server side.
 *
 * In dev mode: The Convex auth provider is disabled, so getCurrentUser
 * falls back to the dev user for ALL requests (can't distinguish logged-in
 * from logged-out). The client-side privacy guard in useProjectData
 * provides the real enforcement by checking the session state.
 */
async function canAccessProject(ctx: QueryCtx, project: Doc<'projects'>): Promise<boolean> {
  if (project.isPublic) return true;

  const currentUser = await getCurrentUser(ctx);
  if (!currentUser) return false;

  // Owner always has access
  if (currentUser._id === project.userId) return true;

  // Check for explicit project access (collaborator)
  const access = await ctx.db
    .query('projectAccess')
    .withIndex('by_project', (q) => q.eq('projectId', project._id))
    .filter((q) => q.eq(q.field('userId'), currentUser._id))
    .first();

  return !!access;
}

/**
 * Generate content hash (first 8 chars of SHA256)
 * Used for permalink generation
 */
async function contentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 8);
}

/**
 * Generate snapshot hash (first 12 chars of SHA256 of content + metadata)
 * Like a Git commit SHA - unique per save event, even for identical content.
 */
async function snapshotHash(
  content: string,
  parentId: string | undefined,
  authorId: string,
  createdAt: number,
): Promise<string> {
  const payload = `${content}\0${parentId ?? ''}\0${authorId}\0${createdAt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 12);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
  },
});

export const listPublicByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first();

    if (!user) return [];

    return ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('isPublic'), true))
      .order('desc')
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
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first();

    if (!user) return null;

    const project = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', args.projectSlug))
      .first();

    if (!project) return null;

    if (!(await canAccessProject(ctx, project))) return null;

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
    const user = await requireUser(ctx);

    if (!/^[a-z0-9-]+$/.test(args.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    const existing = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', args.slug))
      .first();

    if (existing) {
      throw new Error('Project with this slug already exists');
    }

    const redirectsWithSlug = await ctx.db
      .query('slugRedirects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('fromSlug'), args.slug))
      .collect();

    for (const redirect of redirectsWithSlug) {
      await ctx.db.delete(redirect._id);
    }

    const now = Date.now();
    const hash = await contentHash(args.content);

    const projectId = await ctx.db.insert('projects', {
      userId: user._id,
      slug: args.slug,
      displayName: args.displayName,
      description: args.description,
      isPublic: args.isPublic,
      defaultVersion: 'main',
      createdAt: now,
      updatedAt: now,
    });

    const snapHash = await snapshotHash(args.content, undefined, user.authId, now);

    const snapshotId = await ctx.db.insert('snapshots', {
      projectId,
      snapshotHash: snapHash,
      contentHash: hash,
      content: args.content,
      message: 'Initial version',
      authorId: user.authId,
      createdAt: now,
    });

    await ctx.db.insert('versions', {
      projectId,
      name: 'main',
      snapshotId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('projectEvents', {
      projectId,
      action: 'project.create',
      userId: user._id,
      metadata: { slug: args.slug, displayName: args.displayName },
      createdAt: now,
    });

    return projectId;
  },
});

/**
 * Save changes (create new snapshot, update version)
 */
export const save = mutation({
  args: {
    projectId: v.id('projects'),
    versionName: v.string(),
    content: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const isOwner = project.userId === user._id;
    if (!isOwner) {
      const access = await ctx.db
        .query('projectAccess')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.and(q.eq(q.field('userId'), user._id), q.eq(q.field('role'), 'editor')))
        .first();

      if (!access) throw new Error('Not authorized');
    }

    const now = Date.now();
    const hash = await contentHash(args.content);

    // Get current version to find parent snapshot
    const version = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', args.versionName),
      )
      .first();

    // Deduplicate: skip snapshot creation if content is unchanged from HEAD
    if (version?.snapshotId) {
      const headSnapshot = await ctx.db.get(version.snapshotId);
      if (headSnapshot && headSnapshot.contentHash === hash && !args.message) {
        return {
          snapshotId: version.snapshotId,
          hash: headSnapshot.snapshotHash,
          deduplicated: true,
        };
      }
    }

    // Create new snapshot
    const parentSnapshotId = version?.snapshotId;
    const snapHash = await snapshotHash(args.content, parentSnapshotId, user._id, now);

    const snapshotId = await ctx.db.insert('snapshots', {
      projectId: args.projectId,
      snapshotHash: snapHash,
      contentHash: hash,
      content: args.content,
      message: args.message,
      parentId: parentSnapshotId,
      authorId: user._id,
      createdAt: now,
    });

    // Update or create version to point to new snapshot
    if (version) {
      await ctx.db.patch(version._id, { snapshotId, updatedAt: now });
    } else {
      await ctx.db.insert('versions', {
        projectId: args.projectId,
        name: args.versionName,
        snapshotId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update project timestamp
    await ctx.db.patch(args.projectId, { updatedAt: now });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'snapshot.save',
      userId: user._id,
      metadata: {
        versionName: args.versionName,
        snapshotId,
        snapshotHash: snapHash,
        message: args.message,
      },
      createdAt: now,
    });

    return { snapshotId, hash: snapHash };
  },
});

export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error('Unauthenticated');

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== user._id) {
      throw new Error('Not authorized');
    }

    // Delete all related data
    const versions = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    const snapshots = await ctx.db
      .query('snapshots')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    const accessList = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const access of accessList) {
      await ctx.db.delete(access._id);
    }

    const shareLinks = await ctx.db
      .query('shareLinks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
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
 * Get public project by ID (no auth required)
 * Returns null if project is not public
 */
export const getPublic = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Only return if project is public
    if (!project.isPublic) return null;

    // Get the default version and its snapshot
    const version = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', project.defaultVersion),
      )
      .first();

    if (!version) return null;

    const snapshot = await ctx.db.get(version.snapshotId);
    if (!snapshot) return null;

    return {
      project,
      version,
      snapshot,
    };
  },
});

/**
 * Get snapshot by snapshot hash (for permalinks).
 * Falls back to content hash for backwards compatibility with old URLs.
 */
export const getByHash = query({
  args: { projectId: v.id('projects'), hash: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project))) return null;

    // Try snapshot hash first (new unique permalinks)
    const bySnapshotHash = await ctx.db
      .query('snapshots')
      .withIndex('by_snapshot_hash', (q) =>
        q.eq('projectId', args.projectId).eq('snapshotHash', args.hash),
      )
      .first();

    if (bySnapshotHash) return bySnapshotHash;

    // Fall back to content hash (backwards compatibility with old URLs)
    return ctx.db
      .query('snapshots')
      .withIndex('by_content_hash', (q) =>
        q.eq('projectId', args.projectId).eq('contentHash', args.hash),
      )
      .first();
  },
});

/**
 * Get version by name (includes snapshot content)
 */
export const getVersion = query({
  args: { projectId: v.id('projects'), versionName: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project))) return null;

    const version = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', args.versionName),
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
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project))) return [];

    return ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) => q.eq('projectId', args.projectId))
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
    projectId: v.id('projects'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const encoder = new TextEncoder();
    const data = encoder.encode(args.sessionToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sessionHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project))) return [];

    return ctx.db
      .query('snapshots')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

/**
 * Get snapshot history for a project.
 * Returns ALL snapshots for the project (flat query, no parent-walking), ordered by createdAt desc.
 * For each snapshot, indicates which version(s) currently point at it (isHead, headOf).
 */
export const getVersionHistory = query({
  args: {
    projectId: v.id('projects'),
    versionName: v.optional(v.string()), // Keep arg for compatibility but not used for filtering snapshots
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project))) return [];

    // Get all versions to know which snapshots are HEAD of which versions
    const versions = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) => q.eq('projectId', args.projectId))
      .collect();

    const headSnapshotIds = new Map<string, string[]>();
    for (const ver of versions) {
      const existing = headSnapshotIds.get(ver.snapshotId) ?? [];
      existing.push(ver.name);
      headSnapshotIds.set(ver.snapshotId, existing);
    }

    // Query ALL snapshots for the project (no parent-walking)
    const maxSnapshots = args.limit ?? 50;
    const snapshots = await ctx.db
      .query('snapshots')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(maxSnapshots);

    return snapshots.map((snapshot) => ({
      _id: snapshot._id,
      snapshotHash: snapshot.snapshotHash,
      contentHash: snapshot.contentHash,
      message: snapshot.message,
      parentId: snapshot.parentId,
      authorId: snapshot.authorId,
      createdAt: snapshot.createdAt,
      isHead: headSnapshotIds.has(snapshot._id),
      headOf: headSnapshotIds.get(snapshot._id) ?? [],
    }));
  },
});

/**
 * Get project activity feed (audit trail).
 * Returns recent events with user info for display.
 */
export const getProjectActivity = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project))) return [];

    const maxEvents = args.limit ?? 50;
    const events = await ctx.db
      .query('projectEvents')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(maxEvents);

    // Join user info
    const userCache = new Map<
      string,
      { username: string; displayName?: string; avatarUrl?: string }
    >();

    return Promise.all(
      events.map(async (event) => {
        let userInfo = userCache.get(event.userId);
        if (!userInfo) {
          const user = await ctx.db.get(event.userId);
          userInfo = {
            username: user?.username ?? 'unknown',
            displayName: user?.displayName,
            avatarUrl: user?.avatarUrl,
          };
          userCache.set(event.userId, userInfo);
        }

        return {
          _id: event._id,
          action: event.action,
          metadata: event.metadata,
          createdAt: event.createdAt,
          user: userInfo,
        };
      }),
    );
  },
});

/**
 * Update project settings (name, visibility, etc.)
 */
export const update = mutation({
  args: {
    projectId: v.id('projects'),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    defaultVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== user._id) {
      throw new Error('Not authorized');
    }

    const updates: Partial<typeof project> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.defaultVersion !== undefined) updates.defaultVersion = args.defaultVersion;

    await ctx.db.patch(args.projectId, updates);

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'project.update',
      userId: user._id,
      metadata: {
        ...(args.displayName !== undefined && { displayName: args.displayName }),
        ...(args.description !== undefined && { description: args.description }),
        ...(args.isPublic !== undefined && { isPublic: args.isPublic }),
        ...(args.defaultVersion !== undefined && { defaultVersion: args.defaultVersion }),
      },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a new version (branch) from current snapshot
 */
export const createVersion = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    fromVersion: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const isOwner = project.userId === user._id;
    if (!isOwner) {
      const access = await ctx.db
        .query('projectAccess')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.and(q.eq(q.field('userId'), user._id), q.eq(q.field('role'), 'editor')))
        .first();

      if (!access) throw new Error('Not authorized');
    }

    const existing = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) => q.eq('projectId', args.projectId).eq('name', args.name))
      .first();

    if (existing) throw new Error('Version with this name already exists');

    const sourceVersionName = args.fromVersion ?? project.defaultVersion;
    const sourceVersion = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', sourceVersionName),
      )
      .first();

    if (!sourceVersion) throw new Error('Source version not found');

    const now = Date.now();

    const versionId = await ctx.db.insert('versions', {
      projectId: args.projectId,
      name: args.name,
      snapshotId: sourceVersion.snapshotId,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'version.create',
      userId: user._id,
      metadata: { versionName: args.name, fromVersion: sourceVersionName },
      createdAt: now,
    });

    return versionId;
  },
});

/**
 * Delete a non-default version (branch).
 * Snapshots are NOT cascade-deleted — they may be referenced by permalinks or other versions.
 */
export const deleteVersion = mutation({
  args: {
    projectId: v.id('projects'),
    versionName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    // Auth: owner or editor
    const isOwner = project.userId === user._id;
    if (!isOwner) {
      const access = await ctx.db
        .query('projectAccess')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.and(q.eq(q.field('userId'), user._id), q.eq(q.field('role'), 'editor')))
        .first();

      if (!access) throw new Error('Not authorized');
    }

    // Guard: cannot delete the default version
    if (args.versionName === project.defaultVersion) {
      throw new Error('Cannot delete the default version');
    }

    const version = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', args.versionName),
      )
      .first();

    if (!version) throw new Error('Version not found');

    await ctx.db.delete(version._id);

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'version.delete',
      userId: user._id,
      metadata: { versionName: args.versionName },
      createdAt: Date.now(),
    });
  },
});

/**
 * Move a version to point at a different existing snapshot (rollback/restore).
 * Like `git reset --hard <commit>` - moves the branch pointer without creating a new snapshot.
 */
export const moveVersionToSnapshot = mutation({
  args: {
    projectId: v.id('projects'),
    versionName: v.string(),
    snapshotId: v.id('snapshots'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    // Check permissions (owner or editor)
    const isOwner = project.userId === user._id;
    if (!isOwner) {
      const access = await ctx.db
        .query('projectAccess')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.and(q.eq(q.field('userId'), user._id), q.eq(q.field('role'), 'editor')))
        .first();

      if (!access) throw new Error('Not authorized');
    }

    // Verify the snapshot exists and belongs to this project
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');
    if (snapshot.projectId !== args.projectId) {
      throw new Error('Snapshot does not belong to this project');
    }

    // Find the version
    const version = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', args.versionName),
      )
      .first();

    if (!version) throw new Error('Version not found');

    // Move the version pointer
    const now = Date.now();
    await ctx.db.patch(version._id, {
      snapshotId: args.snapshotId,
      updatedAt: now,
    });

    // Update project timestamp
    await ctx.db.patch(args.projectId, { updatedAt: now });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'version.restore',
      userId: user._id,
      metadata: {
        versionName: args.versionName,
        fromSnapshotId: version.snapshotId,
        toSnapshotId: args.snapshotId,
      },
      createdAt: now,
    });

    return { success: true, snapshotId: args.snapshotId };
  },
});

/**
 * Update project slug and create redirect from old slug
 */
export const updateSlug = mutation({
  args: {
    projectId: v.id('projects'),
    newSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (!/^[a-z0-9-]+$/.test(args.newSlug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== user._id) {
      throw new Error('Not authorized');
    }

    if (project.slug === args.newSlug) {
      throw new Error('New slug is the same as current slug');
    }

    const existing = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', args.newSlug))
      .first();

    if (existing) {
      throw new Error('A project with this slug already exists');
    }

    const now = Date.now();
    const oldSlug = project.slug;

    await ctx.db.insert('slugRedirects', {
      fromSlug: oldSlug,
      toSlug: args.newSlug,
      userId: user._id,
      createdAt: now,
    });

    await ctx.db.patch(args.projectId, {
      slug: args.newSlug,
      updatedAt: now,
    });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'project.rename',
      userId: user._id,
      metadata: { oldSlug, newSlug: args.newSlug },
      createdAt: now,
    });

    return { success: true, oldSlug, newSlug: args.newSlug };
  },
});

/**
 * Resolve a slug to a project, checking redirects if needed.
 * Enforces privacy: returns null for private projects the user can't access.
 */
export const resolveSlug = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first();

    if (!user) return null;

    const project = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', args.slug))
      .first();

    if (project) {
      if (!(await canAccessProject(ctx, project))) return null;
      return { projectId: project._id, currentSlug: args.slug, wasRedirected: false };
    }

    const redirect = await ctx.db
      .query('slugRedirects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('fromSlug'), args.slug))
      .first();

    if (!redirect) return null;

    const targetProject = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', redirect.toSlug))
      .first();

    if (!targetProject) return null;
    if (!(await canAccessProject(ctx, targetProject))) return null;

    return { projectId: targetProject._id, currentSlug: redirect.toSlug, wasRedirected: true };
  },
});

/**
 * Backfill snapshotHash for existing snapshots that don't have one.
 * Internal mutation — callable via `npx convex run projects:backfillSnapshotHashes`.
 * Safe to run multiple times. Returns { processed, done }.
 */
export const backfillSnapshotHashes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const batchSize = 100;
    let processed = 0;

    // Scan all snapshots and patch any missing snapshotHash
    const snapshots = await ctx.db.query('snapshots').order('asc').collect();

    for (const snapshot of snapshots) {
      if (snapshot.snapshotHash) continue;

      const hash = await snapshotHash(
        snapshot.content,
        snapshot.parentId,
        snapshot.authorId,
        snapshot.createdAt,
      );

      await ctx.db.patch(snapshot._id, { snapshotHash: hash });
      processed++;
    }

    return { processed, total: snapshots.length, done: true };
  },
});
