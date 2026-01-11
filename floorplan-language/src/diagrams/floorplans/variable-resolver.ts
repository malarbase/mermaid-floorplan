/**
 * Variable resolver for floorplan DSL
 * Resolves dimension variables and config defaults
 */

import type { CONFIG_KEY, Floorplan, Room, LENGTH_UNIT, Dimension } from "../../generated/ast.js";

/**
 * Resolved dimension with optional unit information
 */
export interface ResolvedDimension {
  width: number;
  height: number;
  widthUnit?: LENGTH_UNIT;
  heightUnit?: LENGTH_UNIT;
}

/**
 * Resolved size dimension (width x height)
 */
export interface ResolvedSize {
  width: number;
  height: number;
  widthUnit?: LENGTH_UNIT;
  heightUnit?: LENGTH_UNIT;
}

/**
 * Result of variable resolution
 */
export interface VariableResolutionResult {
  /** Map of variable name to resolved dimension */
  variables: Map<string, ResolvedDimension>;
  /** Configuration values (numeric) */
  config: Map<CONFIG_KEY, number>;
  /** Configuration size values (door_size, window_size) */
  configSizes: Map<string, ResolvedSize>;
  /** Default unit from config (if specified) */
  defaultUnit?: LENGTH_UNIT;
  /** Errors encountered during resolution */
  errors: VariableResolutionError[];
}

export interface VariableResolutionError {
  variableName: string;
  roomName?: string;
  message: string;
  type: "undefined_variable" | "duplicate_definition";
}

/**
 * Collect all variable definitions and config from a floorplan
 */
export function resolveVariables(floorplan: Floorplan): VariableResolutionResult {
  const variables = new Map<string, ResolvedDimension>();
  const config = new Map<CONFIG_KEY, number>();
  const configSizes = new Map<string, ResolvedSize>();
  const errors: VariableResolutionError[] = [];
  let defaultUnit: LENGTH_UNIT | undefined;

  // Process define statements
  for (const define of floorplan.defines) {
    if (variables.has(define.name)) {
      errors.push({
        variableName: define.name,
        message: `Variable '${define.name}' is defined multiple times`,
        type: "duplicate_definition",
      });
    } else {
      variables.set(define.name, {
        width: define.value.width.value,
        height: define.value.height.value,
        widthUnit: define.value.width.unit,
        heightUnit: define.value.height.unit,
      });
    }
  }

  // Process config block
  if (floorplan.config) {
    for (const prop of floorplan.config.properties) {
      if (prop.value !== undefined) {
        config.set(prop.name, prop.value);
      }
      // Handle dimension properties (door_size, window_size)
      if (prop.dimension !== undefined) {
        configSizes.set(prop.name, dimensionToResolvedSize(prop.dimension));
      }
      // Handle default_unit
      if (prop.name === 'default_unit' && prop.unitRef) {
        defaultUnit = prop.unitRef;
      }
      // Note: styleRef properties like 'default_style' are handled separately
    }
  }

  return { variables, config, configSizes, defaultUnit, errors };
}

/**
 * Convert a Dimension AST node to a ResolvedSize
 */
function dimensionToResolvedSize(dimension: Dimension): ResolvedSize {
  return {
    width: dimension.width.value,
    height: dimension.height.value,
    widthUnit: dimension.width.unit,
    heightUnit: dimension.height.unit,
  };
}

/**
 * Get the resolved size for a room
 * Returns the inline dimension or resolves the variable reference
 */
export function getResolvedSize(
  room: Room,
  variables: Map<string, ResolvedDimension>
): ResolvedDimension | undefined {
  // If the room has an inline size, use it
  if (room.size) {
    return { 
      width: room.size.width.value, 
      height: room.size.height.value,
      widthUnit: room.size.width.unit,
      heightUnit: room.size.height.unit,
    };
  }

  // If the room references a variable, look it up
  if (room.sizeRef) {
    return variables.get(room.sizeRef);
  }

  return undefined;
}

/**
 * Validate that all size references in a floorplan are defined
 */
export function validateSizeReferences(
  floorplan: Floorplan,
  variables: Map<string, ResolvedDimension>
): VariableResolutionError[] {
  const errors: VariableResolutionError[] = [];

  function validateRoom(room: Room): void {
    if (room.sizeRef && !variables.has(room.sizeRef)) {
      errors.push({
        variableName: room.sizeRef,
        roomName: room.name,
        message: `Room '${room.name}' references undefined variable '${room.sizeRef}'`,
        type: "undefined_variable",
      });
    }

    // Validate sub-rooms
    for (const subRoom of room.subRooms) {
      validateRoom(subRoom);
    }
  }

  for (const floor of floorplan.floors) {
    for (const room of floor.rooms) {
      validateRoom(room);
    }
  }

  return errors;
}

