/**
 * FloorplanAppCore - 3D-only application core.
 *
 * This class handles all Three.js 3D rendering and scene management,
 * completely separated from UI concerns. It provides:
 * - 3D scene, camera, renderer, controls
 * - Floorplan loading and parsing
 * - File import/export operations
 * - Event emitter for UI to observe state changes
 *
 * UI components should use FloorplanUI (Solid root) to render
 * and coordinate with FloorplanAppCore via its public API.
 */

import type { JsonExport, ViewerTheme } from 'floorplan-3d-core';
import type { Floorplan } from 'floorplan-language';
import type { LangiumDocument } from 'langium';
import type * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { BaseViewer } from './base-viewer.js';
import type { DslEditorInstance } from './dsl-editor.js';
import { isFloorplanFile, isJsonFile, parseFloorplanDSLWithDocument } from './dsl-parser.js';
import { getLayoutManager, type LayoutManager } from './layout-manager.js';
import type { Overlay2DManager } from './overlay-2d-manager.js';
import { type MarqueeMode, SelectionManager } from './selection-manager.js';
import type { LayoutManagerApi, SelectionEntity, ViewerPublicApi } from './types.js';
import type { FileOperation } from './ui/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Authentication callback result.
 */
export type AuthResult = boolean | Promise<boolean>;

/**
 * Event types emitted by FloorplanAppCore.
 */
export interface FloorplanAppCoreEvents {
  /** Emitted when a floorplan is loaded */
  floorplanLoaded: { filename: string; data: JsonExport };
  /** Emitted when theme changes */
  themeChange: { theme: ViewerTheme };
  /** Emitted when authentication state changes */
  authChange: { isAuthenticated: boolean };
  /** Emitted when DSL content changes */
  dslChange: { content: string };
  /** Emitted when parse warnings occur */
  parseWarnings: { warnings: Array<{ message: string; line?: number; column?: number }> };
  /** Emitted when editor panel should toggle */
  editorToggle: { isOpen: boolean };
  /** Emitted when filename changes */
  filenameChange: { filename: string };
}

/**
 * Event handler type.
 */
export type EventHandler<T> = (data: T) => void;

/**
 * Configuration options for FloorplanAppCore.
 */
export interface FloorplanAppCoreOptions {
  /** DOM element ID to mount the app */
  containerId?: string;
  /** Initial floorplan data */
  initialData?: JsonExport;
  /** Initial DSL content */
  initialDsl?: string;
  /** Initial theme (default: 'dark') */
  initialTheme?: ViewerTheme;

  // Feature flags
  /** Enable 3D selection on startup (click/marquee select) */
  enableSelection?: boolean;
  /** Allow user to toggle selection via V key (default: true if enableSelection) */
  allowSelectionToggle?: boolean;

  // Auth
  /** Whether the user is already authenticated */
  isAuthenticated?: boolean;
  /** Callback invoked when editing requires authentication */
  onAuthRequired?: () => AuthResult;
}

// ============================================================================
// FloorplanAppCore
// ============================================================================

/**
 * 3D-only floorplan application core.
 *
 * Use this class for all 3D rendering and scene management.
 * For UI, use FloorplanUI (Solid root component).
 */
export class FloorplanAppCore extends BaseViewer implements ViewerPublicApi {
  // Feature flags
  public readonly enableSelection: boolean;
  public readonly allowSelectionToggle: boolean;

  // Auth state
  private _isAuthenticated: boolean;
  private _onAuthRequired?: () => AuthResult;

  // Managers
  private _selectionManager: SelectionManager | null = null;
  private _overlay2DManager: Overlay2DManager | null = null;
  public readonly layoutManager: LayoutManager;

  // State
  private editorPanelOpen: boolean = false;
  private editorPanelWidth: number = 450;
  private _currentFilename: string = 'Untitled.floorplan';
  private _currentLangiumDocument: LangiumDocument<Floorplan> | null = null;
  private editorInstance: DslEditorInstance | null = null;

  // Event handlers
  private eventHandlers: Map<string, Set<EventHandler<unknown>>> = new Map();

