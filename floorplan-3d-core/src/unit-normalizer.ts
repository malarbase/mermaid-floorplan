/**
 * Unit normalization for 3D rendering
 * 
 * Converts all dimensional values from the DSL's unit to meters
 * for consistent 3D rendering in Three.js.
 * 
 * This module is shared between viewer and MCP server to ensure
 * consistent rendering behavior across all consumers.
 */

import type {
  JsonExport,
  JsonFloor,
  JsonRoom,
  JsonConfig,
  JsonConnection,
  JsonWall,
  JsonStair,
  JsonStairShape,
  JsonStairSegment,
  JsonLift,
} from './types.js';
import { toMeters, isLengthUnit, DEFAULT_UNIT, type LengthUnit } from './constants.js';

/**
 * Get the source unit from config, defaulting to meters if not specified
 */
function getSourceUnit(config?: JsonConfig): LengthUnit {
  const unit = config?.default_unit;
  if (unit && isLengthUnit(unit)) {
    return unit;
  }
  return DEFAULT_UNIT;
}

/**
 * Convert a value to meters if defined
 */
function convertValue(value: number | undefined, unit: LengthUnit): number | undefined {
  if (value === undefined) return undefined;
  return toMeters(value, unit);
}

/**
 * Convert a size tuple [width, height] to meters
 */
function convertSizeTuple(
  size: [number, number] | undefined,
  unit: LengthUnit
): [number, number] | undefined {
  if (!size) return undefined;
  return [toMeters(size[0], unit), toMeters(size[1], unit)];
}

/**
 * Normalize a wall's dimensional values to meters
 */
function normalizeWall(wall: JsonWall, unit: LengthUnit): JsonWall {
  return {
    ...wall,
    // Position is only converted if it's not a percentage
    position:
      wall.position !== undefined && !wall.isPercentage
        ? toMeters(wall.position, unit)
        : wall.position,
    width: convertValue(wall.width, unit),
    height: convertValue(wall.height, unit),
    wallHeight: convertValue(wall.wallHeight, unit),
  };
}

/**
 * Normalize a room's dimensional values to meters
 */
function normalizeRoom(room: JsonRoom, unit: LengthUnit): JsonRoom {
  return {
    ...room,
    x: toMeters(room.x, unit),
    z: toMeters(room.z, unit),
    width: toMeters(room.width, unit),
    height: toMeters(room.height, unit),
    roomHeight: convertValue(room.roomHeight, unit),
    elevation: convertValue(room.elevation, unit),
    walls: room.walls.map((w) => normalizeWall(w, unit)),
  };
}

/**
 * Normalize a stair segment's dimensional values to meters
 */
function normalizeStairSegment(
  segment: JsonStairSegment,
  unit: LengthUnit
): JsonStairSegment {
  return {
    ...segment,
    width: convertValue(segment.width, unit),
    landing: convertSizeTuple(segment.landing, unit),
  };
}

/**
 * Normalize a stair shape's dimensional values to meters
 */
function normalizeStairShape(
  shape: JsonStairShape,
  unit: LengthUnit
): JsonStairShape {
  return {
    ...shape,
    landing: convertSizeTuple(shape.landing, unit),
    outerRadius: convertValue(shape.outerRadius, unit),
    innerRadius: convertValue(shape.innerRadius, unit),
    radius: convertValue(shape.radius, unit),
    segments: shape.segments?.map((seg) => normalizeStairSegment(seg, unit)),
  };
}

/**
 * Normalize a stair's dimensional values to meters
 */
function normalizeStair(stair: JsonStair, unit: LengthUnit): JsonStair {
  return {
    ...stair,
    x: toMeters(stair.x, unit),
    z: toMeters(stair.z, unit),
    rise: toMeters(stair.rise, unit),
    width: convertValue(stair.width, unit),
    riser: convertValue(stair.riser, unit),
    tread: convertValue(stair.tread, unit),
    nosing: convertValue(stair.nosing, unit),
    headroom: convertValue(stair.headroom, unit),
    shape: normalizeStairShape(stair.shape, unit),
  };
}

/**
 * Normalize a lift's dimensional values to meters
 */
function normalizeLift(lift: JsonLift, unit: LengthUnit): JsonLift {
  return {
    ...lift,
    x: toMeters(lift.x, unit),
    z: toMeters(lift.z, unit),
    width: toMeters(lift.width, unit),
    height: toMeters(lift.height, unit),
  };
}

/**
 * Normalize a floor's dimensional values to meters
 */
function normalizeFloor(floor: JsonFloor, unit: LengthUnit): JsonFloor {
  return {
    ...floor,
    height: convertValue(floor.height, unit),
    rooms: floor.rooms.map((r) => normalizeRoom(r, unit)),
    stairs: floor.stairs?.map((s) => normalizeStair(s, unit)),
    lifts: floor.lifts?.map((l) => normalizeLift(l, unit)),
  };
}

/**
 * Normalize config dimensional values to meters
 */
function normalizeConfig(config: JsonConfig, unit: LengthUnit): JsonConfig {
  return {
    ...config,
    // Dimensional values - convert to meters
    wall_thickness: convertValue(config.wall_thickness, unit),
    default_height: convertValue(config.default_height, unit),
    floor_thickness: convertValue(config.floor_thickness, unit),
    door_width: convertValue(config.door_width, unit),
    door_height: convertValue(config.door_height, unit),
    door_size: convertSizeTuple(config.door_size, unit),
    window_width: convertValue(config.window_width, unit),
    window_height: convertValue(config.window_height, unit),
    window_size: convertSizeTuple(config.window_size, unit),
    window_sill: convertValue(config.window_sill, unit),
    // Non-dimensional values - preserve as-is
    default_style: config.default_style,
    default_unit: config.default_unit, // Preserve user's display preference
    area_unit: config.area_unit,
    // Theme properties - preserve as-is
    theme: config.theme,
    darkMode: config.darkMode,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    showLabels: config.showLabels,
    showDimensions: config.showDimensions,
  };
}

/**
 * Normalize a connection's dimensional values to meters
 * Note: Connection positions are ALWAYS percentages in the DSL (e.g., "at 50%"),
 * not length values, so we don't convert them.
 * But width/height are dimensional values that need conversion.
 */
function normalizeConnection(
  conn: JsonConnection,
  unit: LengthUnit
): JsonConnection {
  return {
    ...conn,
    // Convert dimensional values (width, height) but not position (percentage)
    width: convertValue(conn.width, unit),
    height: convertValue(conn.height, unit),
    // fullHeight is a boolean, no conversion needed
  };
}

/**
 * Normalize all dimensional values in a JsonExport from DSL units to meters.
 * This ensures consistent 3D rendering regardless of the source unit.
 * 
 * @param data - The JSON export from DSL parsing
 * @returns A new JsonExport with all dimensions converted to meters
 */
export function normalizeToMeters(data: JsonExport): JsonExport {
  const sourceUnit = getSourceUnit(data.config);

  // If already in meters, return as-is
  if (sourceUnit === 'm') {
    return data;
  }

  return {
    ...data,
    config: data.config ? normalizeConfig(data.config, sourceUnit) : undefined,
    floors: data.floors.map((f) => normalizeFloor(f, sourceUnit)),
    connections: data.connections?.map((c) => normalizeConnection(c, sourceUnit)),
    // styles don't have dimensional values, pass through
    styles: data.styles,
    // vertical connections are just references, pass through
    verticalConnections: data.verticalConnections,
  };
}
