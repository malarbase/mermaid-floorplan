/**
 * Layout Manager
 *
 * Centralizes UI layout state management using CSS custom properties.
 * This provides a consistent way for all UI panels to respond to:
 * - Header bar visibility (auto-hide)
 * - Editor panel open/close state
 * - Bottom panel stacking (2D overlay, floor summary)
 *
 * CSS custom properties are used instead of hard-coded pixel values,
 * allowing all panels to automatically adjust when layout state changes.
 *
 * This approach is designed to work with the current vanilla TypeScript
 * architecture and transition smoothly to Solid.js reactive state in the future.
 */

export interface LayoutManagerConfig {
  /** Header bar height in pixels (default: 40) */
  headerHeight?: number;
  /** Editor panel width in pixels when open (default: 450) */
  editorWidth?: number;
  /** 2D overlay height in pixels (default: 220) */
  overlay2DHeight?: number;
  /** Gap between stacked bottom panels (default: 10) */
  bottomStackGap?: number;
}

export interface LayoutState {
  headerVisible: boolean;
  editorOpen: boolean;
  overlay2DVisible: boolean;
  floorSummaryVisible: boolean;
}

export class LayoutManager {
  private readonly headerHeight: number;
  private editorWidth: number;
  private readonly overlay2DHeight: number;
  private readonly bottomStackGap: number;

  private state: LayoutState = {
    headerVisible: true,
    editorOpen: false,
    overlay2DVisible: false,
    floorSummaryVisible: false,
  };

  private listeners: Set<(state: LayoutState) => void> = new Set();

  constructor(config: LayoutManagerConfig = {}) {
    this.headerHeight = config.headerHeight ?? 40;
    this.editorWidth = config.editorWidth ?? 450;
    this.overlay2DHeight = config.overlay2DHeight ?? 220;
    this.bottomStackGap = config.bottomStackGap ?? 10;

    // Initialize CSS custom properties
    this.initializeCSSVariables();
    this.updateCSSVariables();
  }

  /**
   * Initialize CSS custom properties with default values.
   */
  private initializeCSSVariables(): void {
    const root = document.documentElement;

    // Core measurements (constants)
    root.style.setProperty('--layout-header-height', `${this.headerHeight}px`);
    root.style.setProperty('--layout-editor-width-open', `${this.editorWidth}px`);
    root.style.setProperty('--layout-overlay-2d-height', `${this.overlay2DHeight}px`);
    root.style.setProperty('--layout-bottom-gap', `${this.bottomStackGap}px`);
  }

  /**
   * Update CSS custom properties based on current state.
   */
  private updateCSSVariables(): void {
    const root = document.documentElement;

    // Header offset: 0 when hidden, headerHeight when visible
    const headerOffset = this.state.headerVisible ? this.headerHeight : 0;
    root.style.setProperty('--layout-header-offset', `${headerOffset}px`);

    // Editor width: 0 when closed, editorWidth when open
    const editorWidth = this.state.editorOpen ? this.editorWidth : 0;
    root.style.setProperty('--layout-editor-width', `${editorWidth}px`);

    // Bottom stack offset: height of 2D overlay + gap when visible
    const bottomStackOffset = this.state.overlay2DVisible
      ? this.overlay2DHeight + this.bottomStackGap
      : 0;
    root.style.setProperty('--layout-bottom-stack-offset', `${bottomStackOffset}px`);

    // Individual visibility flags (useful for conditional styling)
    root.style.setProperty('--layout-overlay-2d-visible', this.state.overlay2DVisible ? '1' : '0');
    root.style.setProperty(
      '--layout-floor-summary-visible',
      this.state.floorSummaryVisible ? '1' : '0',
    );

    // Direct inline style updates for panels (bypasses CSS variable caching issues)
    this.updatePanelPositions(headerOffset, editorWidth, bottomStackOffset);
  }

  /**
   * Directly update inline styles on panels for immediate response.
   * This ensures positioning works even if CSS variables aren't being read.
   */
  private updatePanelPositions(
    headerOffset: number,
    editorWidth: number,
    bottomStackOffset: number,
  ): void {
    // Control panel - top-right corner
    const controlPanel = document.querySelector('.fp-control-panel') as HTMLElement | null;
    if (controlPanel) {
      controlPanel.style.top = `${headerOffset + 10}px`;
      controlPanel.style.maxHeight = `calc(100vh - ${headerOffset + 20}px)`;
    }

    // Warnings panel - top-left, aligned with header
    const warningsPanel = document.querySelector('.fp-warnings-panel') as HTMLElement | null;
    if (warningsPanel) {
      warningsPanel.style.top = `${headerOffset + 10}px`;
      warningsPanel.style.left = `${editorWidth + 10}px`;
    }

    // Shortcut info panel - bottom-right (no dynamic positioning needed, uses CSS)

    // Editor panel - full height below header
    const editorPanel = document.querySelector('.fp-editor-panel') as HTMLElement | null;
    if (editorPanel) {
      editorPanel.style.top = `${headerOffset}px`;
    }

    // 2D Overlay - bottom-left
    const overlay2D = document.querySelector('.fp-overlay-2d') as HTMLElement | null;
    if (overlay2D) {
      overlay2D.style.left = `${editorWidth + 10}px`;
    }

    // Floor summary panel - above 2D overlay if visible
    const floorSummary = document.querySelector('.fp-floor-summary-panel') as HTMLElement | null;
    if (floorSummary) {
      floorSummary.style.bottom = `${bottomStackOffset + 10}px`;
      floorSummary.style.left = `${editorWidth + 10}px`;
    }
  }

