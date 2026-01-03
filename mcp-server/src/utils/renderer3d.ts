/**
 * 3D PNG rendering for floorplan visualization
 * Uses Puppeteer with headless Chromium for full WebGL2 support
 */

import {
  type JsonExport,
  type Render3DOptions,
  type Render3DResult,
  type SceneBounds,
  normalizeToMeters,
} from 'floorplan-3d-core';
import {
  renderWithPuppeteer,
  closeBrowser,
} from './puppeteer-renderer.js';

// Re-export closeBrowser for cleanup
export { closeBrowser };

/**
 * Render a floorplan as a 3D PNG image
 *
 * @param jsonData - Floorplan data in JSON format (from convertFloorplanToJson)
 * @param options - Rendering options (camera, dimensions, etc.)
 * @returns PNG buffer and rendering metadata
 */
export async function render3DToPng(
  jsonData: JsonExport,
  options: Render3DOptions = {}
): Promise<Render3DResult> {
  // Normalize all dimensions to meters for consistent 3D rendering
  // This ensures stairs, lifts, rooms, and other elements are correctly scaled
  const normalizedData = normalizeToMeters(jsonData);
  return renderWithPuppeteer(normalizedData, options);
}

/**
 * Format scene bounds for text response
 */
export function formatSceneBounds(bounds: SceneBounds): {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
} {
  return {
    min: [
      Math.round(bounds.min.x * 100) / 100,
      Math.round(bounds.min.y * 100) / 100,
      Math.round(bounds.min.z * 100) / 100,
    ],
    max: [
      Math.round(bounds.max.x * 100) / 100,
      Math.round(bounds.max.y * 100) / 100,
      Math.round(bounds.max.z * 100) / 100,
    ],
    center: [
      Math.round(bounds.center.x * 100) / 100,
      Math.round(bounds.center.y * 100) / 100,
      Math.round(bounds.center.z * 100) / 100,
    ],
  };
}
