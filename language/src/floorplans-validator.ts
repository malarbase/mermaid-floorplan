import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { FloorplansAstType, Floorplan, Connection, Room, Floor } from "./generated/ast.js";
import type { FloorplansServices } from "./floorplans-module.js";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: FloorplansServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.FloorplansValidator;
  const checks: ValidationChecks<FloorplansAstType> = {
    Floorplan: [validator.checkConnectionOverlaps, validator.checkConnectionWallTypes]
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
