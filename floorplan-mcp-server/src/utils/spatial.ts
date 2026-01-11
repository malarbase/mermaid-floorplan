/**
 * Spatial analysis utilities for computing relative positions from absolute coordinates
 */

import { type Room, getRoomSize } from "floorplans-language";

export type Direction =
  | "right-of"
  | "left-of"
  | "above"
  | "below"
  | "above-right-of"
  | "above-left-of"
  | "below-right-of"
  | "below-left-of";

export type Alignment = "top" | "bottom" | "left" | "right" | "center";

export interface RoomBounds {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // Computed bounds
  right: number; // x + width
  bottom: number; // y + height
  centerX: number;
  centerY: number;
}

export interface RelativeAssignment {
  room: string;
  reference: string;
  direction: Direction;
  gap: number;
  alignment?: Alignment;
}

export interface SpatialRelationship {
  direction: Direction;
  gap: number;
  alignment?: Alignment;
  score: number; // Lower is better
}

/**
 * Extract bounds from a room with absolute position
 */
export function extractRoomBounds(
  room: Room,
  variables?: Map<string, { width: number; height: number }>
): RoomBounds | undefined {
  if (!room.position) return undefined;

  const x = room.position.x.value;
  const y = room.position.y.value;
  const size = getRoomSize(room, variables);
  const { width, height } = size;

  return {
    name: room.name,
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

/**
 * Extract bounds from all rooms that have absolute positions
 */
export function extractAllRoomBounds(rooms: Room[]): Map<string, RoomBounds> {
  const bounds = new Map<string, RoomBounds>();

  for (const room of rooms) {
    const b = extractRoomBounds(room);
    if (b) {
      bounds.set(room.name, b);
    }
  }

  return bounds;
}

/**
 * Analyze the spatial relationship between two rooms
 */
export function analyzeRelationship(
  room: RoomBounds,
  ref: RoomBounds,
  tolerance: number
): SpatialRelationship | null {
  // Calculate edge distances
  const gapRight = room.x - ref.right; // Room is to the right of ref
  const gapLeft = ref.x - room.right; // Room is to the left of ref
  const gapBelow = room.y - ref.bottom; // Room is below ref
  const gapAbove = ref.y - room.bottom; // Room is above ref

  // Check for overlap (rooms can't be expressed as relative if they overlap)
  const overlapX = room.x < ref.right && room.right > ref.x;
  const overlapY = room.y < ref.bottom && room.bottom > ref.y;

  // Tolerance for adjacency detection
  const adjTolerance = tolerance;

  // Is there horizontal separation?
  const isRight = gapRight >= -adjTolerance;
  const isLeft = gapLeft >= -adjTolerance;

  // Is there vertical separation?
  const isBelow = gapBelow >= -adjTolerance;
  const isAbove = gapAbove >= -adjTolerance;

  // Check vertical overlap (for horizontal adjacency like right-of, left-of)
  const verticalOverlap = room.y < ref.bottom + adjTolerance && room.bottom > ref.y - adjTolerance;

  // Check horizontal overlap (for vertical adjacency like above, below)
  const horizontalOverlap = room.x < ref.right + adjTolerance && room.right > ref.x - adjTolerance;

  let direction: Direction;
  let gap: number;
  let alignment: Alignment | undefined;

  // Determine direction - prefer cardinal directions over diagonals
  if (isRight && verticalOverlap && !overlapX) {
    direction = "right-of";
    gap = Math.max(0, gapRight);
    alignment = detectVerticalAlignment(room, ref, tolerance);
  } else if (isLeft && verticalOverlap && !overlapX) {
    direction = "left-of";
    gap = Math.max(0, gapLeft);
    alignment = detectVerticalAlignment(room, ref, tolerance);
  } else if (isBelow && horizontalOverlap && !overlapY) {
    direction = "below";
    gap = Math.max(0, gapBelow);
    alignment = detectHorizontalAlignment(room, ref, tolerance);
  } else if (isAbove && horizontalOverlap && !overlapY) {
    direction = "above";
    gap = Math.max(0, gapAbove);
    alignment = detectHorizontalAlignment(room, ref, tolerance);
  } else if (isRight && isBelow) {
    direction = "below-right-of";
    gap = Math.min(Math.max(0, gapRight), Math.max(0, gapBelow));
  } else if (isRight && isAbove) {
    direction = "above-right-of";
    gap = Math.min(Math.max(0, gapRight), Math.max(0, gapAbove));
  } else if (isLeft && isBelow) {
    direction = "below-left-of";
    gap = Math.min(Math.max(0, gapLeft), Math.max(0, gapBelow));
  } else if (isLeft && isAbove) {
    direction = "above-left-of";
    gap = Math.min(Math.max(0, gapLeft), Math.max(0, gapAbove));
  } else {
    // Rooms overlap significantly - can't express as relative
    return null;
  }

  // Calculate score (lower = better reference)
  const dx = room.centerX - ref.centerX;
  const dy = room.centerY - ref.centerY;
  const distanceScore = Math.sqrt(dx * dx + dy * dy);
  const alignmentBonus = alignment ? -10 : 0;
  const cardinalBonus = direction.includes("-") ? 5 : 0; // Penalize diagonals
  const score = distanceScore + alignmentBonus + cardinalBonus + gap;

  return {
    direction,
    gap: Math.round(gap * 100) / 100,
    alignment,
    score,
  };
}

/**
 * Detect vertical alignment for horizontal positioning (right-of, left-of)
 */
function detectVerticalAlignment(
  room: RoomBounds,
  ref: RoomBounds,
  tolerance: number
): Alignment | undefined {
  // Top-aligned: room.y ≈ ref.y
  if (Math.abs(room.y - ref.y) <= tolerance) {
    return "top";
  }

  // Bottom-aligned: room.bottom ≈ ref.bottom
  if (Math.abs(room.bottom - ref.bottom) <= tolerance) {
    return "bottom";
  }

  // Center-aligned: room.centerY ≈ ref.centerY
  if (Math.abs(room.centerY - ref.centerY) <= tolerance) {
    return "center";
  }

  // No clear alignment - will use default (top for horizontal adjacency)
  return undefined;
}

/**
 * Detect horizontal alignment for vertical positioning (above, below)
 */
function detectHorizontalAlignment(
  room: RoomBounds,
  ref: RoomBounds,
  tolerance: number
): Alignment | undefined {
  // Left-aligned: room.x ≈ ref.x
  if (Math.abs(room.x - ref.x) <= tolerance) {
    return "left";
  }

  // Right-aligned: room.right ≈ ref.right
  if (Math.abs(room.right - ref.right) <= tolerance) {
    return "right";
  }

  // Center-aligned
  if (Math.abs(room.centerX - ref.centerX) <= tolerance) {
    return "center";
  }

  return undefined;
}

/**
 * Find all possible adjacencies for a room to already-resolved rooms
 */
export function findAdjacencies(
  room: RoomBounds,
  candidates: RoomBounds[],
  tolerance: number
): Array<RelativeAssignment & { score: number }> {
  const adjacencies: Array<RelativeAssignment & { score: number }> = [];

  for (const ref of candidates) {
    if (ref.name === room.name) continue;

    const relationship = analyzeRelationship(room, ref, tolerance);
    if (relationship) {
      adjacencies.push({
        room: room.name,
        reference: ref.name,
        direction: relationship.direction,
        gap: relationship.gap,
        alignment: relationship.alignment,
        score: relationship.score,
      });
    }
  }

  // Sort by score (prefer closer, more aligned relationships)
  return adjacencies.sort((a, b) => a.score - b.score);
}

/**
 * Build relative assignments for all rooms using topological ordering
 * Starting from an anchor room, iteratively assign relative positions
 */
export function buildRelativeAssignments(
  roomBounds: Map<string, RoomBounds>,
  anchorRoom: string,
  tolerance: number
): { assignments: RelativeAssignment[]; unresolved: string[] } {
  const assignments: RelativeAssignment[] = [];
  const resolved = new Set<string>([anchorRoom]);
  const pending = new Set(
    Array.from(roomBounds.keys()).filter((name) => name !== anchorRoom)
  );

  const allRooms = Array.from(roomBounds.values());

  // Iteratively resolve rooms that can reference already-resolved rooms
  let maxIterations = pending.size + 1;
  while (pending.size > 0 && maxIterations > 0) {
    maxIterations--;
    let progress = false;

    for (const roomName of pending) {
      const room = roomBounds.get(roomName)!;

      // Find adjacencies to already-resolved rooms only
      const resolvedRooms = allRooms.filter((r) => resolved.has(r.name));
      const adjacencies = findAdjacencies(room, resolvedRooms, tolerance);

      if (adjacencies.length > 0) {
        // Pick the best adjacency (lowest score)
        const best = adjacencies[0];
        assignments.push({
          room: roomName,
          reference: best.reference,
          direction: best.direction,
          gap: best.gap,
          alignment: best.alignment,
        });
        resolved.add(roomName);
        pending.delete(roomName);
        progress = true;
      }
    }

    if (!progress && pending.size > 0) {
      // No progress - some rooms couldn't be assigned
      break;
    }
  }

  return {
    assignments,
    unresolved: Array.from(pending),
  };
}

/**
 * Check if two rooms overlap
 */
export function roomsOverlap(a: RoomBounds, b: RoomBounds): boolean {
  const tolerance = 0.01;
  const overlapX = a.x < b.right - tolerance && a.right > b.x + tolerance;
  const overlapY = a.y < b.bottom - tolerance && a.bottom > b.y + tolerance;
  return overlapX && overlapY;
}

/**
 * Validate that all rooms have positions and none overlap
 */
export function validateForConversion(
  rooms: Room[],
  anchorRoom: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check anchor room exists and has position
  const anchor = rooms.find((r) => r.name === anchorRoom);
  if (!anchor) {
    errors.push(`Anchor room '${anchorRoom}' not found`);
    return { valid: false, errors };
  }
  if (!anchor.position) {
    errors.push(`Anchor room '${anchorRoom}' has no absolute position`);
  }

  // Check all rooms have positions
  const roomsWithoutPos = rooms.filter((r) => !r.position);
  if (roomsWithoutPos.length > 0) {
    const names = roomsWithoutPos.map((r) => r.name).join(", ");
    errors.push(`Rooms without positions cannot be converted: ${names}`);
  }

  // Check for overlapping rooms
  const bounds = extractAllRoomBounds(rooms);
  const boundsList = Array.from(bounds.values());
  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      if (roomsOverlap(boundsList[i], boundsList[j])) {
        errors.push(
          `Rooms '${boundsList[i].name}' and '${boundsList[j].name}' overlap`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

