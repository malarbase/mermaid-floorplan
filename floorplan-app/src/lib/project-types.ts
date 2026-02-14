/**
 * Shared type definitions for project-related data structures.
 * Used across route components that display floorplan projects.
 */

import type { SystemTableNames } from 'convex/server';
import type { Id, TableNames } from '../../convex/_generated/dataModel';

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
 * Public interface for the floorplan-viewer-core instance.
 * Re-exports `ViewerPublicApi` from viewer-core so consumers don't
 * need a direct import of the viewer-core package at the type level.
 */
export type { ViewerPublicApi as CoreInstance } from 'floorplan-viewer-core';

/** Selection change event payload */
export interface SelectionChangeEvent {
  selection: ReadonlySet<unknown>;
}

// ---------------------------------------------------------------------------
// ID Aliases & Helpers
// ---------------------------------------------------------------------------

/** Project ID — always a Convex Id<'projects'> inside the app */
export type ProjectId = Id<'projects'>;

/**
 * Cast a raw string (e.g. route param) to a Convex Id.
 * Use at the route/boundary layer only — interior code should pass Id types.
 */
export function asId<T extends TableNames | SystemTableNames>(s: string): Id<T> {
  return s as unknown as Id<T>;
}

// ---------------------------------------------------------------------------
// Domain Types
// ---------------------------------------------------------------------------

/**
 * Project entity from Convex
 */
export interface Project {
  _id: Id<'projects'>;
  displayName: string;
  description?: string;
  isPublic: boolean;
  defaultVersion: string;
  userId: Id<'users'>;
  slug: string;
  thumbnail?: string;
  cameraState?: CameraStateData;
}

/**
 * Project owner information
 */
export interface Owner {
  _id: Id<'users'>;
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
  _id?: Id<'snapshots'>;
  content: string;
  snapshotHash: string;
  contentHash: string;
  message?: string;
  createdAt: number;
  authorId?: Id<'users'>;
}

/**
 * Version data with associated snapshot
 */
export interface VersionData {
  version: { name: string; snapshotId: Id<'snapshots'> };
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
