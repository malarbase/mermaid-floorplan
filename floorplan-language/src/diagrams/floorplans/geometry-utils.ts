/**
 * Geometry utilities for floorplan rendering
 * 
 * Re-exports shared utilities from floorplan-common and provides
 * SVG-specific utilities for wall bounds calculations.
 */

// Re-export shared utilities from floorplan-common
export {
  calculateWallOverlap,
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
  type RoomBounds,
  type OverlapResult,
} from 'floorplan-common';

// ============================================================================
// SVG-Specific Wall Bounds API
// ============================================================================

/**
 * Wall bounds used by SVG renderer
 */
export interface WallBounds {
  x: number;
  y: number;
  length: number;
  isHorizontal: boolean;
}

/**
 * Calculate the overlap between two wall bounds
 * Used by SVG renderer which works with wall-centric coordinates
 */
export function calculateWallBoundsOverlap(
  fromBounds: WallBounds,
  toBounds: WallBounds
): { start: number; end: number; length: number } | null {
  if (fromBounds.isHorizontal && toBounds.isHorizontal) {
    // Both horizontal walls - find x overlap
    const overlapStart = Math.max(fromBounds.x, toBounds.x);
    const overlapEnd = Math.min(fromBounds.x + fromBounds.length, toBounds.x + toBounds.length);
    
    if (overlapEnd <= overlapStart) {
      return null;
    }
    
    return { start: overlapStart, end: overlapEnd, length: overlapEnd - overlapStart };
  } else if (!fromBounds.isHorizontal && !toBounds.isHorizontal) {
    // Both vertical walls - find y overlap
    const overlapStart = Math.max(fromBounds.y, toBounds.y);
    const overlapEnd = Math.min(fromBounds.y + fromBounds.length, toBounds.y + toBounds.length);
    
    if (overlapEnd <= overlapStart) {
      return null;
    }
    
    return { start: overlapStart, end: overlapEnd, length: overlapEnd - overlapStart };
  }
  
  // Mixed orientation - no standard overlap
  return null;
}

/**
 * Calculate position on overlapping wall bounds segment
 * Used by SVG renderer
 */
export function calculatePositionOnWallOverlap(
  fromBounds: WallBounds,
  toBounds: WallBounds,
  positionPercent: number
): number | null {
  const overlap = calculateWallBoundsOverlap(fromBounds, toBounds);
  if (!overlap) return null;
  
  return overlap.start + (overlap.length * positionPercent / 100);
}
