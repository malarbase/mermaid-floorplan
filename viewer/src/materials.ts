/**
 * Material factory for 3D floorplan rendering
 * Supports style-based colors, textures, and PBR properties
 */

import * as THREE from 'three';
import { COLORS, MATERIAL_PROPERTIES } from './constants';
import type { JsonStyle } from './types';

export interface MaterialSet {
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
}

/**
 * Resolved style properties for material creation
 */
export interface MaterialStyle {
  floor_color?: string;
  wall_color?: string;
  floor_texture?: string;
  wall_texture?: string;
  roughness?: number;
  metalness?: number;
}

// Texture cache to avoid duplicate loads
const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

/**
 * Load a texture with caching and error handling
 */
async function loadTexture(url: string): Promise<THREE.Texture | null> {
  // Check cache first
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }
  
  try {
    const texture = await textureLoader.loadAsync(url);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    textureCache.set(url, texture);
    return texture;
  } catch {
    console.warn(`Failed to load texture: ${url}`);
    return null;
  }
}

/**
 * Parse hex color string to THREE.Color number
 */
function parseHexColor(hex: string): number {
  // Remove # prefix if present
  const cleanHex = hex.replace(/^#/, '');
  return parseInt(cleanHex, 16);
}

export class MaterialFactory {
  /**
   * Create floor material with optional style
   */
  static createFloorMaterial(style?: MaterialStyle): THREE.MeshStandardMaterial {
    const color = style?.floor_color 
      ? parseHexColor(style.floor_color) 
      : COLORS.FLOOR;
    
    return new THREE.MeshStandardMaterial({
      color,
      roughness: style?.roughness ?? MATERIAL_PROPERTIES.FLOOR.roughness,
      metalness: style?.metalness ?? MATERIAL_PROPERTIES.FLOOR.metalness,
    });
  }

  /**
   * Create floor material with texture (async)
   */
  static async createFloorMaterialAsync(style?: MaterialStyle): Promise<THREE.MeshStandardMaterial> {
    const material = this.createFloorMaterial(style);
    
    // Load texture if specified
    if (style?.floor_texture) {
      const texture = await loadTexture(style.floor_texture);
      if (texture) {
        material.map = texture;
        material.needsUpdate = true;
      }
    }
    
    return material;
  }

  /**
   * Create wall material with optional style
   */
  static createWallMaterial(style?: MaterialStyle): THREE.MeshStandardMaterial {
    const color = style?.wall_color 
      ? parseHexColor(style.wall_color) 
      : COLORS.WALL;
    
    return new THREE.MeshStandardMaterial({
      color,
      roughness: style?.roughness ?? MATERIAL_PROPERTIES.WALL.roughness,
      metalness: style?.metalness ?? MATERIAL_PROPERTIES.WALL.metalness,
    });
  }

  /**
   * Create wall material with texture (async)
   */
  static async createWallMaterialAsync(style?: MaterialStyle): Promise<THREE.MeshStandardMaterial> {
    const material = this.createWallMaterial(style);
    
    // Load texture if specified
    if (style?.wall_texture) {
      const texture = await loadTexture(style.wall_texture);
      if (texture) {
        material.map = texture;
        material.needsUpdate = true;
      }
    }
    
    return material;
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

  /**
   * Create material set with optional style (sync, no textures)
   */
  static createMaterialSet(style?: MaterialStyle): MaterialSet {
    return {
      floor: this.createFloorMaterial(style),
      wall: this.createWallMaterial(style),
      window: this.createWindowMaterial(),
      door: this.createDoorMaterial(),
    };
  }

  /**
   * Create material set with textures (async)
   */
  static async createMaterialSetAsync(style?: MaterialStyle): Promise<MaterialSet> {
    const [floor, wall] = await Promise.all([
      this.createFloorMaterialAsync(style),
      this.createWallMaterialAsync(style),
    ]);
    
    return {
      floor,
      wall,
      window: this.createWindowMaterial(),
      door: this.createDoorMaterial(),
    };
  }

  /**
   * Convert JsonStyle to MaterialStyle
   */
  static jsonStyleToMaterialStyle(jsonStyle: JsonStyle): MaterialStyle {
    return {
      floor_color: jsonStyle.floor_color,
      wall_color: jsonStyle.wall_color,
      floor_texture: jsonStyle.floor_texture,
      wall_texture: jsonStyle.wall_texture,
      roughness: jsonStyle.roughness,
      metalness: jsonStyle.metalness,
    };
  }

  /**
   * Clear texture cache (useful for cleanup or reloading)
   */
  static clearTextureCache(): void {
    for (const texture of textureCache.values()) {
      texture.dispose();
    }
    textureCache.clear();
  }

  /**
   * Create a 6-material array for per-face wall rendering.
   * Used for shared walls where interior and exterior faces need different colors.
   * 
   * BoxGeometry face order:
   *   0: +X (right side)
   *   1: -X (left side)
   *   2: +Y (top)
   *   3: -Y (bottom)
   *   4: +Z (front)
   *   5: -Z (back)
   * 
   * @param ownerStyle Style of the wall owner (used for sides, top, bottom, exterior)
   * @param adjacentStyle Style of the adjacent room (used for interior face)
   * @param wallDirection Direction of the wall to determine which face is interior
   * @returns Array of 6 materials for BoxGeometry
   */
  static createPerFaceWallMaterials(
    ownerStyle: MaterialStyle | undefined,
    adjacentStyle: MaterialStyle | undefined,
    wallDirection: 'top' | 'bottom' | 'left' | 'right'
  ): THREE.MeshStandardMaterial[] {
    const ownerMat = this.createWallMaterial(ownerStyle);
    const adjMat = adjacentStyle 
      ? this.createWallMaterial(adjacentStyle)
      : ownerMat;

    // Default: all faces use owner material
    const materials: THREE.MeshStandardMaterial[] = [
      ownerMat,  // +X
      ownerMat,  // -X
      ownerMat,  // +Y (top)
      ownerMat,  // -Y (bottom)
      ownerMat,  // +Z
      ownerMat,  // -Z
    ];

    // Set exterior face based on wall direction
    // The exterior face is the one facing OUT toward the adjacent room
    // 
    // For a left wall of owner room:
    //   - The wall is at the owner's left edge (lower X)
    //   - +X face points INTO the owner room (should be owner color)
    //   - -X face points OUT toward adjacent room (should be adjacent color)
    //
    // For a right wall of owner room:
    //   - The wall is at the owner's right edge (higher X)
    //   - +X face points OUT toward adjacent room (should be adjacent color)
    //   - -X face points INTO the owner room (should be owner color)
    switch (wallDirection) {
      case 'top':
        // Top wall: -Z face points toward adjacent room (above in world space)
        materials[5] = adjMat;
        break;
      case 'bottom':
        // Bottom wall: +Z face points toward adjacent room (below in world space)
        materials[4] = adjMat;
        break;
      case 'left':
        // Left wall: -X face points toward adjacent room (to the left)
        materials[1] = adjMat;
        break;
      case 'right':
        // Right wall: +X face points toward adjacent room (to the right)
        materials[0] = adjMat;
        break;
    }

    return materials;
  }
}

