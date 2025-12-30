/**
 * Wall geometry generation and CSG operations
 */

import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { DIMENSIONS } from './constants';
import { JsonWall, JsonRoom, JsonConnection, JsonConfig } from './types';
import { MaterialSet } from './materials';
import { ConnectionMatcher } from './connection-matcher';
import { DoorRenderer } from './door-renderer';

interface WallGeometry {
  width: number;
  depth: number;
  posX: number;
  posZ: number;
  isVertical: boolean;
}

export class WallGenerator {
  private csgEvaluator: Evaluator;
  private doorRenderer: DoorRenderer;

  constructor(csgEvaluator: Evaluator) {
    this.csgEvaluator = csgEvaluator;
    this.doorRenderer = new DoorRenderer();
  }

  /**
   * Generate a complete wall with holes, windows, and doors
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
    const geometry = this.calculateWallGeometry(wall, room, wallThickness);
    const elevation = room.elevation || 0;
    const wallHeight = wall.wallHeight || room.roomHeight || config.default_height || DIMENSIONS.WALL.HEIGHT;

    // Create base wall brush (only if not open)
    let wallBrush: Brush | null = null;
    if (wall.type !== 'open') {
      const wallGeom = new THREE.BoxGeometry(
        geometry.width,
        wallHeight,
        geometry.depth
      );
      wallBrush = new Brush(wallGeom, materials.wall);
      wallBrush.position.set(geometry.posX, elevation + wallHeight / 2, geometry.posZ);
      wallBrush.updateMatrixWorld();
    }

    const holes: Brush[] = [];

    // Handle explicit wall type (window/door)
    if (wallBrush && (wall.type === 'door' || wall.type === 'window')) {
      this.addExplicitHole(wall, room, geometry, holes, materials, group, elevation, config);
    }

    // Handle connections (doors between rooms)
    const connectionMatches = ConnectionMatcher.findMatchingConnections(
      room,
      wall,
      connections
    );

    for (const match of connectionMatches) {
      const shouldRender = ConnectionMatcher.shouldRenderDoor(match, wall, allRooms);
      match.shouldRenderDoor = shouldRender;

      this.addConnectionHole(
        match.connection,
        room,
        wall,
        geometry,
        wallBrush,
        holes,
        shouldRender,
        materials,
        group,
        elevation,
        allRooms,
        config
      );
    }

    // Perform CSG subtraction and add to scene
    if (wallBrush) {
      const resultMesh = this.performCSG(wallBrush, holes, materials.wall);
      if (resultMesh) {
        group.add(resultMesh);
      }
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

  /**
   * Add hole for connection (door between rooms)
   * Uses source room (fromRoom) geometry to ensure consistent positioning
   * when connected rooms have different sizes
   */
  private addConnectionHole(
    connection: JsonConnection,
    room: JsonRoom,
    wall: JsonWall,
    geometry: WallGeometry,
    wallBrush: Brush | null,
    holes: Brush[],
    shouldRenderDoor: boolean,
    materials: MaterialSet,
    group: THREE.Group,
    elevation: number,
    allRooms: JsonRoom[],
    config: JsonConfig = {}
  ): void {
    // Use config values with fallback to constants
    const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
    const singleDoorWidth = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
    const doorHeight = config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
    
    const doorWidth =
      connection.doorType === 'double-door'
        ? singleDoorWidth * 2  // Double door is 2x single door width
        : singleDoorWidth;
    const holeY = elevation + doorHeight / 2;

    // FIX: Find the source room to ensure canonical positioning
    // This fixes misalignment when connected rooms have different sizes
    const sourceRoom = allRooms.find((r) => r.name === connection.fromRoom) || room;

    const percentage = connection.position ?? 50;
    const ratio = percentage / 100;

    let holeX = 0;
    let holeZ = 0;

    // Calculate position based on SOURCE room geometry (not local room)
    const sourceWallDir = connection.fromWall;
    const sourceIsVertical = sourceWallDir === 'left' || sourceWallDir === 'right';

    if (sourceIsVertical) {
      const wallStartZ = sourceRoom.z;
      const offsetZ = sourceRoom.height * ratio;
      holeZ = wallStartZ + offsetZ;

      // For X, use source wall's X position
      if (sourceWallDir === 'left') {
        holeX = sourceRoom.x;
      } else {
        holeX = sourceRoom.x + sourceRoom.width;
      }
    } else {
      const wallStartX = sourceRoom.x;
      const offsetX = sourceRoom.width * ratio;
      holeX = wallStartX + offsetX;

      // For Z, use source wall's Z position
      if (sourceWallDir === 'top') {
        holeZ = sourceRoom.z;
      } else {
        holeZ = sourceRoom.z + sourceRoom.height;
      }
    }

    // Add hole brush (only if wall exists)
    if (wallBrush) {
      const holeGeom = new THREE.BoxGeometry(
        geometry.isVertical ? wallThickness * 2 : doorWidth,
        doorHeight,
        geometry.isVertical ? doorWidth : wallThickness * 2
      );
      const holeBrush = new Brush(holeGeom);
      holeBrush.position.set(holeX, holeY, holeZ);
      holeBrush.updateMatrixWorld();
      holes.push(holeBrush);
    }

    // Add door mesh if this wall should render it
    if (shouldRenderDoor) {
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
   * Perform CSG subtraction to create holes in wall
   */
  private performCSG(
    wallBrush: Brush,
    holes: Brush[],
    wallMaterial: THREE.Material
  ): THREE.Mesh | null {
    if (holes.length > 0) {
      let currentBrush = wallBrush;
      for (const hole of holes) {
        currentBrush = this.csgEvaluator.evaluate(currentBrush, hole, SUBTRACTION);
      }
      const resultMesh = currentBrush;
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      return resultMesh;
    } else {
      // Solid wall with no holes
      const resultMesh = new THREE.Mesh(wallBrush.geometry, wallMaterial);
      resultMesh.position.copy(wallBrush.position);
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      return resultMesh;
    }
  }
}

