/**
 * Integration tests for 3D PNG rendering via Puppeteer
 */

import type { JsonExport } from 'floorplan-3d-core';
import { afterAll, describe, expect, it } from 'vitest';
import { closeBrowser, formatSceneBounds, render3DToPng } from '../src/utils/renderer3d.js';

// Simple test floorplan data
const simpleFloorplan: JsonExport = {
  config: {
    title: 'Test Floorplan',
    units: 'meters',
    default_height: 3,
  },
  floors: [
    {
      id: 'ground',
      index: 0,
      name: 'Ground Floor',
      rooms: [
        {
          id: 'living',
          name: 'Living Room',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'window' },
            { direction: 'bottom', type: 'door' },
            { direction: 'left', type: 'solid' },
          ],
        },
        {
          id: 'kitchen',
          name: 'Kitchen',
          x: 5,
          z: 0,
          width: 3,
          height: 4,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'solid' },
            { direction: 'bottom', type: 'solid' },
            { direction: 'left', type: 'open' },
          ],
        },
      ],
      stairs: [],
      lifts: [],
    },
  ],
  styles: [],
};

// Floorplan with multiple floors for testing
const multiFloorFloorplan: JsonExport = {
  config: {
    title: 'Multi Floor Test',
    units: 'meters',
    default_height: 3,
  },
  floors: [
    {
      id: 'ground',
      index: 0,
      name: 'Ground Floor',
      rooms: [
        {
          id: 'room1',
          name: 'Room 1',
          x: 0,
          z: 0,
          width: 4,
          height: 4,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'solid' },
            { direction: 'bottom', type: 'solid' },
            { direction: 'left', type: 'solid' },
          ],
        },
      ],
      stairs: [{ name: 's1', x: 3, z: 1, width: 1, rise: 3, shape: { type: 'straight' } }],
      lifts: [],
    },
    {
      id: 'first',
      index: 1,
      name: 'First Floor',
      rooms: [
        {
          id: 'room2',
          name: 'Room 2',
          x: 0,
          z: 0,
          width: 4,
          height: 4,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'solid' },
            { direction: 'bottom', type: 'solid' },
            { direction: 'left', type: 'solid' },
          ],
        },
      ],
      stairs: [],
      lifts: [],
    },
  ],
  styles: [],
};

// Floorplan with connections (doors and windows between rooms)
const floorplanWithConnections: JsonExport = {
  config: {
    title: 'Connections Test',
    default_unit: 'm',
    default_height: 3,
  },
  floors: [
    {
      id: 'ground',
      index: 0,
      name: 'Ground Floor',
      rooms: [
        {
          id: 'living',
          name: 'LivingRoom',
          x: 0,
          z: 0,
          width: 5,
          height: 4,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'solid' },
            { direction: 'bottom', type: 'solid' },
            { direction: 'left', type: 'window' },
          ],
        },
        {
          id: 'kitchen',
          name: 'Kitchen',
          x: 5,
          z: 0,
          width: 4,
          height: 4,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'solid' },
            { direction: 'bottom', type: 'solid' },
            { direction: 'left', type: 'solid' },
          ],
        },
        {
          id: 'bedroom',
          name: 'Bedroom',
          x: 0,
          z: 4,
          width: 5,
          height: 3,
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'solid' },
            { direction: 'bottom', type: 'solid' },
            { direction: 'left', type: 'solid' },
          ],
        },
      ],
      stairs: [],
      lifts: [],
    },
  ],
  connections: [
    // Door between LivingRoom and Kitchen
    {
      fromRoom: 'LivingRoom',
      fromWall: 'right',
      toRoom: 'Kitchen',
      toWall: 'left',
      doorType: 'door',
      position: 50,
    },
    // Door between LivingRoom and Bedroom
    {
      fromRoom: 'LivingRoom',
      fromWall: 'bottom',
      toRoom: 'Bedroom',
      toWall: 'top',
      doorType: 'door',
      position: 50,
    },
    // Window connection (window type connection)
    {
      fromRoom: 'Kitchen',
      fromWall: 'right',
      toRoom: 'Kitchen', // External window
      toWall: 'right',
      doorType: 'window',
      position: 50,
    },
  ],
  styles: [],
};

