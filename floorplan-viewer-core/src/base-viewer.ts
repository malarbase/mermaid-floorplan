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
  JsonRoom,
  JsonStyle,
  JsonWall,
} from 'floorplan-3d-core';
import {
  buildFloorplanSceneFromNormalized,
  COLORS,
  COLORS_DARK,
  DIMENSIONS,
  getThemeColors,
  initCSG,
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
import { AnnotationManager } from './annotation-manager.js';
import { CameraManager } from './camera-manager.js';
import { FloorManager } from './floor-manager.js';
import { KeyboardControls } from './keyboard-controls.js';
import { LayerVisibilityManager } from './layer-visibility-manager.js';
import { MeshRegistry } from './mesh-registry.js';
import { PivotIndicator } from './pivot-indicator.js';
import type { SceneContext } from './scene-context.js';

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
  protected _layerVisibilityManager: LayerVisibilityManager;

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

  // Overlay layer for floating UI elements (scoped to container, not document.body)
  protected _overlayLayer: HTMLDivElement;

  // AbortController for cleaning up document-level event listeners on dispose
  protected readonly _abortController: AbortController = new AbortController();

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
  get layerVisibilityManager(): LayerVisibilityManager {
    return this._layerVisibilityManager;
  }

  /** Overlay layer for floating UI panels (scoped to viewer container). */
  get overlayContainer(): HTMLDivElement {
    return this._overlayLayer;
  }

  /** AbortSignal for document-level event listeners. Aborted on dispose(). */
  get abortSignal(): AbortSignal {
    return this._abortController.signal;
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
    this._perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, 0.5, 500);
    this._perspectiveCamera.position.set(20, 20, 20);

    // Init orthographic camera
    const frustumSize = 30;
    this._orthographicCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.5,
      500,
    );
    this._orthographicCamera.position.set(20, 20, 20);

    // Init WebGL renderer
    // logarithmicDepthBuffer gives more uniform depth precision across the near→far
    // range, which is the safety net that keeps any residual coplanar surfaces from
    // shimmering.  The slight fragment-shader cost is acceptable for interactive
    // architectural rendering at these poly counts.
    this._renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
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

    // Create overlay layer for floating UI elements (2D overlay, floor summary, etc.)
    // Scoped to the viewer container so elements are removed automatically on unmount.
    this._overlayLayer = document.createElement('div');
    this._overlayLayer.className = 'fp-overlay-layer';
    this._overlayLayer.style.position = 'absolute';
    this._overlayLayer.style.top = '0';
    this._overlayLayer.style.left = '0';
    this._overlayLayer.style.width = '100%';
    this._overlayLayer.style.height = '100%';
    this._overlayLayer.style.pointerEvents = 'none';
    this._overlayLayer.style.overflow = 'visible';
    this._overlayLayer.style.zIndex = '10'; // Above canvas & CSS2DRenderer
    container.appendChild(this._overlayLayer);

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
    this.directionalLight.shadow.bias = -0.001;
    this._scene.add(this.directionalLight);

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
      overlayContainer: this._overlayLayer,
    });

    this._layerVisibilityManager = new LayerVisibilityManager();

    this._floorManager = new FloorManager({
      getFloors: () => this._floors,
      getFloorplanData: () => this.currentFloorplanData,
      onVisibilityChange: () => {
        this._annotationManager.updateFloorSummary();
        this.onFloorVisibilityChanged?.();
      },
      onFloorShown: (floorGroup) => {
        this._layerVisibilityManager.applyToFloor(floorGroup);
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
   * Get the current theme name.
   * Public accessor for external consumers (replaces protected `currentTheme`).
   */
  public getTheme(): string {
    return this.currentTheme;
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

    // Regenerate materials for all rooms that don't have explicit styles.
    // Wall materials use the theme passed via `buildFloorplanScene` on the
    // next `loadFloorplan` call; existing wall meshes keep the theme they
    // were generated with (matches pre-consolidation behavior).
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
   *
   * Delegates the entire scene build to `floorplan-3d-core`'s
   * `buildFloorplanScene`, attaching synchronous callbacks to register
   * meshes in the viewer's `MeshRegistry` for selection / hover / source-
   * range navigation. This keeps the headless renderer and the interactive
   * viewer on a single scene-building pipeline.
   *
   * Returns a Promise that resolves once the scene has been built. The
   * leading `await initCSG()` ensures `three-bvh-csg` is loaded before the
   * core's `WallBuilder` and floor-slab generator probe `isCsgAvailable()`.
   * Without this, both fall back to non-CSG paths, which silently disables
   * door/window cutouts and stair/lift floor-slab penetrations (e.g. the
   * roof exit holes above a top-floor stair). The headless renderer in the
   * MCP package calls `initCSG()` directly before invoking the same builder,
   * so historically the viewer was the only consumer that hit this fallback.
   */
  public async loadFloorplan(data: JsonExport): Promise<void> {
    await initCSG();

    const normalizedData = normalizeToMeters(data);
    this.currentFloorplanData = normalizedData;

    // Clear existing floor groups; everything else (lights, controls,
    // pivot, annotations) lives directly on `this._scene` and is preserved.
    for (const f of this._floors) this._scene.remove(f);
    this._floors = [];
    this.floorHeights = [];
    this.connections = normalizedData.connections;
    this.config = normalizedData.config || {};

    this._meshRegistry.clear();

    this._annotationManager.initFromConfig(this.config);

    if (this.config.theme === 'dark' || this.config.darkMode === true) {
      this.setTheme('dark');
    } else if (this.config.theme === 'blueprint') {
      this.setTheme('blueprint');
    } else if (this.config.theme === 'default') {
      this.setTheme('light');
    }

    this.styles.clear();
    if (normalizedData.styles) {
      for (const style of normalizedData.styles) {
        this.styles.set(style.name, style);
      }
    }

    if (normalizedData.floors.length > 0 && normalizedData.floors[0].rooms.length > 0) {
      const firstRoom = normalizedData.floors[0].rooms[0];
      this._controls.target.set(
        firstRoom.x + firstRoom.width / 2,
        0,
        firstRoom.z + firstRoom.height / 2,
      );

      this.keyboardControls?.storeDefaultCameraState();
    }

    const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;

    // `normalizedData` has already been passed through `normalizeToMeters`
    // above so we can populate the camera target / styles map / config
    // before building. Use `buildFloorplanSceneFromNormalized` to skip the
    // second normalization pass that `buildFloorplanScene` would otherwise
    // perform on the same object — `normalizeToMeters` is intentionally
    // non-idempotent (it preserves `default_unit` so a re-call in feet
    // would scale dimensions by 1/3.28 a second time, breaking the render).
    const result = buildFloorplanSceneFromNormalized(normalizedData, {
      theme: this.currentTheme,
      onFloorGroup: (group, floor) => {
        this._floors.push(group);
        this.floorHeights.push(floor.height ?? globalDefault);
      },
      onRoomMesh: (mesh, room, floor) => {
        this.registerRoomMesh(mesh, room, floor.id);
      },
      onWallMesh: (mesh, wall, room, floor) => {
        this.registerWallMesh(mesh, wall, room, floor.id);
      },
    });

    // Lift each per-floor group out of the core's standalone scene and
    // attach it to our long-lived viewer scene (which already owns lights,
    // controls, helpers). Iterating `floorGroups` (rather than reusing
    // `result.scene` directly) avoids dragging the core scene's background
    // override into the viewer.
    for (const floorGroup of result.floorGroups.values()) {
      this._scene.add(floorGroup);
    }

    this.setExplodedView(this.explodedViewFactor);

    this._annotationManager.updateAll();

    this._floorManager.initFloorVisibility();

    this._layerVisibilityManager.initLayerVisibility(this._floors);

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
   * Register a room slab mesh in the registry. Default implementation
   * registers without a source range; subclasses (e.g. the editor) override
   * to attach `room._sourceRange` for DSL navigation.
   */
  protected registerRoomMesh(mesh: THREE.Mesh, room: JsonRoom, floorId: string): void {
    this._meshRegistry.register(mesh, 'room', room.name, floorId);
  }

  /**
   * Hook for registering wall-segment meshes emitted by the core scene
   * builder. Default implementation is a no-op (read-only viewer does not
   * need wall selection); the interactive editor overrides this to register
   * walls with their source ranges.
   */
  protected registerWallMesh(
    _mesh: THREE.Mesh,
    _wall: JsonWall,
    _room: JsonRoom,
    _floorId: string,
  ): void {
    // No-op by default.
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

    // Update camera tween animation
    this._cameraManager.updateTween(deltaTime);

    // Call subclass animation extension
    this.animateExtension?.(deltaTime);

    this._controls.update();
    this._renderer.render(this._scene, this._cameraManager.activeCamera);
    this._annotationManager.updateOcclusion(this._cameraManager.activeCamera, this._scene);
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
   * Options for capturing a screenshot / thumbnail.
   */
  public static readonly THUMBNAIL_DEFAULTS = {
    /** Pixel width of the captured image */
    width: 640,
    /** Pixel height — matches the ~2.3:1 aspect of project card thumbnails */
    height: 280,
    /** Image format */
    format: 'image/webp' as const,
    /** Compression quality 0-1 */
    quality: 0.8,
    /** Padding factor for auto-framing (1.0 = tight, 2.0 = double margin) */
    padding: 1.6,
  };

  /**
   * Capture a screenshot of the 3D scene as a Blob.
   *
   * When `width`/`height` are provided the renderer is temporarily resized,
   * the camera is repositioned along its **current viewing direction** to
   * frame all loaded floors, then the canvas is captured. The viewer is
   * fully restored afterwards — the user never sees a flash.
   *
   * Works without `preserveDrawingBuffer` because the render and toBlob()
   * calls execute synchronously before the compositor clears the buffer.
   *
   * @param options - Capture options (defaults to THUMBNAIL_DEFAULTS)
   * @returns Promise resolving to an image Blob
   */
  public captureScreenshot(options?: Partial<typeof BaseViewer.THUMBNAIL_DEFAULTS>): Promise<Blob> {
    const { width, height, format, quality, padding } = {
      ...BaseViewer.THUMBNAIL_DEFAULTS,
      ...options,
    };

    const camera = this._cameraManager.activeCamera;
    const needsResize = width !== undefined && height !== undefined;

    // --- Save current state ---
    const origCamPos = camera.position.clone();
    const origTarget = this._controls.target.clone();
    const origWidth = this._renderer.domElement.width;
    const origHeight = this._renderer.domElement.height;
    let origAspect: number | undefined;
    if (camera instanceof THREE.PerspectiveCamera) {
      origAspect = camera.aspect;
    }

    try {
      // --- Resize renderer to target thumbnail dimensions ---
      if (needsResize) {
        this._renderer.setSize(width, height);
        this._cameraManager.onWindowResize(width, height);
      }

      // --- Frame all floors at the target aspect ratio ---
      if (this._floors.length > 0) {
        const aspect = needsResize ? width / height : undefined;
        const framing = this._cameraManager.computeFramingForObjects(this._floors, padding, aspect);
        if (framing) {
          camera.position.copy(framing.position);
          this._controls.target.copy(framing.target);
          this._controls.update();
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.updateProjectionMatrix();
          }
        }
      }

      // --- Render + capture (synchronous before compositor clears the buffer) ---
      this._renderer.render(this._scene, camera);

      return new Promise<Blob>((resolve, reject) => {
        this._renderer.domElement.toBlob(
          (blob) => {
            // --- Restore state regardless of outcome ---
            camera.position.copy(origCamPos);
            this._controls.target.copy(origTarget);
            if (needsResize) {
              this._renderer.setSize(origWidth, origHeight);
              this._cameraManager.onWindowResize(origWidth, origHeight);
            }
            if (camera instanceof THREE.PerspectiveCamera && origAspect !== undefined) {
              camera.aspect = origAspect;
              camera.updateProjectionMatrix();
            }
            this._controls.update();

            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to capture screenshot from canvas'));
            }
          },
          format,
          quality,
        );
      });
    } catch (err) {
      // Restore on synchronous error
      camera.position.copy(origCamPos);
      this._controls.target.copy(origTarget);
      if (needsResize) {
        this._renderer.setSize(origWidth, origHeight);
        this._cameraManager.onWindowResize(origWidth, origHeight);
      }
      if (camera instanceof THREE.PerspectiveCamera && origAspect !== undefined) {
        camera.aspect = origAspect;
        camera.updateProjectionMatrix();
      }
      this._controls.update();
      throw err;
    }
  }

  /**
   * Clean up resources.
   */
  public dispose(): void {
    // Abort all document-level event listeners registered with our signal
    this._abortController.abort();

    // Stop animation
    this.stopAnimation();

    // Dispose managers/controls
    this.keyboardControls?.dispose();
    this.pivotIndicator?.dispose();
    this._annotationManager?.dispose();

    // Clear scene
    for (const f of this._floors) this._scene.remove(f);
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

    // Remove overlay layer (and all children) from DOM
    this._overlayLayer?.remove();
  }
}
