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

export type {
  AnnotationCallbacks,
  AnnotationState,
  AreaUnit,
} from './annotation-manager.js';
// Annotation manager
export { AnnotationManager } from './annotation-manager.js';
export type { BaseViewerOptions } from './base-viewer.js';
// Base viewer class
export { BaseViewer } from './base-viewer.js';
export type {
  CameraManagerCallbacks,
  CameraMode,
  CameraState,
} from './camera-manager.js';
// Camera manager
export { CameraManager } from './camera-manager.js';
export type {
  DslEditorConfig,
  DslEditorInstance,
} from './dsl-editor.js';
// DSL Editor (Monaco-based)
export {
  createDslEditor,
  monaco,
} from './dsl-editor.js';
export type {
  ParseError,
  ParseResult,
  ParseResultWithDocument,
} from './dsl-parser.js';
// DSL Parser (browser-compatible)
export {
  isFloorplanFile,
  isJsonFile,
  parseFloorplanDSL,
  parseFloorplanDSLWithDocument,
} from './dsl-parser.js';
export type {
  EditorViewerSyncConfig,
  EntityHierarchyContext,
  HierarchyExpansionResult,
} from './editor-viewer-sync.js';
// Editor-Viewer Bidirectional Sync (shared between floorplan-editor and floorplan-app)
export { EditorViewerSync } from './editor-viewer-sync.js';
export type { FloorManagerCallbacks } from './floor-manager.js';
// Floor manager
export { FloorManager } from './floor-manager.js';
export type {
  AuthResult as CoreAuthResult,
  FloorplanAppCoreEvents,
  FloorplanAppCoreOptions,
} from './floorplan-app-core.js';
// FloorplanAppCore (3D-only, for use with FloorplanUI)
export { FloorplanAppCore } from './floorplan-app-core.js';
export type {
  EntityLocation,
  InteractiveEditorCoreEvents,
  InteractiveEditorCoreOptions,
} from './interactive-editor-core.js';
// InteractiveEditorCore (editor-specific, extends FloorplanAppCore)
export { InteractiveEditorCore } from './interactive-editor-core.js';
export type { KeyboardControlsConfig } from './keyboard-controls.js';
// Keyboard controls
export { KeyboardControls } from './keyboard-controls.js';
export type {
  LayoutManagerConfig,
  LayoutState,
} from './layout-manager.js';
// Layout Manager (CSS custom properties based layout state)
export {
  getLayoutManager,
  LayoutManager,
  resetLayoutManager,
} from './layout-manager.js';
export type {
  MaterialSet,
  MaterialStyle,
} from './materials.js';
// Browser material factory (async texture loading)
export {
  BrowserMaterialFactory,
  MaterialFactory,
} from './materials.js';
export type {
  EntityKey,
  RegistryEntry,
} from './mesh-registry.js';
// Mesh registry
export { MeshRegistry } from './mesh-registry.js';
export type { Overlay2DCallbacks } from './overlay-2d-manager.js';
// 2D Overlay manager
export { Overlay2DManager } from './overlay-2d-manager.js';
// Pivot indicator
export { PivotIndicator } from './pivot-indicator.js';
// Scene context
export type {
  MutableSceneContext,
  SceneContext,
  SelectableEntityType,
  SelectableObject,
  SourceRange,
} from './scene-context.js';
export type {
  HighlightStyle,
  SelectionAPI,
  SelectionChangeEvent,
  SelectionChangeListener,
  SelectionSource,
  SelectMultipleOptions,
} from './selection-api.js';
// Selection API
export { BaseSelectionManager } from './selection-api.js';
export type {
  MarqueeMode,
  SelectionManagerConfig,
} from './selection-manager.js';
// Selection Manager (full implementation)
export { SelectionManager } from './selection-manager.js';
// UI Components (vanilla)
export * from './ui/index.js';
// UI Components (Solid.js)
export {
  type Command as UICommand,
  CommandPalette,
  type CommandPaletteProps,
  createEditorUI,
  createEditorUIState,
  createFloorplanUI,
  createSolidThemeToggle,
  createUIState,
  EditorUI,
  type EditorUIAPI,
  type EditorUIConfig,
  type EditorUIProps,
  type EditorUIState,
  FileDropdown,
  type FileDropdownProps,
  FloorplanUI,
  type FloorplanUIAPI,
  type FloorplanUIConfig,
  type FloorplanUIProps,
  HeaderBar,
  type HeaderBarProps,
  PropertiesPanel,
  type PropertiesPanelProps,
  type PropertyDefinition,
  type RecentFile,
  type Theme as UITheme,
  type Theme,
  ThemeToggle,
  type ThemeToggleProps,
  type UIState,
} from './ui/solid/index.js';
// Debug utilities
export {
  createDebugLogger,
  debug,
} from './utils/debug.js';
export type {
  PerformanceMetric,
  PerformanceReport,
} from './utils/performance.js';

// Performance utilities
export { perf } from './utils/performance.js';
export type { StyleResolver } from './wall-generator.js';
// Wall generator (CSG-based, browser-only)
export { WallGenerator } from './wall-generator.js';
