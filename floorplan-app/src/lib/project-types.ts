/**
 * Shared type definitions for project-related data structures.
 * Used across route components that display floorplan projects.
 */

import type { FunctionReference } from 'convex/server';
import type { Id } from '../../convex/_generated/dataModel';

// ---------------------------------------------------------------------------
// Viewer & Core Types
// ---------------------------------------------------------------------------

/** Serialized camera state — matches CameraState from floorplan-viewer-core */
export interface CameraStateData {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  mode: 'perspective' | 'orthographic';
  fov: number;
}

/** Viewer display mode */
export type ViewerMode = 'basic' | 'advanced' | 'editor';

/**
 * Minimal interface for the floorplan-viewer-core instance.
 * Avoids a hard build-time dependency on the viewer-core package while
 * still giving call-sites proper type safety (no `any` index signatures).
 */
export interface CoreInstance {
  dispose: () => void;
  loadFromDsl?: (dsl: string) => void;
  setTheme?: (theme: 'light' | 'dark') => void;
  captureScreenshot?: (options?: Record<string, unknown>) => Promise<Blob>;
  cameraManager?: {
    getCameraState?: () => CameraStateData;
    setCameraState?: (state: CameraStateData) => void;
  };
  /**
   * Event emitter — subscribe to viewer events (e.g. 'themeChange').
   * Present on FloorplanAppCore and InteractiveEditorCore.
   */
  on?: (event: string, cb: (...args: unknown[]) => void) => (() => void) | undefined;
}

/** Selection change event payload */
export interface SelectionChangeEvent {
  selection: ReadonlySet<unknown>;
}

// ---------------------------------------------------------------------------
// ID Aliases
// ---------------------------------------------------------------------------

/** Project ID — accepts both Convex Id and plain string */
export type ProjectId = Id<'projects'> | string;

// ---------------------------------------------------------------------------
// Domain Types
// ---------------------------------------------------------------------------

/**
 * Project entity from Convex
 */
export interface Project {
  _id: ProjectId;
  displayName: string;
  description?: string;
  isPublic: boolean;
  defaultVersion: string;
  userId: string;
  slug: string;
  thumbnail?: string;
  cameraState?: CameraStateData;
}

/**
 * Project owner information
 */
export interface Owner {
  _id: string;
  username: string;
}

/**
 * Fork source information
 */
export interface ForkedFrom {
  project: Project;
  owner: Owner;
}

/**
 * Snapshot (immutable content version)
 */
export interface Snapshot {
  _id?: string;
  content: string;
  contentHash: string;
  message?: string;
  createdAt: number;
  authorId?: string;
}

/**
 * Version data with associated snapshot
 */
export interface VersionData {
  version: { name: string; snapshotId: string };
  snapshot: Snapshot | null;
}

/**
 * Combined project query result
 */
export interface ProjectQueryResult {
  project: Project;
  owner: Owner;
  forkedFrom: ForkedFrom | null;
}

// ---------------------------------------------------------------------------
// Convex API References
// ---------------------------------------------------------------------------

/**
 * Type-safe API reference builder for Convex queries/mutations.
 * Centralised so every consumer imports from here instead of
 * defining ad-hoc `as unknown as FunctionReference` casts.
 */
export const convexApi = {
  projects: {
    getBySlug: 'projects:getBySlug' as unknown as FunctionReference<'query'>,
    getVersion: 'projects:getVersion' as unknown as FunctionReference<'query'>,
    getByHash: 'projects:getByHash' as unknown as FunctionReference<'query'>,
    resolveSlug: 'projects:resolveSlug' as unknown as FunctionReference<'query'>,
    getPublic: 'projects:getPublic' as unknown as FunctionReference<'query'>,
    list: 'projects:list' as unknown as FunctionReference<'query'>,
    listVersions: 'projects:listVersions' as unknown as FunctionReference<'query'>,
    getHistory: 'projects:getHistory' as unknown as FunctionReference<'query'>,
    save: 'projects:save' as unknown as FunctionReference<'mutation'>,
    create: 'projects:create' as unknown as FunctionReference<'mutation'>,
    update: 'projects:update' as unknown as FunctionReference<'mutation'>,
    updateSlug: 'projects:updateSlug' as unknown as FunctionReference<'mutation'>,
    remove: 'projects:remove' as unknown as FunctionReference<'mutation'>,
    createVersion: 'projects:createVersion' as unknown as FunctionReference<'mutation'>,
  },
  storage: {
    generateUploadUrl: 'storage:generateUploadUrl' as unknown as FunctionReference<'mutation'>,
    saveThumbnail: 'storage:saveThumbnail' as unknown as FunctionReference<'mutation'>,
  },
  sharing: {
    getCollaborators: 'sharing:getCollaborators' as unknown as FunctionReference<'query'>,
    getShareLinks: 'sharing:getShareLinks' as unknown as FunctionReference<'query'>,
    getSharedWithMe: 'sharing:getSharedWithMe' as unknown as FunctionReference<'query'>,
    validateShareLink: 'sharing:validateShareLink' as unknown as FunctionReference<'query'>,
    createShareLink: 'sharing:createShareLink' as unknown as FunctionReference<'mutation'>,
    inviteByUsername: 'sharing:inviteByUsername' as unknown as FunctionReference<'mutation'>,
    removeCollaborator: 'sharing:removeCollaborator' as unknown as FunctionReference<'mutation'>,
    updateCollaboratorRole:
      'sharing:updateCollaboratorRole' as unknown as FunctionReference<'mutation'>,
    revokeShareLink: 'sharing:revokeShareLink' as unknown as FunctionReference<'mutation'>,
    forkProject: 'sharing:forkProject' as unknown as FunctionReference<'mutation'>,
  },
  users: {
    getCurrentUser: 'users:getCurrentUser' as unknown as FunctionReference<'query'>,
    suggestUsername: 'users:suggestUsername' as unknown as FunctionReference<'query'>,
    isUsernameAvailable: 'users:isUsernameAvailable' as unknown as FunctionReference<'query'>,
    getUsernameCooldown: 'users:getUsernameCooldown' as unknown as FunctionReference<'query'>,
    setUsername: 'users:setUsername' as unknown as FunctionReference<'mutation'>,
    updateProfile: 'users:updateProfile' as unknown as FunctionReference<'mutation'>,
  },
  admin: {
    listAllUsers: 'admin:listAllUsers' as unknown as FunctionReference<'query'>,
    listAllProjects: 'admin:listAllProjects' as unknown as FunctionReference<'query'>,
    getCurrentUserAdminStatus:
      'admin:getCurrentUserAdminStatus' as unknown as FunctionReference<'query'>,
    getAuditLog: 'admin:getAuditLog' as unknown as FunctionReference<'query'>,
    deleteProject: 'admin:deleteProject' as unknown as FunctionReference<'mutation'>,
  },
};

/** @deprecated Use `convexApi` instead */
export const projectApi = convexApi;
