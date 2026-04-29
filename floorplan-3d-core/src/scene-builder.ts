/**
 * Platform-agnostic scene builder for 3D floorplan rendering
 *
 * This module builds a Three.js scene from JSON floorplan data.
 * It works in both browser and Node.js environments.
 *
 * Uses WallBuilder for CSG-based wall generation when three-bvh-csg is available,
 * falling back to simple box walls otherwise. This ensures consistent rendering
 * between the interactive viewer and headless (MCP server) rendering.
 */

import * as THREE from 'three';
import { type CameraSetupResult, computeSceneBounds, setupCamera } from './camera-utils.js';
import { generateFloorConnections } from './connection-geometry.js';
import { DIMENSIONS, getThemeColors, type ViewerTheme } from './constants.js';
import { generateFloorSlabs } from './floor-geometry.js';
import { setupLighting } from './lighting-utils.js';
import { MaterialFactory, type MaterialStyle } from './materials.js';
import { StairGenerator } from './stair-geometry.js';
import type {
  JsonExport,
  JsonFloor,
  JsonRoom,
  JsonStyle,
  Render3DOptions,
  SceneBounds,
  SceneBuildHooks,
} from './types.js';
import { normalizeToMeters } from './unit-normalizer.js';
import { WallBuilder } from './wall-builder.js';

/**
 * Scene building options. Extends `SceneBuildHooks` so consumers can attach
 * mesh-creation callbacks (e.g. for the viewer's `MeshRegistry`) directly on
 * the options object.
 */
export interface SceneBuildOptions extends SceneBuildHooks {
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
  /** Show connections (doors/windows) (default: true) */
  showConnections?: boolean;
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
  /**
   * Per-floor `THREE.Group`s keyed by `JsonFloor.id`. Surfaces the
   * already-created floor groups so consumers (e.g. the viewer's exploded-
   * view animation, floor visibility manager) can iterate them without
   * walking `scene.children` and risking collisions with lights or
   * decorations added later.
   */
  floorGroups: Map<string, THREE.Group>;
}

/**
 * Build a Three.js scene from JSON floorplan data.
 *
 * Note: This function automatically normalizes all dimensions to meters
 * for consistent 3D rendering, regardless of the source unit. Internal
 * call sites that already hold normalized data should call
 * `buildFloorplanSceneFromNormalized` directly to avoid redundant work.
 */
export function buildFloorplanScene(
  data: JsonExport,
  options: SceneBuildOptions = {},
): SceneBuildResult {
  return buildFloorplanSceneFromNormalized(normalizeToMeters(data), options);
}

/**
 * Scene-build entry point that assumes `normalizedData` has already been
 * passed through `normalizeToMeters`.
 *
 * Use this from consumers that need the normalized `JsonExport` for their
 * own bookkeeping *before* calling the builder (e.g. `BaseViewer.loadFloorplan`
 * uses normalized config / styles / first-room coords for camera framing,
 * theme resolution, and the styles map). Calling `buildFloorplanScene` after
 * already normalizing would re-convert dimensions a second time, since
 * `normalizeToMeters` preserves `default_unit` on the output.
 *
 * `buildCompleteScene` also uses this to avoid normalizing twice across the
 * camera / lighting hand-off.
 */