// Floorplan with custom styles
const styledFloorplan: JsonExport = {
  config: {
    title: 'Styled Floorplan',
    units: 'meters',
    theme: 'dark',
  },
  floors: [
    {
      id: 'floor0',
      index: 0,
      name: 'Main Floor',
      rooms: [
        {
          id: 'office',
          name: 'Office',
          x: 0,
          z: 0,
          width: 6,
          height: 5,
          style: 'corporate',
          walls: [
            { direction: 'top', type: 'solid' },
            { direction: 'right', type: 'window' },
            { direction: 'bottom', type: 'door' },
            { direction: 'left', type: 'solid' },
          ],
        },
      ],
      stairs: [],
      lifts: [{ name: 'lift1', x: 5, z: 3, width: 1.5, height: 1.5, doors: ['bottom'] }],
    },
  ],
  styles: [
    {
      name: 'corporate',
      floor_color: '#2c3e50',
      wall_color: '#34495e',
    },
  ],
};

// Ensure browser is closed after all tests
afterAll(async () => {
  await closeBrowser();
});

describe('render3DToPng', () => {
  describe('basic rendering', () => {
    it('renders a simple floorplan with default options', async () => {
      const result = await render3DToPng(simpleFloorplan);

      expect(result.pngBuffer).toBeInstanceOf(Buffer);
      expect(result.pngBuffer.length).toBeGreaterThan(0);

      // Check PNG magic number
      expect(result.pngBuffer[0]).toBe(0x89);
      expect(result.pngBuffer[1]).toBe(0x50); // P
      expect(result.pngBuffer[2]).toBe(0x4e); // N
      expect(result.pngBuffer[3]).toBe(0x47); // G

      expect(result.metadata.format).toBe('3d-png');
      expect(result.metadata.projection).toBe('isometric');
      expect(result.metadata.width).toBe(800);
      expect(result.metadata.height).toBe(600);
      expect(result.metadata.floorsRendered).toContain(0);
    }, 30000); // Longer timeout for browser startup

    it('renders with custom dimensions', async () => {
      const result = await render3DToPng(simpleFloorplan, {
        width: 1024,
        height: 768,
      });

      expect(result.metadata.width).toBe(1024);
      expect(result.metadata.height).toBe(768);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);

    it('renders with perspective projection', async () => {
      const result = await render3DToPng(simpleFloorplan, {
        projection: 'perspective',
        fov: 60,
      });

      expect(result.metadata.projection).toBe('perspective');
      expect(result.metadata.fov).toBe(60);
      expect(result.metadata.cameraPosition).toBeDefined();
      expect(result.metadata.cameraTarget).toBeDefined();
    }, 30000);

    it('renders with custom camera position', async () => {
      const cameraPosition: [number, number, number] = [10, 10, 10];
      const cameraTarget: [number, number, number] = [2.5, 0, 2];

      const result = await render3DToPng(simpleFloorplan, {
        projection: 'perspective',
        cameraPosition,
        cameraTarget,
      });

      expect(result.metadata.cameraPosition).toEqual(cameraPosition);
      expect(result.metadata.cameraTarget).toEqual(cameraTarget);
    }, 30000);
  });

  describe('multi-floor rendering', () => {
    it('renders a specific floor', async () => {
      const result = await render3DToPng(multiFloorFloorplan, {
        floorIndex: 1,
      });

      expect(result.metadata.floorsRendered).toEqual([1]);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);

    it('renders all floors when requested', async () => {
      const result = await render3DToPng(multiFloorFloorplan, {
        renderAllFloors: true,
      });

      expect(result.metadata.floorsRendered).toEqual([0, 1]);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('styled floorplan rendering', () => {
    it('renders with custom styles applied', async () => {
      const result = await render3DToPng(styledFloorplan);

      expect(result.pngBuffer.length).toBeGreaterThan(0);
      expect(result.metadata.floorsRendered).toContain(0);
    }, 30000);

    it('renders dark theme floorplan', async () => {
      const result = await render3DToPng(styledFloorplan, {
        projection: 'isometric',
      });

      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('scene bounds', () => {
    it('returns valid scene bounds', async () => {
      const result = await render3DToPng(simpleFloorplan);

      const bounds = result.metadata.sceneBounds;
      expect(bounds).toBeDefined();
      expect(bounds.size.x).toBeGreaterThan(0);
      expect(bounds.size.z).toBeGreaterThan(0);
      expect(bounds.center).toBeDefined();
    }, 30000);
  });

  describe('connection rendering', () => {
    it('renders doors between rooms', async () => {
      const result = await render3DToPng(floorplanWithConnections);

      expect(result.pngBuffer).toBeInstanceOf(Buffer);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
      expect(result.metadata.floorsRendered).toContain(0);

      // Verify PNG is valid
      expect(result.pngBuffer[0]).toBe(0x89);
      expect(result.pngBuffer[1]).toBe(0x50);
    }, 30000);

    it('renders connections with isometric projection', async () => {
      const result = await render3DToPng(floorplanWithConnections, {
        projection: 'isometric',
      });

      expect(result.metadata.projection).toBe('isometric');
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);

    it('renders connections with perspective projection', async () => {
      const result = await render3DToPng(floorplanWithConnections, {
        projection: 'perspective',
        fov: 60,
      });

      expect(result.metadata.projection).toBe('perspective');
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);

    it('handles empty connections array', async () => {
      const noConnections: JsonExport = {
        ...simpleFloorplan,
        connections: [],
      };

      const result = await render3DToPng(noConnections);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);

    it('handles missing connections property', async () => {
      // simpleFloorplan doesn't have connections property
      const result = await render3DToPng(simpleFloorplan);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('edge cases', () => {
    it('handles empty rooms array', async () => {
      const emptyFloorplan: JsonExport = {
        config: { title: 'Empty' },
        floors: [
          {
            id: 'empty',
            index: 0,
            name: 'Empty Floor',
            rooms: [],
            stairs: [],
            lifts: [],
          },
        ],
        styles: [],
      };

      const result = await render3DToPng(emptyFloorplan);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);

    it('handles small dimensions', async () => {
      const result = await render3DToPng(simpleFloorplan, {
        width: 100,
        height: 100,
      });

      expect(result.metadata.width).toBe(100);
      expect(result.metadata.height).toBe(100);
      expect(result.pngBuffer.length).toBeGreaterThan(0);
    }, 30000);
  });
});

describe('formatSceneBounds', () => {
  it('formats scene bounds correctly', () => {
    const bounds = {
      min: { x: 0.123456, y: 0.234567, z: 0.345678 },
      max: { x: 10.111111, y: 5.222222, z: 8.333333 },
      center: { x: 5.117284, y: 2.728395, z: 4.339506 },
      size: { x: 9.987655, y: 4.987655, z: 7.987655 },
    };

    const formatted = formatSceneBounds(bounds);

    expect(formatted.min).toEqual([0.12, 0.23, 0.35]);
    expect(formatted.max).toEqual([10.11, 5.22, 8.33]);
    expect(formatted.center).toEqual([5.12, 2.73, 4.34]);
  });

  it('handles negative coordinates', () => {
    const bounds = {
      min: { x: -5.555, y: -2.222, z: -3.333 },
      max: { x: 5.555, y: 2.222, z: 3.333 },
      center: { x: 0, y: 0, z: 0 },
      size: { x: 11.11, y: 4.444, z: 6.666 },
    };

    const formatted = formatSceneBounds(bounds);

    // Note: JS rounding rounds toward positive infinity
    // Math.round(5.555 * 100) / 100 = 5.56
    // Math.round(-5.555 * 100) / 100 = -5.55
    expect(formatted.min).toEqual([-5.55, -2.22, -3.33]);
    expect(formatted.max).toEqual([5.56, 2.22, 3.33]);
    expect(formatted.center).toEqual([0, 0, 0]);
  });

  it('handles zero dimensions', () => {
    const bounds = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
    };

    const formatted = formatSceneBounds(bounds);

    expect(formatted.min).toEqual([0, 0, 0]);
    expect(formatted.max).toEqual([0, 0, 0]);
    expect(formatted.center).toEqual([0, 0, 0]);
  });
});
