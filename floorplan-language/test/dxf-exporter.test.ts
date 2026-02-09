/**
 * Tests for DXF Export functionality
 */

import { describe, expect, it } from 'vitest';
import {
  DXF_COLORS,
  DXF_LAYERS,
  exportFloorplanToDxf,
  exportFloorToDxf,
} from '../src/diagrams/floorplans/dxf-exporter.js';
import type {
  JsonConnection,
  JsonFloor,
  JsonRoom,
} from '../src/diagrams/floorplans/json-converter.js';

describe('DXF Exporter', () => {
  // Sample room data
  const sampleRoom: JsonRoom = {
    name: 'Living Room',
    label: 'Living Room',
    x: 0,
    z: 0,
    width: 20,
    height: 15,
    area: 300,
  };

  const sampleFloor: JsonFloor = {
    id: 'Ground Floor',
    rooms: [sampleRoom],
    stairs: [],
    lifts: [],
  };

  const sampleConnection: JsonConnection = {
    fromRoom: 'Living Room',
    toRoom: 'Kitchen',
    fromWall: 'right',
    doorType: 'door',
    width: 3,
    position: 50,
    swing: 'left',
  };

  describe('DXF_LAYERS', () => {
    it('should define all required layers', () => {
      expect(DXF_LAYERS.WALLS).toBe('WALLS');
      expect(DXF_LAYERS.DOORS).toBe('DOORS');
      expect(DXF_LAYERS.WINDOWS).toBe('WINDOWS');
      expect(DXF_LAYERS.ROOMS).toBe('ROOMS');
      expect(DXF_LAYERS.LABELS).toBe('LABELS');
      expect(DXF_LAYERS.DIMENSIONS).toBe('DIMENSIONS');
      expect(DXF_LAYERS.STAIRS).toBe('STAIRS');
      expect(DXF_LAYERS.LIFTS).toBe('LIFTS');
    });
  });

  describe('DXF_COLORS', () => {
    it('should define AutoCAD color indices', () => {
      expect(DXF_COLORS.WHITE).toBe(7);
      expect(DXF_COLORS.RED).toBe(1);
      expect(DXF_COLORS.YELLOW).toBe(2);
      expect(DXF_COLORS.GREEN).toBe(3);
      expect(DXF_COLORS.CYAN).toBe(4);
      expect(DXF_COLORS.BLUE).toBe(5);
      expect(DXF_COLORS.MAGENTA).toBe(6);
      expect(DXF_COLORS.GRAY).toBe(8);
    });
  });

  describe('exportFloorToDxf', () => {
    it('should export a simple floor with one room', () => {
      const result = exportFloorToDxf(sampleFloor, []);

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.roomCount).toBe(1);
      expect(result.connectionCount).toBe(0);
      expect(result.warnings).toEqual([]);
    });

    it('should include DXF header and entities sections', () => {
      const result = exportFloorToDxf(sampleFloor, []);

      // DXF files have specific structure
      expect(result.content).toContain('SECTION');
      expect(result.content).toContain('ENTITIES');
      expect(result.content).toContain('EOF');
    });

    it('should include layer definitions', () => {
      const result = exportFloorToDxf(sampleFloor, []);

      expect(result.content).toContain('WALLS');
      expect(result.content).toContain('ROOMS');
      expect(result.content).toContain('LABELS');
    });

    it('should include room label when includeLabels is true', () => {
      const result = exportFloorToDxf(sampleFloor, [], { includeLabels: true });

      expect(result.content).toContain('Living Room');
    });

    it('should export connections as doors', () => {
      const result = exportFloorToDxf(sampleFloor, [sampleConnection]);

      expect(result.connectionCount).toBe(1);
    });

    it('should handle empty floor', () => {
      const emptyFloor: JsonFloor = {
        id: 'Empty',
        rooms: [],
        stairs: [],
        lifts: [],
      };

      const result = exportFloorToDxf(emptyFloor, []);

      expect(result.roomCount).toBe(0);
      expect(result.connectionCount).toBe(0);
      expect(result.content).toContain('EOF');
    });

    it('should apply scale factor', () => {
      const result = exportFloorToDxf(sampleFloor, [], { scale: 2.0 });

      expect(result.content).toBeDefined();
      expect(result.roomCount).toBe(1);
    });

    it('should include dimensions when includeDimensions is true', () => {
      const result = exportFloorToDxf(sampleFloor, [], { includeDimensions: true });

      // Dimensions layer should have content
      expect(result.content).toContain('DIMENSIONS');
    });
  });

  describe('exportFloorplanToDxf (multi-floor)', () => {
    const multiFloorData: JsonFloor[] = [
      {
        id: 'Ground Floor',
        rooms: [{ name: 'Living', label: 'Living', x: 0, z: 0, width: 20, height: 15 }],
        stairs: [],
        lifts: [],
      },
      {
        id: 'First Floor',
        rooms: [{ name: 'Bedroom', label: 'Bedroom', x: 0, z: 0, width: 15, height: 12 }],
        stairs: [],
        lifts: [],
      },
    ];

    it('should export multiple floors', () => {
      const result = exportFloorplanToDxf(multiFloorData, []);

      expect(result.roomCount).toBe(2);
      expect(result.content).toContain('Ground Floor');
      expect(result.content).toContain('First Floor');
    });

    it('should offset floors vertically', () => {
      const result = exportFloorplanToDxf(multiFloorData, []);

      // Both floors should be in the output
      expect(result.content).toContain('Living');
      expect(result.content).toContain('Bedroom');
    });
  });

  describe('Wall geometry', () => {
    it('should draw room walls with thickness', () => {
      const result = exportFloorToDxf(sampleFloor, [], { wallThickness: 0.5 });

      // Should contain LINE or POLYLINE entities for walls
      expect(result.content).toContain('LINE');
    });
  });

  describe('Stairs and Lifts', () => {
    it('should export stairs', () => {
      const floorWithStairs: JsonFloor = {
        id: 'Ground',
        rooms: [],
        stairs: [{ name: 'Main Stairs', label: 'Main Stairs', x: 10, z: 5, width: 4 }],
        lifts: [],
      };

      const result = exportFloorToDxf(floorWithStairs, []);

      expect(result.content).toContain('STAIRS');
      expect(result.content).toContain('Main Stairs');
    });

    it('should export lifts with X symbol', () => {
      const floorWithLift: JsonFloor = {
        id: 'Ground',
        rooms: [],
        stairs: [],
        lifts: [{ name: 'Elevator 1', label: 'Elevator', x: 15, z: 10, width: 6, height: 6 }],
      };

      const result = exportFloorToDxf(floorWithLift, []);

      expect(result.content).toContain('LIFTS');
      expect(result.content).toContain('Elevator');
    });
  });

  describe('Unit normalization', () => {
    it('should set units to Meters when config specifies m', () => {
      const result = exportFloorToDxf(sampleFloor, [], { units: 'm' });

      // DXF should contain INSUNITS header variable for meters
      expect(result.content).toContain('$INSUNITS');
      expect(result.content).toMatch(/\$INSUNITS[\s\S]*?6/); // 6 = Meters
    });

    it('should set units to Feet when config specifies ft', () => {
      const result = exportFloorToDxf(sampleFloor, [], { units: 'ft' });

      // DXF should contain INSUNITS header variable for feet
      expect(result.content).toContain('$INSUNITS');
      expect(result.content).toMatch(/\$INSUNITS[\s\S]*?2/); // 2 = Feet
    });

    it('should set units to Millimeters when config specifies mm', () => {
      const result = exportFloorToDxf(sampleFloor, [], { units: 'mm' });

      expect(result.content).toContain('$INSUNITS');
      expect(result.content).toMatch(/\$INSUNITS[\s\S]*?4/); // 4 = Millimeters
    });

    it('should set units to Inches when config specifies in', () => {
      const result = exportFloorToDxf(sampleFloor, [], { units: 'in' });

      expect(result.content).toContain('$INSUNITS');
      expect(result.content).toMatch(/\$INSUNITS[\s\S]*?1/); // 1 = Inches
    });

    it('should default to Feet when no units specified', () => {
      const result = exportFloorToDxf(sampleFloor, []);

      expect(result.content).toContain('$INSUNITS');
      expect(result.content).toMatch(/\$INSUNITS[\s\S]*?2/); // 2 = Feet
    });
  });

  describe('Door and Window positions', () => {
    it('should position door on top wall', () => {
      const conn: JsonConnection = {
        fromRoom: 'Living Room',
        toRoom: 'Hall',
        fromWall: 'top',
        doorType: 'door',
        width: 3,
        position: 50,
      };

      const result = exportFloorToDxf(sampleFloor, [conn]);
      expect(result.connectionCount).toBe(1);
    });

    it('should position door on bottom wall', () => {
      const conn: JsonConnection = {
        fromRoom: 'Living Room',
        toRoom: 'Hall',
        fromWall: 'bottom',
        doorType: 'door',
        width: 3,
        position: 50,
      };

      const result = exportFloorToDxf(sampleFloor, [conn]);
      expect(result.connectionCount).toBe(1);
    });

    it('should position door on left wall', () => {
      const conn: JsonConnection = {
        fromRoom: 'Living Room',
        toRoom: 'Hall',
        fromWall: 'left',
        doorType: 'door',
        width: 3,
        position: 50,
      };

      const result = exportFloorToDxf(sampleFloor, [conn]);
      expect(result.connectionCount).toBe(1);
    });

    it('should export window on WINDOWS layer', () => {
      const conn: JsonConnection = {
        fromRoom: 'Living Room',
        toRoom: 'outside',
        fromWall: 'right',
        doorType: 'window',
        width: 4,
        position: 50,
      };

      const result = exportFloorToDxf(sampleFloor, [conn]);
      expect(result.connectionCount).toBe(1);
      expect(result.content).toContain('WINDOWS');
    });
  });
});
