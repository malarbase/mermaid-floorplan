/**
 * SelectionAPI - Interface for selection operations in the viewer.
 * 
 * Provides a high-level API for:
 * - Selecting/deselecting objects
 * - Highlighting objects
 * - Listening to selection changes
 * 
 * The read-only viewer implements basic selection (programmatic highlight).
 * The interactive editor extends this with click selection, marquee, etc.
 */
import type { SelectableObject } from './scene-context.js';

/**
 * Event emitted when selection changes.
 */
export interface SelectionChangeEvent {
  /** Current selection set (may be empty) */
  selection: ReadonlySet<SelectableObject>;
  /** Objects that were added to selection in this event */
  added: SelectableObject[];
  /** Objects that were removed from selection in this event */
  removed: SelectableObject[];
  /** Source of the selection change */
  source: SelectionSource;
}

/**
 * Source of a selection change (for sync conflict prevention).
 */
export type SelectionSource = 
  | 'click'        // User clicked on 3D object
  | 'marquee'      // User marquee-selected objects
  | 'keyboard'     // Keyboard navigation (Tab, Ctrl+A)
  | 'editor'       // Cursor position change in editor
  | 'api'          // Programmatic selection via API
  | 'deselect'     // Explicit deselect (Escape, click empty)
  | 'visibility';  // Auto-cleared due to visibility change (floor hidden)

/**
 * Listener for selection change events.
 */
export type SelectionChangeListener = (event: SelectionChangeEvent) => void;

/**
 * Highlight style configuration.
 */
export interface HighlightStyle {
  /** Outline color (hex or CSS color) */
  outlineColor?: number;
  /** Outline thickness */
  outlineThickness?: number;
  /** Glow/emission intensity (0-1) */
  emissionIntensity?: number;
  /** Whether to use outline effect vs emission change */
  useOutline?: boolean;
}

/**
 * Options for selectMultiple with hierarchical selection support.
 */
export interface SelectMultipleOptions {
  /** The primary entity (receives full highlight) when doing hierarchical selection */
  primaryEntity?: SelectableObject;
  /** Whether this is a hierarchical selection (children get secondary highlight) */
  isHierarchical?: boolean;
}

/**
 * Selection API interface - implemented by viewer-core for basic selection,
 * extended by interactive-editor for full interactivity.
 */
export interface SelectionAPI {
  /**
   * Get the current selection set.
   */
  getSelection(): ReadonlySet<SelectableObject>;
  
  /**
   * Check if an object is currently selected.
   */
  isSelected(obj: SelectableObject): boolean;
  
  /**
   * Select an object.
   * 
   * @param obj - Object to select
   * @param additive - If true, add to existing selection; if false, replace selection
   */
  select(obj: SelectableObject, additive?: boolean): void;
  
  /**
   * Select multiple objects at once.
   * 
   * @param objs - Objects to select
   * @param additive - If true, add to existing selection; if false, replace selection
   * @param options - Options for hierarchical selection
   */
  selectMultiple(objs: SelectableObject[], additive?: boolean, options?: SelectMultipleOptions): void;
  
  /**
   * Deselect an object. If no object specified, deselect all.
   */
  deselect(obj?: SelectableObject): void;
  
  /**
   * Toggle selection state of an object.
   */
  toggleSelection(obj: SelectableObject): void;
  
  /**
   * Select all selectable objects.
   */
  selectAll(): void;
  
  /**
   * Highlight an object without selecting it.
   * Used for hover preview during marquee selection.
   */
  highlight(obj: SelectableObject): void;
  
  /**
   * Clear highlight from an object.
   */
  clearHighlight(obj?: SelectableObject): void;
  
  /**
   * Add a listener for selection changes.
   * Returns a function to remove the listener.
   */
  onSelectionChange(listener: SelectionChangeListener): () => void;
  
  /**
   * Set the highlight style for selected objects.
   */
  setHighlightStyle(style: HighlightStyle): void;
}

/**
 * Base implementation of SelectionAPI with no visual feedback.
 * Viewer and InteractiveEditor extend this with actual highlighting.
 */
export class BaseSelectionManager implements SelectionAPI {
  protected selection = new Set<SelectableObject>();
  protected highlighted = new Set<SelectableObject>();
  protected listeners = new Set<SelectionChangeListener>();
  protected highlightStyle: HighlightStyle = {
    outlineColor: 0x00ff00,
    outlineThickness: 2,
    emissionIntensity: 0.3,
    useOutline: true,
  };
  
  getSelection(): ReadonlySet<SelectableObject> {
    return this.selection;
  }
  
  isSelected(obj: SelectableObject): boolean {
    // Check by entityId since SelectableObject instances may differ
    for (const selected of this.selection) {
      if (this.isSameEntity(selected, obj)) {
        return true;
      }
    }
    return false;
  }
  