  // Getters
  get selectionManager(): SelectionManager | null {
    return this._selectionManager;
  }
  get overlay2DManager(): Overlay2DManager | null {
    return this._overlay2DManager;
  }
  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }
  get currentFilename(): string {
    return this._currentFilename;
  }
  get isEditorPanelOpen(): boolean {
    return this.editorPanelOpen;
  }
  /** The Langium document from the last successful DSL parse, used for 2D rendering. */
  get currentLangiumDocument(): LangiumDocument<Floorplan> | null {
    return this._currentLangiumDocument;
  }

  constructor(options: FloorplanAppCoreOptions = {}) {
    const containerId = options.containerId ?? 'app';

    super({
      containerId,
      initialTheme: options.initialTheme ?? 'dark',
      enableKeyboardControls: true,
    });

    // Store feature flags
    this.enableSelection = options.enableSelection ?? true;
    this.allowSelectionToggle = options.allowSelectionToggle ?? this.enableSelection;

    // Store auth state
    this._isAuthenticated = options.isAuthenticated ?? false;
    this._onAuthRequired = options.onAuthRequired;

    // Initialize layout manager (singleton)
    this.layoutManager = getLayoutManager();

    // Initialize selection manager if enabled or toggleable
    if (this.enableSelection || this.allowSelectionToggle) {
      this._selectionManager = new SelectionManager(
        this._scene,
        () => this._cameraManager.activeCamera,
        this._renderer,
        this._controls,
        this._meshRegistry,
        {
          marqueeMode: 'intersection',
          enabled: this.enableSelection,
          allowToggle: this.allowSelectionToggle,
        },
      );
    }

    // Note: Overlay2DManager is NOT created here. In the SolidStart app,
    // ControlPanels.tsx creates the overlay UI via createOverlay2DUI().
    // In standalone apps, main.ts creates its own Overlay2DManager instance.
    // This avoids duplicate overlay elements and orphaned DOM nodes.

    // Setup manager controls (keyboard shortcuts)
    this._cameraManager.setupControls();
    this._annotationManager.setupControls();
    this._floorManager.setupControls();

    // Load initial content
    if (options.initialDsl) {
      this.loadFromDsl(options.initialDsl);
    } else if (options.initialData) {
      this.loadFloorplan(options.initialData);
    }

    // Start animation loop
    this.startAnimation();
  }

  // ============================================================================
  // Event Emitter API
  // ============================================================================

  /**
   * Subscribe to an event.
   */
  on<K extends keyof FloorplanAppCoreEvents>(
    event: K,
    handler: EventHandler<FloorplanAppCoreEvents[K]>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler<unknown>);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler as EventHandler<unknown>);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  private emit<K extends keyof FloorplanAppCoreEvents>(
    event: K,
    data: FloorplanAppCoreEvents[K],
  ): void {
    this.eventHandlers.get(event)?.forEach((handler) => {
      (handler as EventHandler<FloorplanAppCoreEvents[K]>)(data);
    });
  }

  // ============================================================================
  // Public API for UI
  // ============================================================================

  /**
   * Load floorplan from DSL content.
   */
  public async loadFromDsl(content: string): Promise<void> {
    try {
      const result = await parseFloorplanDSLWithDocument(content);

      if (result.errors.length > 0) {
        const errorMsg = result.errors
          .map((e) => (e.line ? `Line ${e.line}: ${e.message}` : e.message))
          .join('\n');
        this.showToast(`Parse error: ${errorMsg}`, 'error');
        return;
      }

      if (result.data) {
        this.loadFloorplan(result.data);
        this._currentLangiumDocument = result.document ?? null;
        this._overlay2DManager?.setLangiumDocument(this._currentLangiumDocument);

        // Emit warnings
        this.emit('parseWarnings', { warnings: result.warnings });
        this.emit('floorplanLoaded', {
          filename: this._currentFilename,
          data: result.data,
        });
      }

      // Update editor if available
      if (this.editorInstance) {
        this.editorInstance.setValue(content);
      }

      this.emit('dslChange', { content });
    } catch (err) {
      this.showToast(`Failed to parse DSL: ${(err as Error).message}`, 'error');
    }
  }

  /**
   * Load floorplan from URL.
   */
  public async loadFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const content = await response.text();
      const filename = url.split('/').pop() || 'floorplan';

      this.setFilename(filename);

      if (url.endsWith('.json')) {
        const data = JSON.parse(content) as JsonExport;
        this.loadFloorplan(data);
        this.emit('floorplanLoaded', { filename, data });
      } else {
        await this.loadFromDsl(content);
      }
    } catch (err) {
      this.showToast(`Failed to load: ${(err as Error).message}`, 'error');
    }
  }

  /**
   * Handle file drop.
   */
  public handleFileDrop(file: File, content: string): void {
    this.setFilename(file.name);

    if (isFloorplanFile(file.name)) {
      this.loadFromDsl(content);
    } else if (isJsonFile(file.name)) {
      try {
        const data = JSON.parse(content) as JsonExport;
        this.loadFloorplan(data);
        this.emit('floorplanLoaded', { filename: file.name, data });
      } catch {
        this.showToast('Invalid JSON file', 'error');
      }
    }
  }

  /**
   * Handle file action from dropdown.
   */
  public handleFileAction(action: FileOperation, data?: unknown): void {
    switch (action) {
      case 'open-file':
        this.openFilePicker();
        break;
      case 'open-url':
        this.openFromUrl();
        break;
      case 'open-recent':
        if (data && typeof data === 'object' && 'path' in data) {
          this.loadFromUrl((data as { path: string }).path);
        }
        break;
      case 'save-floorplan':
        this.saveFloorplan();
        break;
      case 'export-json':
        this.exportJson();
        break;
      case 'export-glb':
        this.exportGltf(true);
        break;
      case 'export-gltf':
        this.exportGltf(false);
        break;
    }
  }

  /**
   * Toggle editor panel state.
   */
  public toggleEditorPanel(): void {
    this.editorPanelOpen = !this.editorPanelOpen;

    document.body.classList.toggle('editor-open', this.editorPanelOpen);
    if (this.editorPanelOpen) {
      document.documentElement.style.setProperty('--editor-width', `${this.editorPanelWidth}px`);
    }

    this._overlay2DManager?.onEditorStateChanged(this.editorPanelOpen, this.editorPanelWidth);
    this.emit('editorToggle', { isOpen: this.editorPanelOpen });
  }

  /**
   * Set editor panel state explicitly.
   */
  public setEditorPanelOpen(open: boolean): void {
    if (this.editorPanelOpen === open) return;
    this.editorPanelOpen = open;

    document.body.classList.toggle('editor-open', this.editorPanelOpen);
    if (this.editorPanelOpen) {
      document.documentElement.style.setProperty('--editor-width', `${this.editorPanelWidth}px`);
    }

    this._overlay2DManager?.onEditorStateChanged(this.editorPanelOpen, this.editorPanelWidth);
  }

  /**
   * Override setTheme to emit themeChange event.
   * This ensures all theme changes (from DSL config, user toggle, or API) emit events.
   */
  public override setTheme(theme: ViewerTheme): void {
    const previousTheme = this.currentTheme;
    super.setTheme(theme);

    // Only emit if theme actually changed
    if (this.currentTheme !== previousTheme) {
      this.emit('themeChange', { theme: this.currentTheme });
    }
  }

  /**
   * Handle theme toggle (convenience method for UI buttons).
   */
  public handleThemeToggle(): void {
    this.toggleTheme();
  }

  /**
   * Set authentication state.
   */
  public setAuthenticated(authenticated: boolean): void {
    this._isAuthenticated = authenticated;
    this.emit('authChange', { isAuthenticated: authenticated });
  }

  /**
   * Request edit mode (triggers auth callback).
   */
  public async requestEditMode(): Promise<boolean> {
    if (this._isAuthenticated) return true;

    if (this._onAuthRequired) {
      const result = await this._onAuthRequired();
      if (result) {
        this.setAuthenticated(true);
        return true;
      }
    }

    return false;
  }

  /**
   * Set the current filename.
   */
  public setFilename(filename: string): void {
    this._currentFilename = filename;
    this.emit('filenameChange', { filename });
  }

  /**
   * Set editor instance for DSL syncing.
   */
  public setEditorInstance(editor: DslEditorInstance | null): void {
    this.editorInstance = editor;
  }

  /**
   * Get the current DSL content.
   */
  public getDslContent(): string {
    return this.editorInstance?.getValue() || '';
  }

  /**
   * Get the selection manager.
   */
  public getSelectionManager(): SelectionManager | null {
    return this._selectionManager;
  }

  /**
   * Get the current selection as a serializable array.
   */
  public getSelection(): SelectionEntity[] {
    return this._selectionManager?.getSelection() ?? [];
  }

  /**
   * Get the current selection as a serializable array (ViewerPublicApi).
   */
  public getSelectionState(): SelectionEntity[] {
    return this.getSelection();
  }

  /**
   * Enable or disable 3D selection (click/marquee).
   */
  public setSelectionEnabled(enabled: boolean): void {
    this._selectionManager?.setEnabled(enabled);
  }

  /**
   * Get read-only view of annotation toggle flags.
   */
  public getAnnotationState(): Readonly<import('./annotation-manager.js').AnnotationState> {
    return this._annotationManager.state;
  }

  /**
   * Reset all annotations to hidden (for mode transitions like editor → basic).
   */
  public resetAnnotations(): void {
    const am = this._annotationManager;
    am.state.showFloorSummary = false;
    am.state.showArea = false;
    am.state.showDimensions = false;
    am.updateFloorSummary();
    am.updateAll();
  }

  /**
   * Get a typed API for controlling overlay/panel layout.
   */
  public getLayoutManagerApi(): LayoutManagerApi {
    return this.layoutManager;
  }

  /**
   * Get the overlay container element (for direct DOM queries).
   */
  public getOverlayContainer(): HTMLElement | undefined {
    return this.overlayContainer;
  }

  /**
   * Set marquee selection mode.
   */
  public setMarqueeMode(mode: MarqueeMode): void {
    this._selectionManager?.setMarqueeMode(mode);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Open file picker dialog.
   */
  public openFilePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.floorplan,.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.handleFileDrop(file, content);
      };
      reader.readAsText(file);
    };

    input.click();
  }

  /**
   * Open URL input dialog.
   */
  private openFromUrl(): void {
    const url = prompt('Enter URL to floorplan file:');
    if (url) {
      this.loadFromUrl(url);
    }
  }

  /**
   * Save floorplan (requires auth).
   */
  private async saveFloorplan(): Promise<void> {
    if (!this._isAuthenticated) {
      const authed = await this.requestEditMode();
      if (!authed) return;
    }

    const content = this.editorInstance?.getValue() || '';
    if (!content) {
      this.showToast('No content to save', 'error');
      return;
    }

    this.downloadFile(this._currentFilename, content, 'text/plain');
    this.showToast('Saved!', 'success');
  }

  /**
   * Export as JSON.
   */
  private exportJson(): void {
    if (!this.currentFloorplanData) {
      this.showToast('No floorplan loaded', 'error');
      return;
    }

    const content = JSON.stringify(this.currentFloorplanData, null, 2);
    const filename = `${this._currentFilename.replace(/\.[^.]+$/, '')}.json`;
    this.downloadFile(filename, content, 'application/json');
  }

  /**
   * Export as GLTF/GLB.
   */
  private async exportGltf(binary: boolean): Promise<void> {
    const exporter = new GLTFExporter();

    try {
      const result = await new Promise<ArrayBuffer | object>((resolve, reject) => {
        exporter.parse(
          this._scene,
          (gltf) => resolve(gltf),
          (error) => reject(error),
          { binary },
        );
      });

      const ext = binary ? '.glb' : '.gltf';
      const filename = this._currentFilename.replace(/\.[^.]+$/, '') + ext;

      if (binary) {
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        this.downloadBlob(filename, blob);
      } else {
        const content = JSON.stringify(result, null, 2);
        this.downloadFile(filename, content, 'model/gltf+json');
      }
    } catch (err) {
      this.showToast(`Export failed: ${(err as Error).message}`, 'error');
    }
  }

  /**
   * Show a toast notification.
   */
  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div');
    toast.className = `fp-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Download text content as file.
   */
  private downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(filename, blob);
  }

  /**
   * Download blob as file.
   */
  private downloadBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================================
  // Overrides
  // ============================================================================

  /**
   * Override to handle floor visibility changes.
   */
  protected onFloorVisibilityChanged(): void {
    this._overlay2DManager?.render();
  }

  /**
   * Override to handle floorplan loaded.
   */
  protected onFloorplanLoaded(): void {
    this._overlay2DManager?.render();
  }

  /**
   * Override animation loop to update selection manager.
   */
  protected animateExtension(): void {
    this._selectionManager?.update();
  }

  /**
   * Smoothly animate the camera to focus on the currently selected entities.
   * If nothing is selected, does nothing.
   */
  public focusOnSelection(): void {
    const sm = this._selectionManager;
    if (!sm) return;

    const selection = sm.getSelectionSet();
    if (selection.size === 0) return;

    const meshes: THREE.Object3D[] = [];
    for (const entity of selection) {
      if (entity.mesh) meshes.push(entity.mesh);
    }

    this._cameraManager.focusOnObjects(meshes);
  }

  /**
   * Smoothly animate the camera to focus on the given 3D objects.
   */
  public focusOnObjects(objects: THREE.Object3D[]): void {
    this._cameraManager.focusOnObjects(objects);
  }

  /**
   * Clean up resources.
   */
  public dispose(): void {
    this._selectionManager?.dispose();
    this._overlay2DManager?.dispose();
    this.layoutManager.resetState();
    this.eventHandlers.clear();
    super.dispose();
  }
}
