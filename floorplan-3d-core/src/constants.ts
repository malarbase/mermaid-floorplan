/**
 * Shared architectural constants for 3D floorplan rendering
 * These dimensions can be adjusted to match real-world scales
 */

/**
 * Supported length units in the DSL
 */
export type LengthUnit = 'm' | 'ft' | 'cm' | 'in' | 'mm';

/**
 * Default unit when no unit is specified in the DSL
 * Used as system fallback when config does not specify default_unit
 */
export const DEFAULT_UNIT: LengthUnit = 'm';

/**
 * Conversion factors to meters for each supported unit
 */
export const UNIT_TO_METERS: Record<LengthUnit, number> = {
  m: 1.0,
  ft: 0.3048,
  cm: 0.01,
  in: 0.0254,
  mm: 0.001,
} as const;

/**
 * Conversion factors from meters to each supported unit
 */
export const METERS_TO_UNIT: Record<LengthUnit, number> = {
  m: 1.0,
  ft: 3.28084,
  cm: 100.0,
  in: 39.3701,
  mm: 1000.0,
} as const;

/**
 * Unit system classification for mixed unit warning
 */
export const UNIT_SYSTEM: Record<LengthUnit, 'metric' | 'imperial'> = {
  m: 'metric',
  cm: 'metric',
  mm: 'metric',
  ft: 'imperial',
  in: 'imperial',
} as const;

/**
 * Convert a value from one unit to meters
 */
export function toMeters(value: number, unit: LengthUnit): number {
  return value * UNIT_TO_METERS[unit];
}

/**
 * Convert a value from meters to a target unit
 */
export function fromMeters(valueInMeters: number, targetUnit: LengthUnit): number {
  return valueInMeters * METERS_TO_UNIT[targetUnit];
}

/**
 * Convert a value from one unit to another
 */
export function convertUnit(value: number, fromUnit: LengthUnit, toUnit: LengthUnit): number {
  if (fromUnit === toUnit) return value;
  return fromMeters(toMeters(value, fromUnit), toUnit);
}

/**
 * Check if a string is a valid length unit
 */
export function isLengthUnit(unit: string | undefined): unit is LengthUnit {
  return unit !== undefined && unit in UNIT_TO_METERS;
}

/**
 * Get the effective unit from an explicit unit, config default, or system default
 */
export function resolveUnit(explicitUnit?: string, configDefault?: string): LengthUnit {
  if (explicitUnit && isLengthUnit(explicitUnit)) {
    return explicitUnit;
  }
  if (configDefault && isLengthUnit(configDefault)) {
    return configDefault;
  }
  return DEFAULT_UNIT;
}

export const DIMENSIONS = {
  WALL: {
    THICKNESS: 0.15,
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

/**
 * Dark theme colors for 3D viewer
 */
export const COLORS_DARK = {
  FLOOR: 0x3d3d3d,
  WALL: 0x6d6d6d,
  WINDOW: 0x4488cc,
  DOOR: 0x5c3317,
  BACKGROUND: 0x1a1a2e,
} as const;

/**
 * Blueprint theme colors for 3D viewer
 * Classic architectural blueprint: deep blue background with light lines
 */
export const COLORS_BLUEPRINT = {
  FLOOR: 0x1e3a5f, // Darker blue for floor
  WALL: 0x87ceeb, // Light sky blue for walls (like blueprint lines)
  WINDOW: 0xadd8e6, // Light blue for windows
  DOOR: 0xb8d4e8, // Pale blue for doors
  BACKGROUND: 0x0d2137, // Deep blueprint blue
} as const;

/**
 * Theme type for the viewer
 */
export type ViewerTheme = 'light' | 'dark' | 'blueprint';

/**
 * UI theme mode for components that only understand light/dark
 * (e.g., Monaco editor, DaisyUI data-theme)
 */
export type UIThemeMode = 'light' | 'dark';

/**
 * Themes that should use dark UI styling (dark backgrounds, light text).
 * Blueprint is considered dark because it has a dark blue background.
 */
const DARK_THEMES: ReadonlySet<ViewerTheme> = new Set(['dark', 'blueprint']);

/**
 * Check if a theme should use dark UI styling.
 * @param theme The viewer theme to check
 * @returns true if the theme requires dark UI styling
 */
export function isDarkTheme(theme: ViewerTheme): boolean {
  return DARK_THEMES.has(theme);
}

/**
 * Get the UI theme mode for a viewer theme.
 * Maps viewer themes to the binary light/dark mode used by UI components.
 * @param theme The viewer theme
 * @returns 'dark' for dark/blueprint themes, 'light' otherwise
 */
export function getUIThemeMode(theme: ViewerTheme): UIThemeMode {
  return isDarkTheme(theme) ? 'dark' : 'light';
}

/**
 * Color palette type
 */
export interface ThemeColors {
  readonly FLOOR: number;
  readonly WALL: number;
  readonly WINDOW: number;
  readonly DOOR: number;
  readonly BACKGROUND: number;
}

/**
 * Get color palette for a theme
 */
export function getThemeColors(theme: ViewerTheme): ThemeColors {
  switch (theme) {
    case 'dark':
      return COLORS_DARK;
    case 'blueprint':
      return COLORS_BLUEPRINT;
    default:
      return COLORS;
  }
}

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
  STAIR: {
    roughness: 0.7,
    metalness: 0.1,
    color: 0xcccccc, // Grey concrete
  },
  LIFT: {
    roughness: 0.1,
    metalness: 0.5,
    color: 0xaaaaaa,
    opacity: 0.3,
  },
} as const;
