import { describe, expect, test } from 'vitest';
import { normalizeToMeters } from '../src/unit-normalizer';
import type { JsonExport, JsonConfig, JsonConnection, JsonRoom, JsonFloor } from 'floorplan-3d-core';

/**
 * Helper to create a minimal JsonExport for testing
 */
function createExport(
  config: Partial<JsonConfig>,
  connections: JsonConnection[] = [],
  rooms: JsonRoom[] = []
): JsonExport {
  return {
    config: {
      default_unit: 'ft',
      ...config,
    } as JsonConfig,
    floors: rooms.length > 0 ? [{
      id: 'test-floor',
      index: 0,
      rooms,
    }] : [],
    connections,
    styles: [],
  };
}

/**
 * Helper to create a room
 */
function createRoom(name: string, x: number, z: number, width: number, height: number): JsonRoom {
  return {
    name,
    x,
    z,
    width,
    height,
    walls: [
      { direction: 'top', type: 'solid' },
      { direction: 'bottom', type: 'solid' },
      { direction: 'left', type: 'solid' },
      { direction: 'right', type: 'solid' },
    ],
  };
}

/**
 * Helper to create a connection
 */
function createConnection(
  fromRoom: string,
  toRoom: string,
  options: Partial<JsonConnection> = {}
): JsonConnection {
  return {
    fromRoom,
    fromWall: 'right',
    toRoom,
    toWall: 'left',
    doorType: 'door',
    position: 50,
    ...options,
  };
}

// Conversion factor: 1 foot = 0.3048 meters
const FT_TO_M = 0.3048;

