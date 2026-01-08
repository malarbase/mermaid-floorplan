/**
 * Floor slab geometry generation for 3D floorplan rendering
 */

import * as THREE from 'three';
import type { JsonFloor, JsonRoom } from './types.js';
import { DIMENSIONS } from './constants.js';
import { MaterialFactory, type MaterialStyle } from './materials.js';
import type { ViewerTheme } from './constants.js';
import { isCsgAvailable, getCSG, type CSGBrush } from './csg-manager.js';
import { reassignMaterialsByNormal } from './csg-utils.js';

export interface FloorSlabOptions {
  /** Floor slab thickness (default: DIMENSIONS.FLOOR.THICKNESS) */
  thickness?: number;
  /** Theme for default materials */
  theme?: ViewerTheme;
  /** Style lookup map: room name -> MaterialStyle */
  styleMap?: Map<string, MaterialStyle>;
  /** Vertical penetrations (stairs/lifts) to cut holes for */
  penetrations?: THREE.Box3[];
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
  const penetrations = options.penetrations || [];

  // Use CSG if available and we have penetrations
  const useCSG = isCsgAvailable() && penetrations.length > 0;
  let evaluator = null;
  
  if (useCSG) {
    const { Evaluator } = getCSG();
    evaluator = new Evaluator();
  }

  for (const room of floor.rooms) {
    let slab: THREE.Mesh;
    
    // Check if any penetration intersects this room
    const roomBox = new THREE.Box3(
      new THREE.Vector3(room.x, -Infinity, room.z),
      new THREE.Vector3(room.x + room.width, Infinity, room.z + room.height)
    );
    
    const intersectingPenetrations = penetrations.filter(p => roomBox.intersectsBox(p));
    
    if (useCSG && evaluator && intersectingPenetrations.length > 0) {
      slab = generateRoomFloorSlabWithCSG(
        room, thickness, theme, styleMap.get(room.name), 
        intersectingPenetrations, evaluator
      );
    } else {
      slab = generateRoomFloorSlab(room, thickness, theme, styleMap.get(room.name));
    }
    
    group.add(slab);
  }

  return group;
}

/**
 * Generate a single room's floor slab with CSG holes
 */
function generateRoomFloorSlabWithCSG(
  room: JsonRoom,
  thickness: number,
  theme: ViewerTheme | undefined,
  style: MaterialStyle | undefined,
  penetrations: THREE.Box3[],
  evaluator: any // CSGEvaluator
): THREE.Mesh {
  const { Brush, SUBTRACTION } = getCSG();
  
  // Base slab
  const geometry = new THREE.BoxGeometry(room.width, thickness, room.height);
  const material = MaterialFactory.createFloorMaterial(style, theme);
  const brush = new Brush(geometry, material);
  
  // Position at room center
  brush.position.set(
    room.x + room.width / 2,
    -thickness / 2 + (room.elevation ?? 0),
    room.z + room.height / 2
  );
  brush.updateMatrixWorld();
  
  let resultBrush = brush;
  
  // Cut holes
  for (const p of penetrations) {
    // Create a cutter brush
    const w = p.max.x - p.min.x;
    const d = p.max.z - p.min.z;
    const h = thickness * 4; // Make it significantly thicker
    
    const cutterGeom = new THREE.BoxGeometry(w, h, d);
    const cutter = new Brush(cutterGeom);
    
    const cx = p.min.x + w / 2;
    const cz = p.min.z + d / 2;
    const cy = brush.position.y; // Center vertically on the slab
    
    cutter.position.set(cx, cy, cz);
    cutter.updateMatrixWorld();
    
    resultBrush = evaluator.evaluate(resultBrush, cutter, SUBTRACTION);
  }
  
  // Final mesh
  // Note: CSG destroys material groups, but for floor slabs we usually use a single material.
  // If we used multi-material floors, we'd need reassignMaterialsByNormal.
  // Floor material is typically single.
  const mesh = new THREE.Mesh(resultBrush.geometry, material);
  mesh.name = `floor_slab_${room.name}`;
  mesh.position.copy(resultBrush.position);
  mesh.receiveShadow = true;
  
  return mesh;
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

