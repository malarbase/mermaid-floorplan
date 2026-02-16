import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { resolveAccess } from './lib/access';
import { getCurrentUser, isUserBanned, requireUser } from './lib/auth';
import { createNotification } from './notifications';

/**
 * Check if the current user can access a project.
 *
 * Delegates to the unified resolveAccess() in lib/access.ts which handles:
 * - Public projects (everyone can view)
 * - Share-token access (viewer or editor, with expiry)
 * - Authenticated owner / collaborator access
 *
 * In dev mode: The Convex auth provider is disabled, so ctx.auth.getUserIdentity()
 * is always null and the dev user fallback grants access to all requests.
 * The client-side privacy guard in useProjectData provides real enforcement.
 */
async function canAccessProject(
  ctx: QueryCtx,
  project: Doc<'projects'>,
  shareToken?: string,
): Promise<boolean> {
  const result = await resolveAccess(ctx, project, shareToken);
  return result.granted;
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

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();

    // Enrich with sharing indicator (single indexed .first() per project — O(1) each)
    return Promise.all(
      projects.map(async (p) => {
        const hasCollab = await ctx.db
          .query('projectAccess')
          .withIndex('by_project', (q) => q.eq('projectId', p._id))
          .first();
        return { ...p, isShared: !!hasCollab };
      }),
    );
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
    if (isUserBanned(user)) return [];

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
  args: { username: v.string(), projectSlug: v.string(), shareToken: v.optional(v.string()) },
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

    if (!(await canAccessProject(ctx, project, args.shareToken))) return null;

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
  args: { projectId: v.id('projects'), hash: v.string(), shareToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project, args.shareToken))) return null;

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
  args: {
    projectId: v.id('projects'),
    versionName: v.string(),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project, args.shareToken))) return null;

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
  args: { projectId: v.id('projects'), shareToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project, args.shareToken))) return [];

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
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project, args.shareToken))) return [];

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
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project, args.shareToken))) return [];

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
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !(await canAccessProject(ctx, project, args.shareToken))) return [];

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

    const access = await resolveAccess(ctx, project);
    if (!access.granted || !access.canManage) {
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
  args: { username: v.string(), slug: v.string(), shareToken: v.optional(v.string()) },
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
      if (!(await canAccessProject(ctx, project, args.shareToken))) return null;
      return { projectId: project._id, currentSlug: args.slug, wasRedirected: false };
    }

    const redirect = await ctx.db
      .query('slugRedirects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('fromSlug'), args.slug))
      .first();

    if (redirect) {
      const targetProject = await ctx.db
        .query('projects')
        .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', redirect.toSlug))
        .first();

      if (targetProject && (await canAccessProject(ctx, targetProject, args.shareToken))) {
        return { projectId: targetProject._id, currentSlug: redirect.toSlug, wasRedirected: true };
      }
    }

    // Check cross-user redirects (ownership transfers)
    const crossRedirect = await ctx.db
      .query('crossUserRedirects')
      .withIndex('by_from', (q) => q.eq('fromUserId', user._id).eq('fromSlug', args.slug))
      .first();

    if (crossRedirect) {
      const targetProject = await ctx.db
        .query('projects')
        .withIndex('by_user_slug', (q) =>
          q.eq('userId', crossRedirect.toUserId).eq('slug', crossRedirect.toSlug),
        )
        .first();

      if (targetProject && (await canAccessProject(ctx, targetProject, args.shareToken))) {
        const newOwner = await ctx.db.get(crossRedirect.toUserId);
        return {
          projectId: targetProject._id,
          currentSlug: crossRedirect.toSlug,
          wasRedirected: true,
          newOwnerUsername: newOwner?.username,
        };
      }
    }

    return null;
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

// ---------------------------------------------------------------------------
// Ownership transfer mutations
// ---------------------------------------------------------------------------

/**
 * Request ownership transfer of a project to an existing collaborator.
 * Only the project owner can initiate this.
 */
export const requestTransfer = mutation({
  args: {
    projectId: v.id('projects'),
    toUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    // Validate caller is owner
    if (project.userId !== user._id) {
      throw new Error('Only the project owner can request a transfer');
    }

    // Validate recipient exists
    const recipient = await ctx.db.get(args.toUserId);
    if (!recipient) throw new Error('Recipient user not found');

    // Validate recipient is an existing collaborator
    const collaboratorAccess = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('userId'), args.toUserId))
      .first();

    if (!collaboratorAccess) {
      throw new Error('Recipient must be an existing collaborator on the project');
    }

    // Check no pending transfer already exists for this project
    const existingTransfer = await ctx.db
      .query('transferRequests')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first();

    if (existingTransfer) {
      throw new Error('A pending transfer request already exists for this project');
    }

    const now = Date.now();
    const requestId = await ctx.db.insert('transferRequests', {
      projectId: args.projectId,
      fromUserId: user._id,
      toUserId: args.toUserId,
      status: 'pending',
      createdAt: now,
      expiresAt: now + 7 * 86400000,
    });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'ownership.transferRequested',
      userId: user._id,
      metadata: { toUserId: args.toUserId, requestId },
      createdAt: now,
    });

    await createNotification(ctx, {
      userId: args.toUserId,
      type: 'transfer.requested',
      title: `${user.displayName ?? user.username} wants to transfer "${project.displayName}" to you`,
      metadata: { projectId: args.projectId, requestId, fromUserId: user._id },
    });

    return requestId;
  },
});

/**
 * Accept a pending ownership transfer.
 * Caller must be the intended recipient (toUserId).
 */
