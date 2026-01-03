/**
 * Material factory for 3D floorplan rendering (browser version)
 * 
 * Extends the base MaterialFactory from floorplan-3d-core with
 * browser-specific async texture loading capabilities.
 */

import * as THREE from 'three';

// Re-export everything from the shared library
export { MaterialFactory, type MaterialSet, type MaterialStyle } from 'floorplan-3d-core';
import { MaterialFactory as BaseMaterialFactory, type MaterialStyle, type MaterialSet, type ViewerTheme } from 'floorplan-3d-core';

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
 * Browser-specific material factory extension with async texture loading
 */
export class BrowserMaterialFactory extends BaseMaterialFactory {
  /**
   * Create floor material with texture (async - browser only)
   */
  static async createFloorMaterialAsync(style?: MaterialStyle, theme?: ViewerTheme): Promise<THREE.MeshStandardMaterial> {
    const material = this.createFloorMaterial(style, theme);

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
   * Create wall material with texture (async - browser only)
   */
  static async createWallMaterialAsync(style?: MaterialStyle, theme?: ViewerTheme): Promise<THREE.MeshStandardMaterial> {
    const material = this.createWallMaterial(style, theme);

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

  /**
   * Create material set with textures and theme (async - browser only)
   */
  static async createMaterialSetAsync(style?: MaterialStyle, theme?: ViewerTheme): Promise<MaterialSet> {
    const [floor, wall] = await Promise.all([
      this.createFloorMaterialAsync(style, theme),
      this.createWallMaterialAsync(style, theme),
    ]);

    return {
      floor,
      wall,
      window: this.createWindowMaterial(theme),
      door: this.createDoorMaterial(theme),
      stair: this.createStairMaterial(),
      lift: this.createLiftMaterial(),
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
}
