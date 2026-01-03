/**
 * Floor slab geometry generation for 3D floorplan rendering
 */

import * as THREE from 'three';
import type { JsonFloor, JsonRoom } from './types.js';
import { DIMENSIONS } from './constants.js';
import { MaterialFactory, type MaterialStyle } from './materials.js';
import type { ViewerTheme } from './constants.js';

export interface FloorSlabOptions {
  /** Floor slab thickness (default: DIMENSIONS.FLOOR.THICKNESS) */
  thickness?: number;
  /** Theme for default materials */
  theme?: ViewerTheme;
  /** Style lookup map: room name -> MaterialStyle */
  styleMap?: Map<string, MaterialStyle>;
}

/**
 * Generate floor slab geometry for a single floor
 */
export function generateFloorSlabs(
  floor: JsonFloor,
  options: FloorSlabOptions = {}
): THREE.Group {
  const group = new THREE.Group();
  group.name = `floor_slabs_${floor.id}`;

  const thickness = options.thickness ?? DIMENSIONS.FLOOR.THICKNESS;
  const theme = options.theme;
  const styleMap = options.styleMap ?? new Map();

  for (const room of floor.rooms) {
    const slab = generateRoomFloorSlab(room, thickness, theme, styleMap.get(room.name));
    group.add(slab);
  }

  return group;
}

/**
 * Generate a single room's floor slab
 */
export function generateRoomFloorSlab(
  room: JsonRoom,
  thickness: number = DIMENSIONS.FLOOR.THICKNESS,
  theme?: ViewerTheme,
  style?: MaterialStyle
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(room.width, thickness, room.height);
  const material = MaterialFactory.createFloorMaterial(style, theme);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `floor_slab_${room.name}`;

  // Position at room center, with top of slab at y=0 (ground level for this floor)
  // So the slab extends from y = -thickness to y = 0
  mesh.position.set(
    room.x + room.width / 2,
    -thickness / 2 + (room.elevation ?? 0),
    room.z + room.height / 2
  );

  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Compute the bounding box of all floor slabs
 */
export function computeFloorBounds(floor: JsonFloor): THREE.Box3 {
  const box = new THREE.Box3();

  for (const room of floor.rooms) {
    const roomBox = new THREE.Box3(
      new THREE.Vector3(room.x, (room.elevation ?? 0) - DIMENSIONS.FLOOR.THICKNESS, room.z),
      new THREE.Vector3(room.x + room.width, room.roomHeight ?? DIMENSIONS.WALL.HEIGHT, room.z + room.height)
    );
    box.union(roomBox);
  }

  return box;
}