export const acceptTransfer = mutation({
  args: {
    requestId: v.id('transferRequests'),
    targetSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error('Transfer request not found');

    // Validate caller is the recipient
    if (request.toUserId !== user._id) {
      throw new Error('Only the intended recipient can accept this transfer');
    }

    // Validate request is pending and not expired
    if (request.status !== 'pending') {
      throw new Error('Transfer request is no longer pending');
    }

    if (request.expiresAt <= Date.now()) {
      throw new Error('Transfer request has expired');
    }

    const project = await ctx.db.get(request.projectId);
    if (!project) throw new Error('Project not found');

    const originalSlug = project.slug;
    const finalSlug = args.targetSlug ?? originalSlug;

    // Check slug collision in recipient's namespace
    const existingProject = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', user._id).eq('slug', finalSlug))
      .first();

    if (existingProject) {
      return { success: false as const, slugCollision: true, suggestedSlug: finalSlug + '-1' };
    }

    const now = Date.now();
    const oldOwnerId = project.userId;

    // Patch project ownership to recipient
    const updates: Record<string, unknown> = { userId: user._id, updatedAt: now };
    if (finalSlug !== originalSlug) {
      updates.slug = finalSlug;
      // Insert same-user slugRedirect for the new owner's slug history
      await ctx.db.insert('slugRedirects', {
        fromSlug: originalSlug,
        toSlug: finalSlug,
        userId: user._id,
        createdAt: now,
      });
    }
    await ctx.db.patch(request.projectId, updates);

    // Insert cross-user redirect
    await ctx.db.insert('crossUserRedirects', {
      fromUserId: oldOwnerId,
      fromSlug: originalSlug,
      toUserId: user._id,
      toSlug: finalSlug,
      createdAt: now,
    });

    // Delete recipient's projectAccess record (they're the owner now)
    const recipientAccess = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', request.projectId))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first();

    if (recipientAccess) {
      await ctx.db.delete(recipientAccess._id);
    }

    // Insert old owner as editor collaborator
    await ctx.db.insert('projectAccess', {
      projectId: request.projectId,
      userId: oldOwnerId,
      role: 'editor',
      invitedBy: user._id,
      createdAt: now,
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: 'accepted' as const,
      respondedAt: now,
    });

    // Log event
    await ctx.db.insert('projectEvents', {
      projectId: request.projectId,
      action: 'ownership.transferAccepted',
      userId: user._id,
      metadata: {
        fromUserId: oldOwnerId,
        toUserId: user._id,
        originalSlug,
        newSlug: finalSlug,
      },
      createdAt: now,
    });

    await createNotification(ctx, {
      userId: oldOwnerId,
      type: 'transfer.accepted',
      title: `${user.displayName ?? user.username} accepted ownership of "${project.displayName}"`,
      metadata: { projectId: request.projectId, requestId: args.requestId },
    });

    return { success: true as const, newSlug: finalSlug };
  },
});

/**
 * Cancel a pending ownership transfer.
 * Either the sender or recipient can cancel.
 */
export const cancelTransfer = mutation({
  args: {
    requestId: v.id('transferRequests'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error('Transfer request not found');

    // Validate caller is either sender or recipient
    if (request.fromUserId !== user._id && request.toUserId !== user._id) {
      throw new Error('Only the sender or recipient can cancel this transfer');
    }

    // Validate request is still pending
    if (request.status !== 'pending') {
      throw new Error('Transfer request is no longer pending');
    }

    await ctx.db.patch(args.requestId, {
      status: 'cancelled' as const,
      respondedAt: Date.now(),
    });

    // Notify the other party
    const otherUserId = request.fromUserId === user._id ? request.toUserId : request.fromUserId;
    const project = await ctx.db.get(request.projectId);
    const projectName = project?.displayName ?? 'a project';
    await createNotification(ctx, {
      userId: otherUserId,
      type: 'transfer.cancelled',
      title: `Transfer of "${projectName}" was cancelled`,
      message: `${user.displayName ?? user.username} cancelled the transfer`,
      metadata: { projectId: request.projectId, requestId: args.requestId },
    });
  },
});

// ---------------------------------------------------------------------------
// Pending transfer query
// ---------------------------------------------------------------------------

/**
 * Get pending transfer requests for the current user (as recipient).
 * Filters out expired requests.
 */
export const getPendingTransfers = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const pending = await ctx.db
      .query('transferRequests')
      .withIndex('by_recipient', (q) => q.eq('toUserId', user._id).eq('status', 'pending'))
      .collect();

    const now = Date.now();
    const active = pending.filter((r) => r.expiresAt > now);

    return Promise.all(
      active.map(async (req) => {
        const project = await ctx.db.get(req.projectId);
        const sender = await ctx.db.get(req.fromUserId);
        return {
          _id: req._id,
          projectName: project?.displayName ?? 'Unknown',
          projectSlug: project?.slug ?? '',
          senderUsername: sender?.username ?? 'unknown',
          senderDisplayName: sender?.displayName,
          expiresAt: req.expiresAt,
          createdAt: req.createdAt,
        };
      }),
    );
  },
});

// ---------------------------------------------------------------------------
// Transfer expiration (cron target)
// ---------------------------------------------------------------------------

/**
 * Expire pending transfer requests that have passed their expiresAt.
 * Called by the daily cron job.
 */
export const expireTransfers = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query('transferRequests')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect();

    for (const req of expired) {
      await ctx.db.patch(req._id, { status: 'expired', respondedAt: now });
    }
    return { expired: expired.length };
  },
});
