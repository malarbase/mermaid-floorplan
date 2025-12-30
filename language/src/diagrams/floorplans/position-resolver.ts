/**
 * Position resolver for relative positioning in floorplan DSL
 * Resolves relative positions (right-of, below, etc.) to absolute coordinates
 */

import type { Floor, Room } from "../../generated/ast.js";
import { getRoomSize } from "./variable-resolver.js";

export interface ResolvedPosition {
  x: number;
  y: number;
}

export interface PositionResolutionError {
  roomName: string;
  message: string;
  type: "missing_reference" | "circular_dependency" | "no_position";
}

export interface OverlapWarning {
  room1: string;
  room2: string;
  message: string;
}

export interface PositionResolutionResult {
  /** Map of room name to resolved position */
  positions: Map<string, ResolvedPosition>;
  /** Errors that prevent resolution */
  errors: PositionResolutionError[];
  /** Warnings about overlapping rooms */
  warnings: OverlapWarning[];
}

/**
 * Get resolved position for a room (either explicit or computed)
 */
export function getResolvedPosition(
  room: Room,
  resolvedPositions: Map<string, ResolvedPosition>
): ResolvedPosition | undefined {
  // First check if we have a resolved position
  const resolved = resolvedPositions.get(room.name);
  if (resolved) {
    return resolved;
  }
  
  // Fall back to explicit position if available
  if (room.position) {
    return { x: room.position.x, y: room.position.y };
  }
  
  return undefined;
}

/**
 * Compute absolute position for a room based on its relative position
 */
function computePosition(
  room: Room,
  referenceRoom: Room,
  referencePosition: ResolvedPosition,
  variables?: Map<string, { width: number; height: number }>
): ResolvedPosition {
  const rel = room.relativePosition!;
  const gap = rel.gap ?? 0;
  const direction = rel.direction;
  const alignment = rel.alignment;
  
  const refSize = getRoomSize(referenceRoom, variables);
  const roomSize = getRoomSize(room, variables);
  const refWidth = refSize.width;
  const refHeight = refSize.height;
  const roomWidth = roomSize.width;
  const roomHeight = roomSize.height;
  
  let x: number;
  let y: number;
  
  // Calculate base position based on direction
  switch (direction) {
    case "right-of":
      x = referencePosition.x + refWidth + gap;
      y = computeYAlignment(referencePosition.y, refHeight, roomHeight, alignment ?? "top");
      break;
      
    case "left-of":
      x = referencePosition.x - roomWidth - gap;
      y = computeYAlignment(referencePosition.y, refHeight, roomHeight, alignment ?? "top");
      break;
      
    case "below":
      x = computeXAlignment(referencePosition.x, refWidth, roomWidth, alignment ?? "left");
      y = referencePosition.y + refHeight + gap;
      break;
      
    case "above":
      x = computeXAlignment(referencePosition.x, refWidth, roomWidth, alignment ?? "left");
      y = referencePosition.y - roomHeight - gap;
      break;
      
    case "below-right-of":
      x = referencePosition.x + refWidth + gap;
      y = referencePosition.y + refHeight + gap;
      break;
      
    case "below-left-of":
      x = referencePosition.x - roomWidth - gap;
      y = referencePosition.y + refHeight + gap;
      break;
      
    case "above-right-of":
      x = referencePosition.x + refWidth + gap;
      y = referencePosition.y - roomHeight - gap;
      break;
      
    case "above-left-of":
      x = referencePosition.x - roomWidth - gap;
      y = referencePosition.y - roomHeight - gap;
      break;
      
    default:
      // Exhaustive check
      const _exhaustive: never = direction;
      throw new Error(`Unknown direction: ${_exhaustive}`);
  }
  
  return { x, y };
}

/**
 * Compute Y alignment for horizontal positioning (right-of, left-of)
 */
function computeYAlignment(
  refY: number,
  refHeight: number,
  roomHeight: number,
  alignment: string
): number {
  switch (alignment) {
    case "top":
      return refY;
    case "bottom":
      return refY + refHeight - roomHeight;
    case "center":
      return refY + (refHeight - roomHeight) / 2;
    default:
      return refY; // Default to top
  }
}

/**
 * Compute X alignment for vertical positioning (above, below)
 */
function computeXAlignment(
  refX: number,
  refWidth: number,
  roomWidth: number,
  alignment: string
): number {
  switch (alignment) {
    case "left":
      return refX;
    case "right":
      return refX + refWidth - roomWidth;
    case "center":
      return refX + (refWidth - roomWidth) / 2;
    default:
      return refX; // Default to left
  }
}

/**
 * Check if two rooms overlap
 */
