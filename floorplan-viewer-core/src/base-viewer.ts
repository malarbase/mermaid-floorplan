/**
 * BaseViewer - Abstract base class for floorplan viewers.
 *
 * This class provides the common Three.js setup and floorplan rendering logic
 * shared between the read-only Viewer and the InteractiveEditor.
 *
 * Subclasses implement:
 * - setupUIControls(): App-specific control panel wiring
 * - onFloorplanLoaded?(): Optional hook called after floorplan loading
 * - getAnimateExtension?(): Optional extra animation loop logic
 */

import type {
  JsonConfig,
  JsonConnection,
  JsonExport,
  JsonFloor,
  JsonRoom,
  JsonStyle,
} from 'floorplan-3d-core';
import {
  COLORS,
  COLORS_DARK,
  DIMENSIONS,
  getThemeColors,
  isDarkTheme,
  MaterialFactory,
  type MaterialStyle,
  normalizeToMeters,
  StairGenerator,
  type ViewerTheme,
} from 'floorplan-3d-core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { AnnotationManager } from './annotation-manager.js';
import { CameraManager } from './camera-manager.js';
import { FloorManager } from './floor-manager.js';
import { KeyboardControls } from './keyboard-controls.js';
import { MeshRegistry } from './mesh-registry.js';
import { PivotIndicator } from './pivot-indicator.js';
import type { SceneContext } from './scene-context.js';
import { type StyleResolver, WallGenerator } from './wall-generator.js';

/**
 * Configuration options for BaseViewer initialization.
 */
export interface BaseViewerOptions {
  /** DOM element ID to mount the viewer */
  containerId: string;
  /** Initial theme (default: 'light') */
  initialTheme?: ViewerTheme;
  /** Enable keyboard controls (default: true) */
  enableKeyboardControls?: boolean;
}

/**
 * Abstract base class for floorplan viewers.
 */
export abstract class BaseViewer implements SceneContext {
  // Core Three.js (protected for subclass access)
  protected _scene: THREE.Scene;
  protected _perspectiveCamera: THREE.PerspectiveCamera;
  protected _orthographicCamera: THREE.OrthographicCamera;
  protected _renderer: THREE.WebGLRenderer;
  protected labelRenderer: CSS2DRenderer;
  protected _controls: OrbitControls;

  // Entity-mesh registry for selection support
  protected _meshRegistry: MeshRegistry;

  // Scene content
  protected _floors: THREE.Group[] = [];
  protected floorHeights: number[] = [];
  protected connections: JsonConnection[] = [];
  protected config: JsonConfig = {};
  protected styles: Map<string, JsonStyle> = new Map();
  protected explodedViewFactor: number = 0;

  // Generators
  protected wallGenerator: WallGenerator;
  protected stairGenerator: StairGenerator;

  // Current floorplan data
  protected currentFloorplanData: JsonExport | null = null;

  // Theme state
  protected currentTheme: ViewerTheme = 'light';

  // Keyboard navigation
  protected pivotIndicator: PivotIndicator | null = null;
  protected keyboardControls: KeyboardControls | null = null;
  protected lastFrameTime: number = 0;

  // Managers
  protected _cameraManager: CameraManager;
  protected _annotationManager: AnnotationManager;
  protected _floorManager: FloorManager;

  // Lighting
  protected directionalLight: THREE.DirectionalLight;
  protected lightAzimuth: number = 45;
  protected lightElevation: number = 60;
  protected lightIntensity: number = 1.0;
  protected lightRadius: number = 100;

  // Animation
  protected animationFrameId: number | null = null;

  // Container resize observer (for responsive layout)
  protected resizeObserver: ResizeObserver | null = null;
  protected resizeDebounceTimeout: NodeJS.Timeout | null = null;

  // SceneContext interface getters
  get scene(): THREE.Scene {
    return this._scene;
  }
  get activeCamera(): THREE.Camera {
    return this._cameraManager.activeCamera;
  }
  get perspectiveCamera(): THREE.PerspectiveCamera {
    return this._perspectiveCamera;
  }
  get orthographicCamera(): THREE.OrthographicCamera {
    return this._orthographicCamera;
  }
  get renderer(): THREE.WebGLRenderer {
    return this._renderer;
  }
  get controls(): OrbitControls {
    return this._controls;
  }
  get domElement(): HTMLCanvasElement {
    return this._renderer.domElement;
  }
  get floors(): readonly THREE.Group[] {
    return this._floors;
  }
  get meshRegistry(): MeshRegistry {
    return this._meshRegistry;
  }

