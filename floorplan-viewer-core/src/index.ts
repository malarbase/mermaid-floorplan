/**
 * viewer-core
 * 
 * Shared abstractions for floorplan viewer and interactive editor.
 * 
 * This package provides:
 * - SceneContext: Interface for Three.js scene, camera, renderer, controls
 * - MeshRegistry: Bidirectional mapping between entities and meshes
 * - SelectionAPI: Interface for selection operations
 * - WallGenerator: CSG-based wall generation with ownership detection
 * - PivotIndicator: Visual pivot point that shows camera orbit target
 * - KeyboardControls: WASD navigation, zoom, view presets
 * - CameraManager: Perspective/orthographic/isometric switching
 * - FloorManager: Floor visibility controls
 * - AnnotationManager: Area labels, dimensions, floor summaries
 * - Overlay2DManager: 2D SVG overlay rendering
 * - BrowserMaterialFactory: Async texture loading for browser
 * 
 * The viewer package implements these interfaces for read-only visualization.
 * The interactive-editor package extends them for full editing capabilities.
 */

// Base viewer class
export { BaseViewer } from './base-viewer.js';
export type { BaseViewerOptions } from './base-viewer.js';

// FloorplanAppCore (3D-only, for use with FloorplanUI)
export { FloorplanAppCore } from './floorplan-app-core.js';
export type { 
  FloorplanAppCoreOptions, 
  FloorplanAppCoreEvents,
  AuthResult as CoreAuthResult,
} from './floorplan-app-core.js';

// Scene context
export type {
  SelectableObject,
  SelectableEntityType,
  SourceRange,
  SceneContext,
  MutableSceneContext,
} from './scene-context.js';

// Mesh registry
export {
  MeshRegistry,
} from './mesh-registry.js';
export type {
  EntityKey,
  RegistryEntry,
} from './mesh-registry.js';

// Selection API
export {
  BaseSelectionManager,
} from './selection-api.js';
export type {
  SelectionChangeEvent,
  SelectionSource,
  SelectionChangeListener,
  HighlightStyle,
  SelectionAPI,
  SelectMultipleOptions,
} from './selection-api.js';

// Wall generator (CSG-based, browser-only)
export {
  WallGenerator,
} from './wall-generator.js';
export type {
  StyleResolver,
} from './wall-generator.js';

// Pivot indicator
export {
  PivotIndicator,
} from './pivot-indicator.js';

// Keyboard controls
export {
  KeyboardControls,
} from './keyboard-controls.js';
export type {
  KeyboardControlsConfig,
} from './keyboard-controls.js';

// Camera manager
export {
  CameraManager,
} from './camera-manager.js';
export type {
  CameraMode,
  CameraManagerCallbacks,
} from './camera-manager.js';

// Floor manager
export {
  FloorManager,
} from './floor-manager.js';
export type {
  FloorManagerCallbacks,
} from './floor-manager.js';

// Annotation manager
export {
  AnnotationManager,
} from './annotation-manager.js';
export type {
  AreaUnit,
  AnnotationState,
  AnnotationCallbacks,
} from './annotation-manager.js';

// 2D Overlay manager
export {
  Overlay2DManager,
} from './overlay-2d-manager.js';
export type {
  Overlay2DCallbacks,
} from './overlay-2d-manager.js';

// Browser material factory (async texture loading)
export {
  BrowserMaterialFactory,
  MaterialFactory,
} from './materials.js';
export type {
  MaterialSet,
  MaterialStyle,
} from './materials.js';

// Selection Manager (full implementation)
export {
  SelectionManager,
} from './selection-manager.js';
export type {
  MarqueeMode,
  SelectionManagerConfig,
} from './selection-manager.js';

// UI Components
export * from './ui/index.js';

// DSL Editor (Monaco-based)
export {
  createDslEditor,
  monaco,
} from './dsl-editor.js';
export type {
  DslEditorConfig,
  DslEditorInstance,
} from './dsl-editor.js';

// DSL Parser (browser-compatible)
export {
  parseFloorplanDSL,
  parseFloorplanDSLWithDocument,
  isFloorplanFile,
  isJsonFile,
} from './dsl-parser.js';
export type {
  ParseError,
  ParseResult,
  ParseResultWithDocument,
} from './dsl-parser.js';

// Layout Manager (CSS custom properties based layout state)
export {
  LayoutManager,
  getLayoutManager,
  resetLayoutManager,
} from './layout-manager.js';
export type {
  LayoutManagerConfig,
  LayoutState,
} from './layout-manager.js';

// Performance utilities
export {
  perf,
} from './utils/performance.js';
export type {
  PerformanceMetric,
  PerformanceReport,
} from './utils/performance.js';
