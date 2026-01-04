/**
 * floorplan-common
 * 
 * Shared utilities for floorplan packages.
 * Zero dependencies - pure TypeScript.
 */

// Geometry utilities
export {
  calculateWallOverlap,
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
} from './geometry.js';

export type {
  RoomBounds,
  OverlapResult,
} from './geometry.js';

