/**
 * FloorplanApp - Unified entry point for both viewer and editor modes.
 * 
 * This class provides a single application that supports:
 * - Read-only viewer mode (no auth required)
 * - Full editor mode with auth gating
 * - Feature flags for progressive enablement
 * - Runtime mode switching via requestEditMode()
 * 
 * Replaces both Viewer and InteractiveEditor with a single configurable class.
 */

import type { JsonExport } from 'floorplan-3d-core';
import type { ViewerTheme } from 'floorplan-3d-core';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { BaseViewer } from './base-viewer.js';
import { SelectionManager, type MarqueeMode } from './selection-manager.js';
import type { SelectableObject } from './scene-context.js';
import { Overlay2DManager } from './overlay-2d-manager.js';
import { injectStyles } from './ui/styles.js';
import { 
  createHeaderBar, type HeaderBar,
  createFileDropdown, type FileDropdown, type FileOperation,
  createCommandPalette, createFileCommands, createViewCommands, type CommandPalette,
  initializeDragDrop, type DragDropHandler,
} from './ui/index.js';
import { parseFloorplanDSLWithDocument, isFloorplanFile, isJsonFile } from './dsl-parser.js';
import type { DslEditorInstance } from './dsl-editor.js';
import { getLayoutManager, type LayoutManager } from './layout-manager.js';

// Inject shared styles
injectStyles();

/**
 * Authentication callback result.
 */
export type AuthResult = boolean | Promise<boolean>;

/**
 * Configuration options for FloorplanApp.
 */
export interface FloorplanAppOptions {
  /** DOM element ID to mount the app */
  containerId?: string;
  /** Initial floorplan data */
  initialData?: JsonExport;
  /** Initial DSL content */
  initialDsl?: string;
  /** Initial theme (default: 'dark') */
  initialTheme?: ViewerTheme;
  
  // Feature flags
  /** Enable editing features (DSL editing, properties panel, AI chat) */
  enableEditing?: boolean;
  /** Enable 3D selection on startup (click/marquee select) */
  enableSelection?: boolean;
  /** Allow user to toggle selection via V key (default: true if enableSelection or enableEditing) */
  allowSelectionToggle?: boolean;
  /** Enable AI chat integration */
  enableChat?: boolean;
  /** Show header bar with file operations */
  showHeaderBar?: boolean;
  /** Enable header bar auto-hide (hides when not interacting) */
  headerAutoHide?: boolean;
  /** Enable drag-and-drop file loading */
  enableDragDrop?: boolean;
  /** Editor panel default state (true = open, false = closed) */
  editorPanelDefaultOpen?: boolean;
  
  // Auth
  /** Whether the user is already authenticated */
  isAuthenticated?: boolean;
  /** Callback invoked when editing requires authentication */
  onAuthRequired?: () => AuthResult;
  
  // Callbacks
  /** Callback when a file is loaded */
  onFileLoad?: (filename: string, content: string) => void;
  /** Callback when DSL content changes */
  onDslChange?: (content: string) => void;
  /** Callback when theme changes */
  onThemeChange?: (theme: 'light' | 'dark') => void;
  /** Callback when editor panel is toggled */
  onEditorToggle?: (isOpen: boolean) => void;
  /** Callback when DSL parsing produces warnings */
  onParseWarnings?: (warnings: Array<{ message: string; line?: number; column?: number }>) => void;
}

/**
 * Unified floorplan application supporting viewer and editor modes.
 */
export class FloorplanApp extends BaseViewer {
  // Feature flags (readonly after construction)
  public readonly enableEditing: boolean;
  public readonly enableSelection: boolean;
  public readonly allowSelectionToggle: boolean;
  public readonly enableChat: boolean;
  public readonly showHeaderBar: boolean;
  public readonly headerAutoHide: boolean;
  public readonly enableDragDrop: boolean;
  
  // Auth state
  private _isAuthenticated: boolean;
  private _onAuthRequired?: () => AuthResult;
  
  // UI Components (headerBar is public for external sync)
  public headerBar: HeaderBar | null = null;
  private fileDropdown: FileDropdown | null = null;
  private commandPalette: CommandPalette | null = null;
  private dragDropHandler: DragDropHandler | null = null;
  private editorInstance: DslEditorInstance | null = null;
  
  // Managers
  private _selectionManager: SelectionManager | null = null;
  private overlay2DManager: Overlay2DManager | null = null;
  private layoutManager: LayoutManager;
  
