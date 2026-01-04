/**
 * Shared geometry utilities for 2D (SVG) and 3D rendering
 * Single source of truth for overlap calculations to ensure consistent behavior
 */

/**
 * Rectangular bounds in a 2D coordinate system
 * Note: In 3D contexts, y corresponds to z (depth)
 */
export interface RoomBounds {
  x: number;
  y: number;  // z in 3D coordinates
  width: number;
  height: number;
}

/**
 * Result of an overlap calculation
 */
export interface OverlapResult {
  start: number;
  end: number;
  length: number;
}

/**
 * Calculate the overlap segment between two rooms on adjacent walls
 * @param sourceRoom - The room initiating the connection
 * @param targetRoom - The room being connected to
 * @param isVertical - Whether the walls are vertical (left/right) or horizontal (top/bottom)
 * @returns The overlap segment or null if no overlap exists
 */
export function calculateWallOverlap(
  sourceRoom: RoomBounds,
  targetRoom: RoomBounds,
  isVertical: boolean
): OverlapResult | null {
  let overlapStart: number, overlapEnd: number;

  if (isVertical) {
    // Vertical walls (left/right): overlap along Y axis
    overlapStart = Math.max(sourceRoom.y, targetRoom.y);
    overlapEnd = Math.min(
      sourceRoom.y + sourceRoom.height,
      targetRoom.y + targetRoom.height
    );
  } else {
    // Horizontal walls (top/bottom): overlap along X axis
    overlapStart = Math.max(sourceRoom.x, targetRoom.x);
    overlapEnd = Math.min(
      sourceRoom.x + sourceRoom.width,
      targetRoom.x + targetRoom.width
    );
  }

  if (overlapEnd <= overlapStart) {
    return null; // No overlap
  }

  return {
    start: overlapStart,
    end: overlapEnd,
    length: overlapEnd - overlapStart,
  };
}

/**
 * Calculate absolute position along shared wall segment
 * Position is interpreted as a percentage of the SHARED segment, not the full wall
 * 
 * @param sourceRoom - The room initiating the connection
 * @param targetRoom - The room being connected to
 * @param isVertical - Whether the walls are vertical (left/right) or horizontal (top/bottom)
 * @param positionPercent - Position as percentage (0-100) along the shared segment
 * @returns Absolute coordinate or null if no overlap exists
 */
export function calculatePositionOnOverlap(
  sourceRoom: RoomBounds,
  targetRoom: RoomBounds,
  isVertical: boolean,
  positionPercent: number
): number | null {
  const overlap = calculateWallOverlap(sourceRoom, targetRoom, isVertical);
  if (!overlap) return null;

  return overlap.start + (overlap.length * positionPercent / 100);
}

/**
 * Calculate absolute position with fallback for when target room is unavailable
 * Falls back to percentage of full wall if no target room provided
 * 
 * @param sourceRoom - The room initiating the connection
 * @param targetRoom - The room being connected to (optional)
 * @param isVertical - Whether the walls are vertical (left/right) or horizontal (top/bottom)
 * @param positionPercent - Position as percentage (0-100)
 * @returns Absolute coordinate
 */
export function calculatePositionWithFallback(
  sourceRoom: RoomBounds,
  targetRoom: RoomBounds | null | undefined,
  isVertical: boolean,
  positionPercent: number
): number {
  // Try shared segment calculation first
  if (targetRoom) {
    const position = calculatePositionOnOverlap(sourceRoom, targetRoom, isVertical, positionPercent);
    if (position !== null) {
      return position;
    }
  }

  // Fallback: percentage of full wall
  if (isVertical) {
    return sourceRoom.y + sourceRoom.height * (positionPercent / 100);
  } else {
    return sourceRoom.x + sourceRoom.width * (positionPercent / 100);
  }
}

