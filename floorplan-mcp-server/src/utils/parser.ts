import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import {
  createFloorplansServices,
  type Floorplan,
  type Room,
  resolveFloorPositions,
  resolveVariables,
  validateSizeReferences,
  getRoomSize,
  type ResolvedPosition,
} from "floorplan-language";

const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  document: LangiumDocument<Floorplan> | null;
  errors: ParseError[];
}

export interface ValidationError {
  type: 'parse' | 'circular_dependency' | 'missing_reference' | 'no_position' | 'connection' | 'undefined_variable' | 'duplicate_definition';
  message: string;
  roomName?: string;
  variableName?: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  type: 'overlap' | 'wall_type';
  message: string;
  rooms?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export async function parseFloorplan(dsl: string): Promise<ParseResult> {
  const document = await parse(dsl);
  const errors: ParseError[] = [];

  for (const error of document.parseResult.parserErrors) {
    errors.push({
      message: error.message,
      line: error.token?.startLine,
      column: error.token?.startColumn,
    });
  }

  for (const error of document.parseResult.lexerErrors) {
    errors.push({
      message: error.message,
      line: error.line,
      column: error.column,
    });
  }

  if (errors.length > 0) {
    return { document: null, errors };
  }

  return { document, errors: [] };
}

/**
 * Validate a floorplan including position resolution and Langium validations
 * Returns parse errors, semantic errors, and connection validation errors/warnings
 */
export async function validateFloorplan(dsl: string): Promise<ValidationResult> {
  const parseResult = await parseFloorplan(dsl);
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Convert parse errors to validation errors
  for (const parseError of parseResult.errors) {
    errors.push({
      type: 'parse',
      message: parseError.message,
      line: parseError.line,
      column: parseError.column,
    });
  }

  // If parsing failed, return early
  if (!parseResult.document) {
    return { valid: false, errors, warnings };
  }

  // Run Langium validation framework (includes connection overlap and wall type checks)
  await services.shared.workspace.DocumentBuilder.build([parseResult.document], { validation: true });
  const diagnostics = parseResult.document.diagnostics ?? [];
  
  for (const diagnostic of diagnostics) {
    const line = diagnostic.range?.start?.line ? diagnostic.range.start.line + 1 : undefined;
    const column = diagnostic.range?.start?.character ? diagnostic.range.start.character + 1 : undefined;
    
    if (diagnostic.severity === 1) {
      // Error
      errors.push({
        type: 'connection',
        message: diagnostic.message,
        line,
        column,
      });
    } else if (diagnostic.severity === 2) {
      // Warning
      warnings.push({
        type: 'wall_type',
        message: diagnostic.message,
      });
    }
  }

  // Run variable resolution
  const floorplan = parseResult.document.parseResult.value;
  const variableResolution = resolveVariables(floorplan);
  
  // Convert variable resolution errors
  for (const err of variableResolution.errors) {
    errors.push({
      type: err.type,
      message: err.message,
      variableName: err.variableName,
      roomName: err.roomName,
    });
  }
  
  // Validate size references
  const sizeRefErrors = validateSizeReferences(floorplan, variableResolution.variables);
  for (const err of sizeRefErrors) {
    errors.push({
      type: err.type,
      message: err.message,
      variableName: err.variableName,
      roomName: err.roomName,
    });
  }

  // Run position resolution for each floor to detect semantic errors
  for (const floor of floorplan.floors) {
    const resolution = resolveFloorPositions(floor, variableResolution.variables);

    // Convert position resolution errors
    for (const err of resolution.errors) {
      errors.push({
        type: err.type,
        message: err.message,
        roomName: err.roomName,
      });
    }

    // Convert overlap warnings
    for (const warn of resolution.warnings) {
      warnings.push({
        type: 'overlap',
        message: `Rooms "${warn.room1}" and "${warn.room2}" overlap`,
        rooms: [warn.room1, warn.room2],
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface RoomMetadata {
  name: string;
  /** Explicit position (if specified in DSL) */
  position?: { x: number; y: number };
  /** Resolved position (computed from relative positioning) */
  resolvedPosition?: { x: number; y: number };
  size: { width: number; height: number };
  /** If size was defined via variable reference */
  sizeRef?: string;
  label?: string;
  walls: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  /** Relative positioning info (if specified) */
  relativePosition?: {
    direction: string;
    reference: string;
    gap?: number;
    alignment?: string;
  };
  subRooms?: RoomMetadata[];
}

export function extractRoomMetadata(
  room: Room,
  resolvedPositions?: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>
): RoomMetadata {
  // Extract wall types from specifications array
  const getWallType = (direction: string): string => {
    const spec = room.walls.specifications.find(
      (s) => s.direction === direction
    );
    return spec?.type || "solid";
  };

  // Get room size (either inline or from variable)
  const size = getRoomSize(room, variables);

  const metadata: RoomMetadata = {
    name: room.name,
    size: {
      width: size.width,
      height: size.height,
    },
    walls: {
      top: getWallType("top"),
      right: getWallType("right"),
      bottom: getWallType("bottom"),
      left: getWallType("left"),
    },
  };

  // Add sizeRef if room uses a variable
  if (room.sizeRef) {
    metadata.sizeRef = room.sizeRef;
  }

  // Add explicit position if present
  if (room.position) {
    metadata.position = {
      x: room.position.x.value,
      y: room.position.y.value,
    };
  }

  // Add resolved position if available
  const resolved = resolvedPositions?.get(room.name);
  if (resolved) {
    metadata.resolvedPosition = {
      x: resolved.x,
      y: resolved.y,
    };
  }

  // Add relative positioning info if present
  if (room.relativePosition) {
    metadata.relativePosition = {
      direction: room.relativePosition.direction,
      reference: room.relativePosition.reference,
    };
    if (room.relativePosition.gap !== undefined) {
      metadata.relativePosition.gap = room.relativePosition.gap.value;
    }
    if (room.relativePosition.alignment) {
      metadata.relativePosition.alignment = room.relativePosition.alignment;
    }
  }

  if (room.label) {
    metadata.label = room.label;
  }

  if (room.subRooms && room.subRooms.length > 0) {
    metadata.subRooms = room.subRooms.map(r => extractRoomMetadata(r, resolvedPositions, variables));
  }

  return metadata;
}

export function extractAllRoomMetadata(
  document: LangiumDocument<Floorplan>
): RoomMetadata[] {
  const floorplan = document.parseResult.value;
  const rooms: RoomMetadata[] = [];

  // Resolve variables first
  const variableResolution = resolveVariables(floorplan);
  const variables = variableResolution.variables;

  for (const floor of floorplan.floors) {
    // Resolve positions for this floor
    const resolution = resolveFloorPositions(floor, variables);
    const resolvedPositions = resolution.positions;
    
    for (const room of floor.rooms) {
      rooms.push(extractRoomMetadata(room, resolvedPositions, variables));
    }
  }

  return rooms;
}

