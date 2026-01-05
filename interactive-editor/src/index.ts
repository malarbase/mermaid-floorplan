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

export { SelectionManager } from './selection-manager.js';
export type { MarqueeMode, SelectionManagerConfig } from './selection-manager.js';

export { EditorViewerSync } from './editor-viewer-sync.js';
export type { EditorViewerSyncConfig, EntityLocation } from './editor-viewer-sync.js';

export { createDslEditor, monaco } from './dsl-editor.js';
export type { DslEditorConfig, DslEditorInstance } from './dsl-editor.js';

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

// Re-export viewer-core types for convenience
export type {
  SceneContext,
  SelectableObject,
  SelectableEntityType,
  SourceRange,
  SelectionAPI,
  SelectionChangeEvent,
  SelectionSource,
} from 'viewer-core';
