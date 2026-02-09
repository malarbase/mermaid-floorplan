/**
 * Floorplan Diagram for Mermaid
 *
 * This module provides the complete floorplan diagram implementation
 * following Mermaid's diagram architecture conventions.
 *
 * Structure follows: https://mermaid.js.org/community/new-diagram.html
 * - floorplans.langium: Grammar definition (Langium)
 * - renderer.ts: SVG rendering logic
 * - styles.ts: Theming support
 * - floor.ts, room.ts, wall.ts, door.ts, window.ts, connection.ts: Component renderers
 * - position-resolver.ts: Relative positioning resolution
 */

// Config resolution (Mermaid-aligned)
export {
  DEFAULT_CONFIG,
  getEffectiveThemeName,
  type ParsedConfig,
  resolveConfig,
  resolveThemeOptions,
} from './config-resolver.js';
export { generateConnection, generateConnections } from './connection.js';
// Deprecation system
export {
  DEPRECATION_REGISTRY,
  type DeprecationInfo,
  getActiveDeprecations,
  getDeprecationWarning,
  getRemovalError,
  getRemovedFeatures,
  isDeprecated,
  isRemoved,
} from './deprecation-registry.js';
// Dimension rendering
export {
  type DimensionRenderOptions,
  type DimensionType,
  generateBoundingBoxDimensions,
  generateDimensionLine,
  generateFloorDimensions,
  generateRoomDimensions,
} from './dimension.js';
export { generateDoor } from './door.js';
// DXF Export
export {
  DXF_COLORS,
  DXF_LAYERS,
  type DxfExportOptions,
  type DxfExportResult,
  exportFloorplanToDxf,
  exportFloorToDxf,
} from './dxf-exporter.js';
// Component renderers
export { calculateFloorBounds, type FloorBounds, generateFloorRectangle } from './floor.js';
// Frontmatter parsing (Mermaid v10.5.0+ compatible)
export {
  type FrontmatterResult,
  hasFrontmatter,
  parseFrontmatter,
  stripFrontmatter,
} from './frontmatter-parser.js';
// Unified Generator API (following Langium generator pattern)
export {
  type GeneratorError,
  type GeneratorFormat,
  type GeneratorOptions,
  type GeneratorResult,
  generate,
  generateToJson,
  generateToSvg,
  type JsonGeneratorOptions,
  type JsonGeneratorResult,
  type SvgGeneratorOptions,
  type SvgGeneratorResult,
} from './generator.js';
// Geometry utilities (shared between 2D/SVG and 3D rendering)
export {
  calculatePositionOnOverlap,
  calculatePositionOnWallOverlap,
  calculatePositionWithFallback,
  calculateWallBoundsOverlap,
  calculateWallOverlap,
  type RoomBounds,
  type WallBounds,
} from './geometry-utils.js';
// JSON conversion (shared between CLI and browser)
export {
  type ConversionError,
  type ConversionResult,
  convertFloorplanToJson,
  type JsonConfig,
  type JsonConnection,
  type JsonExport,
  type JsonFloor,
  type JsonLift,
  type JsonRoom,
  type JsonSourceRange,
  type JsonStair,
  type JsonStairSegment,
  type JsonStairShape,
  type JsonStyle,
  type JsonVerticalConnection,
  type JsonWall,
} from './json-converter.js';
// Metrics computation
export {
  type BoundingBox,
  computeBoundingBox,
  computeFloorMetrics,
  computeFloorplanMetrics,
  computeFloorplanSummary,
  computeRoomMetrics,
  enhanceFloorWithMetrics,
  enhanceRoomWithMetrics,
  type FloorMetrics,
  type FloorplanSummary,
  formatArea,
  formatEfficiency,
  formatSummaryTable,
  type RoomMetrics,
} from './metrics.js';
// Migration utilities
export {
  type MigrationResult,
  type MigrationStep,
  migrate,
} from './migrator.js';
// Position resolution (relative positioning)
export {
  getResolvedPosition,
  type OverlapWarning,
  type PositionResolutionError,
  type PositionResolutionResult,
  type ResolvedPosition,
  resolveAllPositions,
  resolveFloorPositions,
} from './position-resolver.js';
// Main renderer
export {
  type AreaUnit,
  type RenderOptions,
  render,
  renderFloor,
  renderToFile,
} from './renderer.js';
export { generateRoomSvg, generateRoomText, type RoomRenderOptions } from './room.js';
export {
  generateFloorCirculation,
  generateLiftSvg,
  generateStairSvg,
  type StairRenderOptions,
} from './stair-renderer.js';
// Style resolution
export {
  buildStyleContext,
  DEFAULT_STYLE,
  getStyleByName,
  type ResolvedStyle,
  resolveRoomStyle,
  type StyleContext,
} from './style-resolver.js';
// Theming
export {
  blueprintTheme,
  darkTheme,
  defaultThemeOptions,
  type FloorplanThemeOptions,
  getAvailableThemes,
  getStyles,
  getThemeByName,
  isValidTheme,
  normalizeConfigKey,
  normalizeConfigKeys,
  themeRegistry,
} from './styles.js';
// Unit utilities
export {
  collectUnits,
  convertUnit,
  DEFAULT_UNIT,
  fromMeters,
  getConfigDefaultUnit,
  getUnitSystems,
  hasMixedUnitSystems,
  isLengthUnit,
  type LengthUnit,
  METERS_TO_UNIT,
  resolveCoordinate,
  resolveCoordinateToMeters,
  resolveDimension,
  resolveDimensionToMeters,
  resolveUnit,
  resolveValue,
  resolveValueToMeters,
  toMeters,
  UNIT_SYSTEM,
  UNIT_TO_METERS,
  VALID_UNITS,
} from './unit-utils.js';
// Variable resolution
export {
  getResolvedConfig,
  getResolvedSize,
  getRoomSize,
  getRoomSizeWithUnits,
  type ResolvedConfig,
  type ResolvedDimension,
  resolveVariables,
  type VariableResolutionError,
  type VariableResolutionResult,
  validateSizeReferences,
} from './variable-resolver.js';
// Grammar versioning system
export {
  CURRENT_VERSION,
  compareVersions,
  extractVersionFromAST,
  formatVersion,
  isCompatibleVersion,
  isFutureVersion,
  parseVersion,
  resolveVersion,
  type SemanticVersion,
} from './version-resolver.js';
export { wallRectangle } from './wall.js';
export { generateWindow } from './window.js';
