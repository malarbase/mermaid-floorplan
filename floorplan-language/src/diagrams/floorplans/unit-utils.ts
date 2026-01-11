/**
 * Unit conversion utilities for floorplan DSL
 * Single source of truth for unit handling across the codebase
 */

import type { LENGTH_UNIT, ValueWithUnit, SignedValueWithUnit, Dimension, Coordinate, Floorplan } from "../../generated/ast.js";

/**
 * Supported length units
 */
export type LengthUnit = LENGTH_UNIT;

/**
 * Default unit when no unit is specified in the DSL
 * Used as system fallback when config does not specify default_unit
 */
export const DEFAULT_UNIT: LengthUnit = 'm';

/**
 * Conversion factors to meters for each supported unit
 */
export const UNIT_TO_METERS: Record<LengthUnit, number> = {
  m: 1.0,
  ft: 0.3048,
  cm: 0.01,
  'in': 0.0254,
  mm: 0.001,
};

/**
 * Conversion factors from meters to each supported unit
 */
export const METERS_TO_UNIT: Record<LengthUnit, number> = {
  m: 1.0,
  ft: 3.28084,
  cm: 100.0,
  'in': 39.3701,
  mm: 1000.0,
};

/**
 * Unit system classification for mixed unit warning
 */
export const UNIT_SYSTEM: Record<LengthUnit, 'metric' | 'imperial'> = {
  m: 'metric',
  cm: 'metric',
  mm: 'metric',
  ft: 'imperial',
  'in': 'imperial',
};

/**
 * All valid length unit values
 */
export const VALID_UNITS: readonly LengthUnit[] = ['m', 'ft', 'cm', 'in', 'mm'];

/**
 * Convert a value from one unit to meters
 */
export function toMeters(value: number, unit: LengthUnit): number {
  return value * UNIT_TO_METERS[unit];
}

/**
 * Convert a value from meters to a target unit
 */
export function fromMeters(valueInMeters: number, targetUnit: LengthUnit): number {
  return valueInMeters * METERS_TO_UNIT[targetUnit];
}

/**
 * Convert a value from one unit to another
 */
export function convertUnit(value: number, fromUnit: LengthUnit, toUnit: LengthUnit): number {
  if (fromUnit === toUnit) return value;
  return fromMeters(toMeters(value, fromUnit), toUnit);
}

/**
 * Check if a string is a valid length unit
 */
export function isLengthUnit(unit: string | undefined | null): unit is LengthUnit {
  return unit !== undefined && unit !== null && (VALID_UNITS as readonly string[]).includes(unit);
}

/**
 * Get the default unit from a floorplan's config block
 */
export function getConfigDefaultUnit(floorplan: Floorplan): LengthUnit | undefined {
  if (!floorplan.config) return undefined;
  
  for (const prop of floorplan.config.properties) {
    if (prop.name === 'default_unit' && prop.unitRef) {
      return prop.unitRef;
    }
  }
  return undefined;
}

/**
 * Get the effective unit from an explicit unit, config default, or system default
 */
export function resolveUnit(
  explicitUnit?: LengthUnit,
  configDefault?: LengthUnit
): LengthUnit {
  if (explicitUnit) {
    return explicitUnit;
  }
  if (configDefault) {
    return configDefault;
  }
  return DEFAULT_UNIT;
}

/**
 * Get the numeric value from a ValueWithUnit or SignedValueWithUnit
 * Handles the negative flag for SignedValueWithUnit
 */
function getNumericValue(valueWithUnit: ValueWithUnit | SignedValueWithUnit): number {
  // Check if it's a SignedValueWithUnit (has 'negative' property)
  if ('negative' in valueWithUnit && valueWithUnit.negative) {
    return -valueWithUnit.value;
  }
  return valueWithUnit.value;
}

/**
 * Resolve a ValueWithUnit to a number in the canonical unit (meters)
 */
export function resolveValueToMeters(
  valueWithUnit: ValueWithUnit | SignedValueWithUnit,
  configDefault?: LengthUnit
): number {
  const unit = resolveUnit(valueWithUnit.unit, configDefault);
  const numericValue = getNumericValue(valueWithUnit);
  return toMeters(numericValue, unit);
}

/**
 * Resolve a ValueWithUnit to a raw number using the effective unit
 * Returns the value as-is (for backward compatibility where units are not normalized)
 */
