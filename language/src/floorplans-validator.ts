import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { FloorplansAstType, Floorplan, Connection, Room, Floor, StyleBlock, StyleProperty, ConfigProperty } from "./generated/ast.js";
import type { FloorplansServices } from "./floorplans-module.js";
import { hasMixedUnitSystems, VALID_UNITS, toMeters, type LengthUnit } from "./diagrams/floorplans/unit-utils.js";
import { resolveFloorPositions } from "./diagrams/floorplans/position-resolver.js";
import { getRoomSize, resolveVariables } from "./diagrams/floorplans/variable-resolver.js";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: FloorplansServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.FloorplansValidator;
  const checks: ValidationChecks<FloorplansAstType> = {
    Floorplan: [
      validator.checkConnectionOverlaps, 
      validator.checkConnectionWallTypes,
      validator.checkStyleReferences,
      validator.checkDuplicateStyleNames,
      validator.checkSharedWallConflicts,
      validator.checkMixedUnitSystems,
      validator.checkRoomHeightExceedsFloor,
      validator.checkDoorPositionWithinSharedWall,
      validator.checkConnectionSizeConstraints,
      validator.checkConflictingDoorSizeConfig
    ],
    StyleProperty: [validator.checkStylePropertyValue],
    ConfigProperty: [validator.checkConfigPropertyValue]
  };
  registry.register(checks, validator);
}

/**
 * Door width as percentage of wall (approximate for overlap detection)
 */
const DOOR_WIDTH_PERCENT = 10; // Single door occupies ~10% of wall
const DOUBLE_DOOR_WIDTH_PERCENT = 20; // Double door occupies ~20% of wall

/**
 * Simple connection info extracted safely from AST
 */
interface SimpleConnection {
  connection: Connection;
  fromRoom: string;
  fromWall: string;
  toRoom: string;
  toWall: string;
  position: number;
  doorWidthPercent: number;
}

/**
 * Implementation of custom validations.
 */
