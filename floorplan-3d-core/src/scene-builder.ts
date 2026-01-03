/**
 * Platform-agnostic scene builder for 3D floorplan rendering
 * 
 * This module builds a Three.js scene from JSON floorplan data.
 * It works in both browser and Node.js environments.
 */

import * as THREE from 'three';
import type { JsonExport, JsonFloor, JsonStyle, SceneBounds, Render3DOptions } from './types.js';
import { DIMENSIONS, getThemeColors, type ViewerTheme } from './constants.js';
import { MaterialFactory, type MaterialStyle } from './materials.js';
import { generateFloorSlabs } from './floor-geometry.js';
import { generateFloorWalls } from './wall-geometry.js';
import { StairGenerator } from './stair-geometry.js';
import { computeSceneBounds, setupCamera, type CameraSetupResult } from './camera-utils.js';
import { setupLighting } from './lighting-utils.js';
import { normalizeToMeters } from './unit-normalizer.js';

/**
 * Scene building options
 */
export interface SceneBuildOptions {
  /** Which floors to render (undefined = all) */
  floorIndices?: number[];
  /** Theme for default colors */
  theme?: ViewerTheme;
  /** Vertical spacing between floors (default: calculated from heights) */
  floorSpacing?: number;
  /** Show floor slabs (default: true) */
  showFloors?: boolean;
  /** Show walls (default: true) */
  showWalls?: boolean;
  /** Show stairs (default: true) */
  showStairs?: boolean;
  /** Show lifts (default: true) */
  showLifts?: boolean;
}

/**
 * Scene building result
 */
export interface SceneBuildResult {
  /** The built Three.js scene */
  scene: THREE.Scene;
  /** Scene bounding box */
  bounds: SceneBounds;
  /** Floors that were rendered */
  floorsRendered: number[];
  /** Style map for lookups */
  styleMap: Map<string, MaterialStyle>;
}

/**
 * Build a Three.js scene from JSON floorplan data
 * 
 * Note: This function automatically normalizes all dimensions to meters
 * for consistent 3D rendering, regardless of the source unit.
 */
export function buildFloorplanScene(
  data: JsonExport,
  options: SceneBuildOptions = {}
): SceneBuildResult {
  // Normalize all dimensions to meters for consistent 3D rendering
  const normalizedData = normalizeToMeters(data);

  const {
    floorIndices,
    theme,
    floorSpacing,
    showFloors = true,
    showWalls = true,
    showStairs = true,
    showLifts = true,
  } = options;

  // Create scene with background color
  const scene = new THREE.Scene();
  const themeColors = theme ? getThemeColors(theme) : getThemeColors('light');
  scene.background = new THREE.Color(themeColors.BACKGROUND);

  // Build style lookup map
  const styleMap = buildStyleMap(normalizedData.styles);

  // Determine which floors to render
  const floorsToRender = floorIndices
    ? normalizedData.floors.filter((_, i) => floorIndices.includes(i))
    : normalizedData.floors;

  const floorsRendered = floorsToRender.map(f => f.index);

  // Get config values (already normalized to meters)
  const config = normalizedData.config ?? {};
  const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
  const defaultHeight = config.default_height ?? DIMENSIONS.WALL.HEIGHT;
  const floorThickness = config.floor_thickness ?? DIMENSIONS.FLOOR.THICKNESS;

  // Calculate floor vertical positions
  const floorPositions = calculateFloorPositions(floorsToRender, floorSpacing, defaultHeight);

  // Render each floor
  const stairGenerator = new StairGenerator();

  for (const floor of floorsToRender) {
    const floorGroup = new THREE.Group();
    floorGroup.name = `floor_${floor.id}`;

    const yOffset = floorPositions.get(floor.index) ?? 0;
    floorGroup.position.y = yOffset;

    // Generate floor slabs
    if (showFloors) {
      const slabs = generateFloorSlabs(floor, {
        thickness: floorThickness,
        theme,
        styleMap,
      });
      floorGroup.add(slabs);
    }

    // Generate walls
    if (showWalls) {
      const walls = generateFloorWalls(floor, {
        wallThickness,
        defaultHeight: floor.height ?? defaultHeight,
        theme,
        styleMap,
      });
      floorGroup.add(walls);
    }

    // Generate stairs
    if (showStairs && floor.stairs) {
      for (const stair of floor.stairs) {
        const stairGroup = stairGenerator.generateStair(stair);
        floorGroup.add(stairGroup);
      }
    }

    // Generate lifts
    if (showLifts && floor.lifts) {
      const floorHeight = floor.height ?? defaultHeight;
      for (const lift of floor.lifts) {
        const liftGroup = stairGenerator.generateLift(lift, floorHeight);
        floorGroup.add(liftGroup);
      }
    }

    scene.add(floorGroup);
  }

  // Compute scene bounds
  const bounds = computeSceneBounds(scene);

  return {
    scene,
    bounds,
    floorsRendered,
    styleMap,
  };
}

