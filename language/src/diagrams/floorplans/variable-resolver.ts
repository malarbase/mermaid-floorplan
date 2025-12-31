/**
 * Variable resolver for floorplan DSL
 * Resolves dimension variables and config defaults
 */

import type { CONFIG_KEY, Floorplan, Room, LENGTH_UNIT } from "../../generated/ast.js";

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
 * Result of variable resolution
 */
export interface VariableResolutionResult {
  /** Map of variable name to resolved dimension */
  variables: Map<string, ResolvedDimension>;
  /** Configuration values */
  config: Map<CONFIG_KEY, number>;
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
      // Handle default_unit
      if (prop.name === 'default_unit' && prop.unitRef) {
        defaultUnit = prop.unitRef;
      }
      // Note: styleRef properties like 'default_style' are handled separately
    }
  }

  return { variables, config, defaultUnit, errors };
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
  windowWidth: number;
  defaultHeight: number;
}

/**
 * Get resolved config with default values
 */
export function getResolvedConfig(
  config: Map<CONFIG_KEY, number>
): ResolvedConfig {
  return {
    wallThickness: config.get("wall_thickness") ?? 0.2,
    doorWidth: config.get("door_width") ?? 1.0,
    windowWidth: config.get("window_width") ?? 1.5,
    defaultHeight: config.get("default_height") ?? 3.0,
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