export class FloorplansValidator {
  /**
   * Check for overlapping connections on the same wall.
   * Uses simple string-based comparisons to avoid deep AST traversal.
   */
  checkConnectionOverlaps(floorplan: Floorplan, accept: ValidationAcceptor): void {
    // Extract simple connection data without triggering AST reference resolution
    const connections = this.extractConnections(floorplan);
    
    // Group by wall key (room.wall)
    const wallConnections = new Map<string, SimpleConnection[]>();
    
    for (const conn of connections) {
      // Add "from" side
      const fromKey = `${conn.fromRoom}.${conn.fromWall}`;
      if (!wallConnections.has(fromKey)) {
        wallConnections.set(fromKey, []);
      }
      wallConnections.get(fromKey)!.push(conn);
      
      // Add "to" side
      const toKey = `${conn.toRoom}.${conn.toWall}`;
      if (!wallConnections.has(toKey)) {
        wallConnections.set(toKey, []);
      }
      wallConnections.get(toKey)!.push(conn);
    }
    
    // Check for overlaps on each wall
    const reported = new Set<Connection>();
    
    for (const wallConns of wallConnections.values()) {
      if (wallConns.length < 2) continue;
      
      // Sort by position
      wallConns.sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < wallConns.length; i++) {
        for (let j = i + 1; j < wallConns.length; j++) {
          const c1 = wallConns[i];
          const c2 = wallConns[j];
          
          // Skip if already reported
          if (reported.has(c1.connection) || reported.has(c2.connection)) {
            continue;
          }
          
          // Check for overlap
          if (this.connectionsOverlap(c1, c2)) {
            const isBidirectional = this.isBidirectional(c1, c2);
            const message = isBidirectional
              ? `Overlapping bidirectional connections between ${c1.fromRoom} and ${c1.toRoom}. Remove one connection.`
              : `Overlapping connections at position ${c1.position}% on wall. Use different positions.`;
            
            accept("error", message, {
              node: c1.connection,
              property: "from"
            });
            reported.add(c1.connection);
            reported.add(c2.connection);
          }
        }
      }
    }
  }
  
  /**
   * Extract connection data safely without deep AST traversal
   */
  private extractConnections(floorplan: Floorplan): SimpleConnection[] {
    const result: SimpleConnection[] = [];
    
    for (const connection of floorplan.connections) {
      // Access properties directly without going through references
      const fromRoom = connection.from?.room?.name;
      const fromWall = connection.from?.wall;
      const toRoom = connection.to?.room?.name;
      const toWall = connection.to?.wall;
      
      // Skip incomplete or outside connections
      if (!fromRoom || !fromWall || !toRoom || !toWall) {
        continue;
      }
      if (fromRoom === "outside" || toRoom === "outside") {
        continue;
      }
      
      const position = connection.position ?? 50;
      const doorWidthPercent = connection.doorType === "double-door" 
        ? DOUBLE_DOOR_WIDTH_PERCENT 
        : DOOR_WIDTH_PERCENT;
      
      result.push({
        connection,
        fromRoom,
        fromWall,
        toRoom,
        toWall,
        position,
        doorWidthPercent
      });
    }
    
    return result;
  }
  
  /**
   * Check if two connections overlap based on position and door width
   */
  private connectionsOverlap(c1: SimpleConnection, c2: SimpleConnection): boolean {
    const halfWidth1 = c1.doorWidthPercent / 2;
    const halfWidth2 = c2.doorWidthPercent / 2;
    
    const start1 = c1.position - halfWidth1;
    const end1 = c1.position + halfWidth1;
    const start2 = c2.position - halfWidth2;
    const end2 = c2.position + halfWidth2;
    
    // Ranges overlap if neither is completely before the other
    return !(end1 < start2 || end2 < start1);
  }
  
  /**
   * Check if two connections are bidirectional (A->B and B->A)
   */
  private isBidirectional(c1: SimpleConnection, c2: SimpleConnection): boolean {
    return (c1.fromRoom === c2.toRoom && c1.toRoom === c2.fromRoom) ||
           (c1.fromRoom === c2.fromRoom && c1.toRoom === c2.toRoom);
  }
  
  /**
   * Check that connection walls are compatible (both should be solid for doors to render correctly)
   * Note: 'opening' connections don't require solid walls - they override wall types
   */
  checkConnectionWallTypes(floorplan: Floorplan, accept: ValidationAcceptor): void {
    // Build a map of room wall types
    const wallTypes = this.buildWallTypeMap(floorplan);
    
    for (const connection of floorplan.connections) {
      const fromRoom = connection.from?.room?.name;
      const fromWall = connection.from?.wall;
      const toRoom = connection.to?.room?.name;
      const toWall = connection.to?.wall;
      
      // Skip incomplete or outside connections
      if (!fromRoom || !fromWall || !toRoom || !toWall) continue;
      if (fromRoom === "outside" || toRoom === "outside") continue;
      
      // Skip wall type checks for 'opening' connections - they override wall types
      // Openings create a doorless passage regardless of wall specs
      if (connection.doorType === "opening") continue;
      
      // Check wall types
      const fromWallType = wallTypes.get(`${fromRoom}.${fromWall}`);
      const toWallType = wallTypes.get(`${toRoom}.${toWall}`);
      
      // Warn if either wall is not solid
      if (fromWallType && fromWallType !== "solid") {
        accept("warning", 
          `Connection references ${fromRoom}.${fromWall} which is '${fromWallType}', not 'solid'. ` +
          `Door openings work best when both walls are 'solid'. Consider changing the wall type.`,
          { node: connection, property: "from" }
        );
      }
      
      if (toWallType && toWallType !== "solid") {
        accept("warning", 
          `Connection references ${toRoom}.${toWall} which is '${toWallType}', not 'solid'. ` +
          `Door openings work best when both walls are 'solid'. Consider changing the wall type.`,
          { node: connection, property: "to" }
        );
      }
      
      // Additional warning for mismatched wall types
      if (fromWallType && toWallType && fromWallType !== toWallType) {
        accept("warning",
          `Wall type mismatch: ${fromRoom}.${fromWall} is '${fromWallType}' but ${toRoom}.${toWall} is '${toWallType}'. ` +
          `This may cause rendering issues in 3D viewer. Both walls should have the same type.`,
          { node: connection }
        );
      }
    }
  }
  
  /**
   * Build a map of wall types for all rooms
   */
  private buildWallTypeMap(floorplan: Floorplan): Map<string, string> {
    const wallTypes = new Map<string, string>();
    
    for (const floor of floorplan.floors) {
      this.addRoomWallTypes(floor, wallTypes);
    }
    
    return wallTypes;
  }
  
  /**
   * Add wall types for all rooms in a floor
   */
  private addRoomWallTypes(floor: Floor, wallTypes: Map<string, string>): void {
    for (const room of floor.rooms) {
      this.addRoomWalls(room, wallTypes);
    }
  }
  
  /**
   * Add wall types for a room and its sub-rooms
   */
  private addRoomWalls(room: Room, wallTypes: Map<string, string>): void {
    if (room.walls?.specifications) {
      for (const spec of room.walls.specifications) {
        const key = `${room.name}.${spec.direction}`;
        wallTypes.set(key, spec.type);
      }
    }
    
    // Process sub-rooms
    for (const subRoom of room.subRooms) {
      this.addRoomWalls(subRoom, wallTypes);
    }
  }
  
  /**
   * Check that all style references in rooms point to defined styles.
   * Also validates default_style in config.
   */
  checkStyleReferences(floorplan: Floorplan, accept: ValidationAcceptor): void {
    // Build set of defined style names
    const definedStyles = new Set<string>();
    for (const style of floorplan.styles) {
      definedStyles.add(style.name);
    }
    
    // Check room style references
    for (const floor of floorplan.floors) {
      this.checkRoomStyleRefs(floor.rooms, definedStyles, accept);
    }
    
    // Check default_style in config
    if (floorplan.config) {
      for (const prop of floorplan.config.properties) {
        if (prop.name === 'default_style' && prop.styleRef) {
          if (!definedStyles.has(prop.styleRef)) {
            accept("error", 
              `Config references undefined style '${prop.styleRef}'. Define it with 'style ${prop.styleRef} { ... }'.`,
              { node: prop, property: "styleRef" }
            );
          }
        }
      }
    }
  }
  
  /**
   * Recursively check room style references
   */
  private checkRoomStyleRefs(rooms: Room[], definedStyles: Set<string>, accept: ValidationAcceptor): void {
    for (const room of rooms) {
      if (room.styleRef && !definedStyles.has(room.styleRef)) {
        accept("error", 
          `Room '${room.name}' references undefined style '${room.styleRef}'. Define it with 'style ${room.styleRef} { ... }'.`,
          { node: room, property: "styleRef" }
        );
      }
      
      // Check sub-rooms
      if (room.subRooms.length > 0) {
        this.checkRoomStyleRefs(room.subRooms, definedStyles, accept);
      }
    }
  }
  
  /**
   * Check for duplicate style names
   */
  checkDuplicateStyleNames(floorplan: Floorplan, accept: ValidationAcceptor): void {
    const seenNames = new Map<string, StyleBlock>();
    
    for (const style of floorplan.styles) {
      const existing = seenNames.get(style.name);
      if (existing) {
        accept("error", 
          `Duplicate style name '${style.name}'. Style names must be unique.`,
          { node: style, property: "name" }
        );
      } else {
        seenNames.set(style.name, style);
      }
    }
  }
  
  /**
   * Check for conflicts on shared walls between adjacent rooms.
   * Detects wall type mismatches and height differences.
   */
  checkSharedWallConflicts(floorplan: Floorplan, accept: ValidationAcceptor): void {
    for (const floor of floorplan.floors) {
      this.checkFloorSharedWalls(floor, floorplan, accept);
    }
  }

  /**
   * Check shared walls within a floor
   */
  private checkFloorSharedWalls(floor: Floor, floorplan: Floorplan, accept: ValidationAcceptor): void {
    const rooms = this.collectAllRooms(floor);
    const roomMap = new Map<string, Room>();
    for (const room of rooms) {
      roomMap.set(room.name, room);
    }

    // Get room bounds for adjacency detection with proper position resolution
    const roomBounds = this.computeRoomBounds(rooms, floorplan, floor);

    // Check each pair of rooms for shared walls
    const checkedPairs = new Set<string>();
    
    for (const [roomAName, boundsA] of roomBounds) {
      for (const [roomBName, boundsB] of roomBounds) {
        if (roomAName === roomBName) continue;
        
        // Skip if already checked this pair
        const pairKey = [roomAName, roomBName].sort().join('|');
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const roomA = roomMap.get(roomAName);
        const roomB = roomMap.get(roomBName);
        if (!roomA || !roomB) continue;

        // Check if rooms share a wall
        const sharedWall = this.findSharedWall(boundsA, boundsB);
        if (!sharedWall) continue;

        // Check wall type conflicts
        const wallTypeA = this.getRoomWallType(roomA, sharedWall.wallA);
        const wallTypeB = this.getRoomWallType(roomB, sharedWall.wallB);

        if (wallTypeA && wallTypeB && wallTypeA !== wallTypeB) {
          // Check if there's an 'opening' connection between these walls
          // Opening connections override wall type conflicts
          const hasOpeningConnection = this.hasOpeningConnection(
            floorplan, roomAName, sharedWall.wallA, roomBName, sharedWall.wallB
          );
          
          if (!hasOpeningConnection) {
            accept("warning", 
              `Shared wall conflict: ${roomAName}.${sharedWall.wallA} is '${wallTypeA}' but ${roomBName}.${sharedWall.wallB} is '${wallTypeB}'. ` +
              `Adjacent walls should have matching types for consistent rendering.`,
              { node: roomA }
            );
          }
        }

        // Check height conflicts
        const heightA = this.getRoomHeight(roomA, floorplan, floor);
        const heightB = this.getRoomHeight(roomB, floorplan, floor);
        
        if (heightA !== heightB) {
          accept("warning",
            `Height mismatch at shared wall: ${roomAName} (${heightA.toFixed(2)}m) and ${roomBName} (${heightB.toFixed(2)}m) have different heights. ` +
            `This may cause visual inconsistencies in 3D rendering.`,
            { node: roomA }
          );
        }
      }
    }
  }

  /**
   * Collect all rooms from a floor including sub-rooms
   */
  private collectAllRooms(floor: Floor): Room[] {
    const result: Room[] = [];
    
    const collect = (rooms: Room[]) => {
      for (const room of rooms) {
        result.push(room);
        if (room.subRooms.length > 0) {
          collect(room.subRooms);
        }
      }
    };
    
    collect(floor.rooms);
    return result;
  }

  /**
   * Compute room bounds for adjacency detection using proper position resolution
   */
  private computeRoomBounds(rooms: Room[], floorplan: Floorplan, floor?: Floor): Map<string, { x: number; z: number; width: number; height: number }> {
    const bounds = new Map<string, { x: number; z: number; width: number; height: number }>();
    
    // Resolve variables for size calculation
    const variableResolution = resolveVariables(floorplan);
    const variables = variableResolution.variables;
    
    // If floor is provided, use proper position resolution
    let resolvedPositions = new Map<string, { x: number; y: number }>();
    if (floor) {
      const positionResult = resolveFloorPositions(floor, variables);
      resolvedPositions = positionResult.positions;
    }

    // Calculate bounds for each room
    for (const room of rooms) {
      let x = 0, z = 0;
      
      // Get resolved position if available, otherwise use absolute position or default to 0,0
      const resolved = resolvedPositions.get(room.name);
      if (resolved) {
        x = resolved.x;
        z = resolved.y;
      } else if (room.position) {
        x = room.position.x.value;
        z = room.position.y.value;
      }
      
      // Get room size
      const size = getRoomSize(room, variables);
      const width = size.width;
      const height = size.height;

      bounds.set(room.name, { x, z, width, height });
    }

    return bounds;
  }

  /**
   * Calculate what portion of a wall is actually shared between two rooms.
   * Returns a segment as start/end ratios (0.0 to 1.0) along the fromRoom's wall.
   */
  private calculateSharedWallSegment(
    fromBounds: { x: number; z: number; width: number; height: number },
    fromWall: string,
    toBounds: { x: number; z: number; width: number; height: number },
    toWall: string
  ): { start: number; end: number } | null {
    const tolerance = 0.1;

    // Calculate wall edges
    const fromEdges = {
      left: fromBounds.x,
      right: fromBounds.x + fromBounds.width,
      top: fromBounds.z,
      bottom: fromBounds.z + fromBounds.height
    };

    const toEdges = {
      left: toBounds.x,
      right: toBounds.x + toBounds.width,
      top: toBounds.z,
      bottom: toBounds.z + toBounds.height
    };

    // Check horizontal walls (top/bottom)
    if ((fromWall === "top" || fromWall === "bottom") && 
        (toWall === "top" || toWall === "bottom")) {
      // Check if they're adjacent vertically
      const fromEdge = fromWall === "top" ? fromEdges.top : fromEdges.bottom;
      const toEdge = toWall === "top" ? toEdges.top : toEdges.bottom;
      
      if (Math.abs(fromEdge - toEdge) > tolerance) return null;

      // Calculate overlapping horizontal segment
      const overlapStart = Math.max(fromEdges.left, toEdges.left);
      const overlapEnd = Math.min(fromEdges.right, toEdges.right);
      
      if (overlapEnd <= overlapStart) return null; // No overlap

      // Convert to ratios along fromRoom's wall
      const start = (overlapStart - fromEdges.left) / fromBounds.width;
      const end = (overlapEnd - fromEdges.left) / fromBounds.width;
      
      return { start: Math.max(0, start), end: Math.min(1, end) };
    }

    // Check vertical walls (left/right)
    if ((fromWall === "left" || fromWall === "right") && 
        (toWall === "left" || toWall === "right")) {
      // Check if they're adjacent horizontally
      const fromEdge = fromWall === "left" ? fromEdges.left : fromEdges.right;
      const toEdge = toWall === "left" ? toEdges.left : toEdges.right;
      
      if (Math.abs(fromEdge - toEdge) > tolerance) return null;

      // Calculate overlapping vertical segment
      const overlapStart = Math.max(fromEdges.top, toEdges.top);
      const overlapEnd = Math.min(fromEdges.bottom, toEdges.bottom);
      
      if (overlapEnd <= overlapStart) return null; // No overlap

      // Convert to ratios along fromRoom's wall
      const start = (overlapStart - fromEdges.top) / fromBounds.height;
      const end = (overlapEnd - fromEdges.top) / fromBounds.height;
      
      return { start: Math.max(0, start), end: Math.min(1, end) };
    }

    // Perpendicular walls don't share a boundary
    return null;
  }

  /**
   * Find if two rooms share a wall and return the wall directions
   */
  private findSharedWall(
    boundsA: { x: number; z: number; width: number; height: number },
    boundsB: { x: number; z: number; width: number; height: number },
    tolerance: number = 0.5
  ): { wallA: string; wallB: string } | null {
    // Check if A's right wall touches B's left wall
    if (Math.abs((boundsA.x + boundsA.width) - boundsB.x) < tolerance) {
      // Check vertical overlap
      if (boundsA.z < boundsB.z + boundsB.height && boundsA.z + boundsA.height > boundsB.z) {
        return { wallA: 'right', wallB: 'left' };
      }
    }

    // Check if A's left wall touches B's right wall
    if (Math.abs(boundsA.x - (boundsB.x + boundsB.width)) < tolerance) {
      if (boundsA.z < boundsB.z + boundsB.height && boundsA.z + boundsA.height > boundsB.z) {
        return { wallA: 'left', wallB: 'right' };
      }
    }

    // Check if A's bottom wall touches B's top wall
    if (Math.abs((boundsA.z + boundsA.height) - boundsB.z) < tolerance) {
      // Check horizontal overlap
      if (boundsA.x < boundsB.x + boundsB.width && boundsA.x + boundsA.width > boundsB.x) {
        return { wallA: 'bottom', wallB: 'top' };
      }
    }

    // Check if A's top wall touches B's bottom wall
    if (Math.abs(boundsA.z - (boundsB.z + boundsB.height)) < tolerance) {
      if (boundsA.x < boundsB.x + boundsB.width && boundsA.x + boundsA.width > boundsB.x) {
        return { wallA: 'top', wallB: 'bottom' };
      }
    }

    return null;
  }

  /**
   * Get the wall type for a specific direction
   */
  private getRoomWallType(room: Room, direction: string): string | undefined {
    if (!room.walls?.specifications) return undefined;
    
    const spec = room.walls.specifications.find(s => s.direction === direction);
    return spec?.type;
  }

  /**
   * Check if there's an 'opening' connection between two rooms on specific walls
   */
  private hasOpeningConnection(
    floorplan: Floorplan,
    roomA: string,
    wallA: string,
    roomB: string,
    wallB: string
  ): boolean {
    for (const conn of floorplan.connections) {
      if (conn.doorType !== "opening") continue;
      
      const fromRoom = conn.from?.room?.name;
      const fromWall = conn.from?.wall;
      const toRoom = conn.to?.room?.name;
      const toWall = conn.to?.wall;
      
      // Check both directions (A->B and B->A)
      const matchesAB = fromRoom === roomA && fromWall === wallA && toRoom === roomB && toWall === wallB;
      const matchesBA = fromRoom === roomB && fromWall === wallB && toRoom === roomA && toWall === wallA;
      
      if (matchesAB || matchesBA) return true;
    }
    return false;
  }

  /**
   * Get room height with fallback to floor/config default, normalized to meters
   */
  private getRoomHeight(room: Room, floorplan: Floorplan, floor: Floor): number {
    const defaultUnit = this.getDefaultUnit(floorplan);
    
    // Check room's explicit height
    if (room.height !== undefined) {
      const unit = (room.height.unit || defaultUnit) as LengthUnit;
      return toMeters(room.height.value, unit);
    }
    
    // Check floor's height
    if (floor.height !== undefined) {
      const unit = (floor.height.unit || defaultUnit) as LengthUnit;
      return toMeters(floor.height.value, unit);
    }
    
    // Check config for default_height
    if (floorplan.config) {
      for (const prop of floorplan.config.properties) {
        if (prop.name === 'default_height' && prop.value !== undefined) {
          // Config default_height uses default_unit
          return toMeters(prop.value, defaultUnit);
        }
      }
    }
    
    // Return default (3.35m)
    return 3.35;
  }
  
  /**
   * Get the default unit from config, or 'm' if not specified
   */
  private getDefaultUnit(floorplan: Floorplan): LengthUnit {
    if (floorplan.config) {
      for (const prop of floorplan.config.properties) {
        if (prop.name === 'default_unit' && prop.unitRef) {
          return prop.unitRef as LengthUnit;
        }
      }
    }
    return 'm';
  }

  /**
   * Validate style property values (hex colors, numeric ranges)
   */
  checkStylePropertyValue(property: StyleProperty, accept: ValidationAcceptor): void {
    const colorProps = ['floor_color', 'wall_color'];
    const numericProps = ['roughness', 'metalness'];
    
    // Validate hex color format
    if (colorProps.includes(property.name)) {
      if (property.stringValue) {
        const colorValue = property.stringValue.replace(/^["']|["']$/g, ''); // Remove quotes
        const hexPattern = /^#[0-9A-Fa-f]{6}$/;
        if (!hexPattern.test(colorValue)) {
          accept("error", 
            `Invalid color format '${colorValue}' for ${property.name}. Use hex format like "#RRGGBB".`,
            { node: property, property: "stringValue" }
          );
        }
      } else if (property.numberValue !== undefined) {
        accept("error", 
          `${property.name} must be a hex color string (e.g., "#RRGGBB"), not a number.`,
          { node: property, property: "numberValue" }
        );
      }
    }
    
    // Validate numeric range for PBR properties
    if (numericProps.includes(property.name)) {
      if (property.numberValue !== undefined) {
        if (property.numberValue < 0 || property.numberValue > 1) {
          accept("error", 
            `${property.name} must be between 0 and 1, got ${property.numberValue}.`,
            { node: property, property: "numberValue" }
          );
        }
      } else if (property.stringValue) {
        accept("error", 
          `${property.name} must be a number between 0 and 1, not a string.`,
          { node: property, property: "stringValue" }
        );
      }
    }
    
    // Validate texture properties are strings
    const textureProps = ['floor_texture', 'wall_texture'];
    if (textureProps.includes(property.name)) {
      if (property.numberValue !== undefined) {
        accept("error", 
          `${property.name} must be a texture path string (e.g., "textures/wood.jpg"), not a number.`,
          { node: property, property: "numberValue" }
        );
      }
    }
  }

  /**
   * Check for mixed unit systems (metric vs imperial) and emit a warning
   */
  checkMixedUnitSystems(floorplan: Floorplan, accept: ValidationAcceptor): void {
    if (hasMixedUnitSystems(floorplan)) {
      accept("warning",
        `Mixed unit systems detected: This floorplan uses both metric (m, cm, mm) and imperial (ft, in) units. ` +
        `Consider using a consistent unit system for clarity.`,
        { node: floorplan }
      );
    }
  }

  /**
   * Check that no room height exceeds its floor height.
   * Rooms taller than their floor will clip through the floor above in 3D rendering.
   */
  checkRoomHeightExceedsFloor(floorplan: Floorplan, accept: ValidationAcceptor): void {
    const defaultHeight = this.getConfigDefaultHeight(floorplan);
    
    for (const floor of floorplan.floors) {
      // Get floor height (explicit or default)
      const floorHeight = floor.height?.value ?? defaultHeight;
      
      // Check each room in the floor
      const rooms = this.collectAllRooms(floor);
      for (const room of rooms) {
        const roomHeight = room.height?.value ?? defaultHeight;
        
        if (roomHeight > floorHeight) {
          accept("warning",
            `Room '${room.name}' has height ${roomHeight} which exceeds floor '${floor.id}' height of ${floorHeight}. ` +
            `This will cause the room to clip through the floor above in 3D rendering. ` +
            `Consider increasing the floor height or reducing the room height.`,
            { node: room, property: "height" }
          );
        }
      }
    }
  }

  /**
   * Get default_height from config
   */
  private getConfigDefaultHeight(floorplan: Floorplan): number {
    if (floorplan.config) {
      for (const prop of floorplan.config.properties) {
        if (prop.name === 'default_height' && prop.value !== undefined) {
          return prop.value;
        }
      }
    }
    return 3.35; // Default fallback (meters)
  }

  /**
   * Validate config property values
   */
  checkConfigPropertyValue(property: ConfigProperty, accept: ValidationAcceptor): void {
    // Validate default_unit has a valid value
    if (property.name === 'default_unit') {
      // The grammar restricts unitRef to LENGTH_UNIT, but we add a defensive check
      // In case someone tries to use a number or styleRef for default_unit
      if (property.value !== undefined) {
        accept("error",
          `default_unit must be a unit symbol (${VALID_UNITS.join(', ')}), not a number.`,
          { node: property, property: "value" }
        );
      }
      if (property.styleRef !== undefined) {
        accept("error",
          `default_unit must be a unit symbol (${VALID_UNITS.join(', ')}), not an identifier. ` +
          `Valid units: ${VALID_UNITS.join(', ')}`,
          { node: property, property: "styleRef" }
        );
      }
    }
  }

  /**
   * Check that connections reference walls that actually share a boundary.
   * 
   * Note: Door position percentages (at N%) are NOT validated here because
   * the renderer interprets them as percentages of the SHARED wall segment,
   * not the full wall. This allows intuitive behavior where `at 50%` always
   * centers the door on the shared boundary regardless of room size differences.
   * 
   * See project.md "Door Position Calculation" for detailed documentation.
   */
  checkDoorPositionWithinSharedWall = (floorplan: Floorplan, accept: ValidationAcceptor): void => {
    // Process each floor
    for (const floor of floorplan.floors) {
      const allRooms = this.collectAllRooms(floor);
      const bounds = this.computeRoomBounds(allRooms, floorplan, floor);

      // Check each connection
      for (const conn of floorplan.connections) {
        const fromRoomName = conn.from.room?.name;
        const toRoomName = conn.to.room?.name;
        if (!fromRoomName || !toRoomName) continue;

        const fromBounds = bounds.get(fromRoomName);
        const toBounds = bounds.get(toRoomName);
        if (!fromBounds || !toBounds) continue;

        const fromWall = conn.from.wall || "unknown";
        const toWall = conn.to.wall || "unknown";

        // Calculate shared wall segment
        const sharedSegment = this.calculateSharedWallSegment(
          fromBounds, fromWall,
          toBounds, toWall
        );

        if (!sharedSegment) {
          // Rooms don't share this wall boundary - this is a real problem
          accept("warning",
            `Connection from ${fromRoomName}.${fromWall} to ${toRoomName}.${toWall} connects walls that don't share a boundary. The door may not align properly with the rooms.`,
            { node: conn }
          );
        }
        // Note: Door position validation removed - renderer interprets position
        // as percentage of shared segment, so any 0-100% value is valid
      }
    }
  }

  /**
   * Check that connection size constraints are satisfied:
   * 1. Connection width should not exceed the wall length
   * 2. Connection height should not exceed room height (unless fullHeight is used)
   */
  checkConnectionSizeConstraints = (floorplan: Floorplan, accept: ValidationAcceptor): void => {
    for (const floor of floorplan.floors) {
      const allRooms = this.collectAllRooms(floor);
      const bounds = this.computeRoomBounds(allRooms, floorplan, floor);

      for (const conn of floorplan.connections) {
        // Skip connections without explicit size
        if (!conn.size) continue;

        const fromRoomName = conn.from.room?.name;
        const toRoomName = conn.to.room?.name;
        if (!fromRoomName || !toRoomName) continue;

        const fromBounds = bounds.get(fromRoomName);
        const toBounds = bounds.get(toRoomName);
        if (!fromBounds || !toBounds) continue;

        const fromWall = conn.from.wall || "unknown";
        const toWall = conn.to.wall || "unknown";

        // Calculate shared wall segment
        const sharedSegment = this.calculateSharedWallSegment(
          fromBounds, fromWall,
          toBounds, toWall
        );

        if (!sharedSegment) continue; // Already reported by checkDoorPositionWithinSharedWall

        // Get the length of the shared wall segment
        let wallLength = 0;
        if (fromWall === "top" || fromWall === "bottom") {
          wallLength = fromBounds.width * (sharedSegment.end - sharedSegment.start);
        } else {
          wallLength = fromBounds.height * (sharedSegment.end - sharedSegment.start);
        }

        // Get connection width
        const connWidth = conn.size.width.value;

        // Validate width constraint
        if (connWidth > wallLength) {
          accept("warning",
            `Connection width ${connWidth}${conn.size.width.unit || ''} exceeds shared wall length ${wallLength.toFixed(2)}. The connection may not fit properly.`,
            { node: conn, property: "size" }
          );
        }

        // Validate height constraint (if not fullHeight)
        if (!conn.size.fullHeight && conn.size.height) {
          // Normalize connection height to meters
          const defaultUnit = this.getDefaultUnit(floorplan);
          const connHeightUnit = (conn.size.height.unit || defaultUnit) as LengthUnit;
          const connHeightMeters = toMeters(conn.size.height.value, connHeightUnit);
          
          // Get room heights (already in meters from getRoomHeight)
          const fromRoomHeight = this.getRoomHeight(this.findRoomByName(allRooms, fromRoomName)!, floorplan, floor);
          const toRoomHeight = this.getRoomHeight(this.findRoomByName(allRooms, toRoomName)!, floorplan, floor);
          const minRoomHeight = Math.min(fromRoomHeight, toRoomHeight);

          if (connHeightMeters > minRoomHeight) {
            accept("warning",
              `Connection height ${conn.size.height.value}${conn.size.height.unit || defaultUnit} exceeds room height ${minRoomHeight.toFixed(2)}m. The connection may not fit properly.`,
              { node: conn, property: "size" }
            );
          }
        }
      }
    }
  }

  /**
   * Warn if both door_size/window_size and door_width/door_height or window_width/window_height
   * are specified in config, as this creates ambiguity about which should take precedence.
   */
  checkConflictingDoorSizeConfig = (floorplan: Floorplan, accept: ValidationAcceptor): void => {
    if (!floorplan.config) return;

    const configProps = new Map<string, ConfigProperty>();
    for (const prop of floorplan.config.properties) {
      configProps.set(prop.name, prop);
    }

    // Check door configuration
    const doorSize = configProps.get("door_size");
    const doorWidth = configProps.get("door_width");
    const doorHeight = configProps.get("door_height");

    if (doorSize && (doorWidth || doorHeight)) {
      const conflictingProps = [];
      if (doorWidth) conflictingProps.push("door_width");
      if (doorHeight) conflictingProps.push("door_height");
      
      accept("warning",
        `Config specifies both 'door_size' and ${conflictingProps.join(", ")}. The 'door_size' property takes precedence, making ${conflictingProps.join(", ")} redundant.`,
        { node: doorSize }
      );
    }

    // Check window configuration
    const windowSize = configProps.get("window_size");
    const windowWidth = configProps.get("window_width");
    const windowHeight = configProps.get("window_height");

    if (windowSize && (windowWidth || windowHeight)) {
      const conflictingProps = [];
      if (windowWidth) conflictingProps.push("window_width");
      if (windowHeight) conflictingProps.push("window_height");
      
      accept("warning",
        `Config specifies both 'window_size' and ${conflictingProps.join(", ")}. The 'window_size' property takes precedence, making ${conflictingProps.join(", ")} redundant.`,
        { node: windowSize }
      );
    }
  }

  /**
   * Helper to find a room by name
   */
  private findRoomByName(rooms: Room[], name: string): Room | undefined {
    return rooms.find(r => r.name === name);
  }
}

/**
 * Standalone validation function for use outside Langium's validation framework.
 * Can be called manually from rendering code if needed.
 */
export function validateConnectionOverlaps(floorplan: Floorplan): string[] {
  const errors: string[] = [];
  const validator = new FloorplansValidator();
  
  validator.checkConnectionOverlaps(floorplan, (severity, message) => {
    if (severity === "error") {
      errors.push(message);
    }
  });
  
  return errors;
}