  // State
  private editorPanelOpen: boolean;
  private editorPanelWidth: number = 450;
  private currentFilename: string = 'Untitled.floorplan';
  private editorDebounceTimer: number | undefined;
  
  // Callbacks
  private onFileLoadCallback?: (filename: string, content: string) => void;
  private onDslChangeCallback?: (content: string) => void;
  private onThemeChangeCallback?: (theme: 'light' | 'dark') => void;
  private onEditorToggleCallback?: (isOpen: boolean) => void;
  private onParseWarningsCallback?: (warnings: Array<{ message: string; line?: number; column?: number }>) => void;
  
  // SceneContext getters
  get selectionManager(): SelectionManager | null { return this._selectionManager; }
  get isAuthenticated(): boolean { return this._isAuthenticated; }
  
  constructor(options: FloorplanAppOptions = {}) {
    const containerId = options.containerId ?? 'app';
    
    super({
      containerId,
      initialTheme: options.initialTheme ?? 'dark',
      enableKeyboardControls: true,
    });
    
    // Store feature flags
    this.enableEditing = options.enableEditing ?? false;
    this.enableSelection = options.enableSelection ?? true;
    // Default allowSelectionToggle to true if enableSelection or enableEditing is true
    this.allowSelectionToggle = options.allowSelectionToggle ?? (this.enableSelection || this.enableEditing);
    this.enableChat = options.enableChat ?? false;
    this.showHeaderBar = options.showHeaderBar ?? true;
    this.headerAutoHide = options.headerAutoHide ?? false;
    this.enableDragDrop = options.enableDragDrop ?? true;
    this.editorPanelOpen = options.editorPanelDefaultOpen ?? this.enableEditing;
    
    // Store auth state
    this._isAuthenticated = options.isAuthenticated ?? false;
    this._onAuthRequired = options.onAuthRequired;
    
    // Store callbacks
    this.onFileLoadCallback = options.onFileLoad;
    this.onDslChangeCallback = options.onDslChange;
    this.onThemeChangeCallback = options.onThemeChange;
    this.onEditorToggleCallback = options.onEditorToggle;
    this.onParseWarningsCallback = options.onParseWarnings;
    
    // Initialize layout manager (singleton)
    this.layoutManager = getLayoutManager();
    
    // If header auto-hide is enabled, header starts hidden
    if (this.headerAutoHide) {
      this.layoutManager.setHeaderVisible(false);
    }
    
    // Initialize selection manager if enabled or toggleable
    // (We need the manager to exist for V key toggle to work)
    if (this.enableSelection || this.allowSelectionToggle) {
      this._selectionManager = new SelectionManager(
        this._scene,
        this._cameraManager.activeCamera,
        this._renderer,
        this._controls,
        this._meshRegistry,
        { 
          marqueeMode: 'intersection',
          enabled: this.enableSelection,  // Start enabled/disabled based on config
          allowToggle: this.allowSelectionToggle,  // Whether V key can toggle
        }
      );
    }
    
    // Initialize 2D overlay manager
    this.overlay2DManager = new Overlay2DManager({
      getCurrentTheme: () => this.currentTheme,
      getFloorplanData: () => this.currentFloorplanData,
      getVisibleFloorIds: () => this._floorManager.getVisibleFloorIds(),
      onVisibilityChange: (visible) => this.layoutManager.setOverlay2DVisible(visible),
    });
    
    // Setup UI components
    this.setupUI();
    
    // Load initial content
    if (options.initialDsl) {
      this.loadFromDsl(options.initialDsl);
    } else if (options.initialData) {
      this.loadFloorplan(options.initialData);
    }
    
    // Start animation loop
    this.startAnimation();
  }
  
  /**
   * Setup UI components based on feature flags.
   */
  private setupUI(): void {
    const container = this._renderer.domElement.parentElement;
    if (!container) return;
    
    // Header bar
    if (this.showHeaderBar) {
      this.setupHeaderBar(container);
    }
    
    // Drag and drop
    if (this.enableDragDrop) {
      this.setupDragDrop(container);
    }
    
    // Command palette (always available for keyboard shortcut)
    this.setupCommandPalette();
    
    // Setup manager controls
    this._cameraManager.setupControls();
    this._annotationManager.setupControls();
    this._floorManager.setupControls();
    this.overlay2DManager?.setupControls();
    
    // Setup help overlay
    this.setupHelpOverlay();
  }
  
