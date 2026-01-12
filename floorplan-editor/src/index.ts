/**
 * interactive-editor
 * 
 * Full-featured floorplan editor with:
 * - Click and marquee selection
 * - Editor-3D bidirectional sync
 * - Properties panel for editing
 * - Branching history (undo/redo)
 * - LSP integration for code intelligence
 */

export { InteractiveEditor } from './interactive-editor.js';
export type { InteractiveEditorOptions } from './interactive-editor.js';

// Re-export SelectionManager from floorplan-viewer-core
export { SelectionManager } from 'floorplan-viewer-core';
export type { MarqueeMode, SelectionManagerConfig } from 'floorplan-viewer-core';

export { EditorViewerSync } from './editor-viewer-sync.js';
export type {
  EditorViewerSyncConfig,
  EntityLocation,
  EntityHierarchyContext,
  HierarchyExpansionResult,
} from './editor-viewer-sync.js';

// Re-export DSL editor from floorplan-viewer-core
export { createDslEditor, monaco } from 'floorplan-viewer-core';
export type { DslEditorConfig, DslEditorInstance } from 'floorplan-viewer-core';

export { DslGenerator, dslGenerator } from './dsl-generator.js';
export type {
  RoomGeneratorOptions,
  ConnectionGeneratorOptions,
  FloorGeneratorOptions,
} from './dsl-generator.js';

export { PropertiesPanel } from './properties-panel.js';
export type {
  PropertyDef,
  PropertyChangeEvent,
  PropertiesPanelConfig,
} from './properties-panel.js';

// Re-export floorplan-viewer-core types for convenience
export type {
  SceneContext,
  SelectableObject,
  SelectableEntityType,
  SourceRange,
  SelectionAPI,
  SelectionChangeEvent,
  SelectionSource,
} from 'floorplan-viewer-core';
