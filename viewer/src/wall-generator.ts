/**
 * Wall geometry generation and CSG operations
 * 
 * Supports wall ownership detection and per-face materials for shared walls.
 */

import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { calculatePositionWithFallback, type RoomBounds } from 'floorplans-language';
// Import shared types and utilities from floorplan-3d-core
import type { JsonWall, JsonRoom, JsonConnection, JsonConfig } from 'floorplan-3d-core';
import { 
  DIMENSIONS, MaterialFactory,
  type ViewerTheme, type MaterialSet, type MaterialStyle,
  // Connection matching utilities from core
  findMatchingConnections, shouldRenderConnection,
} from 'floorplan-3d-core';
import { DoorRenderer } from './door-renderer';
import { 
  analyzeWallOwnership, 
  WallSegment,
} from './wall-ownership';
import { reassignMaterialsByNormal } from './csg-utils';

interface WallGeometry {
  width: number;
  depth: number;
  posX: number;
  posZ: number;
  isVertical: boolean;
}

/**
 * Style resolver function type - used to get style for any room
 */
export type StyleResolver = (room: JsonRoom) => MaterialStyle | undefined;

export class WallGenerator {
  private csgEvaluator: Evaluator;
  private doorRenderer: DoorRenderer;
  private styleResolver: StyleResolver | null = null;
  private currentTheme?: ViewerTheme;

  constructor(csgEvaluator: Evaluator) {
    this.csgEvaluator = csgEvaluator;
    this.doorRenderer = new DoorRenderer();
  }

  /**
   * Set the style resolver for wall ownership detection
   */
  setStyleResolver(resolver: StyleResolver): void {
    this.styleResolver = resolver;
  }

  /**
   * Set the current theme for material generation
   */
  setTheme(theme: ViewerTheme): void {
    this.currentTheme = theme;
  }

  /**
   * Generate a complete wall with holes, windows, and doors.
   * Uses wall ownership detection to prevent Z-fighting on shared walls.
   */
  generateWall(
    wall: JsonWall,
    room: JsonRoom,
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    materials: MaterialSet,
    group: THREE.Group,
    config: JsonConfig = {}
  ): void {
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    const elevation = room.elevation || 0;
    const wallHeight = wall.wallHeight || room.roomHeight || config.default_height || DIMENSIONS.WALL.HEIGHT;

    // Analyze wall ownership to determine if we should render and get segments
    const styleResolver = this.styleResolver || (() => undefined);
    const ownership = analyzeWallOwnership(room, wall, allRooms, styleResolver);

    // Skip rendering if this room doesn't own the wall
    if (!ownership.shouldRender) {
      // Still need to process connections for door rendering
      this.processConnectionsOnly(wall, room, allRooms, connections, materials, group, elevation, config);
      return;
    }

    // Generate segmented wall with per-face materials
    if (ownership.segments.length > 0) {
      this.generateSegmentedWall(
        wall,
        room,
        ownership.segments,
        allRooms,
        connections,
        materials,
        group,
        elevation,
        wallHeight,
        wallThickness,
        config
      );
    }
  }

  /**
   * Generate wall segments with per-face materials
   */
  private generateSegmentedWall(
    wall: JsonWall,
    room: JsonRoom,
    segments: WallSegment[],
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    wallHeight: number,
    wallThickness: number,
    config: JsonConfig
  ): void {
    const isVertical = wall.direction === 'left' || wall.direction === 'right';
    const baseGeometry = this.calculateWallGeometry(wall, room, wallThickness);

    // Collect all holes first (they apply to all segments)
    const holes: Brush[] = [];
    
    // Handle explicit wall type (window/door)
    if (wall.type === 'door' || wall.type === 'window') {
      this.addExplicitHole(wall, room, baseGeometry, holes, materials, group, elevation, config);
    }

    // Handle connections (doors between rooms) - uses shared connection matching from core
    const connectionMatches = findMatchingConnections(room, wall, connections);
    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      this.addConnectionHoleToList(match.connection, room, wall, baseGeometry, holes, shouldRender, materials, group, elevation, allRooms, config);
    }

