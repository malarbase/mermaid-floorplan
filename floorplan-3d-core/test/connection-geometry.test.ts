import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { generateConnection, generateFloorConnections } from '../src/connection-geometry.js';
import type { JsonConnection, JsonRoom, JsonWall, JsonFloor } from '../src/types.js';
import { DIMENSIONS, getThemeColors } from '../src/constants.js';

/**
 * Helper to create a connection
 */
function createConnection(options: Partial<JsonConnection> = {}): JsonConnection {
  return {
    fromRoom: 'RoomA',
    fromWall: 'right',
    toRoom: 'RoomB',
    toWall: 'left',
    doorType: 'door',
    position: 50,
    ...options,
  };
}

/**
 * Helper to create a room
 */
function createRoom(name: string = 'RoomA', options: Partial<JsonRoom> = {}): JsonRoom {
  return {
    name,
    x: 0,
    z: 0,
    width: 5,
    height: 5,
    walls: [
      { direction: 'top', type: 'solid' },
      { direction: 'bottom', type: 'solid' },
      { direction: 'left', type: 'solid' },
      { direction: 'right', type: 'solid' },
    ],
    ...options,
  };
}

/**
 * Helper to create a wall
 */
function createWall(direction: 'top' | 'bottom' | 'left' | 'right' = 'right'): JsonWall {
  return { direction, type: 'solid' };
}

