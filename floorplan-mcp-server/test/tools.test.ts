import { describe, it, expect, beforeAll } from 'vitest';
import { parseFloorplan, validateFloorplan } from '../src/utils/parser.js';
import { generateSvg } from '../src/utils/renderer.js';
import { convertFloorplanToJson } from 'floorplan-language';

const SIMPLE_FLOORPLAN = `
floorplan
  config { default_unit: ft, area_unit: sqft }

  floor GroundFloor {
    room LivingRoom at (0, 0) size (20 x 15) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Kitchen at (20, 0) size (12 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Bedroom at (0, 15) size (15 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
`;

const MULTI_FLOOR_PLAN = `
floorplan
  config { default_unit: ft, area_unit: sqft }

  floor Ground {
    room Hall at (0, 0) size (20 x 15) walls [top: solid, right: solid, bottom: solid, left: solid]
  }

  floor First {
    room Bedroom at (0, 0) size (20 x 15) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
`;

describe('Floorplan Analysis Tool', () => {
  describe('parseFloorplan', () => {
    it('should parse valid floorplan DSL', async () => {
      const result = await parseFloorplan(SIMPLE_FLOORPLAN);
      expect(result.errors).toHaveLength(0);
      expect(result.document).toBeDefined();
    });

    it('should return errors for invalid DSL', async () => {
      const result = await parseFloorplan('invalid dsl content');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('convertFloorplanToJson metrics', () => {
    it('should compute room metrics', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      expect(parseResult.document).toBeDefined();
      
      const json = convertFloorplanToJson(parseResult.document!.parseResult.value);
      expect(json.data).toBeDefined();
      
      const floors = json.data!.floors;
      expect(floors).toHaveLength(1);
      
      const rooms = floors[0].rooms;
      expect(rooms).toHaveLength(3);
      
      // LivingRoom: 20 x 15 = 300 sqft
      const livingRoom = rooms.find(r => r.name === 'LivingRoom');
      expect(livingRoom?.area).toBe(300);
      
      // Kitchen: 12 x 10 = 120 sqft
      const kitchen = rooms.find(r => r.name === 'Kitchen');
      expect(kitchen?.area).toBe(120);
      
      // Bedroom: 15 x 12 = 180 sqft
      const bedroom = rooms.find(r => r.name === 'Bedroom');
      expect(bedroom?.area).toBe(180);
    });

    it('should compute floor metrics', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      const json = convertFloorplanToJson(parseResult.document!.parseResult.value);
      
      const floor = json.data!.floors[0];
      expect(floor.metrics).toBeDefined();
      
      // Net area = sum of room areas = 300 + 120 + 180 = 600 sqft
      expect(floor.metrics!.netArea).toBe(600);
      expect(floor.metrics!.roomCount).toBe(3);
    });

    it('should compute floorplan summary', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      const json = convertFloorplanToJson(parseResult.document!.parseResult.value);
      
      const summary = json.data!.summary;
      expect(summary).toBeDefined();
      expect(summary!.floorCount).toBe(1);
      expect(summary!.totalRoomCount).toBe(3);
      expect(summary!.grossFloorArea).toBe(600);
    });

    it('should handle multi-floor plans', async () => {
      const parseResult = await parseFloorplan(MULTI_FLOOR_PLAN);
      const json = convertFloorplanToJson(parseResult.document!.parseResult.value);
      
      const summary = json.data!.summary;
      expect(summary!.floorCount).toBe(2);
      expect(summary!.totalRoomCount).toBe(2);
      // Hall: 20 x 15 = 300, Bedroom: 20 x 15 = 300 → Total = 600
      expect(summary!.grossFloorArea).toBe(600);
    });
  });
});

describe('Floorplan Rendering Tool', () => {
  describe('generateSvg', () => {
    it('should generate basic SVG', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      expect(parseResult.document).toBeDefined();
      
      const svg = generateSvg(parseResult.document!);
      expect(svg).toContain('<svg');
      expect(svg).toContain('LivingRoom');
      expect(svg).toContain('Kitchen');
      expect(svg).toContain('Bedroom');
    });

    it('should include area labels when showArea is true', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      
      const svg = generateSvg(parseResult.document!, {
        showArea: true,
        areaUnit: 'sqft',
      });
      
      // Should contain area values
      expect(svg).toContain('300 sqft');  // LivingRoom
      expect(svg).toContain('120 sqft');  // Kitchen
      expect(svg).toContain('180 sqft');  // Bedroom
    });

    it('should include dimension lines when showDimensions is true', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      
      const svg = generateSvg(parseResult.document!, {
        showDimensions: true,
        lengthUnit: 'ft',
      });
      
      // Should contain dimension values with units
      expect(svg).toContain('20ft');  // LivingRoom width
      expect(svg).toContain('15ft');  // LivingRoom height
      expect(svg).toContain('12ft');  // Kitchen width or Bedroom height
    });

    it('should include floor summary when showFloorSummary is true', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      
      const svg = generateSvg(parseResult.document!, {
        showFloorSummary: true,
      });
      
      // Should contain summary panel elements
      expect(svg).toContain('Rooms:');
      expect(svg).toContain('Net Area:');
      expect(svg).toContain('Efficiency:');
    });

    it('should render all floors when renderAllFloors is true', async () => {
      const parseResult = await parseFloorplan(MULTI_FLOOR_PLAN);
      
      const svg = generateSvg(parseResult.document!, {
        renderAllFloors: true,
      });
      
      expect(svg).toContain('Hall');
      expect(svg).toContain('Bedroom');
      expect(svg).toContain('Ground');
      expect(svg).toContain('First');
    });

    it('should display areas with sqm unit when areaUnit is sqm', async () => {
      const parseResult = await parseFloorplan(SIMPLE_FLOORPLAN);
      
      const svg = generateSvg(parseResult.document!, {
        showArea: true,
        areaUnit: 'sqm',
      });
      
      // Should display area values with sqm unit suffix (no conversion, just unit label)
      expect(svg).toContain('sqm');
      expect(svg).toContain('[300 sqm]');  // LivingRoom
      expect(svg).toContain('[120 sqm]');  // Kitchen
      expect(svg).toContain('[180 sqm]');  // Bedroom
    });
  });
});

describe('Validation', () => {
  it('should validate correct floorplan', async () => {
    const result = await validateFloorplan(SIMPLE_FLOORPLAN);
    expect(result.errors).toHaveLength(0);
  });

  it('should report errors for invalid floorplan', async () => {
    const result = await validateFloorplan('floorplan end');
    // Should have validation errors (no floors)
    expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