  // Manager getters
  get cameraManager(): CameraManager {
    return this._cameraManager;
  }
  get annotationManager(): AnnotationManager {
    return this._annotationManager;
  }
  get floorManager(): FloorManager {
    return this._floorManager;
  }

  // Light and theme getters
  get light(): THREE.DirectionalLight {
    return this.directionalLight;
  }
  get theme(): ViewerTheme {
    return this.currentTheme;
  }

  constructor(options: BaseViewerOptions) {
    const { containerId, initialTheme = 'light', enableKeyboardControls = true } = options;

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element '${containerId}' not found`);
    }

    this.currentTheme = initialTheme;

    // Init mesh registry for entity-mesh tracking
    this._meshRegistry = new MeshRegistry();

    // Init scene
    this._scene = new THREE.Scene();

    // Init perspective camera
    const fov = 75;
    const aspect =
      container.clientWidth / container.clientHeight || window.innerWidth / window.innerHeight;
    this._perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this._perspectiveCamera.position.set(20, 20, 20);

    // Init orthographic camera
    const frustumSize = 30;
    this._orthographicCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000,
    );
    this._orthographicCamera.position.set(20, 20, 20);

    // Init WebGL renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this._renderer.domElement);

    // Init CSS2D renderer for labels
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    // Init controls (using perspective camera initially)
    this._controls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);
    this._controls.enableDamping = true;

    // Init pivot indicator
    this.pivotIndicator = new PivotIndicator(this._scene, this._controls);

    // Wire up controls events to show pivot indicator
    this._controls.addEventListener('change', () => {
      this.pivotIndicator?.onCameraActivity();
    });

    // Init lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this._scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.lightIntensity);
    this.updateLightPosition();
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this._scene.add(this.directionalLight);

    // Init wall generator with CSG evaluator
    this.wallGenerator = new WallGenerator(new Evaluator());

    // Init stair generator
    this.stairGenerator = new StairGenerator();

    // Initialize managers
    this._cameraManager = new CameraManager(
      this._perspectiveCamera,
      this._orthographicCamera,
      this._controls,
      {
        getFloors: () => this._floors,
        getKeyboardControls: () => this.keyboardControls,
      },
    );

    this._annotationManager = new AnnotationManager({
      getFloors: () => this._floors,
      getFloorplanData: () => this.currentFloorplanData,
      getConfig: () => this.config,
      getFloorVisibility: (id) => this._floorManager.getFloorVisibility(id),
    });

    this._floorManager = new FloorManager({
      getFloors: () => this._floors,
      getFloorplanData: () => this.currentFloorplanData,
      onVisibilityChange: () => {
        this._annotationManager.updateFloorSummary();
        this.onFloorVisibilityChanged?.();
      },
    });

    // Container resize observer (responds to container size changes, not just window resize)
    // This handles editor panel open/close, responsive layout changes, etc.
    this.resizeObserver = new ResizeObserver(() => {
      // Debounce to avoid excessive updates during CSS transitions
      if (this.resizeDebounceTimeout) {
        clearTimeout(this.resizeDebounceTimeout);
      }
      this.resizeDebounceTimeout = setTimeout(() => {
        this.onWindowResize();
      }, 50);
    });
    this.resizeObserver.observe(container);

    // Initialize keyboard controls if enabled
    if (enableKeyboardControls) {
      this.keyboardControls = new KeyboardControls(
        this._controls,
        this._perspectiveCamera,
        this._orthographicCamera,
        {
          onCameraModeToggle: () => this._cameraManager.toggleCameraMode(),
          onUpdateOrthographicSize: () => this._cameraManager.updateOrthographicSize(),
          getBoundingBox: () => this._cameraManager.getSceneBoundingBox(),
          setHelpOverlayVisible: (visible: boolean) => this.setHelpOverlayVisible(visible),
        },
      );
      this.keyboardControls.setPivotIndicator(this.pivotIndicator!);
    }

    // Apply initial theme (sets scene background, body class, wall generator theme)
    this.applyTheme();
  }

  /**
   * Set keyboard help overlay visibility.
   * Override in subclass to connect to actual UI.
   */
  protected setHelpOverlayVisible(visible: boolean): void {
    const overlay = document.getElementById('keyboard-help-overlay');
    if (overlay) {
      overlay.classList.toggle('visible', visible);
      if (overlay.style.display !== undefined) {
        overlay.style.display = visible ? 'flex' : 'none';
      }
    }
    // Sync keyboard controls state
    this.keyboardControls?.syncHelpOverlayState(visible);
  }

  /**
   * Called when floor visibility changes.
   * Override in subclass for additional handling (e.g., 2D overlay update).
   */
  protected onFloorVisibilityChanged?(): void;

  /**
   * Update light position from azimuth/elevation.
   */
  protected updateLightPosition(): void {
    const azimuthRad = (this.lightAzimuth * Math.PI) / 180;
    const elevationRad = (this.lightElevation * Math.PI) / 180;

    const x = this.lightRadius * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = this.lightRadius * Math.sin(elevationRad);
    const z = this.lightRadius * Math.cos(elevationRad) * Math.cos(azimuthRad);

    this.directionalLight.position.set(x, y, z);
  }

  /**
   * Toggle between light and dark theme.
   */
  public toggleTheme(): void {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  /**
   * Set the current theme.
   */
  public setTheme(theme: ViewerTheme): void {
    this.currentTheme = theme;
    this.applyTheme();
  }

  /**
   * Apply the current theme to the scene.
   */
  protected applyTheme(): void {
    const colors = getThemeColors(this.currentTheme);
    this._scene.background = new THREE.Color(colors.BACKGROUND);

    // Update body class for CSS theme selectors (blueprint is also dark)
    const isDark = isDarkTheme(this.currentTheme);
    document.body.classList.toggle('dark-theme', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Update wall generator theme
    this.wallGenerator.setTheme(this.currentTheme);

    // Regenerate materials for all rooms that don't have explicit styles
    this.regenerateMaterialsForTheme();
  }

  /**
   * Regenerate materials for rooms without explicit styles when theme changes.
   */
  protected regenerateMaterialsForTheme(): void {
    if (!this.currentFloorplanData) return;

    const themeColors = getThemeColors(this.currentTheme);

    // Traverse all floors and update materials
    this.currentFloorplanData.floors.forEach((floorData, floorIndex) => {
      const floorGroup = this._floors[floorIndex];
      if (!floorGroup) return;

      floorData.rooms.forEach((room) => {
        // Check if room has explicit style
        const hasExplicitStyle =
          (room.style && this.styles.has(room.style)) ||
          (this.config.default_style && this.styles.has(this.config.default_style));

        // Only update materials for rooms without explicit styles
        if (!hasExplicitStyle) {
          // Find and update floor mesh for this room
          floorGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mesh = child as THREE.Mesh;
              const material = mesh.material;

              // Update floor materials (single material)
              if (material instanceof THREE.MeshStandardMaterial && !Array.isArray(material)) {
                // Check if it's a floor mesh (positioned at room elevation)
                const elevation = room.elevation || 0;
                if (Math.abs(mesh.position.y - elevation) < 0.1) {
                  material.color.setHex(themeColors.FLOOR);
                  material.needsUpdate = true;
                }
              }

              // Update wall materials (material arrays for per-face materials)
              if (Array.isArray(material)) {
                material.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    // Update wall colors
                    mat.color.setHex(themeColors.WALL);
                    mat.needsUpdate = true;
                  }
                });
              }
            }
          });
        }
      });
    });

    // Update door and window materials (they don't have explicit styles)
    this._floors.forEach((floorGroup) => {
      floorGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material;

          if (material instanceof THREE.MeshStandardMaterial) {
            // Window materials are transparent
            if (material.transparent && material.opacity < 1.0) {
              material.color.setHex(themeColors.WINDOW);
              material.needsUpdate = true;
            }
            // Door materials (identified by their color range)
            else if (
              material.color.getHex() === COLORS.DOOR ||
              material.color.getHex() === COLORS_DARK.DOOR
            ) {
              material.color.setHex(themeColors.DOOR);
              material.needsUpdate = true;
            }
          }
        }
      });
    });
  }

  /**
   * Load a floorplan from JSON data.
   */
  public loadFloorplan(data: JsonExport): void {
    // Normalize all dimensions to meters for consistent 3D rendering
    const normalizedData = normalizeToMeters(data);
    this.currentFloorplanData = normalizedData;

    // Clear existing
    this._floors.forEach((f) => this._scene.remove(f));
    this._floors = [];
    this.floorHeights = [];
    this.connections = normalizedData.connections;
    this.config = normalizedData.config || {};

    // Clear mesh registry for new floorplan
    this._meshRegistry.clear();

    // Initialize unit settings from config
    this._annotationManager.initFromConfig(this.config);

    // Apply theme from DSL config
    if (this.config.theme === 'dark' || this.config.darkMode === true) {
      this.setTheme('dark');
    } else if (this.config.theme === 'blueprint') {
      this.setTheme('blueprint');
    } else if (this.config.theme === 'default') {
      this.setTheme('light');
    }

    // Build style lookup map
    this.styles.clear();
    if (normalizedData.styles) {
      for (const style of normalizedData.styles) {
        this.styles.set(style.name, style);
      }
    }

    // Center camera roughly
    if (normalizedData.floors.length > 0 && normalizedData.floors[0].rooms.length > 0) {
      const firstRoom = normalizedData.floors[0].rooms[0];
      this._controls.target.set(
        firstRoom.x + firstRoom.width / 2,
        0,
        firstRoom.z + firstRoom.height / 2,
      );

      // Store as default camera state for Home key reset
      this.keyboardControls?.storeDefaultCameraState();
    }

    // Generate floors and track heights
    // Track penetrations from each floor's stairs/lifts for cutting holes in the next floor
    let prevFloorPenetrations: THREE.Box3[] = [];

    const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    normalizedData.floors.forEach((floorData) => {
      const floorHeight = floorData.height ?? globalDefault;
      this.floorHeights.push(floorHeight);

      const { group: floorGroup, penetrations } = this.generateFloorWithPenetrations(
        floorData,
        prevFloorPenetrations,
      );
      this._scene.add(floorGroup);
      this._floors.push(floorGroup);

      // Update penetrations for the next floor
      prevFloorPenetrations = penetrations;
    });

    this.setExplodedView(this.explodedViewFactor);

    // Update annotations
    this._annotationManager.updateAll();

    // Update floor visibility UI
    this._floorManager.initFloorVisibility();

    // Call subclass hook
    this.onFloorplanLoaded?.();
  }

  /**
   * Called after floorplan loading completes.
   * Override in subclass for additional handling.
   */
  protected onFloorplanLoaded?(): void;

  /**
   * Resolve style for a room with fallback chain:
   * 1. Room's explicit style
   * 2. Default style from config
   * 3. undefined (use defaults)
   */
  protected resolveRoomStyle(room: JsonRoom): MaterialStyle | undefined {
    // Try room's explicit style first
    if (room.style && this.styles.has(room.style)) {
      const style = this.styles.get(room.style)!;
      return MaterialFactory.jsonStyleToMaterialStyle(style);
    }

    // Try default style from config
    if (this.config.default_style && this.styles.has(this.config.default_style)) {
      const style = this.styles.get(this.config.default_style)!;
      return MaterialFactory.jsonStyleToMaterialStyle(style);
    }

    return undefined;
  }

  /**
   * Generate a floor group from floor data.
   */
  protected generateFloor(floorData: JsonFloor): THREE.Group {
    // Delegate to the new method but ignore penetrations (for backwards compatibility)
    return this.generateFloorWithPenetrations(floorData, []).group;
  }

  /**
   * Compute bounding box for a stair penetration.
   * Returns a box in world space that can be used to cut holes in the floor above.
   * For multi-flight stairs, computes penetration at the TOP (final flight) of the stair.
   */
  protected computeStairPenetration(
    stair: {
      x: number;
      z: number;
      width?: number;
      shape: {
        type: string;
        direction?: string;
        entry?: string;
        runs?: number[];
        outerRadius?: number;
        segments?: Array<{
          type: string;
          steps?: number;
          width?: number;
          direction?: string;
          landing?: [number, number];
        }>;
      };
    },
    tread?: number,
    rise?: number,
  ): THREE.Box3 {
    const DEFAULT_WIDTH = 1.0; // meters
    const DEFAULT_TREAD = 0.28; // meters
    const DEFAULT_RISER = 0.18; // meters

    const stairWidth = stair.width ?? DEFAULT_WIDTH;
    const treadDepth = tread ?? DEFAULT_TREAD;
    const riserHeight = DEFAULT_RISER;
    const stairRise = rise ?? 3.0; // default 3m rise

    // For custom/segmented stairs, trace through segments to find final flight position
    if (
      (stair.shape.type === 'custom' || stair.shape.type === 'segmented') &&
      stair.shape.segments
    ) {
      return this.computeCustomStairPenetration(stair, treadDepth, stairWidth, stairRise);
    }

    // Calculate step count and total run based on shape
    let runLength = 0;
    let boundWidth = stairWidth;
    let boundDepth = 0;

    const stepCount = Math.ceil(stairRise / riserHeight);

    if (stair.shape.type === 'straight') {
      runLength = stepCount * treadDepth;
      boundDepth = runLength;
    } else if (stair.shape.type === 'L-shaped') {
      const runs = stair.shape.runs ?? [Math.ceil(stepCount / 2), Math.floor(stepCount / 2)];
      const run1Length = runs[0] * treadDepth;
      const run2Length = runs[1] * treadDepth;
      // L-shaped bounds encompass both runs plus landing
      boundWidth = Math.max(stairWidth, run2Length + stairWidth);
      boundDepth = run1Length + stairWidth; // landing width
    } else if (stair.shape.type === 'spiral') {
      const outerRadius = stair.shape.outerRadius ?? 1.5;
      boundWidth = outerRadius * 2;
      boundDepth = outerRadius * 2;
    } else {
      // Default: treat as straight
      runLength = stepCount * treadDepth;
      boundDepth = runLength;
    }

    // Determine climb direction (which way the stair extends)
    // "direction" = which way the stair climbs (direct)
    // "entry" = which way you enter (so stair climbs OPPOSITE direction)
    let climbDirection: string;
    if (stair.shape.direction) {
      climbDirection = stair.shape.direction;
    } else if (stair.shape.entry) {
      // Entry is opposite of climb direction
      const entryToClimb: Record<string, string> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      };
      climbDirection = entryToClimb[stair.shape.entry] ?? 'top';
    } else {
      climbDirection = 'top';
    }

    let minX = stair.x;
    let maxX = stair.x + boundWidth;
    let minZ = stair.z;
    let maxZ = stair.z + boundDepth;

    // Adjust bounds based on climb direction (which way the stair extends)
    if (climbDirection === 'bottom') {
      // Stair extends toward bottom (south, -Z)
      minZ = stair.z - boundDepth;
      maxZ = stair.z + boundWidth; // width at entry
    } else if (climbDirection === 'top') {
      // Stair extends toward top (north, +Z) - default
      minZ = stair.z;
      maxZ = stair.z + boundDepth;
    } else if (climbDirection === 'left') {
      // Stair extends toward left (west, -X)
      minX = stair.x - boundDepth;
      maxX = stair.x + boundWidth;
      minZ = stair.z;
      maxZ = stair.z + boundWidth;
    } else if (climbDirection === 'right') {
      // Stair extends toward right (east, +X)
      minX = stair.x;
      maxX = stair.x + boundDepth;
      minZ = stair.z;
      maxZ = stair.z + boundWidth;
    }

    // Create box with vertical extent (doesn't matter much for horizontal cutting)
    const box = new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(maxX, stairRise, maxZ),
    );

    return box;
  }

  /**
   * Compute bounding box for a custom stair penetration.
   * Uses the full bounding box of the entire stair (all segments) for the floor cutout.
   * Works in LOCAL coordinates (like stair-geometry.ts), then transforms to world.
   */
  private computeCustomStairPenetration(
    stair: {
      x: number;
      z: number;
      width?: number;
      shape: {
        entry?: string;
        segments?: Array<{
          type: string;
          steps?: number;
          width?: number;
          direction?: string;
          landing?: [number, number];
        }>;
      };
    },
    treadDepth: number,
    defaultWidth: number,
    stairRise: number,
  ): THREE.Box3 {
    const segments = stair.shape.segments!;

    // Work in LOCAL coordinates (same as stair-geometry.ts)
    // Initial forward direction in local space is -Z
    let forward = new THREE.Vector2(0, -1);

    // Track bounding box of entire stair
    let minLocalX = 0,
      maxLocalX = 0,
      minLocalZ = 0,
      maxLocalZ = 0;
    const currentPos = new THREE.Vector2(0, 0); // Start at local origin (entry point)

    for (const segment of segments) {
      if (segment.type === 'flight') {
        const steps = segment.steps ?? 10;
        const segWidth = segment.width ?? defaultWidth;
        const flightLength = steps * treadDepth;

        // Update bounding box with flight start position
        minLocalX = Math.min(minLocalX, currentPos.x - segWidth / 2);
        maxLocalX = Math.max(maxLocalX, currentPos.x + segWidth / 2);
        minLocalZ = Math.min(minLocalZ, currentPos.y);
        maxLocalZ = Math.max(maxLocalZ, currentPos.y);

        // Advance to end of flight
        currentPos.add(forward.clone().multiplyScalar(flightLength));

        // Update bounding box with flight end position
        minLocalX = Math.min(minLocalX, currentPos.x - segWidth / 2);
        maxLocalX = Math.max(maxLocalX, currentPos.x + segWidth / 2);
        minLocalZ = Math.min(minLocalZ, currentPos.y);
        maxLocalZ = Math.max(maxLocalZ, currentPos.y);
      } else if (segment.type === 'turn') {
        const landingW = segment.landing ? segment.landing[0] : defaultWidth;
        const landingD = segment.landing ? segment.landing[1] : defaultWidth;

        // Look ahead to get next flight width for alignment (matching stair-geometry.ts)
        const segIdx = segments.indexOf(segment);
        const nextSegment = segIdx + 1 < segments.length ? segments[segIdx + 1] : null;
        const nextFlightWidth =
          nextSegment && nextSegment.type === 'flight' && nextSegment.width
            ? nextSegment.width
            : defaultWidth;

        // Update bounding box with landing area (conservative: use max dimension)
        const landingCenter = currentPos.clone().add(forward.clone().multiplyScalar(landingD / 2));
        const maxLandingDim = Math.max(landingW, landingD) / 2;
        minLocalX = Math.min(minLocalX, landingCenter.x - maxLandingDim);
        maxLocalX = Math.max(maxLocalX, landingCenter.x + maxLandingDim);
        minLocalZ = Math.min(minLocalZ, landingCenter.y - maxLandingDim);
        maxLocalZ = Math.max(maxLocalZ, landingCenter.y + maxLandingDim);

        // Advance to center of landing
        currentPos.add(forward.clone().multiplyScalar(landingD / 2));

        // Turn - use rotation formula matching Three.js applyAxisAngle around Y
        const turnAngle = segment.direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
        const cos2 = Math.cos(turnAngle);
        const sin2 = Math.sin(turnAngle);
        forward = new THREE.Vector2(
          forward.x * cos2 + forward.y * sin2,
          -forward.x * sin2 + forward.y * cos2,
        );

        // Shift to edge of landing in new direction
        currentPos.add(forward.clone().multiplyScalar(landingW / 2));

        // Align outer edges (matching stair-geometry.ts)
        const perpSign = segment.direction === 'right' ? 1 : -1;
        const perpNew = new THREE.Vector2(forward.y, -forward.x);
        const widthDiff = (landingW - nextFlightWidth) / 2;
        currentPos.add(perpNew.clone().multiplyScalar(widthDiff * perpSign));
      }
    }

    // Transform LOCAL bounding box to WORLD coords
    const entry = stair.shape.entry ?? 'bottom';
    let entryRotation = 0;
    switch (entry) {
      case 'top':
        entryRotation = Math.PI;
        break;
      case 'bottom':
        entryRotation = 0;
        break;
      case 'right':
        entryRotation = -Math.PI / 2;
        break;
      case 'left':
        entryRotation = Math.PI / 2;
        break;
    }

    const cos = Math.cos(entryRotation);
    const sin = Math.sin(entryRotation);

    // Transform bounding box corners (offset so bbox corner aligns with stair position)
    const transformToWorld = (local: THREE.Vector2): THREE.Vector2 => {
      const offsetX = local.x - minLocalX;
      const offsetZ = local.y - minLocalZ;
      const rotatedX = offsetX * cos + offsetZ * sin;
      const rotatedZ = -offsetX * sin + offsetZ * cos;
      return new THREE.Vector2(rotatedX + stair.x, rotatedZ + stair.z);
    };

    // Transform all 4 corners of the bounding box
    const localCorners = [
      new THREE.Vector2(minLocalX, minLocalZ),
      new THREE.Vector2(maxLocalX, minLocalZ),
      new THREE.Vector2(minLocalX, maxLocalZ),
      new THREE.Vector2(maxLocalX, maxLocalZ),
    ];
    const worldCorners = localCorners.map(transformToWorld);

    // Compute world bounds
    const minX = Math.min(...worldCorners.map((c) => c.x));
    const maxX = Math.max(...worldCorners.map((c) => c.x));
    const minZ = Math.min(...worldCorners.map((c) => c.y));
    const maxZ = Math.max(...worldCorners.map((c) => c.y));

    return new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(maxX, stairRise, maxZ),
    );
  }

  /**
   * Compute bounding box for a lift penetration.
   */
  protected computeLiftPenetration(lift: {
    x: number;
    z: number;
    width: number;
    height: number;
  }): THREE.Box3 {
    return new THREE.Box3(
      new THREE.Vector3(lift.x, 0, lift.z),
      new THREE.Vector3(lift.x + lift.width, 10, lift.z + lift.height), // height doesn't matter for horizontal cutting
    );
  }

  /**
   * Generate a floor group from floor data with penetration support.
   * @param floorData The floor data
   * @param prevFloorPenetrations Penetration boxes from the previous floor's stairs/lifts
   * @returns The floor group and penetration boxes for this floor's stairs/lifts
   */
  protected generateFloorWithPenetrations(
    floorData: JsonFloor,
    prevFloorPenetrations: THREE.Box3[],
  ): { group: THREE.Group; penetrations: THREE.Box3[] } {
    const group = new THREE.Group();
    group.name = floorData.id;

    // Height resolution priority: room > floor > config > constant
    const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    const floorDefault = floorData.height ?? globalDefault;

    // Prepare all rooms with defaults for wall ownership detection
    const allRoomsWithDefaults = floorData.rooms.map((r) => ({
      ...r,
      roomHeight: r.roomHeight ?? floorDefault,
    }));

    // Set style resolver for wall ownership detection
    const styleResolver: StyleResolver = (room: JsonRoom) => this.resolveRoomStyle(room);
    this.wallGenerator.setStyleResolver(styleResolver);

    floorData.rooms.forEach((room) => {
      // Apply default height to room if not specified
      const roomWithDefaults = {
        ...room,
        roomHeight: room.roomHeight ?? floorDefault,
      };

      // Resolve style for this room
      const roomStyle = this.resolveRoomStyle(room);

      // Create materials for this room with style and theme
      const hasExplicitStyle =
        (room.style && this.styles.has(room.style)) ||
        (this.config.default_style && this.styles.has(this.config.default_style));
      const materials = MaterialFactory.createMaterialSet(
        roomStyle,
        hasExplicitStyle ? undefined : this.currentTheme,
      );

      // 1. Floor plate with penetration support
      const floorMesh = this.createFloorMeshWithPenetrations(
        roomWithDefaults,
        materials.floor,
        prevFloorPenetrations,
      );
      group.add(floorMesh);

      // Register floor mesh in registry for selection support
      this.registerRoomMesh(floorMesh, room, floorData.id);

      // 2. Walls with doors, windows, and connections
      roomWithDefaults.walls.forEach((wall) => {
        this.wallGenerator.generateWall(
          wall,
          roomWithDefaults,
          allRoomsWithDefaults,
          this.connections,
          materials,
          group,
          this.config,
        );
      });
    });

    // Collect penetrations for the next floor
    const penetrations: THREE.Box3[] = [];

    // 3. Stairs
    if (floorData.stairs) {
      floorData.stairs.forEach((stair) => {
        const stairGroup = this.stairGenerator.generateStair(stair);
        group.add(stairGroup);

        // Compute penetration bounds for next floor
        penetrations.push(this.computeStairPenetration(stair, stair.tread, stair.rise));
      });
    }

    // 4. Lifts
    if (floorData.lifts) {
      floorData.lifts.forEach((lift) => {
        const liftGroup = this.stairGenerator.generateLift(lift, floorDefault);
        group.add(liftGroup);

        // Compute penetration bounds for next floor
        penetrations.push(this.computeLiftPenetration(lift));
      });
    }

    return { group, penetrations };
  }

  /**
   * Register a room mesh in the registry.
   * Override in subclass to include source range tracking.
   */
  protected registerRoomMesh(mesh: THREE.Mesh, room: JsonRoom, floorId: string): void {
    this._meshRegistry.register(mesh, 'room', room.name, floorId);
  }

  /**
   * Create a floor mesh for a room.
   * NOTE: This method does NOT support floor penetrations (holes for stairs/lifts).
   * It creates simple box geometry without CSG hole-cutting.
   */
  protected createFloorMesh(room: JsonRoom, material: THREE.Material): THREE.Mesh {
    const floorThickness = this.config.floor_thickness ?? DIMENSIONS.FLOOR.THICKNESS;
    const floorGeom = new THREE.BoxGeometry(room.width, floorThickness, room.height);
    const centerX = room.x + room.width / 2;
    const centerZ = room.z + room.height / 2;
    const elevation = room.elevation || 0;

    const floorMesh = new THREE.Mesh(floorGeom, material);
    floorMesh.position.set(centerX, elevation, centerZ);
    floorMesh.receiveShadow = true;
    return floorMesh;
  }

  /**
   * Create a floor mesh with CSG hole-cutting for stair/lift penetrations.
   */
  protected createFloorMeshWithPenetrations(
    room: JsonRoom,
    material: THREE.Material,
    penetrations: THREE.Box3[],
  ): THREE.Mesh {
    const floorThickness = this.config.floor_thickness ?? DIMENSIONS.FLOOR.THICKNESS;
    const centerX = room.x + room.width / 2;
    const centerZ = room.z + room.height / 2;
    const elevation = room.elevation || 0;

    // Room bounding box (in XZ plane)
    const roomBox = new THREE.Box3(
      new THREE.Vector3(room.x, elevation - floorThickness, room.z),
      new THREE.Vector3(room.x + room.width, elevation + floorThickness, room.z + room.height),
    );

    // Find penetrations that intersect this room
    const overlappingPenetrations = penetrations.filter((pen) => pen.intersectsBox(roomBox));

    if (overlappingPenetrations.length === 0) {
      // No penetrations - create simple floor
      const floorGeom = new THREE.BoxGeometry(room.width, floorThickness, room.height);
      const floorMesh = new THREE.Mesh(floorGeom, material);
      floorMesh.position.set(centerX, elevation, centerZ);
      floorMesh.receiveShadow = true;
      return floorMesh;
    }

    // Create floor as CSG-compatible Brush
    const floorGeom = new THREE.BoxGeometry(room.width, floorThickness, room.height);
    const floorBrush = new Brush(floorGeom, material);
    floorBrush.position.set(centerX, elevation, centerZ);
    floorBrush.updateMatrixWorld();

    // CSG subtract each penetration
    const csgEvaluator = new Evaluator();
    let resultBrush: Brush = floorBrush;

    for (const pen of overlappingPenetrations) {
      // Compute intersection bounds (clip penetration to room bounds)
      const intersection = pen.clone().intersect(roomBox);
      const size = new THREE.Vector3();
      intersection.getSize(size);
      const center = new THREE.Vector3();
      intersection.getCenter(center);

      // Skip tiny intersections
      if (size.x < 0.1 || size.z < 0.1) continue;

      // Create hole geometry as Brush
      const holeGeom = new THREE.BoxGeometry(size.x, floorThickness * 2, size.z);
      const holeBrush = new Brush(holeGeom);
      holeBrush.position.set(center.x, elevation, center.z);
      holeBrush.updateMatrixWorld();

      // Perform CSG subtraction
      try {
        resultBrush = csgEvaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
      } catch {
        // CSG failed - fallback to no hole
        console.warn('CSG subtraction failed for room', room.name);
      }
    }

    // Convert Brush result to Mesh
    const resultMesh = new THREE.Mesh(resultBrush.geometry, material);
    resultMesh.position.copy(resultBrush.position);
    resultMesh.receiveShadow = true;
    return resultMesh;
  }

  /**
   * Set the exploded view factor.
   * 0 = floors stacked normally (touching)
   * 1 = maximum separation between floors
   */
  public setExplodedView(factor: number): void {
    this.explodedViewFactor = factor;
    const separation = DIMENSIONS.EXPLODED_VIEW.MAX_SEPARATION * factor;
    const defaultHeight = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;

    let cumulativeY = 0;
    this._floors.forEach((floorGroup, index) => {
      floorGroup.position.y = cumulativeY;
      // Use floor-specific height for calculating next floor position
      const floorHeight = this.floorHeights[index] ?? defaultHeight;
      cumulativeY += floorHeight + separation;
    });

    // Update annotations to match new positions
    this._annotationManager.updateAll();
  }

  /**
   * Handle window resize.
   */
  protected onWindowResize(): void {
    const container = this._renderer.domElement.parentElement;
    const width = container?.clientWidth ?? window.innerWidth;
    const height = container?.clientHeight ?? window.innerHeight;

    this._cameraManager.onWindowResize(width, height);
    this._renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  /**
   * Animation loop.
   */
  protected animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    // Calculate delta time
    const now = performance.now();
    const deltaTime = this.lastFrameTime ? now - this.lastFrameTime : 16;
    this.lastFrameTime = now;

    // Update keyboard controls
    this.keyboardControls?.update(deltaTime);

    // Update pivot indicator
    this.pivotIndicator?.update(deltaTime);
    this.pivotIndicator?.updateSize(this._cameraManager.activeCamera);

    // Call subclass animation extension
    this.animateExtension?.(deltaTime);

    this._controls.update();
    this._renderer.render(this._scene, this._cameraManager.activeCamera);
    this.labelRenderer.render(this._scene, this._cameraManager.activeCamera);
  }

  /**
   * Extension point for subclass animation logic.
   * Called each frame with delta time.
   */
  protected animateExtension?(deltaTime: number): void;

  /**
   * Start the animation loop.
   * Call this after setup is complete.
   */
  public startAnimation(): void {
    if (this.animationFrameId === null) {
      this.animate();
    }
  }

  /**
   * Stop the animation loop.
   */
  public stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up resources.
   */
  public dispose(): void {
    // Stop animation
    this.stopAnimation();

    // Dispose managers/controls
    this.keyboardControls?.dispose();
    this.pivotIndicator?.dispose();

    // Clear scene
    this._floors.forEach((f) => this._scene.remove(f));
    this._floors = [];
    this._meshRegistry.clear();

    // Dispose renderer
    this._renderer.dispose();

    // Clean up resize observer
    if (this.resizeDebounceTimeout) {
      clearTimeout(this.resizeDebounceTimeout);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