export function resolveValue(
  valueWithUnit: ValueWithUnit | SignedValueWithUnit | undefined
): number | undefined {
  if (!valueWithUnit) return undefined;
  return valueWithUnit.value;
}

/**
 * Resolve a Dimension to width and height numbers
 * For backward compatibility, returns raw values without unit conversion
 */
export function resolveDimension(
  dimension: Dimension | undefined
): { width: number; height: number } | undefined {
  if (!dimension) return undefined;
  return {
    width: dimension.width.value,
    height: dimension.height.value,
  };
}

/**
 * Resolve a Dimension to width and height in meters
 */
export function resolveDimensionToMeters(
  dimension: Dimension,
  configDefault?: LengthUnit
): { width: number; height: number } {
  return {
    width: resolveValueToMeters(dimension.width, configDefault),
    height: resolveValueToMeters(dimension.height, configDefault),
  };
}

/**
 * Resolve a Coordinate to x and y numbers
 * For backward compatibility, returns raw values without unit conversion
 */
export function resolveCoordinate(
  coordinate: Coordinate | undefined
): { x: number; y: number } | undefined {
  if (!coordinate) return undefined;
  return {
    x: coordinate.x.value,
    y: coordinate.y.value,
  };
}

/**
 * Resolve a Coordinate to x and y in meters
 */
export function resolveCoordinateToMeters(
  coordinate: Coordinate,
  configDefault?: LengthUnit
): { x: number; y: number } {
  return {
    x: resolveValueToMeters(coordinate.x, configDefault),
    y: resolveValueToMeters(coordinate.y, configDefault),
  };
}

/**
 * Collect all units used in a floorplan
 * Returns a set of unique units found
 */
export function collectUnits(floorplan: Floorplan): Set<LengthUnit> {
  const units = new Set<LengthUnit>();
  
  // Check defines
  for (const define of floorplan.defines) {
    if (define.value.width.unit) units.add(define.value.width.unit);
    if (define.value.height.unit) units.add(define.value.height.unit);
  }
  
  // Check floors
  for (const floor of floorplan.floors) {
    if (floor.height?.unit) units.add(floor.height.unit);
    
    for (const room of floor.rooms) {
      collectRoomUnits(room, units);
    }
  }
  
  return units;
}

/**
 * Recursively collect units from a room and its sub-rooms
 */
function collectRoomUnits(room: { 
  position?: Coordinate; 
  size?: Dimension; 
  height?: ValueWithUnit;
  elevation?: SignedValueWithUnit;
  relativePosition?: { gap?: ValueWithUnit };
  subRooms: Array<unknown>;
}, units: Set<LengthUnit>): void {
  // Position
  if (room.position) {
    if (room.position.x.unit) units.add(room.position.x.unit);
    if (room.position.y.unit) units.add(room.position.y.unit);
  }
  
  // Size
  if (room.size) {
    if (room.size.width.unit) units.add(room.size.width.unit);
    if (room.size.height.unit) units.add(room.size.height.unit);
  }
  
  // Height
  if (room.height?.unit) units.add(room.height.unit);
  
  // Elevation
  if (room.elevation?.unit) units.add(room.elevation.unit);
  
  // Gap in relative positioning
  if (room.relativePosition?.gap?.unit) {
    units.add(room.relativePosition.gap.unit);
  }
  
  // Sub-rooms
  for (const subRoom of room.subRooms) {
    collectRoomUnits(subRoom as typeof room, units);
  }
}

/**
 * Check if a floorplan mixes metric and imperial units
 */
export function hasMixedUnitSystems(floorplan: Floorplan): boolean {
  const units = collectUnits(floorplan);
  
  let hasMetric = false;
  let hasImperial = false;
  
  for (const unit of units) {
    if (UNIT_SYSTEM[unit] === 'metric') hasMetric = true;
    if (UNIT_SYSTEM[unit] === 'imperial') hasImperial = true;
  }
  
  return hasMetric && hasImperial;
}

/**
 * Get a list of detected unit systems in a floorplan
 */
export function getUnitSystems(floorplan: Floorplan): ('metric' | 'imperial')[] {
  const units = collectUnits(floorplan);
  const systems = new Set<'metric' | 'imperial'>();
  
  for (const unit of units) {
    systems.add(UNIT_SYSTEM[unit]);
  }
  
  return Array.from(systems);
}

