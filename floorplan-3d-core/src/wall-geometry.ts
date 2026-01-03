/**
 * Simplified wall geometry generation for 3D floorplan rendering
 * This module provides basic wall box geometry without CSG operations.
 * For complex wall cutouts, use the browser-based CSG utilities.
 */

import * as THREE from 'three';
import type { JsonFloor, JsonRoom, JsonWall } from './types.js';
import { DIMENSIONS } from './constants.js';
import { MaterialFactory, type MaterialStyle } from './materials.js';
import type { ViewerTheme } from './constants.js';

export interface WallGeneratorOptions {
  /** Wall thickness (default: DIMENSIONS.WALL.THICKNESS) */
  wallThickness?: number;
  /** Default wall height (default: DIMENSIONS.WALL.HEIGHT) */
  defaultHeight?: number;
  /** Theme for default materials */
  theme?: ViewerTheme;
  /** Style lookup map: room name -> MaterialStyle */
  styleMap?: Map<string, MaterialStyle>;
}

/**
 * Generate wall geometry for a single floor (simplified, no CSG)
 */
export function generateFloorWalls(
  floor: JsonFloor,
  options: WallGeneratorOptions = {}
): THREE.Group {
  const group = new THREE.Group();
  group.name = `floor_walls_${floor.id}`;

  const wallThickness = options.wallThickness ?? DIMENSIONS.WALL.THICKNESS;
  const defaultHeight = options.defaultHeight ?? floor.height ?? DIMENSIONS.WALL.HEIGHT;
  const theme = options.theme;
  const styleMap = options.styleMap ?? new Map();

  for (const room of floor.rooms) {
    const roomWalls = generateRoomWalls(room, {
      wallThickness,
      defaultHeight,
      theme,
      style: styleMap.get(room.name),
    });
    group.add(roomWalls);
  }

  return group;
}

interface RoomWallOptions {
  wallThickness: number;
  defaultHeight: number;
  theme?: ViewerTheme;
  style?: MaterialStyle;
}

/**
 * Generate walls for a single room
 */
export function generateRoomWalls(
  room: JsonRoom,
  options: RoomWallOptions
): THREE.Group {
  const group = new THREE.Group();
  group.name = `room_walls_${room.name}`;

  const { wallThickness, defaultHeight, theme, style } = options;
  const wallHeight = room.roomHeight ?? defaultHeight;
  const elevation = room.elevation ?? 0;

  for (const wall of room.walls) {
    // Skip open walls
    if (wall.type === 'open') continue;

    const wallMesh = createWallSegment(room, wall, {
      wallThickness,
      wallHeight: wall.wallHeight ?? wallHeight,
      elevation,
      theme,
      style,
    });

    if (wallMesh) {
      group.add(wallMesh);
    }
  }

  return group;
}

interface WallSegmentOptions {
  wallThickness: number;
  wallHeight: number;
  elevation: number;
  theme?: ViewerTheme;
  style?: MaterialStyle;
}

/**
 * Create a single wall segment (simplified box, no cutouts)
 */
function createWallSegment(
  room: JsonRoom,
  wall: JsonWall,
  options: WallSegmentOptions
): THREE.Mesh | null {
  const { wallThickness, wallHeight, elevation, theme, style } = options;

  let width: number;
  let depth: number;
  let x: number;
  let z: number;

  // Determine wall dimensions and position based on direction
  switch (wall.direction) {
    case 'top':
      width = room.width + wallThickness;
      depth = wallThickness;
      x = room.x + room.width / 2;
      z = room.z - wallThickness / 2;
      break;
    case 'bottom':
      width = room.width + wallThickness;
      depth = wallThickness;
      x = room.x + room.width / 2;
      z = room.z + room.height + wallThickness / 2;
      break;
    case 'left':
      width = wallThickness;
      depth = room.height + wallThickness;
      x = room.x - wallThickness / 2;
      z = room.z + room.height / 2;
      break;
    case 'right':
      width = wallThickness;
      depth = room.height + wallThickness;
      x = room.x + room.width + wallThickness / 2;
      z = room.z + room.height / 2;
      break;
    default:
      return null;
  }

  const geometry = new THREE.BoxGeometry(width, wallHeight, depth);
  const material = MaterialFactory.createWallMaterial(style, theme);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `wall_${room.name}_${wall.direction}`;

  // Position with center at half height
  mesh.position.set(x, elevation + wallHeight / 2, z);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Check if two rooms share a wall (for wall deduplication)
 */
export function roomsShareWall(
  room1: JsonRoom,
  room2: JsonRoom,
  wallThickness: number = DIMENSIONS.WALL.THICKNESS
): { shared: boolean; direction1?: string; direction2?: string } {
  const tolerance = wallThickness * 0.5;

  // Check if room1's right wall touches room2's left wall
  if (Math.abs((room1.x + room1.width) - room2.x) < tolerance) {
    // Check vertical overlap
    const overlapStart = Math.max(room1.z, room2.z);
    const overlapEnd = Math.min(room1.z + room1.height, room2.z + room2.height);
    if (overlapEnd > overlapStart) {
      return { shared: true, direction1: 'right', direction2: 'left' };
    }
  }

  // Check if room1's bottom wall touches room2's top wall
  if (Math.abs((room1.z + room1.height) - room2.z) < tolerance) {
    // Check horizontal overlap
    const overlapStart = Math.max(room1.x, room2.x);
    const overlapEnd = Math.min(room1.x + room1.width, room2.x + room2.width);
    if (overlapEnd > overlapStart) {
      return { shared: true, direction1: 'bottom', direction2: 'top' };
    }
  }

  return { shared: false };
}

