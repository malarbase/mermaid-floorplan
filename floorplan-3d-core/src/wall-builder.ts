/**
 * Unified wall generation with optional CSG support
 * 
 * This module provides wall generation that works in both CSG-enabled and
 * non-CSG environments. When `three-bvh-csg` is available, walls are generated
 * with proper cutouts for doors/windows. Otherwise, simple box walls are used
 * (doors/windows clip through).
 * 
 * Usage:
 *   // Initialize CSG (call once at startup)
 *   const csgEnabled = await initCSG();
 *   
 *   // Generate walls (uses CSG if available)
 *   const wallGroup = generateWallWithCSG(wall, room, holes, materials);
 */

import * as THREE from 'three';
import type { JsonWall, JsonRoom, JsonConnection, JsonConfig } from './types.js';
import { DIMENSIONS, getThemeColors } from './constants.js';
import type { ViewerTheme, ThemeColors } from './constants.js';
import { MaterialFactory, type MaterialSet, type MaterialStyle } from './materials.js';
import { reassignMaterialsByNormal } from './csg-utils.js';
import {
  analyzeWallOwnership,
  type StyleResolver,
  type WallSegment,
} from './wall-ownership.js';
import {
  findMatchingConnections,
  shouldRenderConnection,
} from './connection-matcher.js';
import { generateConnection } from './connection-geometry.js';

// CSG module - loaded dynamically
let csgModule: {
  Evaluator: new () => CSGEvaluator;
  Brush: new (geometry: THREE.BufferGeometry, material?: THREE.Material | THREE.Material[]) => CSGBrush;
  SUBTRACTION: number;
} | null = null;

// Type definitions for CSG classes
interface CSGEvaluator {
  evaluate(a: CSGBrush, b: CSGBrush, operation: number): CSGBrush;
}

interface CSGBrush extends THREE.Mesh {
  updateMatrixWorld(): void;
}

/**
 * Initialize CSG support by dynamically loading three-bvh-csg
 * 
 * @returns true if CSG is available, false otherwise
 */
export async function initCSG(): Promise<boolean> {
  if (csgModule !== null) {
    return true; // Already initialized
  }

  try {
    const mod = await import('three-bvh-csg');
    csgModule = {
      Evaluator: mod.Evaluator,
      Brush: mod.Brush,
      SUBTRACTION: mod.SUBTRACTION,
    };
    return true;
  } catch {
    // CSG not available - will use fallback rendering
    return false;
  }
}

/**
 * Check if CSG is currently available
 */
export function isCsgAvailable(): boolean {
  return csgModule !== null;
}

/**
 * Get the CSG module (throws if not initialized)
 */
function getCSG() {
  if (!csgModule) {
    throw new Error('CSG not initialized. Call initCSG() first.');
  }
  return csgModule;
}

/**
 * Hole specification for wall cutouts
 */
export interface HoleSpec {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  isVertical: boolean;
  wallThickness: number;
}

/**
 * Options for wall builder
 */
export interface WallBuilderOptions {
  wallThickness?: number;
  defaultHeight?: number;
  theme?: ViewerTheme;
  styleResolver?: StyleResolver;
  config?: JsonConfig;
}

/**
 * Wall builder class that manages CSG operations
 */
export class WallBuilder {
  private evaluator: CSGEvaluator | null = null;
  private theme?: ViewerTheme;
  private themeColors: ThemeColors;
  private styleResolver: StyleResolver = () => undefined;

  constructor() {
    if (csgModule) {
      this.evaluator = new csgModule.Evaluator();
    }
    this.themeColors = getThemeColors('light');
  }

  /**
   * Set the theme for material generation
   */
  setTheme(theme: ViewerTheme): void {
    this.theme = theme;
    this.themeColors = getThemeColors(theme);
  }

  /**
   * Set the style resolver for wall ownership detection
   */
  setStyleResolver(resolver: StyleResolver): void {
    this.styleResolver = resolver;
  }

