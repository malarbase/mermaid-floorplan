/**
 * Unified project access control.
 *
 * Single source of truth for "can this request access this project?"
 * Used by both projects.ts (canAccessProject gate) and sharing.ts (checkAccess query).
 */

import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { getCurrentUser, isUserBanned } from './auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccessRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** Returned when access is granted. */
export interface AccessGranted {
  granted: true;
  role: AccessRole;
  canEdit: boolean;
  canManage: boolean;
}

/** Returned when access is denied. */
export interface AccessDenied {
  granted: false;
}

export type AccessResult = AccessGranted | AccessDenied;

const DENIED: AccessDenied = { granted: false };

// ---------------------------------------------------------------------------
// Share-token validation (low-level helper)
// ---------------------------------------------------------------------------

/**
 * Validate a share token against a specific project.
 * Returns the share link's role if valid, null otherwise.
 */
export async function validateShareTokenForProject(
  ctx: QueryCtx,
  projectId: Id<'projects'>,
  token: string,
): Promise<'viewer' | 'editor' | null> {
  const link = await ctx.db
    .query('shareLinks')
    .withIndex('by_token', (q) => q.eq('token', token))
    .first();

  if (link && link.projectId === projectId && (!link.expiresAt || link.expiresAt > Date.now())) {
    return link.role;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Unified access resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the effective access for a request against a project.
 *
 * Check order:
 * 1. Public project → at least viewer (owner/collaborator may upgrade)
 * 2. Share token → role from the link
 * 3. Authenticated user → owner or collaborator role
 * 4. Otherwise → denied
 */
export async function resolveAccess(
  ctx: QueryCtx,
  project: Doc<'projects'>,
  shareToken?: string,
): Promise<AccessResult> {
  const currentUser = await getCurrentUser(ctx);

  // --- Owner check (applies whether public or private) ---
  if (currentUser && currentUser._id === project.userId) {
    return { granted: true, role: 'owner', canEdit: true, canManage: true };
  }

  // Deny access if project owner is banned (even for public projects)
  const owner = await ctx.db.get(project.userId);
  if (owner && isUserBanned(owner)) return DENIED;

  // --- Collaborator check ---
  let collaboratorRole: 'viewer' | 'editor' | 'admin' | null = null;
  if (currentUser) {
    const access = await ctx.db
      .query('projectAccess')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .filter((q) => q.eq(q.field('userId'), currentUser._id))
      .first();

    if (access) {
      collaboratorRole = access.role;
    }
  }

  // --- Share-token check ---
  let shareRole: 'viewer' | 'editor' | null = null;
  if (shareToken) {
    shareRole = await validateShareTokenForProject(ctx, project._id, shareToken);
  }

  // --- Public project: at least viewer ---
  if (project.isPublic) {
    // 'viewer' floor guarantees non-null result
    const effectiveRole = pickHighestRole(collaboratorRole, shareRole, 'viewer')!;
    return {
      granted: true,
      role: effectiveRole,
      canEdit: effectiveRole === 'editor' || effectiveRole === 'admin',
      canManage: effectiveRole === 'admin',
    };
  }

  // --- Private project: need collaborator or share-token access ---
  const effectiveRole = pickHighestRole(collaboratorRole, shareRole, null);
  if (effectiveRole) {
    return {
      granted: true,
      role: effectiveRole,
      canEdit: effectiveRole === 'editor' || effectiveRole === 'admin',
      canManage: effectiveRole === 'admin',
    };
  }

  return DENIED;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<AccessRole, number> = { owner: 4, admin: 3, editor: 2, viewer: 1 };

/** Pick the highest-privilege role from up to three nullable candidates. */
function pickHighestRole(...roles: (AccessRole | null | undefined)[]): AccessRole | null {
  let best: AccessRole | null = null;
  for (const r of roles) {
    if (r && (!best || ROLE_RANK[r] > ROLE_RANK[best])) {
      best = r;
    }
  }
  return best;
}
