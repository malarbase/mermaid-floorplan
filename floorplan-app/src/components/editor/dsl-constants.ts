/**
 * Shared DSL grammar constants and types.
 *
 * Single source of truth for direction keywords, alignment options, wall
 * types, and related labels used by both AddRoomDialog and PropertiesPanel.
 */

// ─── Relative positioning ───────────────────────────────────────────

/** Relative direction keywords from the floorplan DSL grammar. */
export const RELATIVE_DIRECTIONS = [
  'right-of',
  'left-of',
  'above',
  'below',
  'above-right-of',
  'above-left-of',
  'below-right-of',
  'below-left-of',
] as const;

export type RelativeDirection = (typeof RELATIVE_DIRECTIONS)[number];

/** Friendly labels for relative directions. */
export const DIRECTION_LABELS: Record<RelativeDirection, string> = {
  'right-of': 'Right of',
  'left-of': 'Left of',
  above: 'Above',
  below: 'Below',
  'above-right-of': 'Above-right of',
  'above-left-of': 'Above-left of',
  'below-right-of': 'Below-right of',
  'below-left-of': 'Below-left of',
};

/** Alignment options for relative positioning. */
export const ALIGNMENT_OPTIONS = ['top', 'bottom', 'left', 'right', 'center'] as const;
export type AlignmentDirection = (typeof ALIGNMENT_OPTIONS)[number];

/** Which alignment options are valid for a given direction. */
export function getAlignmentOptions(direction: RelativeDirection): AlignmentDirection[] {
  if (direction === 'right-of' || direction === 'left-of') {
    return ['top', 'bottom', 'center'];
  }
  if (direction === 'above' || direction === 'below') {
    return ['left', 'right', 'center'];
  }
  // Diagonal directions don't have meaningful alignment
  return [];
}

export type PositioningMode = 'absolute' | 'relative';

// ─── Walls ──────────────────────────────────────────────────────────

export type WallType = 'solid' | 'open' | 'door' | 'window';
export type WallConfig = { top: WallType; right: WallType; bottom: WallType; left: WallType };
export const WALL_DIRECTIONS = ['top', 'right', 'bottom', 'left'] as const;

export const WALL_TYPES: WallType[] = ['solid', 'open', 'door', 'window'];

export const WALL_TYPE_LABELS: Record<WallType, string> = {
  solid: 'Solid',
  open: 'Open',
  door: 'Door',
  window: 'Window',
};

/** Wall presets for quick setup. */
export const WALL_PRESETS = {
  'all-solid': { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' } as WallConfig,
  'open-plan': { top: 'open', right: 'open', bottom: 'open', left: 'open' } as WallConfig,
  windowed: { top: 'window', right: 'solid', bottom: 'solid', left: 'solid' } as WallConfig,
  custom: null, // User picks per-wall
} as const;

export type WallPreset = keyof typeof WALL_PRESETS;

export const WALL_PRESET_LABELS: Record<WallPreset, string> = {
  'all-solid': 'Solid',
  'open-plan': 'Open',
  windowed: 'Windowed',
  custom: 'Custom',
};
