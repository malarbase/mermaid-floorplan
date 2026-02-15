/**
 * floorplan-3d-core
 *
 * Shared 3D rendering primitives for floorplan visualization.
 * Works in both browser and Node.js (headless) environments.
 */

export type {
  OverlapResult,
  RoomBounds,
} from 'floorplan-common';
// Shared geometry utilities (re-exported from floorplan-common)
export {
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
  calculateWallOverlap,
} from 'floorplan-common';
export type { CameraSetupResult } from './camera-utils.js';
// Camera
export {
  computeSceneBounds,
  frameBoundingBox,
  setupCamera,
} from './camera-utils.js';
export type { ConnectionGeometryOptions } from './connection-geometry.js';
export {
  generateConnection,
  generateFloorConnections,
} from './connection-geometry.js';
export type { ConnectionMatch } from './connection-matcher.js';
export {
  findMatchingConnections,
  shouldRenderConnection,
} from './connection-matcher.js';
export type { LengthUnit, ThemeColors, UIThemeMode, ViewerTheme } from './constants.js';
// Constants
export {
  COLORS,
  COLORS_BLUEPRINT,
  COLORS_DARK,
  convertUnit,
  DEFAULT_UNIT,
  DIMENSIONS,
  fromMeters,
  getThemeColors,
  getUIThemeMode,
  isDarkTheme,
  isLengthUnit,
  MATERIAL_PROPERTIES,
  METERS_TO_UNIT,
  resolveUnit,
  toMeters,
  UNIT_SYSTEM,
  UNIT_TO_METERS,
} from './constants.js';
// CSG manager
export {
  getCSG,
  initCSG,
  isCsgAvailable,
} from './csg-manager.js';
// CSG utilities (for material preservation after CSG operations)
export {
  FACE_INDICES,
  getWallFaceMaterialIndex,
  normalToMaterialIndex,
  reassignMaterialsByNormal,
} from './csg-utils.js';
export type { FloorSlabOptions } from './floor-geometry.js';
export {
  computeFloorBounds,
  generateFloorSlabs,
  generateRoomFloorSlab,
} from './floor-geometry.js';
export type { LightingOptions } from './lighting-utils.js';
// Lighting
export {
  createHemisphereLight,
  setupLighting,
} from './lighting-utils.js';
export type { MaterialSet, MaterialStyle } from './materials.js';
// Materials
export {
  MaterialFactory,
  parseHexColor,
} from './materials.js';
export type {
  RenderContext,
  RenderContextFactory,
  RenderContextOptions,
} from './render-context.js';
// Render context
export { renderScene } from './render-context.js';
export type {
  SceneBuildOptions,
  SceneBuildResult,
} from './scene-builder.js';
// Scene building
export {
  buildCompleteScene,
  buildFloorplanScene,
} from './scene-builder.js';
// Geometry
export { StairGenerator } from './stair-geometry.js';
// Types
export type {
  JsonConfig,
  JsonConnection,
  JsonExport,
  JsonFloor,
  JsonLift,
  JsonRelativePosition,
  JsonRoom,
  JsonSourceRange,
  JsonStair,
  JsonStairSegment,
  JsonStairShape,
  JsonStairShapeType,
  JsonStyle,
  JsonVerticalConnection,
  JsonWall,
  Render3DOptions,
  Render3DResult,
  SceneBounds,
} from './types.js';
// Unit normalization
export { normalizeToMeters } from './unit-normalizer.js';
export type {
  HoleSpec,
  WallBuilderOptions,
  WallGeometry,
} from './wall-builder.js';

// Unified wall builder (with optional CSG support)
export {
  // Segment generation APIs for browser use
  calculateWallGeometry,
  calculateWallSegmentPosition,
  createWallSegmentGeometry,
  WallBuilder,
} from './wall-builder.js';
export type { WallGeneratorOptions } from './wall-geometry.js';
export {
  generateFloorWalls,
  generateRoomWalls,
  roomsShareWall,
} from './wall-geometry.js';
export type {
  AdjacentRoomInfo,
  StyleResolver,
  WallOwnershipResult,
  WallSegment,
} from './wall-ownership.js';
// Wall ownership (for CSG-based wall rendering)
export {
  analyzeWallOwnership,
  checkAdjacency,
  computeWallSegments,
  findAdjacentRooms,
  shouldRenderWall,
} from './wall-ownership.js';
