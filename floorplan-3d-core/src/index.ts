/**
 * floorplan-3d-core
 * 
 * Shared 3D rendering primitives for floorplan visualization.
 * Works in both browser and Node.js (headless) environments.
 */

// Types
export type {
  JsonConfig,
  JsonStyle,
  JsonExport,
  JsonFloor,
  JsonRoom,
  JsonWall,
  JsonConnection,
  JsonStair,
  JsonStairShape,
  JsonStairShapeType,
  JsonStairSegment,
  JsonLift,
  JsonVerticalConnection,
  SceneBounds,
  Render3DOptions,
  Render3DResult,
} from './types.js';

// Constants
export {
  DIMENSIONS,
  COLORS,
  COLORS_DARK,
  COLORS_BLUEPRINT,
  MATERIAL_PROPERTIES,
  DEFAULT_UNIT,
  UNIT_TO_METERS,
  METERS_TO_UNIT,
  UNIT_SYSTEM,
  toMeters,
  fromMeters,
  convertUnit,
  isLengthUnit,
  resolveUnit,
  getThemeColors,
} from './constants.js';
export type { LengthUnit, ViewerTheme, ThemeColors } from './constants.js';

// Materials
export {
  MaterialFactory,
  parseHexColor,
} from './materials.js';
export type { MaterialSet, MaterialStyle } from './materials.js';

// Geometry
export { StairGenerator } from './stair-geometry.js';
export {
  generateFloorSlabs,
  generateRoomFloorSlab,
  computeFloorBounds,
} from './floor-geometry.js';
export type { FloorSlabOptions } from './floor-geometry.js';
export {
  generateFloorWalls,
  generateRoomWalls,
  roomsShareWall,
} from './wall-geometry.js';
export type { WallGeneratorOptions } from './wall-geometry.js';
export {
  generateFloorConnections,
  generateConnection,
} from './connection-geometry.js';
export type { ConnectionGeometryOptions } from './connection-geometry.js';
export {
  findMatchingConnections,
  shouldRenderConnection,
} from './connection-matcher.js';
export type { ConnectionMatch } from './connection-matcher.js';

// Render context
export {
  renderScene,
} from './render-context.js';
export type {
  RenderContext,
  RenderContextOptions,
  RenderContextFactory,
} from './render-context.js';

// Camera
export {
  computeSceneBounds,
  setupCamera,
  frameBoundingBox,
} from './camera-utils.js';
export type { CameraSetupResult } from './camera-utils.js';

// Lighting
export {
  setupLighting,
  createHemisphereLight,
} from './lighting-utils.js';
export type { LightingOptions } from './lighting-utils.js';

// Scene building
export {
  buildFloorplanScene,
  buildCompleteScene,
} from './scene-builder.js';
export type {
  SceneBuildOptions,
  SceneBuildResult,
} from './scene-builder.js';

// Unit normalization
export { normalizeToMeters } from './unit-normalizer.js';

