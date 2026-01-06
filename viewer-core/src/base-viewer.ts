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

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Evaluator } from 'three-bvh-csg';
import type { JsonExport, JsonFloor, JsonConnection, JsonRoom, JsonConfig, JsonStyle } from 'floorplan-3d-core';
import { 
  COLORS, COLORS_DARK, getThemeColors,
  MaterialFactory, StairGenerator, normalizeToMeters,
  DIMENSIONS,
  type ViewerTheme, type MaterialStyle
} from 'floorplan-3d-core';
import { MeshRegistry } from './mesh-registry.js';
import { WallGenerator, type StyleResolver } from './wall-generator.js';
import { PivotIndicator } from './pivot-indicator.js';
import { KeyboardControls } from './keyboard-controls.js';
import { CameraManager } from './camera-manager.js';
import { FloorManager } from './floor-manager.js';
import { AnnotationManager } from './annotation-manager.js';
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
  
  // SceneContext interface getters
  get scene(): THREE.Scene { return this._scene; }
  get activeCamera(): THREE.Camera { return this._cameraManager.activeCamera; }
  get perspectiveCamera(): THREE.PerspectiveCamera { return this._perspectiveCamera; }
  get orthographicCamera(): THREE.OrthographicCamera { return this._orthographicCamera; }
  get renderer(): THREE.WebGLRenderer { return this._renderer; }
  get controls(): OrbitControls { return this._controls; }
  get domElement(): HTMLCanvasElement { return this._renderer.domElement; }
  get floors(): readonly THREE.Group[] { return this._floors; }
  get meshRegistry(): MeshRegistry { return this._meshRegistry; }
  
  // Manager getters
  get cameraManager(): CameraManager { return this._cameraManager; }
  get annotationManager(): AnnotationManager { return this._annotationManager; }
  get floorManager(): FloorManager { return this._floorManager; }
  
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
    const colors = getThemeColors(this.currentTheme);
    this._scene.background = new THREE.Color(colors.BACKGROUND);
    
    // Init perspective camera
    const fov = 75;
    const aspect = container.clientWidth / container.clientHeight || window.innerWidth / window.innerHeight;
    this._perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this._perspectiveCamera.position.set(20, 20, 20);
    
    // Init orthographic camera
    const frustumSize = 30;
    this._orthographicCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    this._orthographicCamera.position.set(20, 20, 20);
    
    // Init WebGL renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this._renderer.domElement);
    
    // Init CSS2D renderer for labels
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
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
    this.wallGenerator.setTheme(this.currentTheme);
    
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
      }
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
    
    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
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
        }
      );
      this.keyboardControls.setPivotIndicator(this.pivotIndicator!);
    }
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
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
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
    
    // Update body class for CSS theme selectors
    if (this.currentTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
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
      
      floorData.rooms.forEach(room => {
        // Check if room has explicit style
        const hasExplicitStyle = (room.style && this.styles.has(room.style)) ||
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
                material.forEach(mat => {
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
    this._floors.forEach(floorGroup => {
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
            else if (material.color.getHex() === COLORS.DOOR ||
                     material.color.getHex() === COLORS_DARK.DOOR) {
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
    this._floors.forEach(f => this._scene.remove(f));
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
      this._controls.target.set(firstRoom.x + firstRoom.width / 2, 0, firstRoom.z + firstRoom.height / 2);
      
      // Store as default camera state for Home key reset
      this.keyboardControls?.storeDefaultCameraState();
    }
    
    // Generate floors and track heights
    const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    normalizedData.floors.forEach((floorData) => {
      const floorHeight = floorData.height ?? globalDefault;
      this.floorHeights.push(floorHeight);
      
      const floorGroup = this.generateFloor(floorData);
      this._scene.add(floorGroup);
      this._floors.push(floorGroup);
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
    const group = new THREE.Group();
    group.name = floorData.id;
    
    // Height resolution priority: room > floor > config > constant
    const globalDefault = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    const floorDefault = floorData.height ?? globalDefault;
    
    // Prepare all rooms with defaults for wall ownership detection
    const allRoomsWithDefaults = floorData.rooms.map(r => ({
      ...r,
      roomHeight: r.roomHeight ?? floorDefault
    }));
    
    // Set style resolver for wall ownership detection
    const styleResolver: StyleResolver = (room: JsonRoom) => this.resolveRoomStyle(room);
    this.wallGenerator.setStyleResolver(styleResolver);
    
    floorData.rooms.forEach(room => {
      // Apply default height to room if not specified
      const roomWithDefaults = {
        ...room,
        roomHeight: room.roomHeight ?? floorDefault
      };
      
      // Resolve style for this room
      const roomStyle = this.resolveRoomStyle(room);
      
      // Create materials for this room with style and theme
      const hasExplicitStyle = (room.style && this.styles.has(room.style)) ||
        (this.config.default_style && this.styles.has(this.config.default_style));
      const materials = MaterialFactory.createMaterialSet(
        roomStyle,
        hasExplicitStyle ? undefined : this.currentTheme
      );
      
      // 1. Floor plate
      const floorMesh = this.createFloorMesh(roomWithDefaults, materials.floor);
      group.add(floorMesh);
      
      // Register floor mesh in registry for selection support
      this.registerRoomMesh(floorMesh, room, floorData.id);
      
      // 2. Walls with doors, windows, and connections
      roomWithDefaults.walls.forEach(wall => {
        this.wallGenerator.generateWall(
          wall,
          roomWithDefaults,
          allRoomsWithDefaults,
          this.connections,
          materials,
          group,
          this.config
        );
      });
    });
    
    // 3. Stairs
    if (floorData.stairs) {
      floorData.stairs.forEach(stair => {
        const stairGroup = this.stairGenerator.generateStair(stair);
        group.add(stairGroup);
      });
    }
    
    // 4. Lifts
    if (floorData.lifts) {
      floorData.lifts.forEach(lift => {
        const liftGroup = this.stairGenerator.generateLift(lift, floorDefault);
        group.add(liftGroup);
      });
    }
    
    return group;
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
    
    this._cameraManager.onWindowResize();
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
    this._floors.forEach(f => this._scene.remove(f));
    this._floors = [];
    this._meshRegistry.clear();
    
    // Dispose renderer
    this._renderer.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

