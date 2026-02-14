/**
 * Shared type definitions for project-related data structures.
 * Used across route components that display floorplan projects.
 */

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
  snapshotHash: string;
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
