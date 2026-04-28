/**
 * Wall ownership and adjacency detection for shared wall rendering
 *
 * Prevents Z-fighting by ensuring only one room renders each shared wall.
 * Supports per-face materials for walls shared by multiple rooms.
 */

import type { MaterialStyle } from './materials.js';
import type { JsonRoom, JsonWall } from './types.js';

/**
 * Information about an adjacent room and its overlap with a wall
 */
export interface AdjacentRoomInfo {
  room: JsonRoom;
  style: MaterialStyle | undefined;
  overlapStart: number; // Start position along the wall (0 = wall start)
  overlapEnd: number; // End position along the wall
}

/**
 * A segment of a wall with its materials
 */
export interface WallSegment {
  startPos: number; // Start position along wall length
  endPos: number; // End position along wall length
  ownerStyle: MaterialStyle | undefined;
  adjacentStyle: MaterialStyle | undefined; // undefined for exterior-facing segments
  hasAdjacentRoom: boolean;
}

/**
 * Result of wall ownership check
 */
export interface WallOwnershipResult {
  shouldRender: boolean;
  adjacentRooms: AdjacentRoomInfo[];
  segments: WallSegment[];
}

/**
 * Style resolver function type
 */
export type StyleResolver = (room: JsonRoom) => MaterialStyle | undefined;

/**
 * Check if a room is adjacent to another room's wall
 * @param room The room that owns the wall
 * @param wall The wall direction to check
 * @param candidate The candidate room to check for adjacency
 * @param tolerance Tolerance for floating point comparisons
 * @returns Overlap info if adjacent, null otherwise
 */
export function checkAdjacency(
  room: JsonRoom,
  wall: JsonWall,
  candidate: JsonRoom,
  tolerance: number = 0.1,
): { overlapStart: number; overlapEnd: number } | null {
  if (room.name === candidate.name) return null;

  // Get wall position and extent
  const wallPos = getWallPosition(room, wall.direction);
  const wallExtent = getWallExtent(room, wall.direction);

  // Get candidate's opposing wall position and extent
  const opposingDir = getOpposingDirection(wall.direction);
  const candidateWallPos = getWallPosition(candidate, opposingDir);
  const candidateExtent = getWallExtent(candidate, opposingDir);

  // Check if walls are at the same position (within tolerance)
  if (Math.abs(wallPos - candidateWallPos) > tolerance) {
    return null;
  }

  // Check for overlap along the wall
  const overlapStart = Math.max(wallExtent.start, candidateExtent.start);
  const overlapEnd = Math.min(wallExtent.end, candidateExtent.end);

  // Must have positive overlap
  if (overlapEnd - overlapStart <= tolerance) {
    return null;
  }

  // Convert to positions relative to wall start
  return {
    overlapStart: overlapStart - wallExtent.start,
    overlapEnd: overlapEnd - wallExtent.start,
  };
}

/**
 * Get the position of a wall (X for left/right, Z for top/bottom)
 */
function getWallPosition(room: JsonRoom, direction: string): number {
  switch (direction) {
    case 'left':
      return room.x;
    case 'right':
      return room.x + room.width;
    case 'top':
      return room.z;
    case 'bottom':
      return room.z + room.height;
    default:
      return 0;
  }
}

/**
 * Get the extent of a wall (start and end positions along its length)
 */
function getWallExtent(room: JsonRoom, direction: string): { start: number; end: number } {
  switch (direction) {
    case 'left':
    case 'right':
      // Vertical walls extend along Z axis
      return { start: room.z, end: room.z + room.height };
    case 'top':
    case 'bottom':
      // Horizontal walls extend along X axis
      return { start: room.x, end: room.x + room.width };
    default:
      return { start: 0, end: 0 };
  }
}

/**
 * Get the opposing wall direction
 */
function getOpposingDirection(direction: string): string {
  switch (direction) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    default:
      return direction;
  }
}

/**
 * Determine if the current room should render this wall based on ownership rules.
 *
 * Ownership rules:
 * - For vertical walls (left/right): Room with smaller X position owns
 * - For horizontal walls (top/bottom): Room with smaller Z position owns
 * - If positions are equal, compare room names alphabetically
 *
 * @param room The current room
 * @param wall The wall to check
 * @param allRooms All rooms on the floor
 * @param tolerance Tolerance for position comparison
 * @returns true if this room should render the wall
 */