    // Generate each segment
    for (const segment of segments) {
      const segmentLength = segment.endPos - segment.startPos;
      if (segmentLength < 0.01) continue; // Skip tiny segments

      // Calculate segment geometry
      let segmentWidth: number;
      let segmentDepth: number;
      let segmentPosX: number;
      let segmentPosZ: number;

      if (isVertical) {
        // Vertical wall (left/right)
        segmentWidth = wallThickness;
        segmentDepth = segmentLength;
        segmentPosX = baseGeometry.posX;
        // Position along Z axis
        const wallStartZ = room.z;
        segmentPosZ = wallStartZ + segment.startPos + segmentLength / 2;
      } else {
        // Horizontal wall (top/bottom)
        segmentWidth = segmentLength;
        segmentDepth = wallThickness;
        // Position along X axis
        const wallStartX = room.x;
        segmentPosX = wallStartX + segment.startPos + segmentLength / 2;
        segmentPosZ = baseGeometry.posZ;
      }

      // Create segment geometry
      const segmentGeom = new THREE.BoxGeometry(segmentWidth, wallHeight, segmentDepth);

      // Create per-face materials for this segment
      const segmentMaterials = MaterialFactory.createPerFaceWallMaterials(
        segment.ownerStyle,
        segment.hasAdjacentRoom ? segment.adjacentStyle : undefined,
        wall.direction,
        this.currentTheme
      );

      // Create brush for CSG operations
      const segmentBrush = new Brush(segmentGeom, segmentMaterials);
      segmentBrush.position.set(segmentPosX, elevation + wallHeight / 2, segmentPosZ);
      segmentBrush.updateMatrixWorld();

      // Filter holes that overlap with this segment
      const segmentHoles = this.filterHolesForSegment(holes, segment, wall, room, isVertical);

      // Perform CSG and add to scene
      const resultMesh = this.performCSGWithMaterialArray(segmentBrush, segmentHoles, segmentMaterials);
      if (resultMesh) {
        group.add(resultMesh);
      }
    }
  }

  /**
   * Filter holes that overlap with a specific wall segment
   */
  private filterHolesForSegment(
    holes: Brush[],
    segment: WallSegment,
    _wall: JsonWall,  // Kept for potential future use (e.g., wall-specific filtering)
    room: JsonRoom,
    isVertical: boolean
  ): Brush[] {
    if (holes.length === 0) return [];

    const wallStart = isVertical ? room.z : room.x;
    const segmentWorldStart = wallStart + segment.startPos;
    const segmentWorldEnd = wallStart + segment.endPos;

    return holes.filter(hole => {
      const holePos = isVertical ? hole.position.z : hole.position.x;
      // Check if hole center is within segment bounds (with some tolerance)
      return holePos >= segmentWorldStart - 0.5 && holePos <= segmentWorldEnd + 0.5;
    });
  }

  /**
   * Process connections for door rendering only (when wall ownership is with another room)
   */
  private processConnectionsOnly(
    wall: JsonWall,
    room: JsonRoom,
    allRooms: JsonRoom[],
    connections: JsonConnection[],
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    config: JsonConfig
  ): void {
    const geometry = this.calculateWallGeometry(wall, room, config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS);
    
    // Uses shared connection matching from core
    const connectionMatches = findMatchingConnections(room, wall, connections);
    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      if (shouldRender) {
        // Only render the door, not the wall hole (wall is rendered by owner)
        this.renderDoorOnly(match.connection, room, wall, geometry, materials, group, elevation, allRooms, config);
      }
    }
  }

  /**
   * Render just the door mesh without wall hole
   */
  private renderDoorOnly(
    connection: JsonConnection,
    room: JsonRoom,
    wall: JsonWall,
    geometry: WallGeometry,
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    allRooms: JsonRoom[],
    config: JsonConfig
  ): void {
    const doorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    const holeY = elevation + doorHeight / 2;

    const sourceRoom = allRooms.find((r) => r.name === connection.fromRoom) || room;
    const targetRoom = allRooms.find((r) => r.name === connection.toRoom);
    const percentage = connection.position ?? 50;
    const ratio = percentage / 100;

    const sourceWallDir = connection.fromWall;
    const sourceIsVertical = sourceWallDir === 'left' || sourceWallDir === 'right';

    // Check if rooms are actually adjacent before rendering door
    if (targetRoom) {
      const sourceBounds = { x: sourceRoom.x, y: sourceRoom.z, width: sourceRoom.width, height: sourceRoom.height };
      const targetBounds = { x: targetRoom.x, y: targetRoom.z, width: targetRoom.width, height: targetRoom.height };
      const hasOverlap = sourceIsVertical ? 
        (Math.max(sourceBounds.y, targetBounds.y) < Math.min(sourceBounds.y + sourceBounds.height, targetBounds.y + targetBounds.height)) :
        (Math.max(sourceBounds.x, targetBounds.x) < Math.min(sourceBounds.x + sourceBounds.width, targetBounds.x + targetBounds.width));

      if (!hasOverlap) {
        console.warn(`[3D Renderer] Skipping door: ${connection.fromRoom}.${connection.fromWall} → ${connection.toRoom}.${connection.toWall} - rooms are not adjacent on this wall`);
        return;
      }
    }

    let holeX = 0;
    let holeZ = 0;

    if (sourceIsVertical) {
      holeZ = sourceRoom.z + sourceRoom.height * ratio;
      holeX = sourceWallDir === 'left' ? sourceRoom.x : sourceRoom.x + sourceRoom.width;
    } else {
      holeX = sourceRoom.x + sourceRoom.width * ratio;
      holeZ = sourceWallDir === 'top' ? sourceRoom.z : sourceRoom.z + sourceRoom.height;
    }

    const doorMesh = this.doorRenderer.renderDoor({
      connection,
      room,
      wall,
      holeX,
      holeZ,
      holeY,
      isVertical: geometry.isVertical,
      material: materials.door,
    });
    group.add(doorMesh);
  }

  /**
   * Add connection hole to a list (without adding door mesh)
   */
  private addConnectionHoleToList(
    connection: JsonConnection,
    room: JsonRoom,
    wall: JsonWall,
    geometry: WallGeometry,
    holes: Brush[],
    shouldRenderDoor: boolean,
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    allRooms: JsonRoom[],
    config: JsonConfig
  ): void {
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    
    // Resolve door dimensions with precedence:
    // 1. Connection-specific size
    // 2. Config door_size
    // 3. Config door_width/door_height (legacy)
    // 4. Default values
    let doorWidth: number;
    let doorHeight: number;
    let isFullHeight = false;

    if (connection.width !== undefined) {
      // Connection-specific width
      doorWidth = connection.width;
    } else if (config.door_size) {
      // Config door_size [width, height]
      doorWidth = config.door_size[0];
    } else {
      // Legacy door_width or default
      const singleDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
      doorWidth = connection.doorType === 'double-door' ? singleDoorWidth * 2 : singleDoorWidth;
    }

    if (connection.fullHeight) {
      // Full height opening - use room height
      isFullHeight = true;
      const roomHeight = room.roomHeight ?? config.default_height ?? DIMENSIONS.WALL.HEIGHT;
      doorHeight = roomHeight;
    } else if (connection.height !== undefined) {
      // Connection-specific height
      doorHeight = connection.height;
    } else if (config.door_size) {
      // Config door_size [width, height]
      doorHeight = config.door_size[1];
    } else {
      // Legacy door_height or default
      doorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    }

    // For full height, center vertically; otherwise, position from floor
    const holeY = isFullHeight 
      ? elevation + doorHeight / 2  // Full height: center at room mid-height
      : elevation + doorHeight / 2; // Standard: center at door mid-height

    const sourceRoom = allRooms.find((r) => r.name === connection.fromRoom) || room;
    const targetRoom = allRooms.find((r) => r.name === connection.toRoom);
    const percentage = connection.position ?? 50;

    const sourceWallDir = connection.fromWall;
    const sourceIsVertical = sourceWallDir === 'left' || sourceWallDir === 'right';

    // Convert 3D room coordinates to RoomBounds (z -> y for shared utility)
    const sourceBounds: RoomBounds = {
      x: sourceRoom.x,
      y: sourceRoom.z,  // 3D uses z for depth
      width: sourceRoom.width,
      height: sourceRoom.height,
    };
    const targetBounds: RoomBounds | null = targetRoom ? {
      x: targetRoom.x,
      y: targetRoom.z,
      width: targetRoom.width,
      height: targetRoom.height,
    } : null;

    // Check if rooms are actually adjacent before rendering door
    // This prevents rendering doors in invalid positions when rooms don't share a wall
    const hasOverlap = targetBounds ? (sourceIsVertical ? 
      (Math.max(sourceBounds.y, targetBounds.y) < Math.min(sourceBounds.y + sourceBounds.height, targetBounds.y + targetBounds.height)) :
      (Math.max(sourceBounds.x, targetBounds.x) < Math.min(sourceBounds.x + sourceBounds.width, targetBounds.x + targetBounds.width))) : false;

    // Skip rendering door if rooms are not adjacent (no wall overlap)
    if (targetBounds && !hasOverlap) {
      console.warn(`[3D Renderer] Skipping door: ${connection.fromRoom}.${connection.fromWall} → ${connection.toRoom}.${connection.toWall} - rooms are not adjacent on this wall`);
      return;
    }

    // Use shared utility for position calculation (single source of truth with SVG renderer)
    let holeX: number;
    let holeZ: number;

    if (sourceIsVertical) {
      // Vertical walls: calculate Z position using shared utility
      holeZ = calculatePositionWithFallback(sourceBounds, targetBounds, true, percentage);
      holeX = sourceWallDir === 'left' ? sourceRoom.x : sourceRoom.x + sourceRoom.width;
    } else {
      // Horizontal walls: calculate X position using shared utility
      holeX = calculatePositionWithFallback(sourceBounds, targetBounds, false, percentage);
      holeZ = sourceWallDir === 'top' ? sourceRoom.z : sourceRoom.z + sourceRoom.height;
    }

    // Add hole brush
    const holeGeom = new THREE.BoxGeometry(
      geometry.isVertical ? wallThickness * 2 : doorWidth,
      doorHeight,
      geometry.isVertical ? doorWidth : wallThickness * 2
    );
    const holeBrush = new Brush(holeGeom);
    holeBrush.position.set(holeX, holeY, holeZ);
    holeBrush.updateMatrixWorld();
    holes.push(holeBrush);

    // Add door mesh if this wall should render it
    // Skip door mesh for 'opening' type - it's a doorless passage
    if (shouldRenderDoor && connection.doorType !== 'opening') {
      const doorMesh = this.doorRenderer.renderDoor({
        connection,
        room,
        wall,
        holeX,
        holeZ,
        holeY,
        isVertical: geometry.isVertical,
        material: materials.door,
      });
      group.add(doorMesh);
    }
  }

  /**
   * Perform CSG with material array preservation
   * 
   * After CSG operations, the geometry's material groups are destroyed.
   * This method reassigns materials based on face normals to preserve
   * per-face material assignments for shared walls.
   */
  private performCSGWithMaterialArray(
    wallBrush: Brush,
    holes: Brush[],
    materials: THREE.MeshStandardMaterial[]
  ): THREE.Mesh | null {
    if (holes.length > 0) {
      let currentBrush = wallBrush;
      for (const hole of holes) {
        currentBrush = this.csgEvaluator.evaluate(currentBrush, hole, SUBTRACTION);
      }
      // CSG destroys material groups - reassign based on face normals
      currentBrush.material = materials;
      reassignMaterialsByNormal(currentBrush.geometry, materials.length);
      currentBrush.castShadow = true;
      currentBrush.receiveShadow = true;
      return currentBrush;
    } else {
      const resultMesh = new THREE.Mesh(wallBrush.geometry, materials);
      resultMesh.position.copy(wallBrush.position);
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      return resultMesh;
    }
  }

  /**
   * Calculate wall dimensions and position
   */
  private calculateWallGeometry(wall: JsonWall, room: JsonRoom, wallThickness: number): WallGeometry {
    const centerX = room.x + room.width / 2;
    const centerZ = room.z + room.height / 2;

    let width = 0;
    let depth = 0;
    let posX = 0;
    let posZ = 0;
    let isVertical = false;

    switch (wall.direction) {
      case 'top':
        width = room.width + wallThickness;
        depth = wallThickness;
        posX = centerX;
        posZ = room.z;
        isVertical = false;
        break;
      case 'bottom':
        width = room.width + wallThickness;
        depth = wallThickness;
        posX = centerX;
        posZ = room.z + room.height;
        isVertical = false;
        break;
      case 'left':
        width = wallThickness;
        depth = room.height + wallThickness;
        posX = room.x;
        posZ = centerZ;
        isVertical = true;
        break;
      case 'right':
        width = wallThickness;
        depth = room.height + wallThickness;
        posX = room.x + room.width;
        posZ = centerZ;
        isVertical = true;
        break;
    }

    return { width, depth, posX, posZ, isVertical };
  }

  /**
   * Add hole for explicit wall type (door/window)
   */
  private addExplicitHole(
    wall: JsonWall,
    room: JsonRoom,
    geometry: WallGeometry,
    holes: Brush[],
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    config: JsonConfig = {}
  ): void {
    // Use config values with fallback to constants
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    const defaultDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
    const defaultDoorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    const defaultWindowWidth = config.window_width ?? DIMENSIONS.WINDOW.WIDTH;
    const defaultWindowHeight = config.window_height ?? DIMENSIONS.WINDOW.HEIGHT;
    const windowSillHeight = config.window_sill ?? DIMENSIONS.WINDOW.SILL_HEIGHT;

    const defaultWidth = wall.type === 'door' ? defaultDoorWidth : defaultWindowWidth;
    const defaultHeight = wall.type === 'door' ? defaultDoorHeight : defaultWindowHeight;

    const holeWidth = wall.width || defaultWidth;
    const holeHeight = wall.height || defaultHeight;
    
    const holeY =
      elevation +
      (wall.type === 'door'
        ? holeHeight / 2
        : windowSillHeight + holeHeight / 2);

    let holeX = geometry.posX;
    let holeZ = geometry.posZ;

    // Calculate position along the wall if specified
    if (wall.position !== undefined) {
        let ratio = 0.5;
        if (wall.isPercentage) {
            ratio = wall.position / 100;
        } else {
             // Absolute units
             const wallLength = geometry.isVertical ? room.height : room.width;
             ratio = wall.position / wallLength;
        }

        if (geometry.isVertical) {
            const wallStartZ = room.z;
            const offsetZ = room.height * ratio;
            holeZ = wallStartZ + offsetZ;
        } else {
            const wallStartX = room.x;
            const offsetX = room.width * ratio;
            holeX = wallStartX + offsetX;
        }
    }

    const holeGeom = new THREE.BoxGeometry(
      geometry.isVertical ? wallThickness * 2 : holeWidth,
      holeHeight,
      geometry.isVertical ? holeWidth : wallThickness * 2
    );
    const holeBrush = new Brush(holeGeom);
    holeBrush.position.set(holeX, holeY, holeZ);
    holeBrush.updateMatrixWorld();
    holes.push(holeBrush);

    // Add glass for windows
    if (wall.type === 'window') {
      const glassGeom = new THREE.BoxGeometry(
        geometry.isVertical ? DIMENSIONS.WINDOW.GLASS_THICKNESS : holeWidth,
        holeHeight,
        geometry.isVertical ? holeWidth : DIMENSIONS.WINDOW.GLASS_THICKNESS
      );
      const glassMesh = new THREE.Mesh(glassGeom, materials.window);
      glassMesh.position.set(holeX, holeY, holeZ);
      group.add(glassMesh);
    }
  }

}