  /**
   * Generate a complete wall with holes for a room
   * Uses CSG if available, otherwise generates simple box walls
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

    // Analyze wall ownership
    const ownership = analyzeWallOwnership(room, wall, allRooms, this.styleResolver);

    if (!ownership.shouldRender) {
      // Still need to process connections for door rendering
      this.processConnectionsOnly(wall, room, allRooms, connections, materials, group, elevation, config);
      return;
    }

    if (this.evaluator && csgModule) {
      // CSG path: generate wall with proper cutouts
      this.generateWallWithCSG(
        wall, room, ownership.segments, allRooms, connections,
        materials, group, elevation, wallHeight, wallThickness, config
      );
    } else {
      // Fallback path: simple box walls (doors clip through)
      this.generateSimpleWall(
        wall, room, ownership.segments, allRooms, connections,
        materials, group, elevation, wallHeight, wallThickness, config
      );
    }
  }

  /**
   * Generate wall using CSG for proper cutouts
   */
  private generateWallWithCSG(
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
    const { Brush, SUBTRACTION } = getCSG();
    const isVertical = wall.direction === 'left' || wall.direction === 'right';
    const baseGeometry = this.calculateWallGeometry(wall, room, wallThickness);

    // Collect all holes
    const holes: CSGBrush[] = [];

    // Handle explicit wall type (window/door)
    if (wall.type === 'door' || wall.type === 'window') {
      const holeBrush = this.createExplicitHole(wall, room, baseGeometry, wallThickness, elevation, config);
      if (holeBrush) {
        holes.push(holeBrush);
        // Add glass for windows
        if (wall.type === 'window') {
          const glassMesh = this.createWindowGlass(wall, room, baseGeometry, elevation, materials, config);
          if (glassMesh) group.add(glassMesh);
        }
      }
    }

    // Handle connections
    const connectionMatches = findMatchingConnections(room, wall, connections);
    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      const holeData = this.createConnectionHole(match.connection, room, wall, baseGeometry, wallThickness, elevation, allRooms, config);
      if (holeData) {
        holes.push(holeData.brush);
        // Add door/window mesh if this wall should render it
        if (shouldRender && match.connection.doorType !== 'opening') {
          const connectionMesh = generateConnection(
            match.connection, room, allRooms.find(r => r.name === match.connection.toRoom),
            wall, wallThickness, this.themeColors
          );
          if (connectionMesh) {
            connectionMesh.position.y += elevation;
            group.add(connectionMesh);
          }
        }
      }
    }