export function shouldRenderWall(
  room: JsonRoom,
  wall: JsonWall,
  allRooms: JsonRoom[],
  tolerance: number = 0.1,
): boolean {
  // Always render open walls (nothing to render)
  if (wall.type === 'open') {
    return false;
  }

  // Calculate total wall length
  const isVertical = wall.direction === 'left' || wall.direction === 'right';
  const wallLength = isVertical ? room.height : room.width;

  // Track total coverage by adjacent rooms that would own the wall
  let coveredLength = 0;

  // Find all adjacent rooms and calculate their coverage
  for (const candidate of allRooms) {
    const adjacency = checkAdjacency(room, wall, candidate, tolerance);
    if (adjacency) {
      // Found an adjacent room - check if it would own this segment
      let candidateOwnsSegment = false;

      if (isVertical) {
        // Vertical wall: room with smaller X owns
        if (room.x > candidate.x + tolerance) candidateOwnsSegment = true;
        else if (Math.abs(room.x - candidate.x) <= tolerance && room.name > candidate.name)
          candidateOwnsSegment = true;
      } else {
        // Horizontal wall: room with smaller Z owns
        if (room.z > candidate.z + tolerance) candidateOwnsSegment = true;
        else if (Math.abs(room.z - candidate.z) <= tolerance && room.name > candidate.name)
          candidateOwnsSegment = true;
      }

      if (candidateOwnsSegment) {
        // This segment is owned by the adjacent room
        coveredLength += adjacency.overlapEnd - adjacency.overlapStart;
      }
    }
  }

  // Render if there's any uncovered portion of the wall
  // (covered portions will be handled by adjacent rooms)
  return coveredLength < wallLength - tolerance;
}

/**
 * Find all rooms adjacent to a wall and compute their overlap regions
 */
export function findAdjacentRooms(
  room: JsonRoom,
  wall: JsonWall,
  allRooms: JsonRoom[],
  styleResolver: StyleResolver,
  tolerance: number = 0.1,
): AdjacentRoomInfo[] {
  const adjacentRooms: AdjacentRoomInfo[] = [];

  for (const candidate of allRooms) {
    const adjacency = checkAdjacency(room, wall, candidate, tolerance);
    if (adjacency) {
      adjacentRooms.push({
        room: candidate,
        style: styleResolver(candidate),
        overlapStart: adjacency.overlapStart,
        overlapEnd: adjacency.overlapEnd,
      });
    }
  }

  // Sort by overlap start position
  adjacentRooms.sort((a, b) => a.overlapStart - b.overlapStart);

  return adjacentRooms;
}

/**
 * Compute wall segments based on adjacent rooms.
 * Each segment corresponds to either:
 * - An exterior portion (no adjacent room)
 * - A portion facing a specific adjacent room
 */
export function computeWallSegments(
  room: JsonRoom,
  wall: JsonWall,
  adjacentRooms: AdjacentRoomInfo[],
  ownerStyle: MaterialStyle | undefined,
): WallSegment[] {
  const wallLength =
    wall.direction === 'left' || wall.direction === 'right' ? room.height : room.width;

  if (adjacentRooms.length === 0) {
    // No adjacent rooms - single exterior segment
    return [
      {
        startPos: 0,
        endPos: wallLength,
        ownerStyle,
        adjacentStyle: undefined,
        hasAdjacentRoom: false,
      },
    ];
  }

  const segments: WallSegment[] = [];
  let currentPos = 0;

  for (const adj of adjacentRooms) {
    // Add exterior segment before this adjacent room (if any gap)
    if (adj.overlapStart > currentPos + 0.01) {
      segments.push({
        startPos: currentPos,
        endPos: adj.overlapStart,
        ownerStyle,
        adjacentStyle: undefined,
        hasAdjacentRoom: false,
      });
    }

    // Add segment for this adjacent room
    segments.push({
      startPos: Math.max(currentPos, adj.overlapStart),
      endPos: adj.overlapEnd,
      ownerStyle,
      adjacentStyle: adj.style,
      hasAdjacentRoom: true,
    });

    currentPos = adj.overlapEnd;
  }

  // Add trailing exterior segment (if any)
  if (currentPos < wallLength - 0.01) {
    segments.push({
      startPos: currentPos,
      endPos: wallLength,
      ownerStyle,
      adjacentStyle: undefined,
      hasAdjacentRoom: false,
    });
  }

  return segments;
}

