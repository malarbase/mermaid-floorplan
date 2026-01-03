import { describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { DoorRenderer, DoorConfig } from '../src/door-renderer';
import type { JsonConnection, JsonRoom, JsonWall } from 'floorplan-3d-core';
import { DIMENSIONS } from 'floorplan-3d-core';

/**
 * Helper to create a mock material
 */
function createMockMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: 0x8b4513 });
}

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
function createRoom(name: string = 'RoomA'): JsonRoom {
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
  };
}

/**
 * Helper to create a wall
 */
function createWall(direction: 'top' | 'bottom' | 'left' | 'right' = 'right'): JsonWall {
  return { direction, type: 'solid' };
}

/**
 * Helper to create a DoorConfig
 */
function createDoorConfig(connectionOptions: Partial<JsonConnection> = {}): DoorConfig {
  return {
    connection: createConnection(connectionOptions),
    room: createRoom(),
    wall: createWall(),
    holeX: 5,
    holeZ: 2.5,
    holeY: 1.05,
    isVertical: true,
    material: createMockMaterial(),
  };
}

describe('DoorRenderer', () => {
  describe('renderDoor', () => {
    test('should create a door mesh', () => {
      const renderer = new DoorRenderer();
      const config = createDoorConfig();
      
      const mesh = renderer.renderDoor(config);
      
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    });

    describe('door dimensions', () => {
      test('should use default width for single door when not specified', () => {
        const renderer = new DoorRenderer();
        const config = createDoorConfig({ doorType: 'door' });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        // Default door width
        expect(params.width).toBe(DIMENSIONS.DOOR.WIDTH);
      });

      test('should use default height when not specified', () => {
        const renderer = new DoorRenderer();
        const config = createDoorConfig({});
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        // Default door height
        expect(params.height).toBe(DIMENSIONS.DOOR.HEIGHT);
      });

      test('should use double door width when doorType is double-door', () => {
        const renderer = new DoorRenderer();
        const config = createDoorConfig({ doorType: 'double-door' });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.width).toBe(DIMENSIONS.DOUBLE_DOOR.WIDTH);
      });

      test('should use connection.width when specified', () => {
        const renderer = new DoorRenderer();
        const customWidth = 1.5; // 1.5 meters
        const config = createDoorConfig({ width: customWidth });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.width).toBe(customWidth);
      });

      test('should use connection.height when specified', () => {
        const renderer = new DoorRenderer();
        const customHeight = 2.5; // 2.5 meters
        const config = createDoorConfig({ height: customHeight });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.height).toBe(customHeight);
      });

      test('should use both custom width and height when both specified', () => {
        const renderer = new DoorRenderer();
        const customWidth = 1.2;
        const customHeight = 2.8;
        const config = createDoorConfig({ 
          width: customWidth, 
          height: customHeight 
        });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.width).toBe(customWidth);
        expect(params.height).toBe(customHeight);
      });

      test('should override double-door default width with connection.width', () => {
        const renderer = new DoorRenderer();
        const customWidth = 2.0;
        const config = createDoorConfig({ 
          doorType: 'double-door',
          width: customWidth 
        });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        // Should use custom width, not DIMENSIONS.DOUBLE_DOOR.WIDTH
        expect(params.width).toBe(customWidth);
        expect(params.width).not.toBe(DIMENSIONS.DOUBLE_DOOR.WIDTH);
      });

      test('should use default height when only width is specified', () => {
        const renderer = new DoorRenderer();
        const customWidth = 1.5;
        const config = createDoorConfig({ width: customWidth });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.width).toBe(customWidth);
        expect(params.height).toBe(DIMENSIONS.DOOR.HEIGHT);
      });

      test('should use default width when only height is specified', () => {
        const renderer = new DoorRenderer();
        const customHeight = 2.5;
        const config = createDoorConfig({ height: customHeight });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.width).toBe(DIMENSIONS.DOOR.WIDTH);
        expect(params.height).toBe(customHeight);
      });
    });

    describe('door positioning', () => {
      test('should position door at holeY height', () => {
        const renderer = new DoorRenderer();
        const holeY = 1.5;
        const config = createDoorConfig({});
        config.holeY = holeY;
        
        const mesh = renderer.renderDoor(config);
        
        expect(mesh.position.y).toBe(holeY);
      });
    });

    describe('door panel thickness', () => {
      test('should always use standard panel thickness', () => {
        const renderer = new DoorRenderer();
        const config = createDoorConfig({ width: 2, height: 3 });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.depth).toBe(DIMENSIONS.DOOR.PANEL_THICKNESS);
      });
    });

    describe('regression tests', () => {
      test('should NOT use hardcoded dimensions when custom size provided', () => {
        // This test catches the bug where door-renderer ignored connection dimensions
        const renderer = new DoorRenderer();
        const customWidth = 1.0668;  // 3.5 feet in meters
        const customHeight = 2.4384; // 8 feet in meters
        const config = createDoorConfig({ 
          width: customWidth, 
          height: customHeight 
        });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        // Should use custom dimensions, NOT defaults
        expect(params.width).toBe(customWidth);
        expect(params.width).not.toBe(DIMENSIONS.DOOR.WIDTH);
        
        expect(params.height).toBe(customHeight);
        expect(params.height).not.toBe(DIMENSIONS.DOOR.HEIGHT);
      });

      test('full-height opening connection should use custom height', () => {
        // Simulates a full-height opening where height equals room height
        const renderer = new DoorRenderer();
        const roomHeight = 3.35; // Room height in meters
        const config = createDoorConfig({ 
          doorType: 'opening',
          width: 1.2,
          height: roomHeight,
          fullHeight: true
        });
        
        const mesh = renderer.renderDoor(config);
        const geometry = mesh.geometry as THREE.BoxGeometry;
        const params = geometry.parameters;
        
        expect(params.height).toBe(roomHeight);
      });
    });
  });
});

