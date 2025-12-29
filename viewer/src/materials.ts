/**
 * Material factory for 3D floorplan rendering
 */

import * as THREE from 'three';
import { COLORS, MATERIAL_PROPERTIES } from './constants';

export interface MaterialSet {
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
}

export class MaterialFactory {
  static createFloorMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: COLORS.FLOOR,
      roughness: MATERIAL_PROPERTIES.FLOOR.roughness,
      metalness: MATERIAL_PROPERTIES.FLOOR.metalness,
    });
  }

  static createWallMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: COLORS.WALL,
      roughness: MATERIAL_PROPERTIES.WALL.roughness,
      metalness: MATERIAL_PROPERTIES.WALL.metalness,
    });
  }

  static createWindowMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: COLORS.WINDOW,
      transparent: MATERIAL_PROPERTIES.WINDOW.transparent,
      opacity: MATERIAL_PROPERTIES.WINDOW.opacity,
      roughness: MATERIAL_PROPERTIES.WINDOW.roughness,
      metalness: MATERIAL_PROPERTIES.WINDOW.metalness,
    });
  }

  static createDoorMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: COLORS.DOOR,
      roughness: MATERIAL_PROPERTIES.DOOR.roughness,
      metalness: MATERIAL_PROPERTIES.DOOR.metalness,
    });
  }

  static createMaterialSet(): MaterialSet {
    return {
      floor: this.createFloorMaterial(),
      wall: this.createWallMaterial(),
      window: this.createWindowMaterial(),
      door: this.createDoorMaterial(),
    };
  }
}