/**
 * Determine whether a wall's corner has a perpendicular neighbour room whose
 * wall will fill that corner.
 *
 * This is used by `calculateWallGeometry` so that horizontal (top/bottom) walls
 * only extend past the room edge at a corner when there is no perpendicular
 * (left/right) room wall that already covers that corner space.  Without this
 * check, every corner gets double-covered by two walls, producing a
 * `wallThickness × wallHeight × wallThickness` overlap cube that causes Z-fighting.
 *
 * Terminology
 * -----------
 * - A "start" corner for a top/bottom wall is the wall's left (min-X) end.
 * - An "end" corner is the wall's right (max-X) end.
 * - A "start" corner for a left/right wall is the wall's top (min-Z) end.
 * - An "end" corner is the wall's bottom (max-Z) end.
 *
 * A neighbour "fills the corner" when:
 *   1. It is adjacent along the perpendicular axis at that end.
 *   2. Its room body (not just its wall position) overlaps the corner cell.
 *
 * @param room         The room that owns the wall being evaluated.
 * @param wall         The wall direction being evaluated.
 * @param end          Which end of the wall to check ('start' | 'end').
 * @param allRooms     All rooms on the same floor.
 * @param tolerance    Floating-point tolerance for boundary comparisons.
 * @returns `true` if a perpendicular neighbour will fill the corner cell.
 */
export function hasNeighborAtCorner(
  room: JsonRoom,
  wall: JsonWall,
  end: 'start' | 'end',
  allRooms: JsonRoom[],
  tolerance: number = 0.1,
): boolean {
  const dir = wall.direction;
  const isHorizontal = dir === 'top' || dir === 'bottom';

  for (const candidate of allRooms) {
    if (candidate.name === room.name) continue;

    if (isHorizontal) {
      // For a top/bottom wall we check the perpendicular (left / right) direction.
      // 'start' = the left (−X) end of the wall → need a neighbour on the left.
      // 'end'   = the right (+X) end              → need a neighbour on the right.
      const cornerX = end === 'start' ? room.x : room.x + room.width;

      if (end === 'start') {
        // We need a room whose right edge meets our left edge
        if (Math.abs(candidate.x + candidate.width - cornerX) > tolerance) continue;
      } else {
        // We need a room whose left edge meets our right edge
        if (Math.abs(candidate.x - cornerX) > tolerance) continue;
      }

      // The candidate must have a Z body that overlaps with the current room's
      // Z body — not merely touch the corner boundary.  A diagonal neighbour
      // that only shares the exact corner point (e.g. room above-left) would
      // pass an "isPoint-inside-range" test but does NOT fill the corner cell.
      const candidateZEnd = candidate.z + candidate.height;
      const candidateZStart = candidate.z;

      if (
        candidateZEnd > room.z + tolerance &&
        candidateZStart < room.z + room.height - tolerance
      ) {
        return true;
      }
    } else {
      // For a left/right wall we check the perpendicular (top / bottom) direction.
      // 'start' = the top (−Z) end of the wall → need a neighbour above.
      // 'end'   = the bottom (+Z) end           → need a neighbour below.
      const cornerZ = end === 'start' ? room.z : room.z + room.height;

      if (end === 'start') {
        // We need a room whose bottom edge meets our top edge
        if (Math.abs(candidate.z + candidate.height - cornerZ) > tolerance) continue;
      } else {
        // We need a room whose top edge meets our bottom edge
        if (Math.abs(candidate.z - cornerZ) > tolerance) continue;
      }

      // Same body-overlap check along X: the candidate must overlap the current
      // room's X body, not merely touch the corner boundary.
      const candidateXEnd = candidate.x + candidate.width;
      const candidateXStart = candidate.x;

      if (candidateXEnd > room.x + tolerance && candidateXStart < room.x + room.width - tolerance) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Full wall ownership analysis - determines if wall should be rendered
 * and computes segments with materials
 */
export function analyzeWallOwnership(
  room: JsonRoom,
  wall: JsonWall,
  allRooms: JsonRoom[],
  styleResolver: StyleResolver,
  tolerance: number = 0.1,
): WallOwnershipResult {
  const ownerStyle = styleResolver(room);

  // Check if this room should render the wall
  const shouldRender = shouldRenderWall(room, wall, allRooms, tolerance);

  if (!shouldRender) {
    return {
      shouldRender: false,
      adjacentRooms: [],
      segments: [],
    };
  }

  // Find adjacent rooms for segmentation
  const adjacentRooms = findAdjacentRooms(room, wall, allRooms, styleResolver, tolerance);

  // Compute segments
  const segments = computeWallSegments(room, wall, adjacentRooms, ownerStyle);

  return {
    shouldRender: true,
    adjacentRooms,
    segments,
  };
}