  /**
   * Notify all listeners of state change.
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  /**
   * Set header visibility (for auto-hide feature).
   */
  setHeaderVisible(visible: boolean): void {
    if (this.state.headerVisible !== visible) {
      this.state.headerVisible = visible;
      this.updateCSSVariables();
      this.notifyListeners();
    }
  }

  /**
   * Set editor panel open state.
   */
  setEditorOpen(open: boolean): void {
    if (this.state.editorOpen !== open) {
      this.state.editorOpen = open;
      this.updateCSSVariables();
      this.notifyListeners();

      // Also toggle body class for backward compatibility
      document.body.classList.toggle('editor-open', open);
    }
  }

  /**
   * Set editor panel width (for resize functionality).
   */
  setEditorWidth(width: number): void {
    if (this.editorWidth !== width) {
      this.editorWidth = width;
      // Update the CSS variable for the open width
      document.documentElement.style.setProperty('--layout-editor-width-open', `${width}px`);
      // If editor is currently open, update positions immediately
      if (this.state.editorOpen) {
        this.updateCSSVariables();
        this.notifyListeners();
      }
    }
  }

  /**
   * Set 2D overlay visibility.
   */
  setOverlay2DVisible(visible: boolean): void {
    if (this.state.overlay2DVisible !== visible) {
      this.state.overlay2DVisible = visible;
      this.updateCSSVariables();
      this.notifyListeners();
    }
  }

  /**
   * Set floor summary visibility.
   */
  setFloorSummaryVisible(visible: boolean): void {
    if (this.state.floorSummaryVisible !== visible) {
      this.state.floorSummaryVisible = visible;
      this.updateCSSVariables();
      this.notifyListeners();
    }
  }

  /**
   * Get current layout state (readonly copy).
   */
  getState(): Readonly<LayoutState> {
    return { ...this.state };
  }

  /**
   * Get computed layout values for programmatic use.
   */
  getComputedLayout(): {
    headerOffset: number;
    editorWidth: number;
    leftPanelOffset: number;
    bottomStackOffset: number;
  } {
    return {
      headerOffset: this.state.headerVisible ? this.headerHeight : 0,
      editorWidth: this.state.editorOpen ? this.editorWidth : 0,
      leftPanelOffset: this.state.editorOpen ? this.editorWidth + 10 : 10,
      bottomStackOffset: this.state.overlay2DVisible
        ? this.overlay2DHeight + this.bottomStackGap
        : 0,
    };
  }

  /**
   * Subscribe to layout state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: (state: LayoutState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Batch multiple state updates together.
   * Only notifies listeners once after all updates are applied.
   */
  batchUpdate(updates: Partial<LayoutState>): void {
    let changed = false;

    if (updates.headerVisible !== undefined && this.state.headerVisible !== updates.headerVisible) {
      this.state.headerVisible = updates.headerVisible;
      changed = true;
    }
    if (updates.editorOpen !== undefined && this.state.editorOpen !== updates.editorOpen) {
      this.state.editorOpen = updates.editorOpen;
      document.body.classList.toggle('editor-open', updates.editorOpen);
      changed = true;
    }
    if (
      updates.overlay2DVisible !== undefined &&
      this.state.overlay2DVisible !== updates.overlay2DVisible
    ) {
      this.state.overlay2DVisible = updates.overlay2DVisible;
      changed = true;
    }
    if (
      updates.floorSummaryVisible !== undefined &&
      this.state.floorSummaryVisible !== updates.floorSummaryVisible
    ) {
      this.state.floorSummaryVisible = updates.floorSummaryVisible;
      changed = true;
    }

    if (changed) {
      this.updateCSSVariables();
      this.notifyListeners();
    }
  }

  /**
   * Reset all layout state to defaults (panels hidden, editor closed).
   * Unlike dispose(), this keeps the singleton instance alive so it can be
   * reused when the next viewer mounts. Call this from core.dispose().
   */
  resetState(): void {
    this.batchUpdate({
      headerVisible: true,
      editorOpen: false,
      overlay2DVisible: false,
      floorSummaryVisible: false,
    });
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.listeners.clear();

    // Remove CSS custom properties
    const root = document.documentElement;
    root.style.removeProperty('--layout-header-height');
    root.style.removeProperty('--layout-editor-width-open');
    root.style.removeProperty('--layout-overlay-2d-height');
    root.style.removeProperty('--layout-bottom-gap');
    root.style.removeProperty('--layout-header-offset');
    root.style.removeProperty('--layout-editor-width');
    root.style.removeProperty('--layout-bottom-stack-offset');
    root.style.removeProperty('--layout-overlay-2d-visible');
    root.style.removeProperty('--layout-floor-summary-visible');
  }
}

// Singleton instance for shared access
let layoutManagerInstance: LayoutManager | null = null;

/**
 * Get the shared layout manager instance.
 * Creates one if it doesn't exist.
 */
export function getLayoutManager(config?: LayoutManagerConfig): LayoutManager {
  if (!layoutManagerInstance) {
    layoutManagerInstance = new LayoutManager(config);
  }
  return layoutManagerInstance;
}

/**
 * Reset the shared layout manager (useful for testing).
 */
export function resetLayoutManager(): void {
  if (layoutManagerInstance) {
    layoutManagerInstance.dispose();
    layoutManagerInstance = null;
  }
}