  select(obj: SelectableObject, additive = false): void {
    const added: SelectableObject[] = [];
    const removed: SelectableObject[] = [];
    
    if (!additive) {
      // Clear existing selection
      for (const selected of this.selection) {
        removed.push(selected);
        this.applyHighlight(selected, false, 'primary');
      }
      this.selection.clear();
    }
    
    // Add new object if not already selected
    if (!this.isSelected(obj)) {
      this.selection.add(obj);
      added.push(obj);
      this.applyHighlight(obj, true, 'primary');
    }
    
    this.emitChange(added, removed, 'api');
  }
  
  selectMultiple(objs: SelectableObject[], additive = false, options?: SelectMultipleOptions): void {
    const added: SelectableObject[] = [];
    const removed: SelectableObject[] = [];
    
    if (!additive) {
      for (const selected of this.selection) {
        removed.push(selected);
        this.applyHighlight(selected, false);
      }
      this.selection.clear();
    }
    
    for (const obj of objs) {
      if (!this.isSelected(obj)) {
        this.selection.add(obj);
        added.push(obj);
        
        // Determine if this is primary or secondary (hierarchical child)
        const isPrimary = !options?.isHierarchical || 
          (options.primaryEntity && this.isSameEntity(obj, options.primaryEntity));
        
        this.applyHighlight(obj, true, isPrimary ? 'primary' : 'secondary');
      }
    }
    
    this.emitChange(added, removed, 'api');
  }
  
  deselect(obj?: SelectableObject): void {
    const removed: SelectableObject[] = [];
    
    if (obj) {
      // Deselect specific object
      for (const selected of this.selection) {
        if (this.isSameEntity(selected, obj)) {
          removed.push(selected);
          this.applyHighlight(selected, false, 'primary');
          this.selection.delete(selected);
          break;
        }
      }
    } else {
      // Deselect all
      for (const selected of this.selection) {
        removed.push(selected);
        this.applyHighlight(selected, false, 'primary');
      }
      this.selection.clear();
    }
    
    if (removed.length > 0) {
      this.emitChange([], removed, 'deselect');
    }
  }
  
  toggleSelection(obj: SelectableObject): void {
    if (this.isSelected(obj)) {
      this.deselect(obj);
    } else {
      this.select(obj, true);
    }
  }
  
  selectAll(): void {
    // Override in subclass with access to all selectable objects
    throw new Error('selectAll() must be implemented by subclass');
  }
  
  highlight(obj: SelectableObject): void {
    if (!this.isHighlighted(obj)) {
      this.highlighted.add(obj);
      this.applyHighlight(obj, true, 'hover');
    }
  }
  
  clearHighlight(obj?: SelectableObject): void {
    if (obj) {
      for (const highlighted of this.highlighted) {
        if (this.isSameEntity(highlighted, obj)) {
          this.highlighted.delete(highlighted);
          // Only remove highlight if not selected
          if (!this.isSelected(highlighted)) {
            this.applyHighlight(highlighted, false, 'hover');
          }
          break;
        }
      }
    } else {
      for (const highlighted of this.highlighted) {
        if (!this.isSelected(highlighted)) {
          this.applyHighlight(highlighted, false, 'hover');
        }
      }
      this.highlighted.clear();
    }
  }
  
  onSelectionChange(listener: SelectionChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  setHighlightStyle(style: HighlightStyle): void {
    this.highlightStyle = { ...this.highlightStyle, ...style };
    // Re-apply highlights with new style
    for (const obj of this.selection) {
      this.applyHighlight(obj, true, 'primary');
    }
    for (const obj of this.highlighted) {
      if (!this.isSelected(obj)) {
        this.applyHighlight(obj, true, 'primary');
      }
    }
  }
  
  /**
   * Highlight level for hierarchical selection.
   */
  public static readonly HighlightLevel = {
    PRIMARY: 'primary' as const,
    SECONDARY: 'secondary' as const,
    HOVER: 'hover' as const,
  };
  
  /**
   * Apply or remove highlight from an object.
   * Override in subclass to implement actual visual feedback.
   * @param _obj - Object to highlight
   * @param _highlight - Whether to apply or remove highlight
   * @param _level - Highlight level: 'primary' for main selection, 'secondary' for hierarchical children, 'hover' for preview
   */
  protected applyHighlight(_obj: SelectableObject, _highlight: boolean, _level: 'primary' | 'secondary' | 'hover' = 'primary'): void {
    // Base implementation does nothing - override in subclass
  }
  
  /**
   * Emit a selection change event.
   */
  protected emitChange(
    added: SelectableObject[],
    removed: SelectableObject[],
    source: SelectionSource
  ): void {
    const event: SelectionChangeEvent = {
      selection: this.selection,
      added,
      removed,
      source,
    };
    
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Selection change listener error:', err);
      }
    }
  }
  
  /**
   * Check if two SelectableObjects represent the same entity.
   */
  protected isSameEntity(a: SelectableObject, b: SelectableObject): boolean {
    return a.floorId === b.floorId &&
           a.entityType === b.entityType &&
           a.entityId === b.entityId;
  }
  
  /**
   * Check if an object is currently highlighted.
   */
  protected isHighlighted(obj: SelectableObject): boolean {
    for (const h of this.highlighted) {
      if (this.isSameEntity(h, obj)) {
        return true;
      }
    }
    return false;
  }
}

