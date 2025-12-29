/**
 * Connection matching utilities for determining door placement and responsibility
 */

import { JsonConnection, JsonRoom, JsonWall } from './types';

export interface ConnectionMatch {
  connection: JsonConnection;
  isFromRoom: boolean;
  shouldRenderDoor: boolean;
  otherRoomName: string;
  otherWallDirection: string;
}

export class ConnectionMatcher {
  /**
   * Find all connections that match a given room and wall
   */
  static findMatchingConnections(
    room: JsonRoom,
    wall: JsonWall,
    allConnections: JsonConnection[]
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
          shouldRenderDoor: false, // Will be determined later
          otherRoomName,
          otherWallDirection,
        });
      }
    }

    return matches;
  }

  /**
   * Determine if the current room should render the door mesh
   * Logic: Render on solid walls. If both solid/open, prefer "fromRoom"
   */
  static shouldRenderDoor(
    match: ConnectionMatch,
    currentWall: JsonWall,
    allRooms: JsonRoom[]
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

    if (isCurrentOpen && isOtherOpen) {
      // Both open: prefer fromRoom
      return isFromRoom;
    } else if (isCurrentOpen) {
      // I am open, other is solid: Other renders
      return false;
    } else if (isOtherOpen) {
      // I am solid, other is open: I render
      return true;
    } else {
      // Both solid: prefer fromRoom
      return isFromRoom;
    }
  }
}

