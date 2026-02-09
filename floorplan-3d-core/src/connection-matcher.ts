/**
 * Connection matching utilities for determining connection placement and rendering responsibility
 *
 * Implements deduplication logic to ensure each connection is rendered exactly once,
 * even though connections reference two walls (fromRoom/fromWall and toRoom/toWall).
 */

import type { JsonConnection, JsonRoom, JsonWall } from './types.js';

export interface ConnectionMatch {
  connection: JsonConnection;
  isFromRoom: boolean;
  otherRoomName: string;
  otherWallDirection: string;
}

/**
 * Find all connections that match a given room and wall
 *
 * @param room - The room to check
 * @param wall - The wall to check
 * @param allConnections - All connections in the floorplan
 * @returns Array of matching connections with metadata
 */
export function findMatchingConnections(
  room: JsonRoom,
  wall: JsonWall,
  allConnections: JsonConnection[],
): ConnectionMatch[] {
  const matches: ConnectionMatch[] = [];

  for (const conn of allConnections) {
    let isMatch = false;
    let isFromRoom = false;

    // Match fromRoom
    if (conn.fromRoom === room.name && conn.fromWall === wall.direction) {
      isMatch = true;
      isFromRoom = true;
    }
    // Match toRoom
    else if (conn.toRoom === room.name && conn.toWall === wall.direction) {
      isMatch = true;
      isFromRoom = false;
    }

    if (isMatch) {
      const otherRoomName = isFromRoom ? conn.toRoom : conn.fromRoom;
      const otherWallDirection = isFromRoom ? conn.toWall : conn.fromWall;

      matches.push({
        connection: conn,
        isFromRoom,
        otherRoomName,
        otherWallDirection,
      });
    }
  }

  return matches;
}

/**
 * Determine if the current room should render the connection mesh
 *
 * Deduplication Logic:
 * - If both walls are solid: render on fromRoom
 * - If one wall is open, other is solid: render on solid wall
 * - If both walls are open: render on fromRoom
 * - If target room not found (different floor): render on source room if isFromRoom
 *
 * @param match - Connection match metadata
 * @param currentWall - Current wall being processed
 * @param allRooms - All rooms in the current floor
 * @returns true if this wall should render the connection
 */
export function shouldRenderConnection(
  match: ConnectionMatch,
  currentWall: JsonWall,
  allRooms: JsonRoom[],
): boolean {
  const { isFromRoom, otherRoomName, otherWallDirection } = match;

  // Find other wall type
  let otherWallType = 'solid'; // Default
  const otherRoom = allRooms.find((r) => r.name === otherRoomName);

  if (otherRoom) {
    const otherWall = otherRoom.walls.find((w) => w.direction === otherWallDirection);
    if (otherWall) {
      otherWallType = otherWall.type;
    }
  } else {
    // Room not found (maybe other floor).
    // If I am 'from', I take responsibility.
    // If I am 'to', assume 'from' took responsibility.
    if (!isFromRoom) {
      otherWallType = 'solid'; // Assume other exists and is solid
    } else {
      otherWallType = 'open'; // Assume I must render
    }
  }

  const isCurrentOpen = currentWall.type === 'open';
  const isOtherOpen = otherWallType === 'open';

  let result: boolean;
  if (isCurrentOpen && isOtherOpen) {
    // Both open: prefer fromRoom
    result = isFromRoom;
  } else if (isCurrentOpen) {
    // I am open, other is solid: Other renders
    result = false;
  } else if (isOtherOpen) {
    // I am solid, other is open: I render
    result = true;
  } else {
    // Both solid: prefer fromRoom
    result = isFromRoom;
  }

  return result;
}