  /**
   * Setup header bar with file operations.
   */
  private setupHeaderBar(container: HTMLElement): void {
    // Create header bar
    this.headerBar = createHeaderBar({
      filename: this.currentFilename,
      editorOpen: this.editorPanelOpen,
      isAuthenticated: this._isAuthenticated,
      theme: this.currentTheme as 'light' | 'dark',
      autoHide: this.headerAutoHide,
      onFileDropdownClick: () => this.toggleFileDropdown(),
      onEditorToggle: () => this.toggleEditorPanel(),
      onThemeToggle: () => this.handleThemeToggle(),
      onCommandPaletteClick: () => this.commandPalette?.show(),
      onVisibilityChange: (visible) => this.layoutManager.setHeaderVisible(visible),
    });
    
    // Create file dropdown
    this.fileDropdown = createFileDropdown({
      isAuthenticated: this._isAuthenticated,
      onAction: (action, data) => this.handleFileAction(action, data),
    });
    
    // Add hover zone to DOM first (so header bar can slide over it)
    if (this.headerBar.hoverZone) {
      container.appendChild(this.headerBar.hoverZone);
    }
    
    // Add to DOM
    container.appendChild(this.headerBar.element);
    document.body.appendChild(this.fileDropdown.element);
  }
  
  /**
   * Setup drag and drop file loading.
   */
  private setupDragDrop(container: HTMLElement): void {
    this.dragDropHandler = initializeDragDrop({
      target: container,
      onFileDrop: (file, content) => this.handleFileDrop(file, content),
      onInvalidFile: (file, reason) => this.showToast(reason, 'error'),
    });
    this.dragDropHandler.enable();
  }
  
  /**
   * Setup command palette with all available commands.
   */
  private setupCommandPalette(): void {
    const fileCommands = createFileCommands({
      onOpenFile: () => this.openFilePicker(),
      onOpenUrl: () => this.openFromUrl(),
      onSave: () => this.saveFloorplan(),
      onExportJson: () => this.exportJson(),
      onExportGlb: () => this.exportGltf(true),
      onExportGltf: () => this.exportGltf(false),
    });
    
    const viewCommands = createViewCommands({
      onToggleTheme: () => this.toggleTheme(),
      onToggleOrtho: () => this._cameraManager.toggleCameraMode(),
      onIsometricView: () => this._cameraManager.setIsometricView(),
      // Reset camera by simulating Home key press
      onResetCamera: () => this.simulateKeyPress('Home'),
      // Frame all by simulating F key press
      onFrameAll: () => this.simulateKeyPress('f'),
    });
    
    this.commandPalette = createCommandPalette({
      commands: [...fileCommands, ...viewCommands],
      isAuthenticated: this._isAuthenticated,
    });
    
    document.body.appendChild(this.commandPalette.element);
    this.commandPalette.registerShortcut();
  }
  
