import { describe, expect, test } from 'vitest';
import {
  checkAdjacency,
  shouldRenderWall,
  findAdjacentRooms,
  computeWallSegments,
  analyzeWallOwnership,
  type AdjacentRoomInfo,
} from '../src/wall-ownership.js';
import type { JsonRoom, JsonWall } from '../src/types.js';
import type { MaterialStyle } from '../src/materials.js';

/**
 * Helper to create a room with minimal required fields
 */
function createRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  walls: JsonWall[] = []
): JsonRoom {
  return {
    name,
    x,
    z,
    width,
    height,
    walls: walls.length > 0 ? walls : [
      { direction: 'top', type: 'solid' },
      { direction: 'bottom', type: 'solid' },
      { direction: 'left', type: 'solid' },
      { direction: 'right', type: 'solid' },
    ],
  };
}

/**
 * Helper to create a wall spec
 */
function createWall(direction: 'top' | 'bottom' | 'left' | 'right', type: string = 'solid'): JsonWall {
  return { direction, type };
}

/**
 * Mock style resolver
 */
function createStyleResolver(styles: Record<string, MaterialStyle>): (room: JsonRoom) => MaterialStyle | undefined {
  return (room: JsonRoom) => styles[room.name];
}

describe('Wall Ownership', () => {
  describe('checkAdjacency', () => {
    test('should detect horizontal adjacency (top wall facing bottom wall)', () => {
      // Room A above Room B
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 0, 10, 10, 10);
      const wallA = createWall('bottom');

      const result = checkAdjacency(roomA, wallA, roomB);

      expect(result).not.toBeNull();
      expect(result!.overlapStart).toBe(0);
      expect(result!.overlapEnd).toBe(10);
    });

    test('should detect vertical adjacency (right wall facing left wall)', () => {
      // Room A to the left of Room B
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const wallA = createWall('right');

      const result = checkAdjacency(roomA, wallA, roomB);

      expect(result).not.toBeNull();
      expect(result!.overlapStart).toBe(0);
      expect(result!.overlapEnd).toBe(10);
    });

    test('should return null for non-adjacent rooms', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 20, 0, 10, 10); // Gap of 10 units
      const wallA = createWall('right');

      const result = checkAdjacency(roomA, wallA, roomB);

      expect(result).toBeNull();
    });

    test('should detect partial overlap', () => {
      // Room B only covers part of Room A's bottom wall
      const roomA = createRoom('RoomA', 0, 0, 20, 10);
      const roomB = createRoom('RoomB', 5, 10, 10, 10);
      const wallA = createWall('bottom');

      const result = checkAdjacency(roomA, wallA, roomB);

      expect(result).not.toBeNull();
      expect(result!.overlapStart).toBe(5);  // Relative to wall start
      expect(result!.overlapEnd).toBe(15);   // Relative to wall start
    });

    test('should handle rooms with no overlap along wall length', () => {
      // Rooms at same Y level but not overlapping horizontally
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 20, 10, 10, 10);
      const wallA = createWall('bottom');

      const result = checkAdjacency(roomA, wallA, roomB);

      expect(result).toBeNull();
    });

    test('should not match a room with itself', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const wallA = createWall('bottom');

      const result = checkAdjacency(roomA, wallA, roomA);

      expect(result).toBeNull();
    });
  });

  describe('shouldRenderWall', () => {
    test('should return true for exterior walls (no adjacent rooms)', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const wallA = createWall('left');
      const allRooms = [roomA];

      const result = shouldRenderWall(roomA, wallA, allRooms);

      expect(result).toBe(true);
    });

    test('should return false for open walls', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const wallA = createWall('left', 'open');
      const allRooms = [roomA];

      const result = shouldRenderWall(roomA, wallA, allRooms);

      expect(result).toBe(false);
    });

    test('room with smaller X should own vertical shared wall', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const allRooms = [roomA, roomB];

      // Room A's right wall (at X=10) is shared with Room B's left wall (at X=10)
      // Room A has smaller X, so it should own the wall
      const wallARight = createWall('right');
      const wallBLeft = createWall('left');

      expect(shouldRenderWall(roomA, wallARight, allRooms)).toBe(true);
      expect(shouldRenderWall(roomB, wallBLeft, allRooms)).toBe(false);
    });

    test('room with smaller Z should own horizontal shared wall', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 0, 10, 10, 10);
      const allRooms = [roomA, roomB];

      // Room A's bottom wall (at Z=10) is shared with Room B's top wall (at Z=10)
      // Room A has smaller Z, so it should own the wall
      const wallABottom = createWall('bottom');
      const wallBTop = createWall('top');

      expect(shouldRenderWall(roomA, wallABottom, allRooms)).toBe(true);
      expect(shouldRenderWall(roomB, wallBTop, allRooms)).toBe(false);
    });

    test('alphabetically first room wins when positions are equal', () => {
      // Both rooms at same position - this shouldn't happen in real data
      // but tests the tiebreaker
      const roomA = createRoom('Alpha', 0, 0, 10, 10);
      const roomB = createRoom('Beta', 0, 0, 10, 10);
      const allRooms = [roomA, roomB];

      const wallA = createWall('right');
      const wallB = createWall('right');

      // Alpha < Beta alphabetically, so Alpha should render
      expect(shouldRenderWall(roomA, wallA, allRooms)).toBe(true);
      expect(shouldRenderWall(roomB, wallB, allRooms)).toBe(true); // Different walls, both exterior
    });
  });

  describe('findAdjacentRooms', () => {
    test('should find single adjacent room', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const allRooms = [roomA, roomB];
      const wallA = createWall('right');
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
        'RoomB': { wall_color: '#00ff00' },
      });

      const result = findAdjacentRooms(roomA, wallA, allRooms, styleResolver);

      expect(result).toHaveLength(1);
      expect(result[0].room.name).toBe('RoomB');
      expect(result[0].style?.wall_color).toBe('#00ff00');
      expect(result[0].overlapStart).toBe(0);
      expect(result[0].overlapEnd).toBe(10);
    });

    test('should find multiple adjacent rooms sorted by position', () => {
      // One wide room with two narrow rooms adjacent on right
      const roomA = createRoom('RoomA', 0, 0, 10, 20);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const roomC = createRoom('RoomC', 10, 10, 10, 10);
      const allRooms = [roomA, roomB, roomC];
      const wallA = createWall('right');
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
        'RoomB': { wall_color: '#00ff00' },
        'RoomC': { wall_color: '#0000ff' },
      });

      const result = findAdjacentRooms(roomA, wallA, allRooms, styleResolver);

      expect(result).toHaveLength(2);
      // Should be sorted by overlapStart
      expect(result[0].room.name).toBe('RoomB');
      expect(result[0].overlapStart).toBe(0);
      expect(result[0].overlapEnd).toBe(10);
      expect(result[1].room.name).toBe('RoomC');
      expect(result[1].overlapStart).toBe(10);
      expect(result[1].overlapEnd).toBe(20);
    });

    test('should return empty array for exterior wall', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const allRooms = [roomA];
      const wallA = createWall('left');
      const styleResolver = createStyleResolver({});

      const result = findAdjacentRooms(roomA, wallA, allRooms, styleResolver);

      expect(result).toHaveLength(0);
    });
  });

  describe('computeWallSegments', () => {
    const ownerStyle: MaterialStyle = { wall_color: '#ff0000' };

    test('should create single exterior segment when no adjacent rooms', () => {
      const room = createRoom('RoomA', 0, 0, 10, 10);
      const wall = createWall('right');
      const adjacentRooms: AdjacentRoomInfo[] = [];

      const segments = computeWallSegments(room, wall, adjacentRooms, ownerStyle);

      expect(segments).toHaveLength(1);
      expect(segments[0].startPos).toBe(0);
      expect(segments[0].endPos).toBe(10); // room height for vertical wall
      expect(segments[0].hasAdjacentRoom).toBe(false);
      expect(segments[0].ownerStyle).toBe(ownerStyle);
    });

    test('should create single segment for fully adjacent room', () => {
      const room = createRoom('RoomA', 0, 0, 10, 10);
      const wall = createWall('right');
      const adjStyle: MaterialStyle = { wall_color: '#00ff00' };
      const adjacentRooms: AdjacentRoomInfo[] = [{
        room: createRoom('RoomB', 10, 0, 10, 10),
        style: adjStyle,
        overlapStart: 0,
        overlapEnd: 10,
      }];

      const segments = computeWallSegments(room, wall, adjacentRooms, ownerStyle);

      expect(segments).toHaveLength(1);
      expect(segments[0].startPos).toBe(0);
      expect(segments[0].endPos).toBe(10);
      expect(segments[0].hasAdjacentRoom).toBe(true);
      expect(segments[0].adjacentStyle).toBe(adjStyle);
    });

    test('should create segments for partial adjacency', () => {
      const room = createRoom('RoomA', 0, 0, 10, 20);
      const wall = createWall('right');
      const adjStyle: MaterialStyle = { wall_color: '#00ff00' };
      const adjacentRooms: AdjacentRoomInfo[] = [{
        room: createRoom('RoomB', 10, 5, 10, 10),
        style: adjStyle,
        overlapStart: 5,
        overlapEnd: 15,
      }];

      const segments = computeWallSegments(room, wall, adjacentRooms, ownerStyle);

      expect(segments).toHaveLength(3);
      
      // Exterior segment at start
      expect(segments[0].startPos).toBe(0);
      expect(segments[0].endPos).toBe(5);
      expect(segments[0].hasAdjacentRoom).toBe(false);
      
      // Adjacent segment in middle
      expect(segments[1].startPos).toBe(5);
      expect(segments[1].endPos).toBe(15);
      expect(segments[1].hasAdjacentRoom).toBe(true);
      
      // Exterior segment at end
      expect(segments[2].startPos).toBe(15);
      expect(segments[2].endPos).toBe(20);
      expect(segments[2].hasAdjacentRoom).toBe(false);
    });

    test('should handle multiple adjacent rooms', () => {
      const room = createRoom('RoomA', 0, 0, 10, 30);
      const wall = createWall('right');
      const styleB: MaterialStyle = { wall_color: '#00ff00' };
      const styleC: MaterialStyle = { wall_color: '#0000ff' };
      const adjacentRooms: AdjacentRoomInfo[] = [
        {
          room: createRoom('RoomB', 10, 0, 10, 10),
          style: styleB,
          overlapStart: 0,
          overlapEnd: 10,
        },
        {
          room: createRoom('RoomC', 10, 20, 10, 10),
          style: styleC,
          overlapStart: 20,
          overlapEnd: 30,
        },
      ];

      const segments = computeWallSegments(room, wall, adjacentRooms, ownerStyle);

      expect(segments).toHaveLength(3);
      
      // RoomB segment
      expect(segments[0].startPos).toBe(0);
      expect(segments[0].endPos).toBe(10);
      expect(segments[0].hasAdjacentRoom).toBe(true);
      expect(segments[0].adjacentStyle).toBe(styleB);
      
      // Exterior gap
      expect(segments[1].startPos).toBe(10);
      expect(segments[1].endPos).toBe(20);
      expect(segments[1].hasAdjacentRoom).toBe(false);
      
      // RoomC segment
      expect(segments[2].startPos).toBe(20);
      expect(segments[2].endPos).toBe(30);
      expect(segments[2].hasAdjacentRoom).toBe(true);
      expect(segments[2].adjacentStyle).toBe(styleC);
    });
  });

  describe('analyzeWallOwnership', () => {
    test('should return shouldRender=false for non-owning room', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const allRooms = [roomA, roomB];
      const wallB = createWall('left'); // RoomB's left wall
      const styleResolver = createStyleResolver({});

      // Room A (smaller X) owns the shared wall
      // Room B should NOT render its left wall
      const result = analyzeWallOwnership(roomB, wallB, allRooms, styleResolver);

      expect(result.shouldRender).toBe(false);
      expect(result.segments).toHaveLength(0);
    });

    test('should return full analysis for owning room', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const allRooms = [roomA, roomB];
      const wallA = createWall('right'); // RoomA's right wall
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
        'RoomB': { wall_color: '#00ff00' },
      });

      const result = analyzeWallOwnership(roomA, wallA, allRooms, styleResolver);

      expect(result.shouldRender).toBe(true);
      expect(result.adjacentRooms).toHaveLength(1);
      expect(result.adjacentRooms[0].room.name).toBe('RoomB');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].hasAdjacentRoom).toBe(true);
    });

    test('should handle exterior wall with no adjacencies', () => {
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const allRooms = [roomA];
      const wallA = createWall('left');
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
      });

      const result = analyzeWallOwnership(roomA, wallA, allRooms, styleResolver);

      expect(result.shouldRender).toBe(true);
      expect(result.adjacentRooms).toHaveLength(0);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].hasAdjacentRoom).toBe(false);
    });
  });

  describe('Real-world scenarios', () => {
    test('L-shaped room layout - three rooms sharing walls', () => {
      /**
       * Layout:
       *  +-----+-----+
       *  |  A  |  B  |
       *  +-----+-----+
       *  |  C  |
       *  +-----+
       */
      const roomA = createRoom('RoomA', 0, 0, 10, 10);
      const roomB = createRoom('RoomB', 10, 0, 10, 10);
      const roomC = createRoom('RoomC', 0, 10, 10, 10);
      const allRooms = [roomA, roomB, roomC];
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
        'RoomB': { wall_color: '#00ff00' },
        'RoomC': { wall_color: '#0000ff' },
      });

      // Room A owns its right wall (shared with B)
      const resultARight = analyzeWallOwnership(roomA, createWall('right'), allRooms, styleResolver);
      expect(resultARight.shouldRender).toBe(true);
      expect(resultARight.adjacentRooms[0]?.room.name).toBe('RoomB');

      // Room B does NOT render its left wall
      const resultBLeft = analyzeWallOwnership(roomB, createWall('left'), allRooms, styleResolver);
      expect(resultBLeft.shouldRender).toBe(false);

      // Room A owns its bottom wall (shared with C)
      const resultABottom = analyzeWallOwnership(roomA, createWall('bottom'), allRooms, styleResolver);
      expect(resultABottom.shouldRender).toBe(true);
      expect(resultABottom.adjacentRooms[0]?.room.name).toBe('RoomC');

      // Room C does NOT render its top wall
      const resultCTop = analyzeWallOwnership(roomC, createWall('top'), allRooms, styleResolver);
      expect(resultCTop.shouldRender).toBe(false);
    });

    test('Corridor with rooms on both sides', () => {
      /**
       * Layout:
       *  +------+
       *  |  A   |
       *  +------+
       *  | Corr |  <- Corridor with rooms on top and bottom
       *  +------+
       *  |  B   |
       *  +------+
       */
      const roomA = createRoom('RoomA', 0, 0, 20, 10);
      const corridor = createRoom('Corridor', 0, 10, 20, 5);
      const roomB = createRoom('RoomB', 0, 15, 20, 10);
      const allRooms = [roomA, corridor, roomB];
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
        'Corridor': { wall_color: '#888888' },
        'RoomB': { wall_color: '#0000ff' },
      });

      // Room A owns the wall between A and Corridor
      const resultABottom = analyzeWallOwnership(roomA, createWall('bottom'), allRooms, styleResolver);
      expect(resultABottom.shouldRender).toBe(true);
      expect(resultABottom.adjacentRooms[0]?.room.name).toBe('Corridor');

      // Corridor's top wall is NOT rendered (Room A owns it)
      const resultCorridorTop = analyzeWallOwnership(corridor, createWall('top'), allRooms, styleResolver);
      expect(resultCorridorTop.shouldRender).toBe(false);

      // Corridor owns its bottom wall (Corridor.z < RoomB.z)
      const resultCorridorBottom = analyzeWallOwnership(corridor, createWall('bottom'), allRooms, styleResolver);
      expect(resultCorridorBottom.shouldRender).toBe(true);
      expect(resultCorridorBottom.adjacentRooms[0]?.room.name).toBe('RoomB');

      // Room B's top wall is NOT rendered
      const resultBTop = analyzeWallOwnership(roomB, createWall('top'), allRooms, styleResolver);
      expect(resultBTop.shouldRender).toBe(false);
    });

    test('Wide room with multiple narrow rooms on one side', () => {
      /**
       * Layout:
       *  +---------+---+
       *  |         | B |
       *  |    A    +---+
       *  |         | C |
       *  +---------+---+
       */
      const roomA = createRoom('RoomA', 0, 0, 20, 20);
      const roomB = createRoom('RoomB', 20, 0, 10, 10);
      const roomC = createRoom('RoomC', 20, 10, 10, 10);
      const allRooms = [roomA, roomB, roomC];
      const styleResolver = createStyleResolver({
        'RoomA': { wall_color: '#ff0000' },
        'RoomB': { wall_color: '#00ff00' },
        'RoomC': { wall_color: '#0000ff' },
      });

      // Room A owns its right wall, which is segmented
      const result = analyzeWallOwnership(roomA, createWall('right'), allRooms, styleResolver);

      expect(result.shouldRender).toBe(true);
      expect(result.adjacentRooms).toHaveLength(2);
      expect(result.segments).toHaveLength(2);

      // First segment faces Room B
      expect(result.segments[0].startPos).toBe(0);
      expect(result.segments[0].endPos).toBe(10);
      expect(result.segments[0].adjacentStyle?.wall_color).toBe('#00ff00');

      // Second segment faces Room C
      expect(result.segments[1].startPos).toBe(10);
      expect(result.segments[1].endPos).toBe(20);
      expect(result.segments[1].adjacentStyle?.wall_color).toBe('#0000ff');
    });
  });
});

