import { v } from 'convex/values';
import { query } from './_generated/server';
import { authenticatedMutation, optionalAuthQuery } from './lib/auth';

async function generateShareToken(): Promise<string> {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const hashArray = Array.from(array);
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

export const checkAccess = optionalAuthQuery({
  args: {
    projectId: v.id('projects'),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    if (project.isPublic) {
      if (ctx.user) {
        if (project.userId === ctx.user._id) {
          return { role: 'owner' as const, canEdit: true, canManage: true };
        }

        const access = await ctx.db
          .query('projectAccess')
          .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
          .filter((q) => q.eq(q.field('userId'), ctx.user!._id))
          .first();

        if (access) {
          return {
            role: access.role,
            canEdit: access.role === 'editor',
            canManage: false,
          };
        }
      }

      return { role: 'viewer' as const, canEdit: false, canManage: false };
    }

    if (args.token) {
      const token = args.token;
      const shareLink = await ctx.db
        .query('shareLinks')
        .withIndex('by_token', (q) => q.eq('token', token))
        .first();

      if (
        shareLink &&
        shareLink.projectId === args.projectId &&
        (!shareLink.expiresAt || shareLink.expiresAt > Date.now())
      ) {
        return {
          role: shareLink.role,
          canEdit: shareLink.role === 'editor',
          canManage: false,
        };
      }
    }

    if (!ctx.user) return null;

    if (project.userId === ctx.user._id) {
      return { role: 'owner' as const, canEdit: true, canManage: true };
    }

    const access = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('userId'), ctx.user!._id))
      .first();

    if (access) {
      return {
        role: access.role,
        canEdit: access.role === 'editor',
        canManage: false,
      };
    }

    return null;
  },
});

export const getCollaborators = optionalAuthQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    if (!ctx.user) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    if (project.userId !== ctx.user._id) {
      return [];
    }

    const accessList = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const collaborators = await Promise.all(
      accessList.map(async (access) => {
        const collaborator = await ctx.db.get(access.userId);
        const inviter = await ctx.db.get(access.invitedBy);
        return {
          _id: access._id,
          userId: access.userId,
          username: collaborator?.username ?? 'unknown',
          displayName: collaborator?.displayName,
          avatarUrl: collaborator?.avatarUrl,
          role: access.role,
          invitedBy: inviter?.username ?? 'unknown',
          createdAt: access.createdAt,
        };
      }),
    );

    return collaborators;
  },
});

export const getShareLinks = optionalAuthQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    if (!ctx.user) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    if (project.userId !== ctx.user._id) {
      return [];
    }

    const links = await ctx.db
      .query('shareLinks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
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

export const inviteByUsername = authenticatedMutation({
  args: {
    projectId: v.id('projects'),
    username: v.string(),
    role: v.union(v.literal('viewer'), v.literal('editor')),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== ctx.user._id) {
      throw new Error('Only project owner can invite collaborators');
    }

    const invitee = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username.toLowerCase()))
      .first();

    if (!invitee) {
      throw new Error('User not found');
    }

    if (invitee._id === ctx.user._id) {
      throw new Error('Cannot invite yourself');
    }

    const existingAccess = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('userId'), invitee._id))
      .first();

    if (existingAccess) {
      if (existingAccess.role !== args.role) {
        await ctx.db.patch(existingAccess._id, { role: args.role });
        await ctx.db.insert('projectEvents', {
          projectId: args.projectId,
          action: 'collaborator.roleChange',
          userId: ctx.user._id,
          metadata: {
            targetUsername: args.username,
            oldRole: existingAccess.role,
            newRole: args.role,
          },
          createdAt: Date.now(),
        });
        return { success: true, action: 'updated', accessId: existingAccess._id };
      }
      return { success: true, action: 'exists', accessId: existingAccess._id };
    }

    const accessId = await ctx.db.insert('projectAccess', {
      projectId: args.projectId,
      userId: invitee._id,
      role: args.role,
      invitedBy: ctx.user._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'collaborator.invite',
      userId: ctx.user._id,
      metadata: { inviteeUsername: args.username, role: args.role },
      createdAt: Date.now(),
    });

    return { success: true, action: 'created', accessId };
  },
});

export const removeCollaborator = authenticatedMutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== ctx.user._id) {
      throw new Error('Only project owner can remove collaborators');
    }

    const access = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .first();

    if (!access) {
      throw new Error('Collaborator not found');
    }

    await ctx.db.delete(access._id);

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'collaborator.remove',
      userId: ctx.user._id,
      metadata: { removedUserId: args.userId },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateCollaboratorRole = authenticatedMutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    role: v.union(v.literal('viewer'), v.literal('editor')),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== ctx.user._id) {
      throw new Error('Only project owner can update collaborator roles');
    }

    const access = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .first();

    if (!access) {
      throw new Error('Collaborator not found');
    }

    await ctx.db.patch(access._id, { role: args.role });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'collaborator.roleChange',
      userId: ctx.user._id,
      metadata: { targetUserId: args.userId, oldRole: access.role, newRole: args.role },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const createShareLink = authenticatedMutation({
  args: {
    projectId: v.id('projects'),
    role: v.union(v.literal('viewer'), v.literal('editor')),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== ctx.user._id) {
      throw new Error('Only project owner can create share links');
    }

    const token = await generateShareToken();
    const now = Date.now();

    const linkId = await ctx.db.insert('shareLinks', {
      projectId: args.projectId,
      token,
      role: args.role,
      expiresAt: args.expiresInDays ? now + args.expiresInDays * 24 * 60 * 60 * 1000 : undefined,
      createdAt: now,
    });

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'shareLink.create',
      userId: ctx.user._id,
      metadata: { role: args.role },
      createdAt: Date.now(),
    });

    return { success: true, linkId, token };
  },
});

