/**
 * Connection rendering utilities for floorplan SVG generation
 * Renders door connections between rooms
 */

import type { Connection, Floor, Room, WallDirection } from '../../generated/ast.js';
import { generateDoor } from './door.js';
import { calculatePositionOnWallOverlap, type WallBounds } from './geometry-utils.js';
import type { ResolvedPosition } from './position-resolver.js';
import { getRoomSize } from './variable-resolver.js';

export interface ConnectionPoint {
  x: number;
  y: number;
  width: number;
  height: number;
  wallDirection: WallDirection;
}

/**
 * Find a room by name in the floor
 */
function findRoom(floor: Floor, roomName: string): Room | undefined {
  for (const room of floor.rooms) {
    if (room.name === roomName) {
      return room;
    }
    // Check sub-rooms
    for (const subRoom of room.subRooms) {
      if (subRoom.name === roomName) {
        return subRoom;
      }
    }
  }
  return undefined;
}

/**
 * Get position for a room (resolved or explicit)
 */
function getRoomPosition(
  room: Room,
  resolvedPositions?: Map<string, ResolvedPosition>,
): { x: number; y: number } | null {
  // First try resolved positions map
  if (resolvedPositions) {
    const resolved = resolvedPositions.get(room.name);
    if (resolved) {
      return resolved;
    }
  }
  // Fall back to explicit position
  if (room.position) {
    return { x: room.position.x.value, y: room.position.y.value };
  }
  return null;
}

/**
 * Get the wall bounds for a room in a specific direction
 */
function getWallBounds(
  room: Room,
  direction: WallDirection,
  parentOffsetX = 0,
  parentOffsetY = 0,
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
): WallBounds | null {
  const pos = getRoomPosition(room, resolvedPositions);
  if (!pos) {
    return null;
  }
  const x = pos.x + parentOffsetX;
  const y = pos.y + parentOffsetY;
  const size = getRoomSize(room, variables);
  const width = size.width;
  const height = size.height;
  const wallThickness = 0.2;

  switch (direction) {
    case 'top':
      return { x, y, length: width, isHorizontal: true };
    case 'bottom':
      return { x, y: y + height - wallThickness, length: width, isHorizontal: true };
    case 'left':
      return { x, y, length: height, isHorizontal: false };
    case 'right':
      return { x: x + width - wallThickness, y, length: height, isHorizontal: false };
  }
}

/**
 * Calculate the connection point between two rooms
 * The connection is placed at the intersection of the specified walls
 */
function calculateConnectionPoint(
  fromRoom: Room,
  fromWall: WallDirection,
  toRoom: Room,
  toWall: WallDirection,
  position: number = 50, // percentage along the wall
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
  doorWidth: number = 2, // Standard door width (approx 2-3 feet), can be overridden by connection size
): ConnectionPoint | null {
  const wallThickness = 0.2;

  const fromBounds = getWallBounds(fromRoom, fromWall, 0, 0, resolvedPositions, variables);
  const toBounds = getWallBounds(toRoom, toWall, 0, 0, resolvedPositions, variables);

  if (!fromBounds || !toBounds) {
    return null; // Positions not resolved
  }

  // For horizontal walls connecting to vertical walls or same-orientation walls
  // We find the overlapping segment and place the door there

  let x: number, y: number, width: number, height: number;
  let wallDirection: WallDirection;

  if (fromBounds.isHorizontal && toBounds.isHorizontal) {
    // Both horizontal walls - use shared utility for overlap calculation
    const doorX = calculatePositionOnWallOverlap(fromBounds, toBounds, position);
    if (doorX === null) {
      return null; // No overlap
    }

    x = doorX - doorWidth / 2;
    y = Math.min(fromBounds.y, toBounds.y);
    width = doorWidth;
    height = wallThickness;
    wallDirection = fromWall;
  } else if (!fromBounds.isHorizontal && !toBounds.isHorizontal) {
    // Both vertical walls - use shared utility for overlap calculation
    const doorY = calculatePositionOnWallOverlap(fromBounds, toBounds, position);
    if (doorY === null) {
      return null; // No overlap
    }

    x = Math.min(fromBounds.x, toBounds.x);
    y = doorY - doorWidth / 2;
    width = wallThickness;
    height = doorWidth;
    wallDirection = fromWall;
  } else {
    // Mixed orientation - place door at intersection point
    const horizBounds = fromBounds.isHorizontal ? fromBounds : toBounds;
    const horizWall = fromBounds.isHorizontal ? fromWall : toWall;

    // Use the position to offset along the horizontal wall
    const doorX = horizBounds.x + (horizBounds.length * position) / 100 - doorWidth / 2;

    x = doorX;
    y = horizBounds.y;
    width = doorWidth;
    height = wallThickness;
    wallDirection = horizWall;
  }

  return { x, y, width, height, wallDirection };
}