  /**
   * Setup help overlay close functionality.
   */
  private setupHelpOverlay(): void {
    const overlay = document.getElementById('keyboard-help-overlay');
    const closeBtn = document.getElementById('keyboard-help-close');
    const panel = overlay?.querySelector('.fp-keyboard-help-panel');
    
    closeBtn?.addEventListener('click', () => this.setHelpOverlayVisible(false));
    
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.setHelpOverlayVisible(false);
      }
    });
    
    panel?.addEventListener('click', (e) => e.stopPropagation());
  }
  
  /**
   * Toggle file dropdown visibility.
   */
  private toggleFileDropdown(): void {
    if (!this.fileDropdown) return;
    
    if (this.fileDropdown.isVisible()) {
      this.fileDropdown.hide();
    } else {
      const trigger = this.headerBar?.element.querySelector('.fp-file-dropdown-trigger') as HTMLElement;
      if (trigger) {
        this.fileDropdown.show(trigger);
      }
    }
  }
  
  /**
   * Toggle editor panel visibility.
   */
  private toggleEditorPanel(): void {
    this.editorPanelOpen = !this.editorPanelOpen;
    this.headerBar?.setEditorOpen(this.editorPanelOpen);
    
    // Don't apply transform - let the callback handle panel state via editorPanel.open()/close()
    // This ensures consistent behavior whether toggled from header bar or panel's own button
    
    document.body.classList.toggle('editor-open', this.editorPanelOpen);
    if (this.editorPanelOpen) {
      document.documentElement.style.setProperty('--editor-width', `${this.editorPanelWidth}px`);
    }
    
    this.overlay2DManager?.onEditorStateChanged(this.editorPanelOpen, this.editorPanelWidth);
    
    // Notify callback - this will call editorPanel.open()/close()
    this.onEditorToggleCallback?.(this.editorPanelOpen);
  }
  
  /**
   * Handle theme toggle from header bar.
   */
  private handleThemeToggle(): void {
    this.toggleTheme();
    const newTheme = this.currentTheme as 'light' | 'dark';
    this.headerBar?.setTheme(newTheme);
    this.onThemeChangeCallback?.(newTheme);
  }
  
  /**
   * Handle file dropdown actions.
   */
  private handleFileAction(action: FileOperation, data?: unknown): void {
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
   * Handle file drop.
   */
  private handleFileDrop(file: File, content: string): void {
    this.currentFilename = file.name;
    this.headerBar?.setFilename(this.currentFilename);
    
    if (isFloorplanFile(file.name)) {
      this.loadFromDsl(content);
    } else if (isJsonFile(file.name)) {
      try {
        const data = JSON.parse(content) as JsonExport;
        this.loadFloorplan(data);
      } catch {
        this.showToast('Invalid JSON file', 'error');
      }
    }
    
    this.onFileLoadCallback?.(file.name, content);
  }
  
  /**
   * Open file picker dialog.
   */
  private openFilePicker(): void {
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
      
      this.currentFilename = filename;
      this.headerBar?.setFilename(this.currentFilename);
      
      if (url.endsWith('.json')) {
        const data = JSON.parse(content) as JsonExport;
        this.loadFloorplan(data);
      } else {
        this.loadFromDsl(content);
      }
    } catch (err) {
      this.showToast(`Failed to load: ${(err as Error).message}`, 'error');
    }
  }
  
  /**
   * Load floorplan from DSL content.
   */
  public async loadFromDsl(content: string): Promise<void> {
    try {
      const result = await parseFloorplanDSLWithDocument(content);
      
      if (result.errors.length > 0) {
        const errorMsg = result.errors.map(e => 
          e.line ? `Line ${e.line}: ${e.message}` : e.message
        ).join('\n');
        this.showToast(`Parse error: ${errorMsg}`, 'error');
        return;
      }
      
      if (result.data) {
        this.loadFloorplan(result.data);
        this.overlay2DManager?.setLangiumDocument(result.document ?? null);
        
        // Notify about any warnings
        this.onParseWarningsCallback?.(result.warnings);
      }
      
      // Update editor if available
      if (this.editorInstance) {
        this.editorInstance.setValue(content);
      }
      
      this.onDslChangeCallback?.(content);
    } catch (err) {
      this.showToast(`Failed to parse DSL: ${(err as Error).message}`, 'error');
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
    
    this.downloadFile(this.currentFilename, content, 'text/plain');
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
    const filename = this.currentFilename.replace(/\.[^.]+$/, '') + '.json';
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
          { binary }
        );
      });
      
      const ext = binary ? '.glb' : '.gltf';
      const filename = this.currentFilename.replace(/\.[^.]+$/, '') + ext;
      
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
   * Set authentication state.
   */
  public setAuthenticated(authenticated: boolean): void {
    this._isAuthenticated = authenticated;
    this.headerBar?.setAuthenticated(authenticated);
    this.fileDropdown?.setAuthenticated(authenticated);
    this.commandPalette?.setAuthenticated(authenticated);
  }
  
  /**
   * Set the current filename.
   */
  public setFilename(filename: string): void {
    this.currentFilename = filename;
    this.headerBar?.setFilename(filename);
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
   * Get the current selection.
   */
  public getSelection(): ReadonlySet<SelectableObject> {
    return this._selectionManager?.getSelection() ?? new Set<SelectableObject>();
  }
  
  /**
   * Set marquee selection mode.
   */
  public setMarqueeMode(mode: MarqueeMode): void {
    this._selectionManager?.setMarqueeMode(mode);
  }
  
  /**
   * Override to handle floor visibility changes.
   */
  protected onFloorVisibilityChanged(): void {
    this.overlay2DManager?.render();
  }
  
  /**
   * Override to handle floorplan loaded.
   */
  protected onFloorplanLoaded(): void {
    this.overlay2DManager?.render();
  }
  
  /**
   * Override animation loop to update selection manager.
   */
  protected animateExtension(): void {
    this._selectionManager?.update();
  }
  
  /**
   * Simulate a key press for keyboard shortcut commands.
   */
  private simulateKeyPress(key: string): void {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
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
  
  /**
   * Clean up resources.
   */
  public dispose(): void {
    // Dispose UI components
    this.headerBar?.dispose();
    this.fileDropdown?.dispose();
    this.commandPalette?.dispose();
    this.dragDropHandler?.dispose();
    this._selectionManager?.dispose();
    
    // Call parent dispose
    super.dispose();
  }
}
