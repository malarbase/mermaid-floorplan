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
  JsonSourceRange,
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

// Wall ownership (for CSG-based wall rendering)
export {
  checkAdjacency,
  shouldRenderWall,
  findAdjacentRooms,
  computeWallSegments,
  analyzeWallOwnership,
} from './wall-ownership.js';
export type {
  AdjacentRoomInfo,
  WallSegment,
  WallOwnershipResult,
  StyleResolver,
} from './wall-ownership.js';

// CSG utilities (for material preservation after CSG operations)
export {
  FACE_INDICES,
  normalToMaterialIndex,
  reassignMaterialsByNormal,
  getWallFaceMaterialIndex,
} from './csg-utils.js';

// Unified wall builder (with optional CSG support)
export {
  WallBuilder,
  // Segment generation APIs for browser use
  calculateWallGeometry,
  createWallSegmentGeometry,
  calculateWallSegmentPosition,
} from './wall-builder.js';
export type {
  HoleSpec,
  WallBuilderOptions,
  WallGeometry,
} from './wall-builder.js';

// CSG manager
export {
  initCSG,
  isCsgAvailable,
  getCSG,
} from './csg-manager.js';

// Shared geometry utilities (re-exported from floorplan-common)
export {
  calculateWallOverlap,
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
} from 'floorplan-common';
export type {
  RoomBounds,
  OverlapResult,
} from 'floorplan-common';

