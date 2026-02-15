/**
 * Public API types for floorplan-viewer-core.
 *
 * These types define the stable contract for external consumers
 * (bridge components, embedders) without exposing Three.js internals.
 */

import type { AnnotationState } from './annotation-manager.js';
import type { CameraState } from './camera-manager.js';
import type { SelectableEntityType } from './scene-context.js';

// Re-export for consumers
export type { AnnotationState } from './annotation-manager.js';

// ============================================================================
// Selection
// ============================================================================

/**
 * Serializable selection entity — strips Three.js mesh references.
 * Field names match SelectableObject (entityType, entityId) for structural
 * compatibility with consumer interfaces (e.g. EditorPanel's SelectableEntity).
 */
export interface SelectionEntity {
  /** Entity type (room, wall, connection, stair, lift) */
  entityType: SelectableEntityType;
  /** Entity identifier (e.g. room name) */
  entityId: string;
  /** Floor the entity belongs to */
  floorId: string;
}

// ============================================================================
// Layout Manager API
// ============================================================================

/**
 * Public subset of LayoutManager for bridge components.
 * Controls overlay and panel visibility without exposing CSS internals.
 */
export interface LayoutManagerApi {
  setOverlay2DVisible(visible: boolean): void;
  setFloorSummaryVisible(visible: boolean): void;
  setEditorOpen(open: boolean): void;
  resetState(): void;
}

// ============================================================================
// Viewer Public API
// ============================================================================

/**
 * Public interface for floorplan-viewer-core consumers.
 *
 * Bridge components (FloorplanBase, FloorplanContainer) and embedders
 * should use this interface instead of concrete classes. This avoids
 * exposing Three.js internals, protected members, or implementation details.
 *
 * Both `FloorplanAppCore` and `InteractiveEditorCore` implement this interface.
 */
export interface ViewerPublicApi {
  // -- Lifecycle --

  /** Clean up all resources (Three.js, DOM, managers). */
  dispose(): void;

  // -- Content --

  /** Load floorplan from DSL content. */
  loadFromDsl(dsl: string): Promise<void>;

  // -- Theme --

  /** Get the current theme name (e.g. 'light', 'dark', 'blueprint'). */
  getTheme(): string;

  /** Set the active theme. */
  setTheme(theme: string): void;

  // -- Selection --

  /** Get current selection as a serializable array. */
  getSelectionState(): SelectionEntity[];

  /** Enable or disable 3D selection (click/marquee). */
  setSelectionEnabled(enabled: boolean): void;

  // -- Annotations --

  /** Get read-only view of annotation toggle flags. */
  getAnnotationState(): Readonly<AnnotationState>;

  /** Reset all annotations to hidden (for mode transitions). */
  resetAnnotations(): void;

  // -- Layout --

  /** Get a typed API for controlling overlay/panel layout. */
  getLayoutManagerApi(): LayoutManagerApi;

  // -- Overlay --

  /** Get the overlay container element (for direct DOM queries). */
  getOverlayContainer(): HTMLElement | undefined;

  // -- Screenshot --

  /** Capture a screenshot of the current viewport. */
  captureScreenshot(options?: Record<string, unknown>): Promise<Blob>;

  // -- Camera --

  /** Camera state access (for save/restore and advanced control). */
  cameraManager?: {
    getCameraState?: () => CameraState;
    setCameraState?: (state: CameraState) => void;
    /** Toggle between perspective and orthographic camera modes. */
    toggleCameraMode?(): void;
    /** Snap to isometric (45°/60°) view. */
    setIsometricView?(): void;
  };

  /** Set the perspective camera's field of view in degrees. */
  setFov?(fov: number): void;

  // -- Selection Manager --

  /** Get the selection manager for selection control and change subscription. */
  getSelectionManager?(): {
    select(entity: SelectionEntity, isAdditive: boolean, silent?: boolean): void;
    selectMultiple(
      entities: SelectionEntity[],
      isAdditive: boolean,
      options?: {
        primaryEntities?: SelectionEntity[];
        isHierarchical?: boolean;
        silent?: boolean;
      },
    ): void;
    deselect(entity?: SelectionEntity): void;
    highlight(entity: SelectionEntity): void;
    clearHighlight(): void;
    getSelection(): SelectionEntity[];
    onSelectionChange(
      cb: (event: {
        selection: ReadonlySet<SelectionEntity>;
        added: SelectionEntity[];
        removed: SelectionEntity[];
        source: string;
      }) => void,
    ): () => void;
  } | null;

  // -- File Operations --
  // Available when the core is FloorplanAppCore (not all implementations support these).

  /** Handle a dropped file (DSL or JSON). */
  handleFileDrop?(file: File, content: string): void;

  /** Dispatch a file action (open-file, save-floorplan, export-json, etc.). */
  handleFileAction?(action: string, data?: unknown): void;

  /** Open a native file picker dialog. */
  openFilePicker?(): void;

  // -- Events --

  /**
   * Subscribe to viewer events (e.g. 'themeChange', 'floorplanLoaded').
   * Returns an unsubscribe function.
   */
  on(event: string, cb: (...args: unknown[]) => void): (() => void) | undefined;
}
