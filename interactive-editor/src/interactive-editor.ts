/**
 * InteractiveEditor - Full-featured floorplan editor with selection and editing capabilities.
 * 
 * This extends the read-only viewer with:
 * - Click and marquee selection
 * - Editor-3D bidirectional sync
 * - Properties panel for editing
 * - Branching history (undo/redo)
 * 
 * Uses shared WallGenerator from viewer-core for proper:
 * - Wall ownership detection (no duplicate walls)
 * - CSG operations for door/window cutouts
 * - Multi-floor elevation stacking
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Evaluator } from 'three-bvh-csg';
import type { JsonExport, JsonFloor, JsonRoom, JsonStyle, JsonConfig, JsonConnection } from 'floorplan-3d-core';
import { 
  COLORS,
  MaterialFactory, 
  StairGenerator, 
  normalizeToMeters,
  DIMENSIONS,
  type ViewerTheme,
  type MaterialStyle,
} from 'floorplan-3d-core';
import { 
  MeshRegistry, 
  WallGenerator,
  PivotIndicator,
  KeyboardControls,
  CameraManager,
  FloorManager,
  AnnotationManager,
  SelectionManager,
  type SceneContext,
  type SelectableObject,
  type StyleResolver,
  type MarqueeMode,
} from 'viewer-core';

/**
 * Configuration options for the InteractiveEditor.
 */
export interface InteractiveEditorOptions {
  /** DOM element ID to mount the editor */
  containerId?: string;
  /** Initial floorplan data */
  initialData?: JsonExport;
  /** Enable selection features (default: true) */
  enableSelection?: boolean;
  /** Initial marquee mode (default: 'intersection') */
  marqueeMode?: MarqueeMode;
}

/**
 * Interactive floorplan editor with selection and editing capabilities.
 */
export class InteractiveEditor implements SceneContext {
  // Core Three.js
  protected _scene: THREE.Scene;
  protected _perspectiveCamera: THREE.PerspectiveCamera;
  protected _orthographicCamera: THREE.OrthographicCamera;
  protected _renderer: THREE.WebGLRenderer;
  protected labelRenderer: CSS2DRenderer;
  protected _controls: OrbitControls;
  
  // Entity-mesh registry
  protected _meshRegistry: MeshRegistry;
  
  // Selection manager
  protected _selectionManager: SelectionManager | null = null;
  
  // Shared managers from viewer-core
  protected _pivotIndicator: PivotIndicator;
  protected _keyboardControls: KeyboardControls;
  protected _cameraManager: CameraManager;
  protected _floorManager: FloorManager;
  protected _annotationManager: AnnotationManager;
  
  // Lighting (stored for manager access)
  protected _directionalLight: THREE.DirectionalLight;
  
  // Scene content
  protected _floors: THREE.Group[] = [];
  protected floorHeights: number[] = [];
  protected currentFloorplanData: JsonExport | null = null;
  protected connections: JsonConnection[] = [];
  protected config: JsonConfig = {};
  protected styles: Map<string, JsonStyle> = new Map();
  protected explodedViewFactor: number = 0;
  
  // Error state management
  private _hasParseError: boolean = false;
  private _lastValidFloorplanData: JsonExport | null = null;
  
  // Generators
  protected wallGenerator: WallGenerator;
  protected stairGenerator: StairGenerator;
  
  // Theme state
  protected currentTheme: ViewerTheme = 'light';
  
  // Animation
  private animationFrameId: number | null = null;
  
  // Active camera tracking
  private _activeCamera: THREE.Camera;
  
  // SceneContext interface getters
  get scene(): THREE.Scene { return this._scene; }
  get activeCamera(): THREE.Camera { return this._activeCamera; }
  get perspectiveCamera(): THREE.PerspectiveCamera { return this._perspectiveCamera; }
  get orthographicCamera(): THREE.OrthographicCamera { return this._orthographicCamera; }
  get renderer(): THREE.WebGLRenderer { return this._renderer; }
  get controls(): OrbitControls { return this._controls; }
  get domElement(): HTMLCanvasElement { return this._renderer.domElement; }
  get floors(): readonly THREE.Group[] { return this._floors; }
  get meshRegistry(): MeshRegistry { return this._meshRegistry; }
  get selectionManager(): SelectionManager | null { return this._selectionManager; }
  
