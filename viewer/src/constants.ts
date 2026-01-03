/**
 * Re-export all constants from floorplan-3d-core shared library
 * This ensures consistent rendering between viewer and MCP server
 */
export {
  // Length units
  DEFAULT_UNIT,
  UNIT_TO_METERS,
  METERS_TO_UNIT,
  toMeters,
  isLengthUnit,
  type LengthUnit,
  // Architectural dimensions
  DIMENSIONS,
  // Color themes
  COLORS,
  COLORS_DARK,
  COLORS_BLUEPRINT,
  getThemeColors,
  type ViewerTheme,
  // Material properties
  MATERIAL_PROPERTIES,
} from 'floorplan-3d-core';
