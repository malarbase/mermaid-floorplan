/**
 * floorplan-common
 *
 * Shared utilities for floorplan packages.
 * Zero dependencies - pure TypeScript.
 */

export type {
  OverlapResult,
  RoomBounds,
} from './geometry.js';
// Geometry utilities
export {
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
  calculateWallOverlap,
} from './geometry.js';
