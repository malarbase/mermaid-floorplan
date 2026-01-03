/**
 * Platform-agnostic render context interface
 * 
 * This interface abstracts the WebGL renderer creation, allowing the same
 * scene-building code to work in both browser and headless (Node.js) contexts.
 */

import * as THREE from 'three';

/**
 * Abstract render context that both browser and headless implementations must provide
 */
export interface RenderContext {
  /** The Three.js WebGL renderer */
  renderer: THREE.WebGLRenderer;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Clean up resources */
  dispose(): void;
}

/**
 * Options for creating a render context
 */
export interface RenderContextOptions {
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Enable antialiasing (default: true) */
  antialias?: boolean;
  /** Preserve drawing buffer for pixel extraction (required for headless) */
  preserveDrawingBuffer?: boolean;
}

/**
 * Factory type for creating render contexts
 * Platform-specific implementations provide this
 */
export type RenderContextFactory = (options: RenderContextOptions) => RenderContext;

/**
 * Render a scene with the given camera using the provided context
 * This is the platform-agnostic rendering function
 */
export function renderScene(
  scene: THREE.Scene,
  camera: THREE.Camera,
  context: RenderContext
): void {
  context.renderer.render(scene, camera);
}

