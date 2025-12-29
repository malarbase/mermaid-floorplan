/**
 * Shared architectural constants for 3D floorplan rendering
 * These dimensions can be adjusted to match real-world scales
 */

export const DIMENSIONS = {
  WALL: {
    THICKNESS: 0.2,
    HEIGHT: 3.35, // 11 feet (scale: 1 unit ≈ 3.3 feet)
  },
  FLOOR: {
    THICKNESS: 0.2,
  },
  DOOR: {
    WIDTH: 1.0,
    HEIGHT: 2.1,
    PANEL_THICKNESS: 0.05,
    DEFAULT_SWING_ANGLE: Math.PI / 4, // 45 degrees
  },
  DOUBLE_DOOR: {
    WIDTH: 1.8,
  },
  WINDOW: {
    WIDTH: 1.5,
    HEIGHT: 1.2,
    SILL_HEIGHT: 0.9,
    GLASS_THICKNESS: 0.05,
  },
  EXPLODED_VIEW: {
    MAX_SEPARATION: 10, // units
  },
} as const;

export const COLORS = {
  FLOOR: 0xe0e0e0,
  WALL: 0x909090,
  WINDOW: 0x88ccff,
  DOOR: 0x8b4513, // SaddleBrown
  BACKGROUND: 0xf5f5f7,
} as const;

export const MATERIAL_PROPERTIES = {
  FLOOR: {
    roughness: 0.8,
    metalness: 0.1,
  },
  WALL: {
    roughness: 0.5,
    metalness: 0.0,
  },
  WINDOW: {
    roughness: 0.0,
    metalness: 0.9,
    transparent: true,
    opacity: 0.3,
  },
  DOOR: {
    roughness: 0.7,
    metalness: 0.0,
  },
} as const;

