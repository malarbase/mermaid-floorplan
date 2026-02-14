/**
 * SelectionManager - Handles click and marquee selection in the 3D scene.
 *
 * Features:
 * - Click to select single objects
 * - Shift-click to add to selection
 * - Marquee (rectangle drag) to select multiple objects
 * - Alt+drag for camera orbit (prevents selection)
 * - Small drag detection (< 5px treated as click)
 * - Intersection vs containment mode toggle
 * - Enable/disable toggle for navigation-first UX
 */
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MeshRegistry } from './mesh-registry.js';
import type { SelectableObject } from './scene-context.js';
import { BaseSelectionManager } from './selection-api.js';

/**
 * Marquee selection mode: intersection selects partially enclosed,
 * containment requires fully enclosed.
 */
export type MarqueeMode = 'intersection' | 'containment';

/**
 * Configuration for SelectionManager
 */
export interface SelectionManagerConfig {
  /** Minimum drag distance to trigger marquee (default: 5px) */
  minDragDistance?: number;
  /** Initial marquee mode (default: 'intersection') */
  marqueeMode?: MarqueeMode;
  /** Outline color for selected objects (default: 0x00ff00) */
  highlightColor?: number;
  /** Enable hover preview during marquee (default: true) */
  enableHoverPreview?: boolean;
  /** Initial enabled state (default: true) */
  enabled?: boolean;
  /** Allow user to toggle selection via V key (default: true) */
  allowToggle?: boolean;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Screen-space rectangle for marquee selection
 */
interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * SelectionManager with visual highlighting and marquee support.
 */
export class SelectionManager extends BaseSelectionManager {
  // Scene references
  private scene: THREE.Scene;
  private getCamera: () => THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private meshRegistry: MeshRegistry;

  // Configuration
  private config: Required<SelectionManagerConfig>;

  // Enabled state
  private _enabled: boolean;

  // Highlight visuals
  private outlineMaterial: THREE.LineBasicMaterial; // Primary selection (green)
  private secondaryOutlineMaterial: THREE.LineBasicMaterial; // Hierarchical children (dimmed green)
  private hoverHighlightMaterial: THREE.LineBasicMaterial; // Hover/preview highlight (cyan)
  private outlinedObjects = new Map<string, THREE.LineSegments>(); // keyed by mesh uuid
  private emissiveObjects = new Map<string, { color: THREE.Color; intensity: number }>(); // Store original emission values
  private hierarchyLevel = new Map<string, 'primary' | 'secondary'>(); // Track highlight level per object
  private isHoverHighlight = new Map<string, boolean>(); // Track if object is hover (not selection)

  // Marquee state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragCurrentX = 0;
  private dragCurrentY = 0;
  private isAltPressed = false;

  // Marquee overlay
  private marqueeOverlay: HTMLDivElement | null = null;

  // Raycaster for click selection
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Bound event handlers (for cleanup)
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  // Callbacks
  private onEnterPressedCallback?: () => void;
  private onModeChangeCallbacks: ((enabled: boolean) => void)[] = [];

  constructor(
    scene: THREE.Scene,
    getCamera: () => THREE.Camera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls,
    meshRegistry: MeshRegistry,
    config: SelectionManagerConfig = {},
  ) {
    super();

    this.scene = scene;
    this.getCamera = getCamera;
    this.renderer = renderer;
    this.controls = controls;
    this.meshRegistry = meshRegistry;

    // Apply config with defaults
    this.config = {
      minDragDistance: config.minDragDistance ?? 5,
      marqueeMode: config.marqueeMode ?? 'intersection',
      highlightColor: config.highlightColor ?? 0x00ff00,
      enableHoverPreview: config.enableHoverPreview ?? true,
      enabled: config.enabled ?? true,
      allowToggle: config.allowToggle ?? true,
      debug: config.debug ?? false,
    };

    this._enabled = this.config.enabled;

    // Create highlight materials
    // Primary selection: bright green
    this.outlineMaterial = new THREE.LineBasicMaterial({
      color: this.config.highlightColor,
      linewidth: 2,
    });

    // Secondary (dimmed) outline for hierarchical children
    this.secondaryOutlineMaterial = new THREE.LineBasicMaterial({
      color: 0x88cc88, // Dimmed green
      linewidth: 1,
      transparent: true,
      opacity: 0.5,
    });

    // Hover/preview highlight: cyan (distinct from selection green)
    this.hoverHighlightMaterial = new THREE.LineBasicMaterial({
      color: 0x00ccff, // Cyan
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });

    // Bind event handlers
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);

