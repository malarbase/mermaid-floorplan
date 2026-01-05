/**
 * InteractiveEditor - Full-featured floorplan editor with selection and editing capabilities.
 * 
 * This extends the read-only viewer with:
 * - Click and marquee selection
 * - Editor-3D bidirectional sync
 * - Properties panel for editing
 * - Branching history (undo/redo)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { JsonExport } from 'floorplan-3d-core';
import { 
  COLORS,
  MaterialFactory, 
  StairGenerator, 
  normalizeToMeters,
  DIMENSIONS,
} from 'floorplan-3d-core';
import { 
  MeshRegistry, 
  type SceneContext,
  type SelectableObject,
} from 'viewer-core';
import { SelectionManager, type MarqueeMode } from './selection-manager.js';

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
  
  // Scene content
  protected _floors: THREE.Group[] = [];
  protected currentFloorplanData: JsonExport | null = null;
  
  // Generators (simplified for skeleton)
  protected stairGenerator: StairGenerator;
  
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
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    this._scene.add(directionalLight);
    
    // Initialize generators
    this.stairGenerator = new StairGenerator();
    
    // Initialize selection manager if enabled
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
    if (mode === 'perspective') {
      this._activeCamera = this._perspectiveCamera;
      this._controls.object = this._perspectiveCamera;
    } else {
      // Copy position and target
      this._orthographicCamera.position.copy(this._perspectiveCamera.position);
      this._activeCamera = this._orthographicCamera;
      this._controls.object = this._orthographicCamera;
    }
    
    // Update selection manager camera reference
    if (this._selectionManager) {
      this._selectionManager.setCamera(this._activeCamera);
    }
  }
  
  /**
   * Animation loop.
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    this._controls.update();
    this._renderer.render(this._scene, this._activeCamera);
    this.labelRenderer.render(this._scene, this._activeCamera);
  }
  
  /**
   * Load a floorplan from JSON data.
   */
  public loadFloorplan(data: JsonExport): void {
    // Normalize to meters
    const normalizedData = normalizeToMeters(data);
    this.currentFloorplanData = normalizedData;
    
    // Clear existing floors
    this._floors.forEach(f => this._scene.remove(f));
    this._floors = [];
    this._meshRegistry.clear();
    this._selectionManager?.deselect();
    
    // Generate floors
    const config = normalizedData.config || {};
    const globalHeight = config.default_height ?? DIMENSIONS.WALL.HEIGHT;
    
    normalizedData.floors.forEach((floorData) => {
      const floorGroup = new THREE.Group();
      floorGroup.name = floorData.id;
      
      const floorHeight = floorData.height ?? globalHeight;
      
      // Generate rooms
      floorData.rooms.forEach(room => {
        const roomHeight = room.roomHeight ?? floorHeight;
        
        // Create floor plate
        const floorThickness = config.floor_thickness ?? DIMENSIONS.FLOOR.THICKNESS;
        const floorGeom = new THREE.BoxGeometry(room.width, floorThickness, room.height);
        const floorMaterial = MaterialFactory.createFloorMaterial();
        const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
        
        const centerX = room.x + room.width / 2;
        const centerZ = room.z + room.height / 2;
        const elevation = room.elevation || 0;
        
        floorMesh.position.set(centerX, elevation, centerZ);
        floorMesh.receiveShadow = true;
        floorGroup.add(floorMesh);
        
                // Register in mesh registry with entity metadata and source range
                this._meshRegistry.register(
                  floorMesh,
                  'room',
                  room.name,
                  floorData.id,
                  room._sourceRange // Pass source range from JSON for editor sync
                );
        
        // Create walls
        const wallHeight = roomHeight;
        const wallThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
        const wallMaterial = MaterialFactory.createWallMaterial();
        
        room.walls.forEach(wall => {
          if (wall.type === 'open') return;
          
          let wallGeom: THREE.BoxGeometry;
          let wallMesh: THREE.Mesh;
          
          switch (wall.direction) {
            case 'top':
              wallGeom = new THREE.BoxGeometry(room.width, wallHeight, wallThickness);
              wallMesh = new THREE.Mesh(wallGeom, wallMaterial.clone());
              wallMesh.position.set(centerX, elevation + wallHeight / 2, room.z);
              break;
            case 'bottom':
              wallGeom = new THREE.BoxGeometry(room.width, wallHeight, wallThickness);
              wallMesh = new THREE.Mesh(wallGeom, wallMaterial.clone());
              wallMesh.position.set(centerX, elevation + wallHeight / 2, room.z + room.height);
              break;
            case 'left':
              wallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, room.height);
              wallMesh = new THREE.Mesh(wallGeom, wallMaterial.clone());
              wallMesh.position.set(room.x, elevation + wallHeight / 2, centerZ);
              break;
            case 'right':
              wallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, room.height);
              wallMesh = new THREE.Mesh(wallGeom, wallMaterial.clone());
              wallMesh.position.set(room.x + room.width, elevation + wallHeight / 2, centerZ);
              break;
          }
          
          if (wallMesh!) {
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            floorGroup.add(wallMesh);
            
            // Register wall as part of the room
            this._meshRegistry.register(
              wallMesh,
              'wall',
              `${room.name}_${wall.direction}`,
              floorData.id
            );
          }
        });
      });
      
      this._scene.add(floorGroup);
      this._floors.push(floorGroup);
    });
    
    // Center camera on first room
    if (normalizedData.floors.length > 0 && normalizedData.floors[0].rooms.length > 0) {
      const firstRoom = normalizedData.floors[0].rooms[0];
      this._controls.target.set(
        firstRoom.x + firstRoom.width / 2,
        0,
        firstRoom.z + firstRoom.height / 2
      );
    }
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
   * Clean up resources.
   */
  public dispose(): void {
    // Stop animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Dispose selection manager
    this._selectionManager?.dispose();
    
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
