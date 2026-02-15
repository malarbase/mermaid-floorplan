/**
 * Material factory for 3D floorplan rendering
 * Supports style-based colors, textures, and PBR properties
 *
 * Note: This is the core material factory without browser-specific texture loading.
 * For texture support in browser contexts, use the async methods with a texture loader.
 */

import * as THREE from 'three';
import { COLORS, getThemeColors, MATERIAL_PROPERTIES, type ViewerTheme } from './constants.js';
import type { JsonStyle } from './types.js';

export interface MaterialSet {
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  stair: THREE.MeshStandardMaterial;
  lift: THREE.MeshStandardMaterial;
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

/**
 * Parse hex color string to THREE.Color number
 */
export function parseHexColor(hex: string): number {
  // Remove # prefix if present
  const cleanHex = hex.replace(/^#/, '');
  return parseInt(cleanHex, 16);
}

export class MaterialFactory {
  /**
   * Create floor material with optional style and theme
   */
  static createFloorMaterial(
    style?: MaterialStyle,
    theme?: ViewerTheme,
  ): THREE.MeshStandardMaterial {
    const themeColors = theme ? getThemeColors(theme) : COLORS;
    const color = style?.floor_color ? parseHexColor(style.floor_color) : themeColors.FLOOR;

    return new THREE.MeshStandardMaterial({
      color,
      roughness: style?.roughness ?? MATERIAL_PROPERTIES.FLOOR.roughness,
      metalness: style?.metalness ?? MATERIAL_PROPERTIES.FLOOR.metalness,
    });
  }

  /**
   * Create wall material with optional style and theme
   */
  static createWallMaterial(
    style?: MaterialStyle,
    theme?: ViewerTheme,
  ): THREE.MeshStandardMaterial {
    const themeColors = theme ? getThemeColors(theme) : COLORS;
    const color = style?.wall_color ? parseHexColor(style.wall_color) : themeColors.WALL;

    return new THREE.MeshStandardMaterial({
      color,
      roughness: style?.roughness ?? MATERIAL_PROPERTIES.WALL.roughness,
      metalness: style?.metalness ?? MATERIAL_PROPERTIES.WALL.metalness,
    });
  }

  static createWindowMaterial(theme?: ViewerTheme): THREE.MeshStandardMaterial {
    const themeColors = theme ? getThemeColors(theme) : COLORS;
    return new THREE.MeshStandardMaterial({
      color: themeColors.WINDOW,
      transparent: MATERIAL_PROPERTIES.WINDOW.transparent,
      opacity: MATERIAL_PROPERTIES.WINDOW.opacity,
      roughness: MATERIAL_PROPERTIES.WINDOW.roughness,
      metalness: MATERIAL_PROPERTIES.WINDOW.metalness,
    });
  }

  static createDoorMaterial(theme?: ViewerTheme): THREE.MeshStandardMaterial {
    const themeColors = theme ? getThemeColors(theme) : COLORS;
    return new THREE.MeshStandardMaterial({
      color: themeColors.DOOR,
      roughness: MATERIAL_PROPERTIES.DOOR.roughness,
      metalness: MATERIAL_PROPERTIES.DOOR.metalness,
    });
  }

  static createStairMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: MATERIAL_PROPERTIES.STAIR.color,
      roughness: MATERIAL_PROPERTIES.STAIR.roughness,
      metalness: MATERIAL_PROPERTIES.STAIR.metalness,
    });
  }

  static createLiftMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: MATERIAL_PROPERTIES.LIFT.color,
      transparent: true,
      opacity: MATERIAL_PROPERTIES.LIFT.opacity,
      roughness: MATERIAL_PROPERTIES.LIFT.roughness,
      metalness: MATERIAL_PROPERTIES.LIFT.metalness,
    });
  }

  /**
   * Create material set with optional style and theme (sync, no textures)
   */
  static createMaterialSet(style?: MaterialStyle, theme?: ViewerTheme): MaterialSet {
    return {
      floor: MaterialFactory.createFloorMaterial(style, theme),
      wall: MaterialFactory.createWallMaterial(style, theme),
      window: MaterialFactory.createWindowMaterial(theme),
      door: MaterialFactory.createDoorMaterial(theme),
      stair: MaterialFactory.createStairMaterial(),
      lift: MaterialFactory.createLiftMaterial(),
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
   * @param theme Optional theme for material colors when no style is specified
   * @returns Array of 6 materials for BoxGeometry
   */
  static createPerFaceWallMaterials(
    ownerStyle: MaterialStyle | undefined,
    adjacentStyle: MaterialStyle | undefined,
    wallDirection: 'top' | 'bottom' | 'left' | 'right',
    theme?: ViewerTheme,
  ): THREE.MeshStandardMaterial[] {
    const ownerMat = MaterialFactory.createWallMaterial(ownerStyle, theme);
    const adjMat = adjacentStyle
      ? MaterialFactory.createWallMaterial(adjacentStyle, theme)
      : ownerMat;

    // Default: all faces use owner material
    const materials: THREE.MeshStandardMaterial[] = [
      ownerMat, // +X
      ownerMat, // -X
      ownerMat, // +Y (top)
      ownerMat, // -Y (bottom)
      ownerMat, // +Z
      ownerMat, // -Z
    ];

    // Set exterior face based on wall direction
    switch (wallDirection) {
      case 'top':
        materials[5] = adjMat;
        break;
      case 'bottom':
        materials[4] = adjMat;
        break;
      case 'left':
        materials[1] = adjMat;
        break;
      case 'right':
        materials[0] = adjMat;
        break;
    }

    return materials;
  }
}
