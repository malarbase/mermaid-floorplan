/**
 * 3D PNG rendering for floorplan visualization
 * Uses Puppeteer with headless Chromium for full WebGL2 support
 */

import type { JsonExport, Render3DOptions, Render3DResult, SceneBounds } from 'floorplan-3d-core';
import { closeBrowser, renderWithPuppeteer } from './puppeteer-renderer.js';

// Re-export closeBrowser for cleanup
export { closeBrowser };

/**
 * Render a floorplan as a 3D PNG image.
 *
 * Unit normalization (DSL units → meters) is owned by `buildCompleteScene`
 * inside the puppeteer page, so we forward `jsonData` unchanged.
 *
 * @param jsonData - Floorplan data in JSON format (from convertFloorplanToJson)
 * @param options - Rendering options (camera, dimensions, etc.)
 * @returns PNG buffer and rendering metadata
 */
export async function render3DToPng(
  jsonData: JsonExport,
  options: Render3DOptions = {},
): Promise<Render3DResult> {
  return renderWithPuppeteer(jsonData, options);
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