    // Generate each segment with CSG
    for (const segment of segments) {
      const segmentLength = segment.endPos - segment.startPos;
      if (segmentLength < 0.01) continue;

      // Calculate segment geometry
      const segmentGeom = this.createSegmentGeometry(segment, wall, room, wallThickness, wallHeight, isVertical);
      const segmentPos = this.calculateSegmentPosition(segment, wall, room, wallThickness, isVertical);

      // Create per-face materials
      const segmentMaterials = MaterialFactory.createPerFaceWallMaterials(
        segment.ownerStyle,
        segment.hasAdjacentRoom ? segment.adjacentStyle : undefined,
        wall.direction,
        this.theme
      );

      // Create brush
      const segmentBrush = new Brush(segmentGeom, segmentMaterials);
      segmentBrush.position.set(segmentPos.x, elevation + wallHeight / 2, segmentPos.z);
      segmentBrush.updateMatrixWorld();

      // Filter holes for this segment
      const segmentHoles = this.filterHolesForSegment(holes, segment, room, isVertical);

      // Perform CSG and add to scene
      const resultMesh = this.performCSG(segmentBrush, segmentHoles, segmentMaterials, SUBTRACTION);
      if (resultMesh) {
        group.add(resultMesh);
      }
    }
  }

  /**
   * Generate simple box wall without CSG (fallback)
   */
  private generateSimpleWall(
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

    // Handle explicit wall type (window)
    if (wall.type === 'window') {
      const glassMesh = this.createWindowGlass(wall, room, baseGeometry, elevation, materials, config);
      if (glassMesh) group.add(glassMesh);
    }

    // Handle connections - add door meshes (they'll clip through walls)
    const connectionMatches = findMatchingConnections(room, wall, connections);
    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      if (shouldRender && match.connection.doorType !== 'opening') {
        const connectionMesh = generateConnection(
          match.connection, room, allRooms.find(r => r.name === match.connection.toRoom),
          wall, wallThickness, this.themeColors
        );
        if (connectionMesh) {
          connectionMesh.position.y += elevation;
          group.add(connectionMesh);
        }
      }
    }

    // Generate simple box walls for each segment
    for (const segment of segments) {
      const segmentLength = segment.endPos - segment.startPos;
      if (segmentLength < 0.01) continue;

      const segmentGeom = this.createSegmentGeometry(segment, wall, room, wallThickness, wallHeight, isVertical);
      const segmentPos = this.calculateSegmentPosition(segment, wall, room, wallThickness, isVertical);

      const segmentMaterial = MaterialFactory.createWallMaterial(segment.ownerStyle, this.theme);
      const wallMesh = new THREE.Mesh(segmentGeom, segmentMaterial);
      wallMesh.position.set(segmentPos.x, elevation + wallHeight / 2, segmentPos.z);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      group.add(wallMesh);
    }
  }

  /**
   * Process connections for door rendering only
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
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    const connectionMatches = findMatchingConnections(room, wall, connections);

    for (const match of connectionMatches) {
      const shouldRender = shouldRenderConnection(match, wall, allRooms);
      if (shouldRender && match.connection.doorType !== 'opening') {
        const connectionMesh = generateConnection(
          match.connection, room, allRooms.find(r => r.name === match.connection.toRoom),
          wall, wallThickness, this.themeColors
        );
        if (connectionMesh) {
          connectionMesh.position.y += elevation;
          group.add(connectionMesh);
        }
      }
    }
  }

  /**
   * Calculate wall dimensions and position
   */
  private calculateWallGeometry(wall: JsonWall, room: JsonRoom, wallThickness: number) {
    const centerX = room.x + room.width / 2;
    const centerZ = room.z + room.height / 2;

    let width = 0, depth = 0, posX = 0, posZ = 0;
    let isVertical = false;

    switch (wall.direction) {
      case 'top':
        width = room.width + wallThickness;
        depth = wallThickness;
        posX = centerX;
        posZ = room.z;
        break;
      case 'bottom':
        width = room.width + wallThickness;
        depth = wallThickness;
        posX = centerX;
        posZ = room.z + room.height;
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
   * Create segment geometry
   */
  private createSegmentGeometry(
    segment: WallSegment,
    wall: JsonWall,
    room: JsonRoom,
    wallThickness: number,
    wallHeight: number,
    isVertical: boolean
  ): THREE.BoxGeometry {
    const segmentLength = segment.endPos - segment.startPos;

    if (isVertical) {
      return new THREE.BoxGeometry(wallThickness, wallHeight, segmentLength);
    } else {
      return new THREE.BoxGeometry(segmentLength, wallHeight, wallThickness);
    }
  }

  /**
   * Calculate segment position
   */
  private calculateSegmentPosition(
    segment: WallSegment,
    wall: JsonWall,
    room: JsonRoom,
    wallThickness: number,
    isVertical: boolean
  ): { x: number; z: number } {
    const segmentLength = segment.endPos - segment.startPos;
    const baseGeom = this.calculateWallGeometry(wall, room, wallThickness);

    if (isVertical) {
      return {
        x: baseGeom.posX,
        z: room.z + segment.startPos + segmentLength / 2,
      };
    } else {
      return {
        x: room.x + segment.startPos + segmentLength / 2,
        z: baseGeom.posZ,
      };
    }
  }

  /**
   * Create explicit hole for door/window wall type
   */
  private createExplicitHole(
    wall: JsonWall,
    room: JsonRoom,
    geometry: ReturnType<typeof this.calculateWallGeometry>,
    wallThickness: number,
    elevation: number,
    config: JsonConfig
  ): CSGBrush | null {
    if (!csgModule) return null;
    const { Brush } = csgModule;

    const defaultDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
    const defaultDoorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    const defaultWindowWidth = config.window_width ?? DIMENSIONS.WINDOW.WIDTH;
    const defaultWindowHeight = config.window_height ?? DIMENSIONS.WINDOW.HEIGHT;
    const windowSillHeight = config.window_sill ?? DIMENSIONS.WINDOW.SILL_HEIGHT;

    const defaultWidth = wall.type === 'door' ? defaultDoorWidth : defaultWindowWidth;
    const defaultHeight = wall.type === 'door' ? defaultDoorHeight : defaultWindowHeight;

    const holeWidth = wall.width || defaultWidth;
    const holeHeight = wall.height || defaultHeight;

    const holeY = elevation +
      (wall.type === 'door' ? holeHeight / 2 : windowSillHeight + holeHeight / 2);

    let holeX = geometry.posX;
    let holeZ = geometry.posZ;

    if (wall.position !== undefined) {
      let ratio = 0.5;
      if (wall.isPercentage) {
        ratio = wall.position / 100;
      } else {
        const wallLength = geometry.isVertical ? room.height : room.width;
        ratio = wall.position / wallLength;
      }

      if (geometry.isVertical) {
        holeZ = room.z + room.height * ratio;
      } else {
        holeX = room.x + room.width * ratio;
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
    return holeBrush;
  }

  /**
   * Create window glass mesh
   */
  private createWindowGlass(
    wall: JsonWall,
    room: JsonRoom,
    geometry: ReturnType<typeof this.calculateWallGeometry>,
    elevation: number,
    materials: MaterialSet,
    config: JsonConfig
  ): THREE.Mesh | null {
    const defaultWindowWidth = config.window_width ?? DIMENSIONS.WINDOW.WIDTH;
    const defaultWindowHeight = config.window_height ?? DIMENSIONS.WINDOW.HEIGHT;
    const windowSillHeight = config.window_sill ?? DIMENSIONS.WINDOW.SILL_HEIGHT;

    const holeWidth = wall.width || defaultWindowWidth;
    const holeHeight = wall.height || defaultWindowHeight;
    const holeY = elevation + windowSillHeight + holeHeight / 2;

    let holeX = geometry.posX;
    let holeZ = geometry.posZ;

    if (wall.position !== undefined) {
      let ratio = wall.isPercentage ? wall.position / 100 : wall.position / (geometry.isVertical ? room.height : room.width);
      if (geometry.isVertical) {
        holeZ = room.z + room.height * ratio;
      } else {
        holeX = room.x + room.width * ratio;
      }
    }

    const glassGeom = new THREE.BoxGeometry(
      geometry.isVertical ? DIMENSIONS.WINDOW.GLASS_THICKNESS : holeWidth,
      holeHeight,
      geometry.isVertical ? holeWidth : DIMENSIONS.WINDOW.GLASS_THICKNESS
    );
    const glassMesh = new THREE.Mesh(glassGeom, materials.window);
    glassMesh.position.set(holeX, holeY, holeZ);
    return glassMesh;
  }

  /**
   * Create connection hole
   */
  private createConnectionHole(
    connection: JsonConnection,
    room: JsonRoom,
    wall: JsonWall,
    geometry: ReturnType<typeof this.calculateWallGeometry>,
    wallThickness: number,
    elevation: number,
    allRooms: JsonRoom[],
    config: JsonConfig
  ): { brush: CSGBrush; x: number; z: number; y: number } | null {
    if (!csgModule) return null;
    const { Brush } = csgModule;

    // Door dimensions
    let doorWidth: number;
    let doorHeight: number;

    if (connection.width !== undefined) {
      doorWidth = connection.width;
    } else if (config.door_size) {
      doorWidth = config.door_size[0];
    } else {
      const singleDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
      doorWidth = connection.doorType === 'double-door' ? singleDoorWidth * 2 : singleDoorWidth;
    }

    if (connection.fullHeight) {
      const roomHeight = room.roomHeight ?? config.default_height ?? DIMENSIONS.WALL.HEIGHT;
      doorHeight = roomHeight;
    } else if (connection.height !== undefined) {
      doorHeight = connection.height;
    } else if (config.door_size) {
      doorHeight = config.door_size[1];
    } else {
      doorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    }

    const holeY = elevation + doorHeight / 2;

    const sourceRoom = allRooms.find(r => r.name === connection.fromRoom) || room;
    const percentage = connection.position ?? 50;
    const ratio = percentage / 100;

    const sourceIsVertical = connection.fromWall === 'left' || connection.fromWall === 'right';

    let holeX: number, holeZ: number;
    if (sourceIsVertical) {
      holeZ = sourceRoom.z + sourceRoom.height * ratio;
      holeX = connection.fromWall === 'left' ? sourceRoom.x : sourceRoom.x + sourceRoom.width;
    } else {
      holeX = sourceRoom.x + sourceRoom.width * ratio;
      holeZ = connection.fromWall === 'top' ? sourceRoom.z : sourceRoom.z + sourceRoom.height;
    }

    const holeGeom = new THREE.BoxGeometry(
      geometry.isVertical ? wallThickness * 2 : doorWidth,
      doorHeight,
      geometry.isVertical ? doorWidth : wallThickness * 2
    );
    const holeBrush = new Brush(holeGeom);
    holeBrush.position.set(holeX, holeY, holeZ);
    holeBrush.updateMatrixWorld();

    return { brush: holeBrush, x: holeX, z: holeZ, y: holeY };
  }

  /**
   * Filter holes that overlap with a segment
   */
  private filterHolesForSegment(
    holes: CSGBrush[],
    segment: WallSegment,
    room: JsonRoom,
    isVertical: boolean
  ): CSGBrush[] {
    if (holes.length === 0) return [];

    const wallStart = isVertical ? room.z : room.x;
    const segmentWorldStart = wallStart + segment.startPos;
    const segmentWorldEnd = wallStart + segment.endPos;

    return holes.filter(hole => {
      const holePos = isVertical ? hole.position.z : hole.position.x;
      return holePos >= segmentWorldStart - 0.5 && holePos <= segmentWorldEnd + 0.5;
    });
  }

  /**
   * Perform CSG subtraction
   */
  private performCSG(
    wallBrush: CSGBrush,
    holes: CSGBrush[],
    materials: THREE.MeshStandardMaterial[],
    subtraction: number
  ): THREE.Mesh | null {
    if (!this.evaluator) return null;

    if (holes.length > 0) {
      let currentBrush = wallBrush;
      for (const hole of holes) {
        currentBrush = this.evaluator.evaluate(currentBrush, hole, subtraction);
      }
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
}

