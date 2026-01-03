/**
 * Tests for constants module
 */

import { describe, expect, test } from 'vitest';
import {
  toMeters,
  fromMeters,
  convertUnit,
  isLengthUnit,
  resolveUnit,
  getThemeColors,
  DIMENSIONS,
  COLORS,
  COLORS_DARK,
  COLORS_BLUEPRINT,
  UNIT_TO_METERS,
  METERS_TO_UNIT,
  DEFAULT_UNIT,
  type LengthUnit,
} from '../src/constants';

describe('Unit Conversion', () => {
  describe('toMeters', () => {
    test('should convert meters to meters (identity)', () => {
      expect(toMeters(10, 'm')).toBe(10);
    });

    test('should convert feet to meters', () => {
      expect(toMeters(1, 'ft')).toBeCloseTo(0.3048);
      expect(toMeters(10, 'ft')).toBeCloseTo(3.048);
    });

    test('should convert centimeters to meters', () => {
      expect(toMeters(100, 'cm')).toBe(1);
      expect(toMeters(50, 'cm')).toBe(0.5);
    });

    test('should convert inches to meters', () => {
      expect(toMeters(1, 'in')).toBeCloseTo(0.0254);
      expect(toMeters(12, 'in')).toBeCloseTo(0.3048);
    });

    test('should convert millimeters to meters', () => {
      expect(toMeters(1000, 'mm')).toBe(1);
      expect(toMeters(500, 'mm')).toBe(0.5);
    });
  });

  describe('fromMeters', () => {
    test('should convert meters to meters (identity)', () => {
      expect(fromMeters(10, 'm')).toBe(10);
    });

    test('should convert meters to feet', () => {
      expect(fromMeters(1, 'ft')).toBeCloseTo(3.28084);
      expect(fromMeters(0.3048, 'ft')).toBeCloseTo(1);
    });

    test('should convert meters to centimeters', () => {
      expect(fromMeters(1, 'cm')).toBe(100);
    });

    test('should convert meters to inches', () => {
      expect(fromMeters(1, 'in')).toBeCloseTo(39.3701);
    });

    test('should convert meters to millimeters', () => {
      expect(fromMeters(1, 'mm')).toBe(1000);
    });
  });

  describe('convertUnit', () => {
    test('should return same value for same unit', () => {
      expect(convertUnit(5, 'ft', 'ft')).toBe(5);
      expect(convertUnit(10, 'm', 'm')).toBe(10);
    });

    test('should convert feet to meters', () => {
      expect(convertUnit(10, 'ft', 'm')).toBeCloseTo(3.048);
    });

    test('should convert meters to feet', () => {
      expect(convertUnit(1, 'm', 'ft')).toBeCloseTo(3.28084);
    });

    test('should convert inches to centimeters', () => {
      expect(convertUnit(1, 'in', 'cm')).toBeCloseTo(2.54);
    });

    test('should round-trip conversions accurately', () => {
      const original = 10;
      const converted = convertUnit(original, 'ft', 'm');
      const roundTrip = convertUnit(converted, 'm', 'ft');
      expect(roundTrip).toBeCloseTo(original);
    });
  });

  describe('isLengthUnit', () => {
    test('should return true for valid units', () => {
      expect(isLengthUnit('m')).toBe(true);
      expect(isLengthUnit('ft')).toBe(true);
      expect(isLengthUnit('cm')).toBe(true);
      expect(isLengthUnit('in')).toBe(true);
      expect(isLengthUnit('mm')).toBe(true);
    });

    test('should return false for invalid units', () => {
      expect(isLengthUnit('meters')).toBe(false);
      expect(isLengthUnit('feet')).toBe(false);
      expect(isLengthUnit('km')).toBe(false);
      expect(isLengthUnit('')).toBe(false);
      expect(isLengthUnit(undefined)).toBe(false);
    });
  });

  describe('resolveUnit', () => {
    test('should use explicit unit when valid', () => {
      expect(resolveUnit('ft', 'm')).toBe('ft');
      expect(resolveUnit('cm', 'ft')).toBe('cm');
    });

    test('should fall back to config default when explicit is invalid', () => {
      expect(resolveUnit('invalid', 'ft')).toBe('ft');
      expect(resolveUnit(undefined, 'cm')).toBe('cm');
    });

    test('should fall back to DEFAULT_UNIT when both are invalid', () => {
      expect(resolveUnit('invalid', 'also-invalid')).toBe(DEFAULT_UNIT);
      expect(resolveUnit(undefined, undefined)).toBe(DEFAULT_UNIT);
    });
  });
});