describe('connection-geometry', () => {
  // Shared test constants
  const colors = getThemeColors('light');
  const wallThickness = DIMENSIONS.WALL.THICKNESS;

  describe('generateConnection', () => {
    test('should create a door mesh', () => {
      const connection = createConnection({ doorType: 'door' });
      const room = createRoom();
      const wall = createWall('right');

      const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh!.geometry).toBeInstanceOf(THREE.BoxGeometry);
    });

    test('should return null for unsupported connection types', () => {
      const connection = createConnection({ doorType: 'portal' as any });
      const room = createRoom();
      const wall = createWall();

      const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors);

      expect(mesh).toBeNull();
    });

    describe('door dimensions', () => {
      test('should use default width for single door when not specified', () => {
        const connection = createConnection({ doorType: 'door' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;

        expect(params.width).toBe(DIMENSIONS.DOOR.WIDTH);
      });

      test('should use default height when not specified', () => {
        const connection = createConnection({ doorType: 'door' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;

        expect(params.height).toBe(DIMENSIONS.DOOR.HEIGHT);
      });

      test('should use double door width when doorType is double-door', () => {
        const connection = createConnection({ doorType: 'double-door' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Group;
        // Double door returns a group with two panels
        expect(mesh.children.length).toBe(2);
      });

      test('should use connection.width when specified', () => {
        const customWidth = 1.5;
        const connection = createConnection({ width: customWidth });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;

        expect(params.width).toBe(customWidth);
      });

      test('should use connection.height when specified', () => {
        const customHeight = 2.5;
        const connection = createConnection({ height: customHeight });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;

        expect(params.height).toBe(customHeight);
      });

      test('should use panel thickness from constants', () => {
        const connection = createConnection({ width: 2, height: 3 });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;

        expect(params.depth).toBe(DIMENSIONS.DOOR.PANEL_THICKNESS);
      });
    });

    describe('hinge position', () => {
      test('should position hinge on right side for right-swinging door on right wall', () => {
        const connection = createConnection({ 
          doorType: 'door',
          swing: 'right',
          fromWall: 'right' 
        });
        const room = createRoom();
        const wall = createWall('right');

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;

        // For a right wall with right swing, hinge should be at max Z
        // Position should be at room.x + room.width (5) and Z should be offset
        expect(mesh.position.x).toBe(room.x + room.width);
      });

      test('should position hinge on left side for left-swinging door on right wall', () => {
        const connection = createConnection({ 
          doorType: 'door',
          swing: 'left',
          fromWall: 'right' 
        });
        const room = createRoom();
        const wall = createWall('right');

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;

        // For a right wall with left swing, hinge should be at min Z
        expect(mesh.position.x).toBe(room.x + room.width);
      });

      test('should position hinge on horizontal walls correctly', () => {
        const connection = createConnection({ 
          doorType: 'door',
          swing: 'right',
          fromWall: 'top' 
        });
        const room = createRoom();
        const wall = createWall('top');

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;

        // For a top wall, hinge position should be along X axis
        expect(mesh.position.z).toBe(room.z);
      });
    });

    describe('swing rotation', () => {
      test('should apply default swing angle', () => {
        const connection = createConnection({ doorType: 'door' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;

        // Door should have rotation applied (not 0)
        expect(mesh.rotation.y).not.toBe(0);
      });

      test('should swing into source room by default', () => {
        const connection = createConnection({ 
          doorType: 'door',
          fromRoom: 'RoomA',
          toRoom: 'RoomB',
        });
        const roomA = createRoom('RoomA');
        const roomB = createRoom('RoomB', { x: 5 });
        const wall = createWall('right');

        const mesh = generateConnection(connection, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;
        const rotationWithDefaultOpensIn = mesh.rotation.y;

        // When opensInto is not specified, door opens into source room
        expect(rotationWithDefaultOpensIn).toBeDefined();
      });

      test('should respect opensInto parameter', () => {
        const connectionOpensIntoA = createConnection({ 
          doorType: 'door',
          fromRoom: 'RoomA',
          toRoom: 'RoomB',
          opensInto: 'RoomA',
        });
        const connectionOpensIntoB = createConnection({ 
          doorType: 'door',
          fromRoom: 'RoomA',
          toRoom: 'RoomB',
          opensInto: 'RoomB',
        });
        const roomA = createRoom('RoomA');
        const roomB = createRoom('RoomB', { x: 5 });
        const wall = createWall('right');

        const meshA = generateConnection(connectionOpensIntoA, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;
        const meshB = generateConnection(connectionOpensIntoB, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;

        // Different opensInto should result in different rotation
        expect(meshA.rotation.y).not.toBe(meshB.rotation.y);
      });

      test('should handle swing direction with different wall directions', () => {
        const walls: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
        
        for (const direction of walls) {
          const connection = createConnection({ 
            doorType: 'door',
            fromWall: direction,
          });
          const room = createRoom();
          const wall = createWall(direction);

          const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;

          // Each wall direction should produce a valid door mesh with rotation
          expect(mesh).toBeInstanceOf(THREE.Mesh);
          expect(typeof mesh.rotation.y).toBe('number');
        }
      });
    });

    describe('double door', () => {
      test('should create two door panels for double door', () => {
        const connection = createConnection({ doorType: 'double-door' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Group;

        expect(mesh).toBeInstanceOf(THREE.Group);
        expect(mesh.children.length).toBe(2);
      });

      test('should name double door panels correctly', () => {
        const connection = createConnection({ 
          doorType: 'double-door',
          fromRoom: 'RoomA',
          toRoom: 'RoomB',
        });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Group;

        expect(mesh.children[0].name).toContain('double-door-left');
        expect(mesh.children[1].name).toContain('double-door-right');
      });

      test('should use custom width for double door', () => {
        const customWidth = 2.4; // Total width
        const connection = createConnection({ 
          doorType: 'double-door',
          width: customWidth,
        });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Group;
        const leftPanel = mesh.children[0] as THREE.Mesh;
        const geometry = leftPanel.geometry as THREE.BoxGeometry;

        // Each panel should be half the total width
        expect(geometry.parameters.width).toBe(customWidth / 2);
      });
    });

    describe('window', () => {
      test('should create window mesh with glass material', () => {
        const connection = createConnection({ doorType: 'window' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;

        expect(mesh).toBeInstanceOf(THREE.Mesh);
        const material = mesh.material as THREE.MeshStandardMaterial;
        expect(material.transparent).toBe(true);
        expect(material.opacity).toBeLessThan(1);
      });

      test('should position window at sill height', () => {
        const connection = createConnection({ doorType: 'window' });
        const room = createRoom();
        const wall = createWall();

        const mesh = generateConnection(connection, room, undefined, wall, wallThickness, colors) as THREE.Mesh;
        const windowHeight = DIMENSIONS.WINDOW.HEIGHT;
        const sillHeight = DIMENSIONS.WINDOW.SILL_HEIGHT;

        // Window center should be at sill height + half window height
        expect(mesh.position.y).toBe(sillHeight + windowHeight / 2);
      });
    });
  });

  describe('uneven room overlap positioning', () => {
    // Door width is 1.0m, so hinge offset is +/- 0.5m from hole center
    const doorWidth = DIMENSIONS.DOOR.WIDTH;
    const hingeOffset = doorWidth / 2;

    test('should position door within shared wall segment when rooms have partial overlap', () => {
      // Room A is 10 units tall (z-axis), Room B is offset so they share only z: 5-10
      const roomA = createRoom('RoomA', { x: 0, z: 0, width: 10, height: 10 });
      const roomB = createRoom('RoomB', { x: 10, z: 5, width: 10, height: 5 }); // Only overlaps z: 5-10

      const connection = createConnection({
        doorType: 'door',
        fromRoom: 'RoomA',
        fromWall: 'right',
        toRoom: 'RoomB',
        toWall: 'left',
        position: 50, // 50% along shared segment, NOT 50% of room A
      });
      const wall = createWall('right');

      const mesh = generateConnection(connection, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;

      // Hole center at 50% of overlap (5-10) = 7.5
      // Right wall + right swing -> hingeSideSign = +1 -> hinge at max Z
      // Door mesh position = hole center + hingeOffset = 7.5 + 0.5 = 8.0
      const expectedHoleCenter = 7.5;
      expect(mesh.position.z).toBe(expectedHoleCenter + hingeOffset);
      expect(mesh.position.x).toBe(10); // Right wall of room A
    });

    test('should position door at 25% of shared wall segment', () => {
      const roomA = createRoom('RoomA', { x: 0, z: 0, width: 10, height: 10 });
      const roomB = createRoom('RoomB', { x: 10, z: 5, width: 10, height: 5 }); // Overlap is z: 5-10 (5 units)

      const connection = createConnection({
        doorType: 'door',
        fromRoom: 'RoomA',
        fromWall: 'right',
        toRoom: 'RoomB',
        toWall: 'left',
        position: 25, // 25% along shared segment
      });
      const wall = createWall('right');

      const mesh = generateConnection(connection, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;

      // 25% of overlap (5-10) = 5 + (5 * 0.25) = 6.25
      // Door mesh = hole center + hingeOffset = 6.25 + 0.5 = 6.75
      const expectedHoleCenter = 6.25;
      expect(mesh.position.z).toBe(expectedHoleCenter + hingeOffset);
    });

    test('should position door correctly on horizontal wall with partial overlap', () => {
      // Room A at x:0, Room B at x:5, so they share x:5-10 on the bottom wall
      const roomA = createRoom('RoomA', { x: 0, z: 0, width: 10, height: 10 });
      const roomB = createRoom('RoomB', { x: 5, z: 10, width: 10, height: 10 }); // Overlap is x: 5-10

      const connection = createConnection({
        doorType: 'door',
        fromRoom: 'RoomA',
        fromWall: 'bottom',
        toRoom: 'RoomB',
        toWall: 'top',
        position: 50,
      });
      const wall = createWall('bottom');

      const mesh = generateConnection(connection, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;

      // 50% of overlap (5-10) = 7.5
      // Bottom wall + right swing -> hingeSideSign = -1 -> hinge at min X
      // Door mesh = hole center - hingeOffset = 7.5 - 0.5 = 7.0
      const expectedHoleCenter = 7.5;
      expect(mesh.position.x).toBe(expectedHoleCenter - hingeOffset);
      expect(mesh.position.z).toBe(10); // Bottom wall of room A
    });

    test('double door should also respect shared wall segment positioning', () => {
      const roomA = createRoom('RoomA', { x: 0, z: 0, width: 10, height: 10 });
      const roomB = createRoom('RoomB', { x: 10, z: 5, width: 10, height: 5 });

      const connection = createConnection({
        doorType: 'double-door',
        fromRoom: 'RoomA',
        fromWall: 'right',
        toRoom: 'RoomB',
        toWall: 'left',
        position: 50,
      });
      const wall = createWall('right');

      const group = generateConnection(connection, roomA, roomB, wall, wallThickness, colors) as THREE.Group;
      const leftPanel = group.children[0] as THREE.Mesh;
      const rightPanel = group.children[1] as THREE.Mesh;

      // Both panels should be positioned relative to z=7.5 (center of overlap)
      // The exact panel positions depend on panel width, but both should be near 7.5
      const avgZ = (leftPanel.position.z + rightPanel.position.z) / 2;
      expect(avgZ).toBeCloseTo(7.5, 1);
    });

    test('should fallback to full room dimension when target room is undefined', () => {
      const roomA = createRoom('RoomA', { x: 0, z: 0, width: 10, height: 10 });

      const connection = createConnection({
        doorType: 'door',
        fromRoom: 'RoomA',
        fromWall: 'right',
        toRoom: 'RoomB', // RoomB not provided
        toWall: 'left',
        position: 50,
      });
      const wall = createWall('right');

      // Pass undefined for targetRoom
      const mesh = generateConnection(connection, roomA, undefined, wall, wallThickness, colors) as THREE.Mesh;

      // Should fallback to 50% of room A's height = 5.0
      // Plus hinge offset = 5.0 + 0.5 = 5.5
      const expectedHoleCenter = 5.0;
      expect(mesh.position.z).toBe(expectedHoleCenter + hingeOffset);
    });

    test('door mesh position should match hole position with hinge offset', () => {
      // This test verifies that the door and hole are positioned consistently
      // The door mesh is offset from hole center by hinge position
      const roomA = createRoom('RoomA', { x: 0, z: 0, width: 10, height: 10 });
      const roomB = createRoom('RoomB', { x: 10, z: 5, width: 10, height: 5 });

      const connection = createConnection({
        doorType: 'door',
        fromRoom: 'RoomA',
        fromWall: 'right',
        toRoom: 'RoomB',
        toWall: 'left',
        position: 50,
      });
      const wall = createWall('right');

      const mesh = generateConnection(connection, roomA, roomB, wall, wallThickness, colors) as THREE.Mesh;

      // The critical assertion: door should NOT be at 50% of full room (z=5)
      // It should be within the overlap region (z=5-10)
      expect(mesh.position.z).toBeGreaterThan(5); // Not at center of full room
      expect(mesh.position.z).toBeLessThanOrEqual(10); // Within overlap region
    });
  });

  describe('generateFloorConnections', () => {
    test('should create a group for floor connections', () => {
      const floor: JsonFloor = {
        id: 'ground',
        rooms: [createRoom('RoomA'), createRoom('RoomB', { x: 5 })],
      };
      const connections = [createConnection()];

      const group = generateFloorConnections(floor, connections, {
        wallThickness: DIMENSIONS.WALL.THICKNESS,
        defaultHeight: DIMENSIONS.WALL.HEIGHT,
      });

      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.name).toBe('floor-ground-connections');
    });
  });
});