/**
 * Build a complete scene with camera and lighting
 * 
 * Note: This function automatically normalizes all dimensions to meters
 * for consistent 3D rendering, regardless of the source unit.
 */
export function buildCompleteScene(
  data: JsonExport,
  renderOptions: Render3DOptions,
  sceneOptions: SceneBuildOptions = {}
): {
  scene: THREE.Scene;
  camera: THREE.Camera;
  cameraResult: CameraSetupResult;
  bounds: SceneBounds;
  floorsRendered: number[];
} {
  // Normalize all dimensions to meters (buildFloorplanScene does this internally,
  // but we need it here for theme resolution too)
  const normalizedData = normalizeToMeters(data);

  // Determine theme from config
  const theme = resolveTheme(normalizedData.config);
  
  // Determine which floors to render
  const floorIndices = renderOptions.renderAllFloors 
    ? undefined 
    : [renderOptions.floorIndex ?? 0];

  // Build scene (normalizedData is already in meters, so buildFloorplanScene
  // will detect this and skip re-normalization)
  const { scene, bounds, floorsRendered } = buildFloorplanScene(normalizedData, {
    ...sceneOptions,
    theme,
    floorIndices,
  });

  // Set up camera
  const width = renderOptions.width ?? 800;
  const height = renderOptions.height ?? 600;
  const aspectRatio = width / height;

  const cameraResult = setupCamera(renderOptions, bounds, aspectRatio);

  // Set up lighting
  setupLighting(scene, bounds, {
    shadows: false, // Disabled for headless rendering
  });

  return {
    scene,
    camera: cameraResult.camera,
    cameraResult,
    bounds,
    floorsRendered,
  };
}

/**
 * Build style lookup map from JSON styles array
 */
function buildStyleMap(styles?: JsonStyle[]): Map<string, MaterialStyle> {
  const map = new Map<string, MaterialStyle>();

  if (styles) {
    for (const style of styles) {
      map.set(style.name, MaterialFactory.jsonStyleToMaterialStyle(style));
    }
  }

  return map;
}

/**
 * Calculate vertical positions for each floor
 */
function calculateFloorPositions(
  floors: JsonFloor[],
  spacing?: number,
  defaultHeight?: number
): Map<number, number> {
  const positions = new Map<number, number>();

  // Sort floors by index
  const sortedFloors = [...floors].sort((a, b) => a.index - b.index);

  let currentY = 0;

  for (const floor of sortedFloors) {
    positions.set(floor.index, currentY);

    // Calculate height for next floor
    const floorHeight = floor.height ?? defaultHeight ?? DIMENSIONS.WALL.HEIGHT;
    const gap = spacing ?? DIMENSIONS.FLOOR.THICKNESS;
    currentY += floorHeight + gap;
  }

  return positions;
}

/**
 * Resolve theme from config
 */
function resolveTheme(config?: JsonExport['config']): ViewerTheme {
  if (!config) return 'light';

  if (config.theme) {
    const themeName = config.theme.toLowerCase();
    if (themeName === 'dark') return 'dark';
    if (themeName === 'blueprint') return 'blueprint';
  }

  if (config.darkMode) return 'dark';

  return 'light';
}