  /** Whether the current DSL has parse errors (3D view shows stale geometry) */
  get hasParseError(): boolean { return this._hasParseError; }
  
  /** The last successfully parsed floorplan data (used during error state) */
  get lastValidFloorplanData(): JsonExport | null { return this._lastValidFloorplanData; }
  
  constructor(options: InteractiveEditorOptions = {}) {
    const containerId = options.containerId ?? 'app';
    const container = document.getElementById(containerId);
    
    if (!container) {
      throw new Error(`Container element '${containerId}' not found`);
    }
    
    // Initialize mesh registry
    this._meshRegistry = new MeshRegistry();
    
    // Initialize scene
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(COLORS.BACKGROUND);
    
    // Initialize cameras
    const fov = 75;
    const aspect = container.clientWidth / container.clientHeight;
    this._perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this._perspectiveCamera.position.set(20, 20, 20);
    
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
    
    // Set active camera
    this._activeCamera = this._perspectiveCamera;
    
    // Initialize renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(container.clientWidth, container.clientHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this._renderer.domElement);
    
    // Initialize CSS2D renderer for labels
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);
    
    // Initialize controls
    this._controls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);
    this._controls.enableDamping = true;
    
    // Initialize lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this._scene.add(ambientLight);
    
    this._directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this._directionalLight.position.set(50, 50, 50);
    this._directionalLight.castShadow = true;
    this._directionalLight.shadow.mapSize.width = 4096;
    this._directionalLight.shadow.mapSize.height = 4096;
    this._scene.add(this._directionalLight);
    
    // Initialize shared managers from viewer-core
    this._pivotIndicator = new PivotIndicator(this._scene, this._controls);
    
    this._keyboardControls = new KeyboardControls(
      this._controls,
      this._perspectiveCamera,
      this._orthographicCamera,
      {
        onCameraModeToggle: () => this._cameraManager.toggleCameraMode(),
        onUpdateOrthographicSize: () => this._cameraManager.updateOrthographicSize(),
        getBoundingBox: () => this._cameraManager.getSceneBoundingBox(),
        setHelpOverlayVisible: (visible: boolean) => {
          const helpOverlay = document.getElementById('keyboard-help-overlay');
          if (helpOverlay) helpOverlay.style.display = visible ? 'flex' : 'none';
        },
      }
    );
    this._keyboardControls.setPivotIndicator(this._pivotIndicator);
    
    this._cameraManager = new CameraManager(
      this._perspectiveCamera,
      this._orthographicCamera,
      this._controls,
      {
        getFloors: () => this._floors,
        getKeyboardControls: () => this._keyboardControls,
      }
    );
    
    this._floorManager = new FloorManager({
      getFloors: () => this._floors,
      getFloorplanData: () => this.currentFloorplanData,
      onVisibilityChange: () => this._annotationManager.updateFloorSummary(),
    });
    
    this._annotationManager = new AnnotationManager({
      getFloors: () => this._floors,
      getFloorplanData: () => this.currentFloorplanData,
      getConfig: () => this.config,
      getFloorVisibility: (id: string) => this._floorManager.getFloorVisibility(id),
    });
    
    // Initialize wall generator with CSG evaluator
    this.wallGenerator = new WallGenerator(new Evaluator());
    this.wallGenerator.setTheme(this.currentTheme);
    
    // Initialize stair generator
    this.stairGenerator = new StairGenerator();
    
    // Initialize selection manager if enabled
    // Note: SelectionManager automatically filters out invisible objects (e.g., hidden floors)
    // by checking the THREE.js visible property in the parent chain
    if (options.enableSelection !== false) {
      this._selectionManager = new SelectionManager(
        this._scene,
        this._activeCamera,
        this._renderer,
        this._controls,
        this._meshRegistry,
        {
          marqueeMode: options.marqueeMode ?? 'intersection',
        }
      );
    }
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Load initial data if provided
    if (options.initialData) {
      this.loadFloorplan(options.initialData);
    }
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Handle window resize.
   */
  private onWindowResize(): void {
    const container = this._renderer.domElement.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this._perspectiveCamera.aspect = width / height;
    this._perspectiveCamera.updateProjectionMatrix();
    
    const frustumSize = 30;
    this._orthographicCamera.left = frustumSize * (width / height) / -2;
    this._orthographicCamera.right = frustumSize * (width / height) / 2;
    this._orthographicCamera.updateProjectionMatrix();
    
    this._renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }
  
  /**
   * Switch between perspective and orthographic camera.
   */
  public setCameraMode(mode: 'perspective' | 'orthographic'): void {
    // Determine if we need to toggle
    const currentMode = this._cameraManager.getMode();
    
    if (currentMode !== mode) {
      this._cameraManager.toggleCameraMode();
    }
    
    // Update internal reference
    this._activeCamera = this._cameraManager.activeCamera;
    
    // Update selection manager camera reference
    if (this._selectionManager) {
      this._selectionManager.setCamera(this._activeCamera);
    }
  }
  
  // Track time for delta calculation
  private lastFrameTime: number = performance.now();
  
  /**
   * Animation loop.
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Calculate delta time for smooth keyboard controls
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // Update controls and managers
    this._controls.update();
    this._keyboardControls.update(deltaTime);
    this._pivotIndicator.update();
    this._selectionManager?.update();  // Auto-clear invisible selections
    
    // Render using camera manager's active camera (respects camera mode changes)
    const activeCamera = this._cameraManager.activeCamera;
    this._renderer.render(this._scene, activeCamera);
    this.labelRenderer.render(this._scene, activeCamera);
  }
  
  /**
   * Set the error state (called by parent when DSL parse fails).
   * When in error state, the 3D view shows last valid geometry.
   * Selection still works on the stale geometry.
   * 
   * @param hasError - Whether there are parse errors
   */
  public setErrorState(hasError: boolean): void {
    this._hasParseError = hasError;
  }
  
  /**
   * Resolve style for a room with fallback chain:
   * 1. Room's explicit style
   * 2. Default style from config
   * 3. undefined (use defaults)
   */
  private resolveRoomStyle(room: JsonRoom): MaterialStyle | undefined {
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
   * Load a floorplan from JSON data.
   */
  public loadFloorplan(data: JsonExport): void {
    // Normalize to meters
    const normalizedData = normalizeToMeters(data);
    this.currentFloorplanData = normalizedData;
    
    // Store as last valid data (cleared error state)
    this._lastValidFloorplanData = normalizedData;
    this._hasParseError = false;
    
    // Clear existing floors
    this._floors.forEach(f => this._scene.remove(f));
    this._floors = [];
    this.floorHeights = [];
    this._meshRegistry.clear();
    this._selectionManager?.deselect();
    
    // Store config and connections
    this.connections = normalizedData.connections;
    this.config = normalizedData.config || {};
    
    // Build style lookup map
    this.styles.clear();
    if (normalizedData.styles) {
      for (const style of normalizedData.styles) {
        this.styles.set(style.name, style);
      }
    }
    
    // Generate floors
    const globalHeight = this.config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    
    // Center camera roughly
    if (normalizedData.floors.length > 0 && normalizedData.floors[0].rooms.length > 0) {
      const firstRoom = normalizedData.floors[0].rooms[0];
      this._controls.target.set(
        firstRoom.x + firstRoom.width / 2,
        0,
        firstRoom.z + firstRoom.height / 2
      );
    }
    
    normalizedData.floors.forEach((floorData) => {
      const floorHeight = floorData.height ?? globalHeight;
      this.floorHeights.push(floorHeight);
      
      const floorGroup = this.generateFloor(floorData);
      this._scene.add(floorGroup);
      this._floors.push(floorGroup);
    });
    
    // Apply floor stacking (exploded view at 0 = floors touching)
    this.setExplodedView(this.explodedViewFactor);
    
    // Update managers with new floors
    this._floorManager.initFloorVisibility();
    this._annotationManager.updateAll();
  }
  
  /**
   * Generate a floor group with all rooms, walls, and connections.
   * Uses WallGenerator for proper wall ownership detection and CSG operations.
   */
  private generateFloor(floorData: JsonFloor): THREE.Group {
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
      this._meshRegistry.register(
        floorMesh,
        'room',
        room.name,
        floorData.id,
        room._sourceRange
      );

      // 2. Walls with doors, windows, and connections
      // Uses wall ownership detection to prevent Z-fighting
      roomWithDefaults.walls.forEach(wall => {
        // Track wall meshes added by WallGenerator
        const wallMeshesBefore = new Set<THREE.Object3D>();
        group.traverse(obj => wallMeshesBefore.add(obj));
        
        this.wallGenerator.generateWall(
          wall,
          roomWithDefaults,
          allRoomsWithDefaults,
          this.connections,
          materials,
          group,
          this.config
        );
        
        // Find newly added meshes and register walls
        group.traverse(obj => {
          if (!wallMeshesBefore.has(obj) && obj instanceof THREE.Mesh) {
            // Check if this looks like a wall mesh (not a door/window)
            // Wall meshes typically have material arrays or standard material
            const isWallMesh = Array.isArray(obj.material) || 
              (obj.material instanceof THREE.MeshStandardMaterial && 
               !obj.material.transparent);
            
            if (isWallMesh && !this._meshRegistry.getEntityForMesh(obj)) {
              // Get wall source range
              const wallSourceRange = (wall as { _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number } })._sourceRange;
              this._meshRegistry.register(
                obj,
                'wall',
                `${room.name}_${wall.direction}`,
                floorData.id,
                wallSourceRange
              );
            }
          }
        });
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
   * Create a floor mesh for a room
   */
  private createFloorMesh(room: JsonRoom, material: THREE.Material): THREE.Mesh {
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
  }
  
  /**
   * Get the currently selected objects.
   */
  public getSelection(): ReadonlySet<SelectableObject> {
    return this._selectionManager?.getSelection() ?? new Set();
  }
  
  /**
   * Get the current marquee selection mode.
   */
  public getMarqueeMode(): MarqueeMode {
    return this._selectionManager?.marqueeMode ?? 'intersection';
  }
  
  /**
   * Set the marquee selection mode.
   */
  public setMarqueeMode(mode: MarqueeMode): void {
    this._selectionManager?.setMarqueeMode(mode);
  }
  
  /**
   * Set the current theme.
   */
  public setTheme(theme: ViewerTheme): void {
    this.currentTheme = theme;
    this.wallGenerator.setTheme(theme);
    
    // Reload floorplan to apply theme
    if (this.currentFloorplanData) {
      this.loadFloorplan(this.currentFloorplanData);
    }
  }
  
  /**
   * Clean up resources.
   */
  public dispose(): void {
    // Stop animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Dispose selection manager
    this._selectionManager?.dispose();
    
    // Dispose shared managers
    this._keyboardControls.dispose();
    this._pivotIndicator.dispose();
    
    // Clear scene
    this._floors.forEach(f => this._scene.remove(f));
    this._floors = [];
    this._meshRegistry.clear();
    
    // Dispose renderer
    this._renderer.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
  
  // === Getters for managers ===
  
  /** Get the pivot indicator for camera controls */
  get pivotIndicator(): PivotIndicator { return this._pivotIndicator; }
  
  /** Get the keyboard controls manager */
  get keyboardControls(): KeyboardControls { return this._keyboardControls; }
  
  /** Get the camera manager */
  get cameraManager(): CameraManager { return this._cameraManager; }
  
  /** Get the floor manager */
  get floorManager(): FloorManager { return this._floorManager; }
  
  /** Get the annotation manager */
  get annotationManager(): AnnotationManager { return this._annotationManager; }
  
  /** Get the directional light */
  get directionalLight(): THREE.DirectionalLight { return this._directionalLight; }
}
