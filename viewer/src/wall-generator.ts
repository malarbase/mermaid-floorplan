/**
 * Wall geometry generation and CSG operations
 */

import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { DIMENSIONS } from './constants';
import { JsonWall, JsonRoom, JsonConnection } from './types';
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
    group: THREE.Group
  ): void {
    const geometry = this.calculateWallGeometry(wall, room);

    // Create base wall brush (only if not open)
    let wallBrush: Brush | null = null;
    if (wall.type !== 'open') {
      const wallGeom = new THREE.BoxGeometry(
        geometry.width,
        DIMENSIONS.WALL.HEIGHT,
        geometry.depth
      );
      wallBrush = new Brush(wallGeom, materials.wall);
      wallBrush.position.set(geometry.posX, DIMENSIONS.WALL.HEIGHT / 2, geometry.posZ);
      wallBrush.updateMatrixWorld();
    }

    const holes: Brush[] = [];

    // Handle explicit wall type (window/door)
    if (wallBrush && (wall.type === 'door' || wall.type === 'window')) {
      this.addExplicitHole(wall, geometry, holes, materials, group);
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
        group
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
  private calculateWallGeometry(wall: JsonWall, room: JsonRoom): WallGeometry {
    const centerX = room.x + room.width / 2;
    const centerZ = room.z + room.height / 2;

    let width = 0;
    let depth = 0;
    let posX = 0;
    let posZ = 0;
    let isVertical = false;

    switch (wall.direction) {
      case 'top':
        width = room.width + DIMENSIONS.WALL.THICKNESS;
        depth = DIMENSIONS.WALL.THICKNESS;
        posX = centerX;
        posZ = room.z;
        isVertical = false;
        break;
      case 'bottom':
        width = room.width + DIMENSIONS.WALL.THICKNESS;
        depth = DIMENSIONS.WALL.THICKNESS;
        posX = centerX;
        posZ = room.z + room.height;
        isVertical = false;
        break;
      case 'left':
        width = DIMENSIONS.WALL.THICKNESS;
        depth = room.height + DIMENSIONS.WALL.THICKNESS;
        posX = room.x;
        posZ = centerZ;
        isVertical = true;
        break;
      case 'right':
        width = DIMENSIONS.WALL.THICKNESS;
        depth = room.height + DIMENSIONS.WALL.THICKNESS;
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
    geometry: WallGeometry,
    holes: Brush[],
    materials: MaterialSet,
    group: THREE.Group
  ): void {
    const holeWidth =
      wall.type === 'door' ? DIMENSIONS.DOOR.WIDTH : DIMENSIONS.WINDOW.WIDTH;
    const holeHeight =
      wall.type === 'door' ? DIMENSIONS.DOOR.HEIGHT : DIMENSIONS.WINDOW.HEIGHT;
    const holeY =
      wall.type === 'door'
        ? holeHeight / 2
        : DIMENSIONS.WINDOW.SILL_HEIGHT + holeHeight / 2;

    const holeGeom = new THREE.BoxGeometry(
      geometry.isVertical ? DIMENSIONS.WALL.THICKNESS * 2 : holeWidth,
      holeHeight,
      geometry.isVertical ? holeWidth : DIMENSIONS.WALL.THICKNESS * 2
    );
    const holeBrush = new Brush(holeGeom);
    holeBrush.position.set(geometry.posX, holeY, geometry.posZ);
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
      glassMesh.position.set(geometry.posX, holeY, geometry.posZ);
      group.add(glassMesh);
    }
  }

  /**
   * Add hole for connection (door between rooms)
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
    group: THREE.Group
  ): void {
    const doorWidth =
      connection.doorType === 'double-door'
        ? DIMENSIONS.DOUBLE_DOOR.WIDTH
        : DIMENSIONS.DOOR.WIDTH;
    const doorHeight = DIMENSIONS.DOOR.HEIGHT;
    const holeY = doorHeight / 2;

    // Calculate position along the wall
    const percentage = connection.position ?? 50;
    const ratio = percentage / 100;

    let holeX = geometry.posX;
    let holeZ = geometry.posZ;

    if (geometry.isVertical) {
      const wallStartZ = room.z;
      const offsetZ = room.height * ratio;
      holeZ = wallStartZ + offsetZ;
    } else {
      const wallStartX = room.x;
      const offsetX = room.width * ratio;
      holeX = wallStartX + offsetX;
    }

    // Add hole brush (only if wall exists)
    if (wallBrush) {
      const holeGeom = new THREE.BoxGeometry(
        geometry.isVertical ? DIMENSIONS.WALL.THICKNESS * 2 : doorWidth,
        doorHeight,
        geometry.isVertical ? doorWidth : DIMENSIONS.WALL.THICKNESS * 2
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

