/**
 * InteractiveEditor - Full-featured floorplan editor with selection and editing capabilities.
 * 
 * This extends BaseViewer with:
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
import type { JsonExport, JsonRoom, JsonFloor } from 'floorplan-3d-core';
import { 
  MaterialFactory, 
  DIMENSIONS,
  type ViewerTheme,
} from 'floorplan-3d-core';
import { 
  BaseViewer,
  MeshRegistry, 
  SelectionManager,
  injectStyles,
  type SceneContext,
  type SelectableObject,
  type MarqueeMode,
} from 'viewer-core';

// Inject shared styles before anything else
injectStyles();

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
  /** Initial theme (default: 'dark') */
  initialTheme?: ViewerTheme;
  /** Enable selection debug logging (default: false) */
  selectionDebug?: boolean;
}

/**
 * Interactive floorplan editor with selection and editing capabilities.
 */
export class InteractiveEditor extends BaseViewer implements SceneContext {
  // Selection manager
  protected _selectionManager: SelectionManager | null = null;
  
  // Error state management
  private _hasParseError: boolean = false;
  private _lastValidFloorplanData: JsonExport | null = null;
  
  // SceneContext interface getters (additional ones beyond BaseViewer)
  get meshRegistry(): MeshRegistry { return this._meshRegistry; }
  get selectionManager(): SelectionManager | null { return this._selectionManager; }
  
  /** Whether the current DSL has parse errors (3D view shows stale geometry) */
  get hasParseError(): boolean { return this._hasParseError; }
  
  /** The last successfully parsed floorplan data (used during error state) */
  get lastValidFloorplanData(): JsonExport | null { return this._lastValidFloorplanData; }
  
  constructor(options: InteractiveEditorOptions = {}) {
    super({
      containerId: options.containerId ?? 'app',
      initialTheme: options.initialTheme ?? 'dark',
      enableKeyboardControls: true,
    });
    
    // Initialize selection manager if enabled
    // Note: SelectionManager automatically filters out invisible objects (e.g., hidden floors)
    // by checking the THREE.js visible property in the parent chain
    if (options.enableSelection !== false) {
      this._selectionManager = new SelectionManager(
        this._scene,
        this._cameraManager.activeCamera,
        this._renderer,
        this._controls,
        this._meshRegistry,
        {
          marqueeMode: options.marqueeMode ?? 'intersection',
          debug: options.selectionDebug ?? false,
          enabled: true,  // Explicitly enable selection
        }
      );
    }
    
    // Load initial data if provided
    if (options.initialData) {
      this.loadFloorplan(options.initialData);
    }
    
    // Start animation loop
    this.startAnimation();
  }
  
  /**
   * Setup UI controls - interactive editor has different UI needs than read-only viewer.
   * Called from BaseViewer constructor, but we handle our own initialization.
   */
  protected setupUIControls(): void {
    // Collapsible sections
    document.querySelectorAll('.fp-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.parentElement;
        section?.classList.toggle('collapsed');
      });
    });
    
    // Setup manager controls
    this._cameraManager.setupControls();
    this._annotationManager.setupControls();
    this._floorManager.setupControls();
    
    // Setup help overlay
    this.setupHelpOverlay();
  }
  
  /**
   * Setup help overlay close functionality
   */
  private setupHelpOverlay(): void {
    const overlay = document.getElementById('keyboard-help-overlay');
    const closeBtn = document.getElementById('keyboard-help-close');
    const panel = overlay?.querySelector('.fp-keyboard-help-panel');
    
    // Close button click
    closeBtn?.addEventListener('click', () => {
      this.setHelpOverlayVisible(false);
    });
    
    // Click outside panel to close
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.setHelpOverlayVisible(false);
      }
    });
    
    // Prevent clicks on panel from closing
    panel?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  /**
   * Override to handle floorplan loaded event.
   */
  protected onFloorplanLoaded(): void {
    // Store as last valid data (cleared error state)
    this._lastValidFloorplanData = this.currentFloorplanData;
    this._hasParseError = false;
  }
  
  /**
   * Override to clear selection when visibility changes.
   */
  protected onFloorVisibilityChanged(): void {
    // Selection manager auto-clears invisible objects in update(), no need for explicit action here
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
    
    // Update selection manager camera reference
    if (this._selectionManager) {
      this._selectionManager.setCamera(this._cameraManager.activeCamera);
    }
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
   * Override loadFloorplan to handle selection manager clearing.
   */
  public loadFloorplan(data: JsonExport): void {
    // Deselect before clearing the scene
    this._selectionManager?.deselect();
    
    // Call parent implementation
    super.loadFloorplan(data);
  }
  
  /**
   * Override generateFloorWithPenetrations to register meshes in the mesh registry for selection.
   */
  protected generateFloorWithPenetrations(
    floorData: JsonFloor, 
    prevFloorPenetrations: THREE.Box3[]
  ): { group: THREE.Group; penetrations: THREE.Box3[] } {
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
    this.wallGenerator.setStyleResolver((room: JsonRoom) => this.resolveRoomStyle(room));
    
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

      // 1. Floor plate with penetration support
      const floorMesh = this.createFloorMeshWithPenetrations(roomWithDefaults, materials.floor, prevFloorPenetrations);
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
        let wallMeshCount = 0;
        group.traverse(obj => {
          if (!wallMeshesBefore.has(obj) && obj instanceof THREE.Mesh) {
            // Check if this looks like a wall mesh (not a door/window)
            // Wall meshes typically have material arrays or standard material
            const isArrayMaterial = Array.isArray(obj.material);
            const isStandardMaterial = obj.material instanceof THREE.MeshStandardMaterial;
            const isTransparent = isStandardMaterial && (obj.material as THREE.MeshStandardMaterial).transparent;
            const isWallMesh = isArrayMaterial || (isStandardMaterial && !isTransparent);
            
            
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
              wallMeshCount++;
            }
          }
        });
      });
    });

    // Collect penetrations for the next floor
    const penetrations: THREE.Box3[] = [];

    // 3. Stairs
    if (floorData.stairs) {
      floorData.stairs.forEach(stair => {
        const stairGroup = this.stairGenerator.generateStair(stair);
        group.add(stairGroup);
        
        // Compute penetration bounds for next floor
        penetrations.push(this.computeStairPenetration(stair, stair.tread, stair.rise));
      });
    }

    // 4. Lifts
    if (floorData.lifts) {
      floorData.lifts.forEach(lift => {
        const liftGroup = this.stairGenerator.generateLift(lift, floorDefault);
        group.add(liftGroup);
        
        // Compute penetration bounds for next floor
        penetrations.push(this.computeLiftPenetration(lift));
      });
    }

    return { group, penetrations };
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
   * Override animation loop to also update selection manager.
   */
  protected animate(): void {
    super.animate();
    
    // Update selection manager (auto-clears invisible selections)
    this._selectionManager?.update();
  }
  
  /**
   * Clean up resources.
   */
  public dispose(): void {
    // Dispose selection manager
    this._selectionManager?.dispose();
    
    // Call parent dispose (handles managers and scene cleanup)
    super.dispose();
  }
}
