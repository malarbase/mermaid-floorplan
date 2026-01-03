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

// Main renderer
export {
  render,
  renderFloor,
  renderToFile,
  type RenderOptions,
  type AreaUnit,
} from "./renderer.js";

// Dimension rendering
export {
  generateDimensionLine,
  generateRoomDimensions,
  generateFloorDimensions,
  generateBoundingBoxDimensions,
  type DimensionType,
  type DimensionRenderOptions,
} from "./dimension.js";

// Component renderers
export { calculateFloorBounds, generateFloorRectangle, type FloorBounds } from "./floor.js";
export { generateRoomSvg, generateRoomText, type RoomRenderOptions } from "./room.js";
export { wallRectangle } from "./wall.js";
export { generateDoor } from "./door.js";
export { generateWindow } from "./window.js";
export { generateConnection, generateConnections } from "./connection.js";
export { 
  generateFloorCirculation, 
  generateStairSvg, 
  generateLiftSvg,
  type StairRenderOptions 
} from "./stair-renderer.js";

// Position resolution (relative positioning)
export {
  resolveFloorPositions,
  resolveAllPositions,
  getResolvedPosition,
  type ResolvedPosition,
  type PositionResolutionResult,
  type PositionResolutionError,
  type OverlapWarning,
} from "./position-resolver.js";

// Variable resolution
export {
  resolveVariables,
  getResolvedSize,
  validateSizeReferences,
  getResolvedConfig,
  getRoomSize,
  getRoomSizeWithUnits,
  type VariableResolutionResult,
  type VariableResolutionError,
  type ResolvedConfig,
  type ResolvedDimension,
} from "./variable-resolver.js";

// Unit utilities
export {
  DEFAULT_UNIT,
  UNIT_TO_METERS,
  METERS_TO_UNIT,
  UNIT_SYSTEM,
  VALID_UNITS,
  toMeters,
  fromMeters,
  convertUnit,
  isLengthUnit,
  getConfigDefaultUnit,
  resolveUnit,
  resolveValueToMeters,
  resolveValue,
  resolveDimension,
  resolveDimensionToMeters,
  resolveCoordinate,
  resolveCoordinateToMeters,
  collectUnits,
  hasMixedUnitSystems,
  getUnitSystems,
  type LengthUnit,
} from "./unit-utils.js";

// Theming
export {
  getStyles,
  defaultThemeOptions,
  darkTheme,
  blueprintTheme,
  themeRegistry,
  getThemeByName,
  isValidTheme,
  getAvailableThemes,
  normalizeConfigKey,
  normalizeConfigKeys,
  type FloorplanThemeOptions,
} from "./styles.js";

// Config resolution (Mermaid-aligned)
export {
  resolveConfig,
  resolveThemeOptions,
  getEffectiveThemeName,
  DEFAULT_CONFIG,
  type ParsedConfig,
} from "./config-resolver.js";

// Frontmatter parsing (Mermaid v10.5.0+ compatible)
export {
  parseFrontmatter,
  hasFrontmatter,
  stripFrontmatter,
  type FrontmatterResult,
} from "./frontmatter-parser.js";

// Style resolution
export {
  buildStyleContext,
  resolveRoomStyle,
  getStyleByName,
  DEFAULT_STYLE,
  type StyleContext,
  type ResolvedStyle,
} from "./style-resolver.js";

// JSON conversion (shared between CLI and browser)
export {
  convertFloorplanToJson,
  type JsonExport,
  type JsonFloor,
  type JsonRoom,
  type JsonWall,
  type JsonConnection,
  type JsonConfig,
  type JsonStyle,
  type JsonStair,
  type JsonStairShape,
  type JsonStairSegment,
  type JsonLift,
  type JsonVerticalConnection,
  type ConversionResult,
  type ConversionError,
} from "./json-converter.js";

// Metrics computation
export {
  computeRoomMetrics,
  computeFloorMetrics,
  computeFloorplanSummary,
  computeFloorplanMetrics,
  computeBoundingBox,
  enhanceRoomWithMetrics,
  enhanceFloorWithMetrics,
  formatArea,
  formatEfficiency,
  formatSummaryTable,
  type RoomMetrics,
  type FloorMetrics,
  type FloorplanSummary,
  type BoundingBox,
} from "./metrics.js";

// Geometry utilities (shared between 2D/SVG and 3D rendering)
export {
  calculateWallOverlap,
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
  calculateWallBoundsOverlap,
  calculatePositionOnWallOverlap,
  type RoomBounds,
  type WallBounds,
} from "./geometry-utils.js";

// Unified Generator API (following Langium generator pattern)
export {
  generate,
  generateToSvg,
  generateToJson,
  type GeneratorFormat,
  type GeneratorOptions,
  type SvgGeneratorOptions,
  type JsonGeneratorOptions,
  type GeneratorResult,
  type SvgGeneratorResult,
  type JsonGeneratorResult,
  type GeneratorError,
} from "./generator.js";

// Grammar versioning system
export {
  CURRENT_VERSION,
  parseVersion,
  compareVersions,
  isCompatibleVersion,
  isFutureVersion,
  extractVersionFromAST,
  resolveVersion,
  formatVersion,
  type SemanticVersion,
} from "./version-resolver.js";

// Deprecation system
export {
  isDeprecated,
  isRemoved,
  getDeprecationWarning,
  getRemovalError,
  getActiveDeprecations,
  getRemovedFeatures,
  DEPRECATION_REGISTRY,
  type DeprecationInfo,
} from "./deprecation-registry.js";

// Migration utilities
export {
  migrate,
  type MigrationResult,
  type MigrationStep,
} from "./migrator.js";
