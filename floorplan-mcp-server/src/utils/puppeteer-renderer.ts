/**
 * Puppeteer-based 3D rendering for floorplan visualization
 * Uses headless Chromium for full WebGL2 support
 *
 * This module uses the shared floorplan-3d-core browser bundle for consistent
 * rendering between the interactive viewer and MCP server.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer';

// Create CommonJS-style require for module resolution
const require = createRequire(import.meta.url);

import type { JsonExport, Render3DOptions, Render3DResult } from 'floorplan-3d-core';

// Shared browser instance for performance
let browserInstance: Browser | null = null;

// Cache sources
let threeJsSource: string | null = null;
let floorplanCoreSource: string | null = null;
let threeMeshBvhSource: string | null = null;
let threeBvhCsgSource: string | null = null;

/**
 * Load Three.js source from node_modules
 * Uses Node.js module resolution to find the package
 */
function getThreeJsSource(): string {
  if (!threeJsSource) {
    try {
      // Use Node.js module resolution to find Three.js
      // The package.json "exports" maps "." to "./build/three.cjs" for require
      const threeJsPath = require.resolve('three');
      const cjsSource = readFileSync(threeJsPath, 'utf-8');

      // Wrap the CJS module to expose THREE globally in the browser context
      threeJsSource = `
        (function() {
          var module = { exports: {} };
          var exports = module.exports;
          ${cjsSource}
          window.THREE = module.exports;
        })();
      `;
    } catch (error) {
      throw new Error(`Could not find Three.js: ${error instanceof Error ? error.message : error}`);
    }
  }
  return threeJsSource;
}

/**
 * Load `three-mesh-bvh` UMD bundle for the puppeteer page.
 * Required as a peer dependency of `three-bvh-csg` and exposes `window.MeshBVHLib`.
 */
function getThreeMeshBvhSource(): string {
  if (!threeMeshBvhSource) {
    const pkgJsonPath = require.resolve('three-mesh-bvh/package.json');
    const umdPath = join(dirname(pkgJsonPath), 'build', 'index.umd.cjs');
    threeMeshBvhSource = readFileSync(umdPath, 'utf-8');
  }
  return threeMeshBvhSource;
}

/**
 * Load `three-bvh-csg` UMD bundle for the puppeteer page.
 * Exposes `window.ThreBvhCsg` (note the upstream library's spelling).
 * Must be loaded after Three.js and three-mesh-bvh globals are set.
 */
function getThreeBvhCsgSource(): string {
  if (!threeBvhCsgSource) {
    const pkgJsonPath = require.resolve('three-bvh-csg/package.json');
    const umdPath = join(dirname(pkgJsonPath), 'build', 'index.umd.cjs');
    threeBvhCsgSource = readFileSync(umdPath, 'utf-8');
  }
  return threeBvhCsgSource;
}

/**
 * Load floorplan-3d-core browser bundle
 * Uses Node.js module resolution to find the package
 */