export const revokeShareLink = authenticatedMutation({
  args: { linkId: v.id('shareLinks') },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error('Share link not found');

    const project = await ctx.db.get(link.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId !== ctx.user._id) {
      throw new Error('Only project owner can revoke share links');
    }

    await ctx.db.delete(args.linkId);

    await ctx.db.insert('projectEvents', {
      projectId: link.projectId,
      action: 'shareLink.revoke',
      userId: ctx.user._id,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const validateShareLink = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query('shareLinks')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first();

    if (!link) {
      return { valid: false, reason: 'not_found' as const };
    }

    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { valid: false, reason: 'expired' as const };
    }

    const project = await ctx.db.get(link.projectId);
    if (!project) {
      return { valid: false, reason: 'project_not_found' as const };
    }

    const owner = await ctx.db.get(project.userId);

    return {
      valid: true,
      projectId: project._id,
      projectSlug: project.slug,
      projectName: project.displayName,
      ownerUsername: owner?.username ?? 'unknown',
      role: link.role,
    };
  },
});

export const getSharedWithMe = optionalAuthQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.user) return [];

    const accessList = await ctx.db
      .query('projectAccess')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user!._id))
      .collect();

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
            username: owner?.username ?? 'unknown',
            displayName: owner?.displayName,
          },
          role: access.role,
          sharedAt: access.createdAt,
        };
      }),
    );

    return projects.filter((p) => p !== null);
  },
});

export const forkProject = authenticatedMutation({
  args: {
    projectId: v.id('projects'),
    slug: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sourceProject = await ctx.db.get(args.projectId);
    if (!sourceProject) throw new Error('Project not found');

    let hasAccess = sourceProject.isPublic;
    if (!hasAccess) {
      if (sourceProject.userId === ctx.user._id) {
        hasAccess = true;
      } else {
        const access = await ctx.db
          .query('projectAccess')
          .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
          .filter((q) => q.eq(q.field('userId'), ctx.user._id))
          .first();
        hasAccess = !!access;
      }
    }

    if (!hasAccess) {
      throw new Error('No access to fork this project');
    }

    const existingProject = await ctx.db
      .query('projects')
      .withIndex('by_user_slug', (q) => q.eq('userId', ctx.user._id).eq('slug', args.slug))
      .first();

    if (existingProject) {
      throw new Error('You already have a project with this slug');
    }

    const defaultVersion = await ctx.db
      .query('versions')
      .withIndex('by_project_name', (q) =>
        q.eq('projectId', args.projectId).eq('name', sourceProject.defaultVersion),
      )
      .first();

    if (!defaultVersion) {
      throw new Error('Source project has no default version');
    }

    const sourceSnapshot = await ctx.db.get(defaultVersion.snapshotId);
    if (!sourceSnapshot) {
      throw new Error('Source snapshot not found');
    }

    const now = Date.now();

    const newProjectId = await ctx.db.insert('projects', {
      userId: ctx.user._id,
      slug: args.slug,
      displayName: args.displayName ?? sourceProject.displayName,
      description: sourceProject.description,
      isPublic: false,
      defaultVersion: 'main',
      forkedFrom: args.projectId,
      createdAt: now,
      updatedAt: now,
    });

    const snapHash = await snapshotHash(sourceSnapshot.content, undefined, ctx.user.authId, now);

    const newSnapshotId = await ctx.db.insert('snapshots', {
      projectId: newProjectId,
      snapshotHash: snapHash,
      contentHash: sourceSnapshot.contentHash,
      content: sourceSnapshot.content,
      message: `Forked from ${sourceProject.displayName}`,
      authorId: ctx.user.authId,
      createdAt: now,
    });

    await ctx.db.insert('versions', {
      projectId: newProjectId,
      name: 'main',
      snapshotId: newSnapshotId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.projectId, {
      forkCount: (sourceProject.forkCount ?? 0) + 1,
      updatedAt: now,
    });

    await ctx.db.insert('projectEvents', {
      projectId: newProjectId,
      action: 'project.fork',
      userId: ctx.user._id,
      metadata: { sourceProjectId: args.projectId },
      createdAt: now,
    });

    return { success: true, projectId: newProjectId };
  },
});

export const getForkSource = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.forkedFrom) return null;

    const sourceProject = await ctx.db.get(project.forkedFrom);
    if (!sourceProject) {
      return { deleted: true, projectId: project.forkedFrom };
    }

    const owner = await ctx.db.get(sourceProject.userId);

    return {
      deleted: false,
      projectId: sourceProject._id,
      slug: sourceProject.slug,
      displayName: sourceProject.displayName,
      ownerUsername: owner?.username ?? 'unknown',
      isPublic: sourceProject.isPublic,
    };
  },
});

export const leaveProject = authenticatedMutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    if (project.userId === ctx.user._id) {
      throw new Error('Owner cannot leave their own project. Transfer or delete instead.');
    }

    const access = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('userId'), ctx.user._id))
      .first();

    if (!access) {
      throw new Error("You don't have access to this project");
    }

    await ctx.db.delete(access._id);

    await ctx.db.insert('projectEvents', {
      projectId: args.projectId,
      action: 'collaborator.leave',
      userId: ctx.user._id,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
