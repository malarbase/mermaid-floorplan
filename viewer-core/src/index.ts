/**
 * viewer-core
 * 
 * Shared abstractions for floorplan viewer and interactive editor.
 * 
 * This package provides:
 * - SceneContext: Interface for Three.js scene, camera, renderer, controls
 * - MeshRegistry: Bidirectional mapping between entities and meshes
 * - SelectionAPI: Interface for selection operations
 * 
 * The viewer package implements these interfaces for read-only visualization.
 * The interactive-editor package extends them for full editing capabilities.
 */

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
} from './selection-api.js';