function getFloorplanCoreSource(): string {
  if (!floorplanCoreSource) {
    try {
      // Resolve the main entry point of floorplan-3d-core
      const coreMainPath = require.resolve('floorplan-3d-core');
      // Navigate from out/index.js to out/floorplan-3d-core.browser.js
      const coreDir = dirname(coreMainPath);
      const browserBundlePath = join(coreDir, 'floorplan-3d-core.browser.js');

      floorplanCoreSource = readFileSync(browserBundlePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Could not find floorplan-3d-core browser bundle: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  return floorplanCoreSource;
}

/**
 * Check if we're running in a CI environment
 */
function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.JENKINS_URL ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI
  );
}

/**
 * Get or create a shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    // Disable sandbox in CI environments or when running as root
    // CI environments like GitHub Actions have restrictions that prevent Chrome's sandbox
    const isRoot = process.getuid?.() === 0;
    const needsNoSandbox = isRoot || isCI();

    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        // Disable sandbox in CI or when running as root
        ...(needsNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
        // Prevent crashes in Docker/constrained environments
        '--disable-dev-shm-usage',
        // Enable WebGL with software rendering (no GPU required)
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
      ],
    });
  }
  return browserInstance;
}

/**
 * Close the shared browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Render a floorplan as a 3D PNG using Puppeteer
 *
 * Uses the shared floorplan-3d-core module for consistent rendering
 * between the interactive viewer and MCP server.
 */
export async function renderWithPuppeteer(
  jsonData: JsonExport,
  options: Render3DOptions = {},
): Promise<Render3DResult> {
  const width = options.width ?? 800;
  const height = options.height ?? 600;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport to match output dimensions
    await page.setViewport({ width, height });

    // Capture browser errors for debugging
    page.on('pageerror', (err) => console.error('Browser error:', String(err)));
    page.on('console', (msg) => console.log('Browser log:', msg.text()));

    // Create a minimal HTML page
    const html = createRenderingHTML(width, height);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Inject Three.js from node_modules
    await page.addScriptTag({ content: getThreeJsSource() });

    // Wait for Three.js to be available
    await page.waitForFunction('typeof THREE !== "undefined"', {
      timeout: 10000,
    });

    // Inject CSG dependencies (three-mesh-bvh, then three-bvh-csg).
    // Their UMD bundles auto-bind to globals (`window.MeshBVHLib`, `window.ThreBvhCsg`)
    // when no module/CJS environment is present. The floorplan-3d-core CSG manager
    // detects these globals to enable slab cutouts and door/window cuts.
    try {
      await page.addScriptTag({ content: getThreeMeshBvhSource() });
      await page.waitForFunction('typeof window.MeshBVHLib !== "undefined"', { timeout: 5000 });
      await page.addScriptTag({ content: getThreeBvhCsgSource() });
      await page.waitForFunction('typeof window.ThreBvhCsg !== "undefined"', { timeout: 5000 });
    } catch (err) {
      console.warn(
        `CSG libraries unavailable; floor cutouts and door/window holes will be skipped: ${err instanceof Error ? err.message : err}`,
      );
    }

    // Inject floorplan-3d-core browser bundle
    await page.addScriptTag({ content: getFloorplanCoreSource() });

    // Wait for FloorplanCore to be available
    await page.waitForFunction('typeof FloorplanCore !== "undefined"', {
      timeout: 5000,
    });

    // Add the minimal rendering wrapper
    await page.addScriptTag({ content: getRenderingWrapper() });

    // Wait for render function to be available
    await page.waitForFunction('typeof window.renderFloorplan === "function"', {
      timeout: 5000,
    });

    // Pass data and options to the page and render
    const result = (await page.evaluate(
      `(async () => {
        const jsonData = ${JSON.stringify(jsonData)};
        const options = ${JSON.stringify(options)};
        return await window.renderFloorplan(jsonData, options);
      })()`,
    )) as {
      projection: 'isometric' | 'perspective';
      sceneBounds: Render3DResult['metadata']['sceneBounds'];
      floorsRendered: number[];
      cameraPosition?: [number, number, number];
      cameraTarget?: [number, number, number];
      fov?: number;
    };

    // Capture the canvas as PNG
    const canvasHandle = await page.$('canvas');
    if (!canvasHandle) {
      throw new Error('Canvas not found');
    }

    const pngBuffer = await canvasHandle.screenshot({
      type: 'png',
      omitBackground: false,
    });

    // Parse the result
    const metadata: Render3DResult['metadata'] = {
      format: '3d-png',
      projection: result.projection,
      width,
      height,
      sceneBounds: result.sceneBounds,
      floorsRendered: result.floorsRendered,
    };

    if (result.projection === 'perspective') {
      metadata.cameraPosition = result.cameraPosition;
      metadata.cameraTarget = result.cameraTarget;
      metadata.fov = result.fov;
    }

    return {
      pngBuffer: Buffer.from(pngBuffer),
      metadata,
    };
  } finally {
    await page.close();
  }
}

/**
 * Create the base HTML page
 */
function createRenderingHTML(width: number, height: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #f5f5f7; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas" width="${width}" height="${height}"></canvas>
</body>
</html>`;
}

/**
 * Minimal rendering wrapper that uses floorplan-3d-core
 *
 * This wrapper uses the shared scene builder from floorplan-3d-core,
 * ensuring consistent rendering between viewer and MCP server.
 *
 * Uses WallBuilder with CSG support for proper door/window cutouts,
 * matching the interactive viewer's rendering exactly.
 */
function getRenderingWrapper(): string {
  return `
    window.renderFloorplan = async function(jsonData, options) {
      // Initialize CSG support - this enables proper wall cutouts for doors/windows
      // After this call, WallBuilder will use CSG operations instead of simple boxes
      await FloorplanCore.initCSG();

      const canvas = document.getElementById('canvas');
      const width = options.width || 800;
      const height = options.height || 600;

      // Use the shared buildCompleteScene from floorplan-3d-core
      // This now uses WallBuilder with CSG for consistent rendering with the viewer
      const sceneOptions = {};
      if (options.showFloors !== undefined) sceneOptions.showFloors = options.showFloors;
      if (options.showWalls !== undefined) sceneOptions.showWalls = options.showWalls;
      if (options.showStairs !== undefined) sceneOptions.showStairs = options.showStairs;
      if (options.showLifts !== undefined) sceneOptions.showLifts = options.showLifts;
      if (options.showConnections !== undefined) sceneOptions.showConnections = options.showConnections;
      const { scene, camera, cameraResult, bounds, floorsRendered } = 
        FloorplanCore.buildCompleteScene(jsonData, options, sceneOptions);

      // Create WebGL renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      
      // Enable shadows if requested (matches viewer capabilities)
      if (options.shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      // Render the scene
      renderer.render(scene, camera);

      // Return metadata for the result
      return {
        projection: cameraResult.projection,
        sceneBounds: bounds,
        floorsRendered,
        cameraPosition: cameraResult.position,
        cameraTarget: cameraResult.target,
        fov: cameraResult.fov,
      };
    };
  `;
}