/**
 * Interface for resolved config values with defaults
 */
export interface ResolvedConfig {
  wallThickness: number;
  doorWidth: number;
  doorHeight: number;
  windowWidth: number;
  windowHeight: number;
  defaultHeight: number;
}

// Default values for config
const CONFIG_DEFAULTS = {
  wallThickness: 0.2,
  doorWidth: 1.0,
  doorHeight: 2.1,
  windowWidth: 1.5,
  windowHeight: 1.5,
  defaultHeight: 3.0,
};

/**
 * Get resolved config with default values
 * Supports both door_size/window_size (preferred) and door_width/door_height (legacy)
 * 
 * Precedence:
 * 1. door_size/window_size dimension property
 * 2. door_width/door_height individual properties
 * 3. Default values
 */
export function getResolvedConfig(
  config: Map<CONFIG_KEY, number>,
  configSizes?: Map<string, ResolvedSize>
): ResolvedConfig {
  // Resolve door dimensions (door_size takes precedence)
  let doorWidth = CONFIG_DEFAULTS.doorWidth;
  let doorHeight = CONFIG_DEFAULTS.doorHeight;
  
  const doorSize = configSizes?.get("door_size");
  if (doorSize) {
    doorWidth = doorSize.width;
    doorHeight = doorSize.height;
  } else {
    // Fallback to individual properties
    doorWidth = config.get("door_width") ?? CONFIG_DEFAULTS.doorWidth;
    doorHeight = config.get("door_height") ?? CONFIG_DEFAULTS.doorHeight;
  }

  // Resolve window dimensions (window_size takes precedence)
  let windowWidth = CONFIG_DEFAULTS.windowWidth;
  let windowHeight = CONFIG_DEFAULTS.windowHeight;
  
  const windowSize = configSizes?.get("window_size");
  if (windowSize) {
    windowWidth = windowSize.width;
    windowHeight = windowSize.height;
  } else {
    // Fallback to individual properties
    windowWidth = config.get("window_width") ?? CONFIG_DEFAULTS.windowWidth;
    windowHeight = config.get("window_height") ?? CONFIG_DEFAULTS.windowHeight;
  }

  return {
    wallThickness: config.get("wall_thickness") ?? CONFIG_DEFAULTS.wallThickness,
    doorWidth,
    doorHeight,
    windowWidth,
    windowHeight,
    defaultHeight: config.get("default_height") ?? CONFIG_DEFAULTS.defaultHeight,
  };
}

/**
 * Get room size, ensuring it exists (either inline or from resolved variables)
 * This is a convenience function for use after validation
 * Returns width/height as numbers (without unit info) for backward compatibility
 * @throws Error if room has no size
 */
export function getRoomSize(
  room: Room,
  variables?: Map<string, ResolvedDimension>
): { width: number; height: number } {
  // If the room has an inline size, use it
  if (room.size) {
    return { width: room.size.width.value, height: room.size.height.value };
  }

  // If the room references a variable, look it up
  if (room.sizeRef && variables) {
    const resolved = variables.get(room.sizeRef);
    if (resolved) {
      return { width: resolved.width, height: resolved.height };
    }
  }

  // If sizeRef but no variables passed, this is likely old code path
  // Return a fallback to avoid breaking existing code
  if (room.sizeRef) {
    throw new Error(`Room '${room.name}' uses variable '${room.sizeRef}' but no variables provided`);
  }

  throw new Error(`Room '${room.name}' has no size defined`);
}

/**
 * Get room size with unit information
 * This is the unit-aware version for contexts that need unit normalization
 * @throws Error if room has no size
 */
export function getRoomSizeWithUnits(
  room: Room,
  variables?: Map<string, ResolvedDimension>
): ResolvedDimension {
  // If the room has an inline size, use it
  if (room.size) {
    return { 
      width: room.size.width.value, 
      height: room.size.height.value,
      widthUnit: room.size.width.unit,
      heightUnit: room.size.height.unit,
    };
  }

  // If the room references a variable, look it up
  if (room.sizeRef && variables) {
    const resolved = variables.get(room.sizeRef);
    if (resolved) {
      return resolved;
    }
  }

  // If sizeRef but no variables passed, this is likely old code path
  if (room.sizeRef) {
    throw new Error(`Room '${room.name}' uses variable '${room.sizeRef}' but no variables provided`);
  }

  throw new Error(`Room '${room.name}' has no size defined`);
}

