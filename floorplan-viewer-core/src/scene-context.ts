/**
 * SceneContext - Interface for Three.js scene, camera, renderer, and controls.
 * 
 * Provides a common interface for both the read-only viewer and interactive editor
 * to access the underlying Three.js objects without exposing implementation details.
 */
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Represents a 3D object that can be selected in the viewer.
 * Contains the mesh and its associated metadata.
 */
export interface SelectableObject {
  /** The Three.js mesh or group that was selected */
  mesh: THREE.Object3D;
  /** Type of entity (room, wall, connection, stair, lift) */
  entityType: SelectableEntityType;
  /** Unique identifier for the entity (e.g., room name) */
  entityId: string;
  /** Floor ID containing this entity */
  floorId: string;
  /** Source range in DSL if available */
  sourceRange?: SourceRange;
}

/**
 * Types of entities that can be selected in the 3D view.
 */
export type SelectableEntityType = 'room' | 'wall' | 'connection' | 'stair' | 'lift';

/**
 * Source location range in the DSL file.
 * Used for bidirectional sync between 3D view and editor.
 */
export interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Read-only interface for accessing the Three.js scene context.
 * Implemented by both Viewer and InteractiveEditor.
 */
export interface SceneContext {
  /** Get the Three.js scene */
  readonly scene: THREE.Scene;
  
  /** Get the currently active camera */
  readonly activeCamera: THREE.Camera;
  
  /** Get the perspective camera */
  readonly perspectiveCamera: THREE.PerspectiveCamera;
  
  /** Get the orthographic camera */
  readonly orthographicCamera: THREE.OrthographicCamera;
  
  /** Get the WebGL renderer */
  readonly renderer: THREE.WebGLRenderer;
  
  /** Get the orbit controls */
  readonly controls: OrbitControls;
  
  /** Get the DOM element for the renderer */
  readonly domElement: HTMLCanvasElement;
  
  /** Get all floor groups in the scene */
  readonly floors: readonly THREE.Group[];
}

/**
 * Extended scene context with methods for scene manipulation.
 * Used internally by the viewer and editor.
 */
export interface MutableSceneContext extends SceneContext {
  /** Add an object to the scene */
  addToScene(object: THREE.Object3D): void;
  
  /** Remove an object from the scene */
  removeFromScene(object: THREE.Object3D): void;
  
  /** Request a re-render of the scene */
  requestRender(): void;
}

