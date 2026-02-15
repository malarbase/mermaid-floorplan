/**
 * Tests for connection matching and deduplication logic
 */

import { describe, expect, it } from 'vitest';
import { findMatchingConnections, shouldRenderConnection } from '../src/connection-matcher.js';
import type { JsonConnection, JsonRoom, JsonWall } from '../src/types.js';

describe('connection-matcher', () => {
  describe('findMatchingConnections', () => {
    it('should find connections where room is fromRoom', () => {
      const room: JsonRoom = {
        name: 'living',
        x: 0,
        z: 0,
        width: 5,
        height: 4,
        walls: [
          { direction: 'top', type: 'solid' },
          { direction: 'bottom', type: 'solid' },
          { direction: 'left', type: 'solid' },
          { direction: 'right', type: 'solid' },
        ],
      };

      const wall: JsonWall = { direction: 'right', type: 'solid' };

      const connections: JsonConnection[] = [
        {
          fromRoom: 'living',
          fromWall: 'right',
          toRoom: 'kitchen',
          toWall: 'left',
          doorType: 'door',
        },
      ];

      const matches = findMatchingConnections(room, wall, connections);

      expect(matches).toHaveLength(1);
      expect(matches[0].isFromRoom).toBe(true);
      expect(matches[0].otherRoomName).toBe('kitchen');
      expect(matches[0].otherWallDirection).toBe('left');
    });

    it('should find connections where room is toRoom', () => {
      const room: JsonRoom = {
        name: 'kitchen',
        x: 5,
        z: 0,
        width: 4,
        height: 4,
        walls: [
          { direction: 'top', type: 'solid' },
          { direction: 'bottom', type: 'solid' },
          { direction: 'left', type: 'solid' },
          { direction: 'right', type: 'solid' },
        ],
      };

      const wall: JsonWall = { direction: 'left', type: 'solid' };

      const connections: JsonConnection[] = [
        {
          fromRoom: 'living',
          fromWall: 'right',
          toRoom: 'kitchen',
          toWall: 'left',
          doorType: 'door',
        },
      ];

      const matches = findMatchingConnections(room, wall, connections);

      expect(matches).toHaveLength(1);
      expect(matches[0].isFromRoom).toBe(false);
      expect(matches[0].otherRoomName).toBe('living');
      expect(matches[0].otherWallDirection).toBe('right');
    });

    it('should not find connections for non-matching walls', () => {
      const room: JsonRoom = {
        name: 'living',
        x: 0,
        z: 0,
        width: 5,
        height: 4,
        walls: [
          { direction: 'top', type: 'solid' },
          { direction: 'bottom', type: 'solid' },
          { direction: 'left', type: 'solid' },
          { direction: 'right', type: 'solid' },
        ],
      };

      const wall: JsonWall = { direction: 'left', type: 'solid' };

      const connections: JsonConnection[] = [
        {
          fromRoom: 'living',
          fromWall: 'right',
          toRoom: 'kitchen',
          toWall: 'left',
          doorType: 'door',
        },
      ];

      const matches = findMatchingConnections(room, wall, connections);

      expect(matches).toHaveLength(0);
    });
  });

  describe('shouldRenderConnection', () => {
    it('should render on fromRoom when both walls are solid', () => {
      const match = {
        connection: { fromRoom: 'living', toRoom: 'kitchen' } as JsonConnection,
        isFromRoom: true,
        otherRoomName: 'kitchen',
        otherWallDirection: 'left',
      };

      const currentWall: JsonWall = { direction: 'right', type: 'solid' };

      const allRooms: JsonRoom[] = [
        {
          name: 'living',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [{ direction: 'right', type: 'solid' }],
        },
        {
          name: 'kitchen',
          x: 5,
          z: 0,
          width: 4,
          height: 4,
          walls: [{ direction: 'left', type: 'solid' }],
        },
      ];

      const result = shouldRenderConnection(match, currentWall, allRooms);
      expect(result).toBe(true);
    });

    it('should not render on toRoom when both walls are solid', () => {
      const match = {
        connection: { fromRoom: 'living', toRoom: 'kitchen' } as JsonConnection,
        isFromRoom: false,
        otherRoomName: 'living',
        otherWallDirection: 'right',
      };

      const currentWall: JsonWall = { direction: 'left', type: 'solid' };

      const allRooms: JsonRoom[] = [
        {
          name: 'living',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [{ direction: 'right', type: 'solid' }],
        },
        {
          name: 'kitchen',
          x: 5,
          z: 0,
          width: 4,
          height: 4,
          walls: [{ direction: 'left', type: 'solid' }],
        },
      ];

      const result = shouldRenderConnection(match, currentWall, allRooms);
      expect(result).toBe(false);
    });

    it('should render on solid wall when other wall is open', () => {
      const match = {
        connection: { fromRoom: 'living', toRoom: 'kitchen' } as JsonConnection,
        isFromRoom: false,
        otherRoomName: 'living',
        otherWallDirection: 'right',
      };

      const currentWall: JsonWall = { direction: 'left', type: 'solid' };

      const allRooms: JsonRoom[] = [
        {
          name: 'living',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [{ direction: 'right', type: 'open' }],
        },
        {
          name: 'kitchen',
          x: 5,
          z: 0,
          width: 4,
          height: 4,
          walls: [{ direction: 'left', type: 'solid' }],
        },
      ];

      const result = shouldRenderConnection(match, currentWall, allRooms);
      expect(result).toBe(true);
    });

    it('should not render on open wall when other wall is solid', () => {
      const match = {
        connection: { fromRoom: 'living', toRoom: 'kitchen' } as JsonConnection,
        isFromRoom: true,
        otherRoomName: 'kitchen',
        otherWallDirection: 'left',
      };

      const currentWall: JsonWall = { direction: 'right', type: 'open' };

      const allRooms: JsonRoom[] = [
        {
          name: 'living',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [{ direction: 'right', type: 'open' }],
        },
        {
          name: 'kitchen',
          x: 5,
          z: 0,
          width: 4,
          height: 4,
          walls: [{ direction: 'left', type: 'solid' }],
        },
      ];

      const result = shouldRenderConnection(match, currentWall, allRooms);
      expect(result).toBe(false);
    });

    it('should render on fromRoom when both walls are open', () => {
      const match = {
        connection: { fromRoom: 'living', toRoom: 'kitchen' } as JsonConnection,
        isFromRoom: true,
        otherRoomName: 'kitchen',
        otherWallDirection: 'left',
      };

      const currentWall: JsonWall = { direction: 'right', type: 'open' };

      const allRooms: JsonRoom[] = [
        {
          name: 'living',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [{ direction: 'right', type: 'open' }],
        },
        {
          name: 'kitchen',
          x: 5,
          z: 0,
          width: 4,
          height: 4,
          walls: [{ direction: 'left', type: 'open' }],
        },
      ];

      const result = shouldRenderConnection(match, currentWall, allRooms);
      expect(result).toBe(true);
    });
  });
});