function checkOverlap(
  room1: string,
  pos1: ResolvedPosition,
  size1: { width: number; height: number },
  room2: string,
  pos2: ResolvedPosition,
  size2: { width: number; height: number }
): OverlapWarning | null {
  const r1Left = pos1.x;
  const r1Right = pos1.x + size1.width;
  const r1Top = pos1.y;
  const r1Bottom = pos1.y + size1.height;
  
  const r2Left = pos2.x;
  const r2Right = pos2.x + size2.width;
  const r2Top = pos2.y;
  const r2Bottom = pos2.y + size2.height;
  
  // Check for overlap (excluding edge-touching which is fine)
  const tolerance = 0.01; // Small tolerance for floating point
  const overlapX = r1Left < r2Right - tolerance && r1Right > r2Left + tolerance;
  const overlapY = r1Top < r2Bottom - tolerance && r1Bottom > r2Top + tolerance;
  
  if (overlapX && overlapY) {
    return {
      room1,
      room2,
      message: `Rooms '${room1}' and '${room2}' overlap at their computed positions`,
    };
  }
  
  return null;
}

/**
 * Resolve all relative positions in a floor to absolute coordinates
 * Uses topological sort to handle dependencies
 */
export function resolveFloorPositions(
  floor: Floor,
  variables?: Map<string, { width: number; height: number }>
): PositionResolutionResult {
  const positions = new Map<string, ResolvedPosition>();
  const errors: PositionResolutionError[] = [];
  const warnings: OverlapWarning[] = [];
  
  // Build room lookup map
  const roomMap = new Map<string, Room>();
  for (const room of floor.rooms) {
    roomMap.set(room.name, room);
    // Also add sub-rooms
    for (const subRoom of room.subRooms) {
      roomMap.set(subRoom.name, subRoom);
    }
  }
  
  // Track which rooms still need resolution
  const pending = new Set<string>();
  const resolved = new Set<string>();
  
  // First pass: resolve rooms with explicit positions
  for (const room of floor.rooms) {
    if (room.position) {
      positions.set(room.name, { x: room.position.x, y: room.position.y });
      resolved.add(room.name);
    } else if (room.relativePosition) {
      pending.add(room.name);
    } else {
      errors.push({
        roomName: room.name,
        message: `Room '${room.name}' has no position specified (use 'at (x,y)' or relative positioning like 'right-of RoomA')`,
        type: "no_position",
      });
    }
  }
  
  // Iterative resolution with cycle detection
  let maxIterations = pending.size + 1;
  while (pending.size > 0 && maxIterations > 0) {
    maxIterations--;
    let progress = false;
    
    for (const roomName of pending) {
      const room = roomMap.get(roomName)!;
      const rel = room.relativePosition!;
      const refName = rel.reference;
      
      // Check if reference room exists
      const refRoom = roomMap.get(refName);
      if (!refRoom) {
        errors.push({
          roomName,
          message: `Room '${roomName}' references unknown room '${refName}'`,
          type: "missing_reference",
        });
        pending.delete(roomName);
        progress = true;
        continue;
      }
      
      // Check if reference room is resolved
      const refPosition = positions.get(refName);
      if (refPosition) {
        // Compute this room's position
        const computedPos = computePosition(room, refRoom, refPosition, variables);
        positions.set(roomName, computedPos);
        resolved.add(roomName);
        pending.delete(roomName);
        progress = true;
      }
    }
    
    if (!progress && pending.size > 0) {
      // No progress made - circular dependency
      const cycleRooms = Array.from(pending).join(", ");
      for (const roomName of pending) {
        errors.push({
          roomName,
          message: `Circular dependency detected involving rooms: ${cycleRooms}`,
          type: "circular_dependency",
        });
      }
      break;
    }
  }
  
  // Check for overlaps among resolved rooms
  const resolvedRooms = Array.from(resolved);
  for (let i = 0; i < resolvedRooms.length; i++) {
    for (let j = i + 1; j < resolvedRooms.length; j++) {
      const room1Name = resolvedRooms[i];
      const room2Name = resolvedRooms[j];
      const room1 = roomMap.get(room1Name)!;
      const room2 = roomMap.get(room2Name)!;
      const pos1 = positions.get(room1Name)!;
      const pos2 = positions.get(room2Name)!;
      
      const size1 = getRoomSize(room1, variables);
      const size2 = getRoomSize(room2, variables);
      
      const overlap = checkOverlap(
        room1Name,
        pos1,
        { width: size1.width, height: size1.height },
        room2Name,
        pos2,
        { width: size2.width, height: size2.height }
      );
      
      if (overlap) {
        warnings.push(overlap);
      }
    }
  }
  
  return { positions, errors, warnings };
}

/**
 * Resolve positions for all floors in a floorplan
 */
export function resolveAllPositions(
  floors: Floor[],
  variables?: Map<string, { width: number; height: number }>
): Map<string, PositionResolutionResult> {
  const results = new Map<string, PositionResolutionResult>();
  for (const floor of floors) {
    results.set(floor.id, resolveFloorPositions(floor, variables));
  }
  return results;
}

