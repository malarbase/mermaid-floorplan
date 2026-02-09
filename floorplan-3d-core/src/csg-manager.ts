/**
 * Centralized CSG (Constructive Solid Geometry) management
 *
 * Manages the dynamic loading of the three-bvh-csg library and provides
 * access to CSG operations for both walls and floors.
 */

import type * as THREE from 'three';

// CSG module - loaded dynamically
let csgModule: {
  Evaluator: new () => CSGEvaluator;
  Brush: new (
    geometry: THREE.BufferGeometry,
    material?: THREE.Material | THREE.Material[],
  ) => CSGBrush;
  SUBTRACTION: number;
  ADDITION: number;
  INTERSECTION: number;
} | null = null;

// Type definitions for CSG classes
export interface CSGEvaluator {
  evaluate(a: CSGBrush, b: CSGBrush, operation: number): CSGBrush;
}

export interface CSGBrush extends THREE.Mesh {
  updateMatrixWorld(): void;
}

/**
 * Initialize CSG support by dynamically loading three-bvh-csg
 *
 * @returns true if CSG is available, false otherwise
 */
export async function initCSG(): Promise<boolean> {
  if (csgModule !== null) {
    return true; // Already initialized
  }

  try {
    const mod = await import('three-bvh-csg');
    csgModule = {
      Evaluator: mod.Evaluator,
      Brush: mod.Brush,
      SUBTRACTION: mod.SUBTRACTION,
      ADDITION: mod.ADDITION,
      INTERSECTION: mod.INTERSECTION,
    };
    return true;
  } catch {
    // CSG not available - will use fallback rendering
    return false;
  }
}

/**
 * Check if CSG is currently available
 */
export function isCsgAvailable(): boolean {
  return csgModule !== null;
}

/**
 * Get the loaded CSG module. Throws if not initialized.
 */
export function getCSG() {
  if (!csgModule) {
    throw new Error('CSG not initialized. Call initCSG() first.');
  }
  return csgModule;
}