    // Setup event listeners
    this.setupEventListeners();

    // Create marquee overlay
    this.createMarqueeOverlay();
  }

  /**
   * Check if selection mode is enabled.
   */
  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Enable or disable selection mode.
   * When disabled, clears selection and restores full orbit controls.
   */
  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;

    this._enabled = enabled;

    if (!enabled) {
      // Clear selection when disabling
      this.deselect();
      this.clearHighlight();

      // Restore orbit controls
      this.controls.enabled = true;
    }

    // Notify listeners
    for (const callback of this.onModeChangeCallbacks) {
      callback(enabled);
    }
  }

  /**
   * Toggle selection mode.
   */
  toggleEnabled(): boolean {
    this.setEnabled(!this._enabled);
    return this._enabled;
  }

  /**
   * Register callback for mode changes.
   */
  onModeChange(callback: (enabled: boolean) => void): void {
    this.onModeChangeCallbacks.push(callback);
  }

  /**
   * Get current marquee mode.
   */
  get marqueeMode(): MarqueeMode {
    return this.config.marqueeMode;
  }

  /**
   * Set marquee mode (intersection or containment).
   */
  setMarqueeMode(mode: MarqueeMode): void {
    this.config.marqueeMode = mode;
    // Persist preference
    try {
      localStorage.setItem('floorplan-marquee-mode', mode);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Update method to be called in the animation loop.
   * Automatically clears selections for objects that become invisible
   * (e.g., when floor visibility changes).
   */
  update(): void {
    // Quick check: any invisible selections?
    let hasInvisible = false;
    for (const entity of this.getSelectionSet()) {
      if (!this.isObjectVisible(entity.mesh)) {
        hasInvisible = true;
        break;
      }
    }

    if (hasInvisible) {
      this.clearInvisibleSelections();
    }
  }

  /**
   * Clear selections for objects that are no longer visible.
   * Called automatically by update() or can be called manually.
   */
  clearInvisibleSelections(): void {
    const invisibleEntities: SelectableObject[] = [];

    for (const entity of this.selection) {
      if (!this.isObjectVisible(entity.mesh)) {
        invisibleEntities.push(entity);
      }
    }

    if (invisibleEntities.length > 0) {
      for (const entity of invisibleEntities) {
        // Remove visual highlight
        this.applyHighlight(entity, false);
        // Remove from selection set
        this.selection.delete(entity);
      }
      this.emitChange([], invisibleEntities, 'visibility');
    }
  }

  /**
   * Select all selectable objects in the scene.
   */
  override selectAll(): void {
    if (!this._enabled) return;

    const allEntities = this.meshRegistry.getAllEntities();
    this.selectMultiple(allEntities, false);
    this.emitChange(allEntities, [], 'keyboard');
  }

  /**
   * Cycle selection through available entities.
   * @param reverse - If true, cycle backwards (Shift+Tab)
   */
  cycleSelection(reverse = false): void {
    if (!this._enabled) return;

    const allEntities = this.meshRegistry.getAllEntities();
    if (allEntities.length === 0) return;

    // Find current selection index
    let currentIndex = -1;
    if (this.selection.size === 1) {
      const currentEntity = Array.from(this.selection)[0];
      if (currentEntity) {
        currentIndex = allEntities.findIndex(
          (e) =>
            e.entityType === currentEntity.entityType &&
            e.entityId === currentEntity.entityId &&
            e.floorId === currentEntity.floorId,
        );
      }
    }

    // Calculate next index
    let nextIndex: number;
    if (currentIndex === -1) {
      // Nothing selected, start from beginning (or end if reverse)
      nextIndex = reverse ? allEntities.length - 1 : 0;
    } else {
      // Move to next/previous
      nextIndex = reverse
        ? (currentIndex - 1 + allEntities.length) % allEntities.length
        : (currentIndex + 1) % allEntities.length;
    }

    // Select the new entity
    const nextEntity = allEntities[nextIndex];
    this.select(nextEntity, false);
    this.emitChange([nextEntity], [], 'keyboard');
  }

  /**
   * Register callback for Enter key press (to focus properties panel).
   */
  onEnterPressed(callback: () => void): void {
    this.onEnterPressedCallback = callback;
  }

  /**
   * Emit Enter key pressed event.
   */
  private emitEnterPressed(): void {
    if (this.onEnterPressedCallback) {
      this.onEnterPressedCallback();
    }
  }

  /**
   * Setup event listeners on the renderer's DOM element.
   */
  private setupEventListeners(): void {
    const domElement = this.renderer.domElement;

    console.log('[SelectionManager] Setting up event listeners on:', domElement);
    console.log('[SelectionManager] domElement tagName:', domElement.tagName, 'id:', domElement.id);

    domElement.addEventListener('mousedown', this.boundMouseDown);
    domElement.addEventListener('mousemove', this.boundMouseMove);
    domElement.addEventListener('mouseup', this.boundMouseUp);

    // Global key listeners for modifiers
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    console.log('[SelectionManager] Event listeners attached');
  }

  /**
   * Create the marquee selection overlay element.
   */
  private createMarqueeOverlay(): void {
    this.marqueeOverlay = document.createElement('div');
    this.marqueeOverlay.style.cssText = `
      position: absolute;
      border: 2px dashed #4a9eff;
      background: rgba(74, 158, 255, 0.1);
      pointer-events: none;
      display: none;
      z-index: 1000;
    `;

    // Append to renderer's parent
    const parent = this.renderer.domElement.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(this.marqueeOverlay);
    }
  }

  /**
   * Debug logging helper.
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[SelectionManager]', ...args);
    }
  }

  /**
   * Handle mouse down event.
   */
  private onMouseDown(event: MouseEvent): void {
    this.log('onMouseDown', {
      enabled: this._enabled,
      button: event.button,
      altPressed: this.isAltPressed,
    });

    // Skip if disabled
    if (!this._enabled) {
      this.log('Skipping - disabled');
      return;
    }

    // Only handle left click
    if (event.button !== 0) return;

    // Alt+drag is for camera orbit, don't start selection
    if (this.isAltPressed) return;

    // Store drag start position
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.dragStartX = event.clientX - rect.left;
    this.dragStartY = event.clientY - rect.top;
    this.dragCurrentX = this.dragStartX;
    this.dragCurrentY = this.dragStartY;
    this.isDragging = true;

    this.log('Started drag at', this.dragStartX, this.dragStartY);

    // Disable orbit controls during potential selection
    this.controls.enabled = false;
  }

  /**
   * Handle mouse move event.
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this._enabled) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.dragCurrentX = event.clientX - rect.left;
    this.dragCurrentY = event.clientY - rect.top;

    // Calculate drag distance
    const dx = this.dragCurrentX - this.dragStartX;
    const dy = this.dragCurrentY - this.dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Show marquee if drag exceeds threshold
    if (distance >= this.config.minDragDistance) {
      this.updateMarqueeOverlay();

      // Preview selection during drag
      if (this.config.enableHoverPreview) {
        this.previewMarqueeSelection();
      }
    }
  }

  /**
   * Handle mouse up event.
   */
  private onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;

    // Re-enable orbit controls
    this.controls.enabled = true;

    // Skip selection logic if disabled
    if (!this._enabled) {
      this.isDragging = false;
      this.hideMarqueeOverlay();
      return;
    }

    // Calculate drag distance
    const dx = this.dragCurrentX - this.dragStartX;
    const dy = this.dragCurrentY - this.dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Hide marquee overlay
    this.hideMarqueeOverlay();

    // Clear hover previews
    this.clearHighlight();

    if (distance < this.config.minDragDistance) {
      // Treat as click selection
      this.handleClickSelection(event);
    } else {
      // Treat as marquee selection
      this.handleMarqueeSelection(event.shiftKey);
    }

    this.isDragging = false;
  }

  /**
   * Handle keyboard key down.
   */
  private onKeyDown(event: KeyboardEvent): void {
    // Skip if typing in input or Monaco editor
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Skip if focus is in Monaco editor (uses custom elements, not standard inputs)
    if (target.closest('.monaco-editor')) {
      return;
    }

    if (event.key === 'Alt') {
      this.isAltPressed = true;
    }

    // V key toggles selection mode (if allowed)
    if (event.code === 'KeyV' && this.config.allowToggle) {
      this.toggleEnabled();
    }

    // Only process selection shortcuts if enabled
    if (!this._enabled) return;

    // Ctrl/Cmd+A to select all
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      this.selectAll();
    }

    // Escape to deselect
    if (event.key === 'Escape') {
      this.deselect();
    }

    // Tab to cycle selection through entities
    if (event.key === 'Tab') {
      event.preventDefault();
      this.cycleSelection(event.shiftKey);
    }

    // Enter to trigger properties panel focus
    if (event.key === 'Enter') {
      if (this.selection.size > 0) {
        this.emitEnterPressed();
      }
    }
  }

  /**
   * Handle keyboard key up.
   */
  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Alt') {
      this.isAltPressed = false;
    }
  }

  /**
   * Handle click selection (raycast).
   */
  private handleClickSelection(event: MouseEvent): void {
    this.log('handleClickSelection called');

    // Calculate normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycast
    this.raycaster.setFromCamera(this.mouse, this.getCamera());
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    this.log('Raycast found', intersects.length, 'intersections');
    if (this.config.debug && intersects.length > 0) {
      this.log(
        'First intersection:',
        intersects[0].object.name,
        'type:',
        intersects[0].object.type,
      );
    }

    // Find first selectable object that is visible
    for (const intersection of intersects) {
      // Skip invisible objects (e.g., on hidden floors)
      if (!this.isObjectVisible(intersection.object)) {
        this.log('Skipping invisible object:', intersection.object.name);
        continue;
      }

      const selectable = this.meshRegistry.findSelectableAncestor(intersection.object);
      this.log(
        'findSelectableAncestor for',
        intersection.object.name,
        'returned:',
        selectable?.name ?? 'null',
      );

      if (selectable) {
        const entity = this.meshRegistry.getEntityForMesh(selectable);
        this.log('getEntityForMesh returned:', entity);

        if (entity) {
          if (event.shiftKey) {
            // Toggle selection with Shift
            const wasSelected = this.isSelected(entity);
            this.toggleSelection(entity);
            this.emitChange(wasSelected ? [] : [entity], wasSelected ? [entity] : [], 'click');
          } else {
            // Replace selection (silent to avoid double-emit from select())
            const previousSelection = Array.from(this.getSelectionSet());
            this.select(entity, false, true);
            this.emitChange(
              [entity],
              previousSelection.filter((p) => !this.isSameEntity(p, entity)),
              'click',
            );
          }
          this.log('Selected entity:', entity.entityType, entity.entityId);
          return;
        }
      }
    }

    this.log('No selectable entity found, deselecting');

    // Click on empty space - deselect all (unless Shift held)
    if (!event.shiftKey) {
      const previousSelection = Array.from(this.getSelectionSet());
      this.deselect();
      if (previousSelection.length > 0) {
        this.emitChange([], previousSelection, 'click');
      }
    }
  }

  /**
   * Handle marquee selection.
   */
  private handleMarqueeSelection(additive: boolean): void {
    const marqueeRect = this.getMarqueeRect();
    // getObjectsInMarquee already filters out invisible objects
    const selectedObjects = this.getObjectsInMarquee(marqueeRect);

    const entities = selectedObjects
      .map((mesh) => this.meshRegistry.getEntityForMesh(mesh))
      .filter((e): e is SelectableObject => e !== undefined);

    if (entities.length > 0) {
      const previousSelection = Array.from(this.getSelectionSet());
      this.selectMultiple(entities, additive, { silent: true });

      const added = entities.filter((e) => !previousSelection.some((p) => this.isSameEntity(p, e)));
      const removed = additive
        ? []
        : previousSelection.filter((p) => !entities.some((e) => this.isSameEntity(e, p)));

      this.emitChange(added, removed, 'marquee');
    } else if (!additive) {
      // Empty marquee on non-additive clears selection
      const previousSelection = Array.from(this.getSelectionSet());
      this.deselect();
      if (previousSelection.length > 0) {
        this.emitChange([], previousSelection, 'marquee');
      }
    }
  }

  /**
   * Get the marquee rectangle in screen coordinates.
   */
  private getMarqueeRect(): ScreenRect {
    const x = Math.min(this.dragStartX, this.dragCurrentX);
    const y = Math.min(this.dragStartY, this.dragCurrentY);
    const width = Math.abs(this.dragCurrentX - this.dragStartX);
    const height = Math.abs(this.dragCurrentY - this.dragStartY);

    return { x, y, width, height };
  }

  /**
   * Update the marquee overlay position and size.
   */
  private updateMarqueeOverlay(): void {
    if (!this.marqueeOverlay) return;

    const rect = this.getMarqueeRect();

    this.marqueeOverlay.style.display = 'block';
    this.marqueeOverlay.style.left = `${rect.x}px`;
    this.marqueeOverlay.style.top = `${rect.y}px`;
    this.marqueeOverlay.style.width = `${rect.width}px`;
    this.marqueeOverlay.style.height = `${rect.height}px`;
  }

  /**
   * Hide the marquee overlay.
   */
  private hideMarqueeOverlay(): void {
    if (this.marqueeOverlay) {
      this.marqueeOverlay.style.display = 'none';
    }
  }

  /**
   * Preview which objects would be selected by current marquee.
   */
  private previewMarqueeSelection(): void {
    // Clear existing previews
    this.clearHighlight();

    const marqueeRect = this.getMarqueeRect();
    const objects = this.getObjectsInMarquee(marqueeRect);

    // Highlight preview objects
    for (const mesh of objects) {
      const entity = this.meshRegistry.getEntityForMesh(mesh);
      if (entity && !this.isSelected(entity)) {
        this.highlight(entity);
      }
    }
  }

  /**
   * Get all selectable objects within the marquee rectangle.
   * Filters out invisible objects (e.g., on hidden floors).
   */
  private getObjectsInMarquee(marqueeRect: ScreenRect): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    const allEntities = this.meshRegistry.getAllEntities();

    const canvasWidth = this.renderer.domElement.clientWidth;
    const canvasHeight = this.renderer.domElement.clientHeight;

    for (const entity of allEntities) {
      const mesh = entity.mesh;
      if (!(mesh instanceof THREE.Mesh)) continue;

      // Skip invisible objects (e.g., on hidden floors)
      if (!this.isObjectVisible(mesh)) continue;

      // Get screen-space bounding box
      const screenBounds = this.projectBoundingBoxToScreen(mesh, canvasWidth, canvasHeight);
      if (!screenBounds) continue;

      // Check intersection based on mode
      const intersects =
        this.config.marqueeMode === 'intersection'
          ? this.rectIntersects(marqueeRect, screenBounds)
          : this.rectContains(marqueeRect, screenBounds);

      if (intersects) {
        result.push(mesh);
      }
    }

    return result;
  }

  /**
   * Project a mesh's bounding box to screen space.
   * Returns null if object is behind camera.
   */
  private projectBoundingBoxToScreen(
    mesh: THREE.Mesh,
    canvasWidth: number,
    canvasHeight: number,
  ): ScreenRect | null {
    // Get world bounding box
    const box = new THREE.Box3().setFromObject(mesh);

    // Get all 8 corners
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let allBehindCamera = true;

    for (const corner of corners) {
      // Project to NDC
      corner.project(this.getCamera());

      // Check if in front of camera (z < 1 in NDC)
      if (corner.z < 1) {
        allBehindCamera = false;

        // Convert NDC to screen coordinates
        const screenX = ((corner.x + 1) / 2) * canvasWidth;
        const screenY = ((-corner.y + 1) / 2) * canvasHeight;

        minX = Math.min(minX, screenX);
        minY = Math.min(minY, screenY);
        maxX = Math.max(maxX, screenX);
        maxY = Math.max(maxY, screenY);
      }
    }

    if (allBehindCamera) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Check if two rectangles intersect.
   */
  private rectIntersects(a: ScreenRect, b: ScreenRect): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  /**
   * Check if rectangle a fully contains rectangle b.
   */
  private rectContains(a: ScreenRect, b: ScreenRect): boolean {
    return (
      a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height
    );
  }

  /**
   * Check if an object and all its ancestors are visible.
   * This is used to filter out objects on hidden floors from selection.
   * When FloorManager hides a floor, it sets the floor group's visible = false,
   * which this method checks by walking up the parent chain.
   */
  private isObjectVisible(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (!current.visible) {
        return false;
      }
      current = current.parent;
    }
    return true;
  }

  /**
   * Apply or remove highlight from an object.
   * Uses edge outlines for walls, emission change for floor plates (rooms).
   * @param level - 'primary' for main selection, 'secondary' for hierarchical children, 'hover' for preview
   */
  protected override applyHighlight(
    obj: SelectableObject,
    highlight: boolean,
    level: 'primary' | 'secondary' | 'hover' = 'primary',
  ): void {
    const mesh = obj.mesh;
    const key = mesh.uuid;
    const isRoom = obj.entityType === 'room';
    const isPrimary = level === 'primary';
    const isHover = level === 'hover';

    if (highlight) {
      // Track hierarchy level and hover state for this object
      this.hierarchyLevel.set(key, level === 'hover' ? 'primary' : level);
      this.isHoverHighlight.set(key, isHover);

      // Create outline if not already present
      if (mesh instanceof THREE.Mesh && !this.outlinedObjects.has(key)) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        // Use different material based on level:
        // - hover: cyan outline for preview
        // - primary/secondary: same bright green outline (all selected items look equally selected)
        const material = isHover
          ? this.hoverHighlightMaterial.clone()
          : this.outlineMaterial.clone();
        const outline = new THREE.LineSegments(edges, material);

        // Match transform - need to consider world transform
        mesh.updateMatrixWorld(true);
        outline.applyMatrix4(mesh.matrixWorld);

        this.scene.add(outline);
        this.outlinedObjects.set(key, outline);
      }

      // For rooms (floor plates), add emission glow to show focus
      // Only primary gets glow - secondary has outline but no glow (to show "selected but not focused")
      if (isRoom && mesh instanceof THREE.Mesh && (isPrimary || isHover)) {
        const material = mesh.material;
        if (material instanceof THREE.MeshStandardMaterial && !this.emissiveObjects.has(key)) {
          // Store original values
          this.emissiveObjects.set(key, {
            color: material.emissive.clone(),
            intensity: material.emissiveIntensity,
          });
          // Apply highlight emission:
          // - hover: cyan glow
          // - primary: green glow
          // - secondary: NO glow (just outline)
          if (isHover) {
            material.emissive.setHex(0x00ccff);
            material.emissiveIntensity = 0.25;
          } else {
            material.emissive.setHex(0x00ff00);
            material.emissiveIntensity = 0.3;
          }
        }
      }
    } else {
      // Clear hierarchy level and hover state
      this.hierarchyLevel.delete(key);
      this.isHoverHighlight.delete(key);

      // Remove outline
      const outline = this.outlinedObjects.get(key);
      if (outline) {
        this.scene.remove(outline);
        outline.geometry.dispose();
        (outline.material as THREE.Material).dispose();
        this.outlinedObjects.delete(key);
      }

      // Restore original emission for rooms
      if (mesh instanceof THREE.Mesh) {
        const original = this.emissiveObjects.get(key);
        if (original) {
          const material = mesh.material;
          if (material instanceof THREE.MeshStandardMaterial) {
            material.emissive.copy(original.color);
            material.emissiveIntensity = original.intensity;
          }
          this.emissiveObjects.delete(key);
        }
      }
    }
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    // Remove event listeners
    const domElement = this.renderer.domElement;
    domElement.removeEventListener('mousedown', this.boundMouseDown);
    domElement.removeEventListener('mousemove', this.boundMouseMove);
    domElement.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);

    // Clean up outlines
    for (const [_, outline] of this.outlinedObjects) {
      this.scene.remove(outline);
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
    }
    this.outlinedObjects.clear();

    // Clean up emissive tracking
    this.emissiveObjects.clear();

    // Clean up hierarchy level and hover tracking
    this.hierarchyLevel.clear();
    this.isHoverHighlight.clear();

    // Clean up materials
    this.outlineMaterial.dispose();
    this.secondaryOutlineMaterial.dispose();
    this.hoverHighlightMaterial.dispose();

    // Remove marquee overlay
    if (this.marqueeOverlay?.parentElement) {
      this.marqueeOverlay.parentElement.removeChild(this.marqueeOverlay);
    }
  }
}