/**
 * Infer the wall direction based on room positions
 * Used when wall direction is not explicitly specified
 */
function inferWallDirection(
  fromRoom: Room,
  toRoom: Room,
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
): { fromWall: WallDirection; toWall: WallDirection } | null {
  const fromPos = getRoomPosition(fromRoom, resolvedPositions);
  const toPos = getRoomPosition(toRoom, resolvedPositions);

  if (!fromPos || !toPos) {
    return null;
  }

  const fromSize = getRoomSize(fromRoom, variables);
  const toSize = getRoomSize(toRoom, variables);

  const fromX = fromPos.x;
  const fromY = fromPos.y;
  const fromWidth = fromSize.width;
  const fromHeight = fromSize.height;

  const toX = toPos.x;
  const toY = toPos.y;
  const toWidth = toSize.width;
  const toHeight = toSize.height;

  // Check if rooms are adjacent horizontally
  if (Math.abs(fromX + fromWidth - toX) < 0.5) {
    return { fromWall: 'right', toWall: 'left' };
  }
  if (Math.abs(toX + toWidth - fromX) < 0.5) {
    return { fromWall: 'left', toWall: 'right' };
  }

  // Check if rooms are adjacent vertically
  if (Math.abs(fromY + fromHeight - toY) < 0.5) {
    return { fromWall: 'bottom', toWall: 'top' };
  }
  if (Math.abs(toY + toHeight - fromY) < 0.5) {
    return { fromWall: 'top', toWall: 'bottom' };
  }

  return null;
}

/**
 * Generate SVG for a connection between two rooms
 */
export function generateConnection(
  connection: Connection,
  floor: Floor,
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
): string {
  const fromRoomName = connection.from.room.name;
  const toRoomName = connection.to.room.name;

  // Handle 'outside' connections
  if (!fromRoomName || !toRoomName) {
    // For now, skip outside connections - they use the room's wall directly
    return '';
  }

  const fromRoom = findRoom(floor, fromRoomName);
  const toRoom = findRoom(floor, toRoomName);

  if (!fromRoom || !toRoom) {
    return ''; // Rooms not found
  }

  // Get wall directions (infer if not specified)
  let fromWall = connection.from.wall;
  let toWall = connection.to.wall;

  if (!fromWall || !toWall) {
    const inferred = inferWallDirection(fromRoom, toRoom, resolvedPositions, variables);
    if (!inferred) {
      return ''; // Cannot determine connection point
    }
    fromWall = fromWall || inferred.fromWall;
    toWall = toWall || inferred.toWall;
  }

  const position = connection.position ?? 50;

  // Get door width from connection size if specified
  const doorWidth = connection.size?.width?.value ?? 2; // Default to 2 (approx 2-3 feet)

  const connectionPoint = calculateConnectionPoint(
    fromRoom,
    fromWall,
    toRoom,
    toWall,
    position,
    resolvedPositions,
    variables,
    doorWidth,
  );

  if (!connectionPoint) {
    return ''; // No valid connection point
  }

  // Determine swing direction based on opensInto or explicit swing
  let swingDirection = connection.swing;
  if (!swingDirection && connection.opensInto?.name) {
    // If door opens into a specific room, swing toward that room
    swingDirection = connection.opensInto.name === fromRoomName ? 'left' : 'right';
  }

  return generateDoor(
    connectionPoint.x,
    connectionPoint.y,
    connectionPoint.width,
    connectionPoint.height,
    connectionPoint.wallDirection,
    connection.doorType,
    swingDirection,
  );
}

/**
 * Generate SVG for all connections in a floor
 */
export function generateConnections(
  floor: Floor,
  connections: Connection[],
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
): string {
  let svg = '';
  for (const connection of connections) {
    svg += generateConnection(connection, floor, resolvedPositions, variables);
  }
  return svg;
}