describe('unit-normalizer', () => {
  describe('normalizeToMeters', () => {
    test('should return unchanged if already in meters', () => {
      const input = createExport({ default_unit: 'm', wall_thickness: 0.2 });
      const result = normalizeToMeters(input);
      
      expect(result.config?.wall_thickness).toBe(0.2);
      expect(result.config?.default_unit).toBe('m');
    });

    test('should convert wall_thickness from feet to meters', () => {
      const input = createExport({ wall_thickness: 1 }); // 1 foot
      const result = normalizeToMeters(input);
      
      expect(result.config?.wall_thickness).toBeCloseTo(FT_TO_M, 5);
    });

    test('should convert default_height from feet to meters', () => {
      const input = createExport({ default_height: 10 }); // 10 feet
      const result = normalizeToMeters(input);
      
      expect(result.config?.default_height).toBeCloseTo(10 * FT_TO_M, 5);
    });

    describe('door_size tuple conversion', () => {
      test('should convert door_size [width, height] from feet to meters', () => {
        const input = createExport({ door_size: [3, 7] }); // 3ft x 7ft
        const result = normalizeToMeters(input);
        
        expect(result.config?.door_size).toBeDefined();
        expect(result.config?.door_size![0]).toBeCloseTo(3 * FT_TO_M, 5); // ~0.91m
        expect(result.config?.door_size![1]).toBeCloseTo(7 * FT_TO_M, 5); // ~2.13m
      });

      test('should handle undefined door_size', () => {
        const input = createExport({});
        const result = normalizeToMeters(input);
        
        expect(result.config?.door_size).toBeUndefined();
      });
    });

    describe('window_size tuple conversion', () => {
      test('should convert window_size [width, height] from feet to meters', () => {
        const input = createExport({ window_size: [5, 4] }); // 5ft x 4ft
        const result = normalizeToMeters(input);
        
        expect(result.config?.window_size).toBeDefined();
        expect(result.config?.window_size![0]).toBeCloseTo(5 * FT_TO_M, 5); // ~1.52m
        expect(result.config?.window_size![1]).toBeCloseTo(4 * FT_TO_M, 5); // ~1.22m
      });
    });

    describe('legacy door_width/door_height conversion', () => {
      test('should convert door_width from feet to meters', () => {
        const input = createExport({ door_width: 3 }); // 3 feet
        const result = normalizeToMeters(input);
        
        expect(result.config?.door_width).toBeCloseTo(3 * FT_TO_M, 5);
      });

      test('should convert door_height from feet to meters', () => {
        const input = createExport({ door_height: 7 }); // 7 feet
        const result = normalizeToMeters(input);
        
        expect(result.config?.door_height).toBeCloseTo(7 * FT_TO_M, 5);
      });
    });

    describe('connection dimensional fields conversion', () => {
      test('should convert connection width from feet to meters', () => {
        const connection = createConnection('RoomA', 'RoomB', { width: 4 }); // 4 feet
        const input = createExport({}, [connection]);
        const result = normalizeToMeters(input);
        
        expect(result.connections[0].width).toBeCloseTo(4 * FT_TO_M, 5); // ~1.22m
      });

      test('should convert connection height from feet to meters', () => {
        const connection = createConnection('RoomA', 'RoomB', { height: 8 }); // 8 feet
        const input = createExport({}, [connection]);
        const result = normalizeToMeters(input);
        
        expect(result.connections[0].height).toBeCloseTo(8 * FT_TO_M, 5); // ~2.44m
      });

      test('should convert both width and height together', () => {
        const connection = createConnection('RoomA', 'RoomB', { 
          width: 3.5,  // 3.5 feet
          height: 8    // 8 feet
        });
        const input = createExport({}, [connection]);
        const result = normalizeToMeters(input);
        
        expect(result.connections[0].width).toBeCloseTo(3.5 * FT_TO_M, 5);
        expect(result.connections[0].height).toBeCloseTo(8 * FT_TO_M, 5);
      });

      test('should preserve undefined width/height', () => {
        const connection = createConnection('RoomA', 'RoomB', {});
        const input = createExport({}, [connection]);
        const result = normalizeToMeters(input);
        
        expect(result.connections[0].width).toBeUndefined();
        expect(result.connections[0].height).toBeUndefined();
      });

      test('should preserve fullHeight boolean (not convert)', () => {
        const connection = createConnection('RoomA', 'RoomB', { 
          width: 4,
          fullHeight: true 
        });
        const input = createExport({}, [connection]);
        const result = normalizeToMeters(input);
        
        expect(result.connections[0].fullHeight).toBe(true);
        expect(result.connections[0].width).toBeCloseTo(4 * FT_TO_M, 5);
      });

      test('should NOT convert position (percentage)', () => {
        const connection = createConnection('RoomA', 'RoomB', { position: 50 });
        const input = createExport({}, [connection]);
        const result = normalizeToMeters(input);
        
        // Position should remain as percentage, not converted
        expect(result.connections[0].position).toBe(50);
      });
    });

    describe('room dimensional fields conversion', () => {
      test('should convert room coordinates and dimensions', () => {
        const room = createRoom('TestRoom', 10, 20, 15, 12); // All in feet
        const input = createExport({}, [], [room]);
        const result = normalizeToMeters(input);
        
        const convertedRoom = result.floors[0].rooms[0];
        expect(convertedRoom.x).toBeCloseTo(10 * FT_TO_M, 5);
        expect(convertedRoom.z).toBeCloseTo(20 * FT_TO_M, 5);
        expect(convertedRoom.width).toBeCloseTo(15 * FT_TO_M, 5);
        expect(convertedRoom.height).toBeCloseTo(12 * FT_TO_M, 5);
      });

      test('should convert roomHeight when specified', () => {
        const room = { ...createRoom('TestRoom', 0, 0, 10, 10), roomHeight: 12 };
        const input = createExport({}, [], [room]);
        const result = normalizeToMeters(input);
        
        expect(result.floors[0].rooms[0].roomHeight).toBeCloseTo(12 * FT_TO_M, 5);
      });
    });

    describe('integration: complete floorplan conversion', () => {
      test('should convert all dimensional fields in a complete floorplan', () => {
        const room = createRoom('LivingRoom', 0, 0, 20, 16);
        const connection = createConnection('LivingRoom', 'Kitchen', {
          width: 4,
          height: 8,
        });
        const input = createExport(
          {
            wall_thickness: 1,
            door_size: [3, 7],
            window_size: [5, 4],
            default_height: 10,
          },
          [connection],
          [room]
        );
        
        const result = normalizeToMeters(input);
        
        // Config conversions
        expect(result.config?.wall_thickness).toBeCloseTo(FT_TO_M, 5);
        expect(result.config?.door_size![0]).toBeCloseTo(3 * FT_TO_M, 5);
        expect(result.config?.door_size![1]).toBeCloseTo(7 * FT_TO_M, 5);
        expect(result.config?.window_size![0]).toBeCloseTo(5 * FT_TO_M, 5);
        expect(result.config?.window_size![1]).toBeCloseTo(4 * FT_TO_M, 5);
        expect(result.config?.default_height).toBeCloseTo(10 * FT_TO_M, 5);
        
        // Connection conversions
        expect(result.connections[0].width).toBeCloseTo(4 * FT_TO_M, 5);
        expect(result.connections[0].height).toBeCloseTo(8 * FT_TO_M, 5);
        
        // Room conversions
        expect(result.floors[0].rooms[0].width).toBeCloseTo(20 * FT_TO_M, 5);
        expect(result.floors[0].rooms[0].height).toBeCloseTo(16 * FT_TO_M, 5);
        
        // User's display preference should be preserved
        expect(result.config?.default_unit).toBe('ft');
      });
    });
  });
});

