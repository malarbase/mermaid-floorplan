/**
 * Shared type definitions for project-related data structures.
 * Used across route components that display floorplan projects.
 */

import type { FunctionReference } from 'convex/server';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Project entity from Convex
 */
export interface Project {
  _id: Id<'projects'> | string;
  displayName: string;
  description?: string;
  isPublic: boolean;
  defaultVersion: string;
  userId: string;
  slug: string;
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

/**
 * Type-safe API reference builder for Convex queries/mutations.
 * Use when generated types don't exist yet.
 */
export const projectApi = {
  projects: {
    getBySlug: 'projects:getBySlug' as unknown as FunctionReference<'query'>,
    getVersion: 'projects:getVersion' as unknown as FunctionReference<'query'>,
    getByHash: 'projects:getByHash' as unknown as FunctionReference<'query'>,
    resolveSlug: 'projects:resolveSlug' as unknown as FunctionReference<'query'>,
    save: 'projects:save' as unknown as FunctionReference<'mutation'>,
  },
  storage: {
    generateUploadUrl: 'storage:generateUploadUrl' as unknown as FunctionReference<'mutation'>,
    saveThumbnail: 'storage:saveThumbnail' as unknown as FunctionReference<'mutation'>,
  },
};
