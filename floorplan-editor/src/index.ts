/**
 * floorplan-editor
 *
 * Full-featured floorplan editor with:
 * - Click and marquee selection
 * - Editor-3D bidirectional sync
 * - Properties panel for editing
 * - DSL generation utilities
 *
 * Uses InteractiveEditorCore from floorplan-viewer-core as the core class.
 */

// Re-export floorplan-viewer-core types for convenience
// Re-export EditorViewerSync and related types from viewer-core (canonical location)
// EntityLocation is now the core's type from viewer-core
export type {
  DslEditorConfig,
  DslEditorInstance,
  EditorUIAPI,
  EditorUIConfig,
  EditorViewerSyncConfig,
  EntityHierarchyContext,
  EntityLocation,
  HierarchyExpansionResult,
  InteractiveEditorCoreEvents,
  InteractiveEditorCoreOptions,
  MarqueeMode,
  SceneContext,
  SelectableEntityType,
  SelectableObject,
  SelectionAPI,
  SelectionChangeEvent,
  SelectionManagerConfig,
  SelectionSource,
  SourceRange,
} from 'floorplan-viewer-core';
// Re-export InteractiveEditorCore from floorplan-viewer-core
// Re-export SelectionManager from floorplan-viewer-core
// Re-export DSL editor from floorplan-viewer-core
export {
  createDslEditor,
  createEditorUI,
  EditorViewerSync,
  InteractiveEditorCore,
  monaco,
  SelectionManager,
} from 'floorplan-viewer-core';
export type {
  ConnectionGeneratorOptions,
  FloorGeneratorOptions,
  RoomGeneratorOptions,
} from './dsl-generator.js';
export { DslGenerator, dslGenerator } from './dsl-generator.js';
export type {
  PropertiesPanelConfig,
  PropertyChangeEvent,
  PropertyDef,
} from './properties-panel.js';
export { PropertiesPanel } from './properties-panel.js';
