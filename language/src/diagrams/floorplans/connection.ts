/**
 * Connection rendering utilities for floorplan SVG generation
 * Renders door connections between rooms
 */

import type { Connection, Floor, Room, WallDirection } from "../../generated/ast.js";
import { generateDoor } from "./door.js";

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
 * Get the wall bounds for a room in a specific direction
 */
function getWallBounds(
  room: Room,
  direction: WallDirection,
  parentOffsetX = 0,
  parentOffsetY = 0
): { x: number; y: number; length: number; isHorizontal: boolean } {
  const x = room.position.x + parentOffsetX;
  const y = room.position.y + parentOffsetY;
  const width = room.size.width;
  const height = room.size.height;
  const wallThickness = 0.2;

  switch (direction) {
    case "top":
      return { x, y, length: width, isHorizontal: true };
    case "bottom":
      return { x, y: y + height - wallThickness, length: width, isHorizontal: true };
    case "left":
      return { x, y, length: height, isHorizontal: false };
    case "right":
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
  position: number = 50 // percentage along the wall
): ConnectionPoint | null {
  const wallThickness = 0.2;
  const doorWidth = 2; // Standard door width (approx 2-3 feet)
  
  const fromBounds = getWallBounds(fromRoom, fromWall);
  const toBounds = getWallBounds(toRoom, toWall);
  
  // For horizontal walls connecting to vertical walls or same-orientation walls
  // We find the overlapping segment and place the door there
  
  let x: number, y: number, width: number, height: number;
  let wallDirection: WallDirection;
  
  if (fromBounds.isHorizontal && toBounds.isHorizontal) {
    // Both horizontal walls - find x overlap
    const overlapStart = Math.max(fromBounds.x, toBounds.x);
    const overlapEnd = Math.min(fromBounds.x + fromBounds.length, toBounds.x + toBounds.length);
    
    if (overlapStart >= overlapEnd) {
      return null; // No overlap
    }
    
    const overlapLength = overlapEnd - overlapStart;
    const doorX = overlapStart + (overlapLength * position / 100) - doorWidth / 2;
    
    x = doorX;
    y = Math.min(fromBounds.y, toBounds.y);
    width = doorWidth;
    height = wallThickness;
    wallDirection = fromWall;
  } else if (!fromBounds.isHorizontal && !toBounds.isHorizontal) {
    // Both vertical walls - find y overlap
    const overlapStart = Math.max(fromBounds.y, toBounds.y);
    const overlapEnd = Math.min(fromBounds.y + fromBounds.length, toBounds.y + toBounds.length);
    
    if (overlapStart >= overlapEnd) {
      return null; // No overlap
    }
    
    const overlapLength = overlapEnd - overlapStart;
    const doorY = overlapStart + (overlapLength * position / 100) - doorWidth / 2;
    
    x = Math.min(fromBounds.x, toBounds.x);
    y = doorY;
    width = wallThickness;
    height = doorWidth;
    wallDirection = fromWall;
  } else {
    // Mixed orientation - place door at intersection point
    const horizBounds = fromBounds.isHorizontal ? fromBounds : toBounds;
    const horizWall = fromBounds.isHorizontal ? fromWall : toWall;
    
    // Use the position to offset along the horizontal wall
    const doorX = horizBounds.x + (horizBounds.length * position / 100) - doorWidth / 2;
    
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
function inferWallDirection(fromRoom: Room, toRoom: Room): { fromWall: WallDirection; toWall: WallDirection } | null {
  const fromX = fromRoom.position.x;
  const fromY = fromRoom.position.y;
  const fromWidth = fromRoom.size.width;
  const fromHeight = fromRoom.size.height;
  
  const toX = toRoom.position.x;
  const toY = toRoom.position.y;
  const toWidth = toRoom.size.width;
  const toHeight = toRoom.size.height;
  
  // Check if rooms are adjacent horizontally
  if (Math.abs((fromX + fromWidth) - toX) < 0.5) {
    return { fromWall: "right", toWall: "left" };
  }
  if (Math.abs((toX + toWidth) - fromX) < 0.5) {
    return { fromWall: "left", toWall: "right" };
  }
  
  // Check if rooms are adjacent vertically
  if (Math.abs((fromY + fromHeight) - toY) < 0.5) {
    return { fromWall: "bottom", toWall: "top" };
  }
  if (Math.abs((toY + toHeight) - fromY) < 0.5) {
    return { fromWall: "top", toWall: "bottom" };
  }
  
  return null;
}

/**
 * Generate SVG for a connection between two rooms
 */
export function generateConnection(
  connection: Connection,
  floor: Floor
): string {
  const fromRoomName = connection.from.room.name;
  const toRoomName = connection.to.room.name;
  
  // Handle 'outside' connections
  if (!fromRoomName || !toRoomName) {
    // For now, skip outside connections - they use the room's wall directly
    return "";
  }
  
  const fromRoom = findRoom(floor, fromRoomName);
  const toRoom = findRoom(floor, toRoomName);
  
  if (!fromRoom || !toRoom) {
    return ""; // Rooms not found
  }
  
  // Get wall directions (infer if not specified)
  let fromWall = connection.from.wall;
  let toWall = connection.to.wall;
  
  if (!fromWall || !toWall) {
    const inferred = inferWallDirection(fromRoom, toRoom);
    if (!inferred) {
      return ""; // Cannot determine connection point
    }
    fromWall = fromWall || inferred.fromWall;
    toWall = toWall || inferred.toWall;
  }
  
  const position = connection.position ?? 50;
  const connectionPoint = calculateConnectionPoint(fromRoom, fromWall, toRoom, toWall, position);
  
  if (!connectionPoint) {
    return ""; // No valid connection point
  }
  
  // Determine swing direction based on opensInto or explicit swing
  let swingDirection = connection.swing;
  if (!swingDirection && connection.opensInto?.name) {
    // If door opens into a specific room, swing toward that room
    swingDirection = connection.opensInto.name === fromRoomName ? "left" : "right";
  }
  
  return generateDoor(
    connectionPoint.x,
    connectionPoint.y,
    connectionPoint.width,
    connectionPoint.height,
    connectionPoint.wallDirection,
    connection.doorType,
    swingDirection
  );
}

/**
 * Generate SVG for all connections in a floor
 */
export function generateConnections(floor: Floor, connections: Connection[]): string {
  let svg = "";
  for (const connection of connections) {
    svg += generateConnection(connection, floor);
  }
  return svg;
}