describe('Theme Colors', () => {
  describe('getThemeColors', () => {
    test('should return light theme colors by default', () => {
      const colors = getThemeColors('light');
      expect(colors.FLOOR).toBe(COLORS.FLOOR);
      expect(colors.WALL).toBe(COLORS.WALL);
      expect(colors.BACKGROUND).toBe(COLORS.BACKGROUND);
    });

    test('should return dark theme colors', () => {
      const colors = getThemeColors('dark');
      expect(colors.FLOOR).toBe(COLORS_DARK.FLOOR);
      expect(colors.WALL).toBe(COLORS_DARK.WALL);
      expect(colors.BACKGROUND).toBe(COLORS_DARK.BACKGROUND);
    });

    test('should return blueprint theme colors', () => {
      const colors = getThemeColors('blueprint');
      expect(colors.FLOOR).toBe(COLORS_BLUEPRINT.FLOOR);
      expect(colors.WALL).toBe(COLORS_BLUEPRINT.WALL);
      expect(colors.BACKGROUND).toBe(COLORS_BLUEPRINT.BACKGROUND);
    });
  });

  describe('COLORS constants', () => {
    test('should have all required color properties', () => {
      const requiredProps = ['FLOOR', 'WALL', 'WINDOW', 'DOOR', 'BACKGROUND'];

      for (const prop of requiredProps) {
        expect(COLORS).toHaveProperty(prop);
        expect(COLORS_DARK).toHaveProperty(prop);
        expect(COLORS_BLUEPRINT).toHaveProperty(prop);
      }
    });

    test('should have valid hex color values', () => {
      // All color values should be numbers (hex colors)
      expect(typeof COLORS.FLOOR).toBe('number');
      expect(typeof COLORS.WALL).toBe('number');
      expect(typeof COLORS_DARK.FLOOR).toBe('number');
      expect(typeof COLORS_BLUEPRINT.FLOOR).toBe('number');
    });
  });
});

describe('DIMENSIONS', () => {
  test('should have wall dimensions', () => {
    expect(DIMENSIONS.WALL.THICKNESS).toBeGreaterThan(0);
    expect(DIMENSIONS.WALL.HEIGHT).toBeGreaterThan(0);
  });

  test('should have floor dimensions', () => {
    expect(DIMENSIONS.FLOOR.THICKNESS).toBeGreaterThan(0);
  });

  test('should have door dimensions', () => {
    expect(DIMENSIONS.DOOR.WIDTH).toBeGreaterThan(0);
    expect(DIMENSIONS.DOOR.HEIGHT).toBeGreaterThan(0);
    expect(DIMENSIONS.DOOR.PANEL_THICKNESS).toBeGreaterThan(0);
  });

  test('should have window dimensions', () => {
    expect(DIMENSIONS.WINDOW.WIDTH).toBeGreaterThan(0);
    expect(DIMENSIONS.WINDOW.HEIGHT).toBeGreaterThan(0);
    expect(DIMENSIONS.WINDOW.SILL_HEIGHT).toBeGreaterThan(0);
  });

  test('should have reasonable wall height (around 3m)', () => {
    expect(DIMENSIONS.WALL.HEIGHT).toBeGreaterThan(2);
    expect(DIMENSIONS.WALL.HEIGHT).toBeLessThan(5);
  });
});

describe('Unit Conversion Tables', () => {
  test('should have reciprocal conversion factors', () => {
    const units: LengthUnit[] = ['m', 'ft', 'cm', 'in', 'mm'];
    
    for (const unit of units) {
      const toMeters = UNIT_TO_METERS[unit];
      const fromMeters = METERS_TO_UNIT[unit];
      expect(toMeters * fromMeters).toBeCloseTo(1);
    }
  });
});