export function buildFloorplanSceneFromNormalized(
  normalizedData: JsonExport,
  options: SceneBuildOptions = {},
): SceneBuildResult {
  const {
    floorIndices,
    theme,
    floorSpacing,
    showFloors = true,
    showWalls = true,
    showConnections = true,
    showStairs = true,
    showLifts = true,
    onFloorGroup,
    onRoomMesh,
    onWallMesh,
    onStairMesh,
    onLiftMesh,
  } = options;

  // Track floor groups by id for the result map (D7).
  const floorGroups = new Map<string, THREE.Group>();

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

  const floorsRendered = floorsToRender.map((f) => f.index);

  // Get config values (already normalized to meters)
  const config = normalizedData.config ?? {};
  const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
  const defaultHeight = config.default_height ?? DIMENSIONS.WALL.HEIGHT;
  const floorThickness = config.floor_thickness ?? DIMENSIONS.FLOOR.THICKNESS;

  // Calculate floor vertical positions
  const floorPositions = calculateFloorPositions(floorsToRender, floorSpacing, defaultHeight);

  // Render each floor
  const stairGenerator = new StairGenerator();

  // Create wall builder with theme and style resolver
  // WallBuilder uses CSG when available (after initCSG() is called) for proper door/window cutouts
  const wallBuilder = new WallBuilder();
  wallBuilder.setTheme(theme ?? 'light');
  wallBuilder.setStyleResolver((room: JsonRoom) =>
    styleMap.get(room.style ?? config.default_style ?? ''),
  );

  // Track vertical penetrations from previous floor (for cutting holes)
  let prevFloorPenetrations: THREE.Box3[] = [];

  for (const floor of floorsToRender) {
    const floorGroup = new THREE.Group();
    floorGroup.name = `floor_${floor.id}`;

    const yOffset = floorPositions.get(floor.index) ?? 0;
    floorGroup.position.y = yOffset;

    floorGroups.set(floor.id, floorGroup);
    onFloorGroup?.(floorGroup, floor);

    // Generate floor slabs (cut holes for stairs/lifts from floor below)
    if (showFloors) {
      const slabs = generateFloorSlabs(floor, {
        thickness: floorThickness,
        theme,
        styleMap,
        penetrations: prevFloorPenetrations,
      });
      slabs.userData.layer = 'floor';
      floorGroup.add(slabs);

      // Surface each room slab to the consumer. `generateFloorSlabs` emits
      // one `THREE.Mesh` per room (named `floor_slab_${room.name}`) in
      // `floor.rooms` order, so we attribute by name.
      if (onRoomMesh) {
        for (const room of floor.rooms) {
          const slabMesh = slabs.children.find(
            (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name === `floor_slab_${room.name}`,
          );
          if (slabMesh) onRoomMesh(slabMesh, room, floor);
        }
      }
    }

    // Prepare rooms with default heights for wall ownership detection
    const floorHeight = floor.height ?? defaultHeight;
    const allRooms = floor.rooms.map((r) => ({
      ...r,
      roomHeight: r.roomHeight ?? floorHeight,
    }));

    // Generate walls using WallBuilder (CSG-enabled when available).
    // Connection meshes (doors, windows) go into a sibling `connectionsGroup`
    // so their visibility can be toggled independently of wall segments.
    if (showWalls) {
      const wallsGroup = new THREE.Group();
      wallsGroup.name = `walls_${floor.id}`;
      wallsGroup.userData.layer = 'wall';

      const connectionsGroup = new THREE.Group();
      connectionsGroup.name = `connections_${floor.id}`;
      connectionsGroup.userData.layer = 'connection';

      for (const room of allRooms) {
        const roomStyle = styleMap.get(room.style ?? config.default_style ?? '');
        const materials = MaterialFactory.createMaterialSet(roomStyle, theme);

        for (const wall of room.walls) {
          if (wall.type === 'open') continue;

          // Snapshot wall-segment count before generating so onWallMesh fires
          // only for wall meshes, not for connection geometry placed in the
          // separate connectionsGroup.
          const childCountBefore = onWallMesh ? wallsGroup.children.length : 0;
          wallBuilder.generateWall(
            wall,
            room,
            allRooms,
            normalizedData.connections ?? [],
            materials,
            wallsGroup,
            config,
            connectionsGroup,
          );
          if (onWallMesh) {
            for (let i = childCountBefore; i < wallsGroup.children.length; i++) {
              const child = wallsGroup.children[i];
              if (child instanceof THREE.Mesh) {
                onWallMesh(child, wall, room, floor);
              }
            }
          }
        }
      }

      floorGroup.add(wallsGroup);
      floorGroup.add(connectionsGroup);
    }

    // When walls are disabled, still render standalone door/window geometry.
    if (showConnections && !showWalls) {
      const connections = generateFloorConnections(floor, normalizedData.connections ?? [], {
        wallThickness,
        defaultHeight: floorHeight,
        theme,
        styleMap,
      });
      connections.userData.layer = 'connection';
      floorGroup.add(connections);
    }

    const currentFloorPenetrations: THREE.Box3[] = [];

    // Generate stairs
    if (showStairs && floor.stairs) {
      for (const stair of floor.stairs) {
        const stairGroup = stairGenerator.generateStair(stair);
        stairGroup.userData.layer = 'stair';
        floorGroup.add(stairGroup);
        // Update world matrix before computing bounding box
        floorGroup.updateMatrixWorld(true);
        // Track for next floor's holes
        const stairBox = new THREE.Box3().setFromObject(stairGroup);
        currentFloorPenetrations.push(stairBox);
        onStairMesh?.(stairGroup, stair, floor);
      }
    }

    // Generate lifts
    if (showLifts && floor.lifts) {
      const floorHeight = floor.height ?? defaultHeight;
      for (const lift of floor.lifts) {
        const liftGroup = stairGenerator.generateLift(lift, floorHeight);
        liftGroup.userData.layer = 'lift';
        floorGroup.add(liftGroup);
        // Update world matrix before computing bounding box
        floorGroup.updateMatrixWorld(true);
        // Track for next floor's holes
        currentFloorPenetrations.push(new THREE.Box3().setFromObject(liftGroup));
        onLiftMesh?.(liftGroup, lift, floor);
      }
    }

    // Update penetrations for the next floor
    prevFloorPenetrations = currentFloorPenetrations;

    scene.add(floorGroup);
  }

  // Compute scene bounds
  const bounds = computeSceneBounds(scene);

  return {
    scene,
    bounds,
    floorsRendered,
    styleMap,
    floorGroups,
  };
}

/**
 * Build a complete scene with camera and lighting.
 *
 * Normalizes all dimensions to meters once at the entry point and forwards
 * the normalized data to the internal scene-build helper, so it isn't
 * re-normalized downstream.
 */
export function buildCompleteScene(
  data: JsonExport,
  renderOptions: Render3DOptions,
  sceneOptions: SceneBuildOptions = {},
): {
  scene: THREE.Scene;
  camera: THREE.Camera;
  cameraResult: CameraSetupResult;
  bounds: SceneBounds;
  floorsRendered: number[];
  floorGroups: Map<string, THREE.Group>;
} {
  // Normalize once — we need meters here for theme/bounds/camera setup, and
  // we hand the same normalized object to the internal scene-build helper so
  // it isn't re-normalized.
  const normalizedData = normalizeToMeters(data);

  // Determine theme from config
  const theme = resolveTheme(normalizedData.config);

  // Determine which floors to render
  const floorIndices = renderOptions.renderAllFloors ? undefined : [renderOptions.floorIndex ?? 0];

  const { scene, bounds, floorsRendered, floorGroups } = buildFloorplanSceneFromNormalized(
    normalizedData,
    {
      ...sceneOptions,
      theme,
      floorIndices,
    },
  );

  // Set up camera
  const width = renderOptions.width ?? 800;
  const height = renderOptions.height ?? 600;
  const aspectRatio = width / height;

  const cameraResult = setupCamera(renderOptions, bounds, aspectRatio);

  // Set up lighting (shadows disabled by default for headless rendering)
  setupLighting(scene, bounds, {
    shadows: renderOptions.shadows ?? false,
  });

  return {
    scene,
    camera: cameraResult.camera,
    cameraResult,
    bounds,
    floorsRendered,
    floorGroups,
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
  defaultHeight?: number,
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
