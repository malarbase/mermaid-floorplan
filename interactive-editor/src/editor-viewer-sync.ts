/**
 * EditorViewerSync - Bidirectional synchronization between Monaco editor and 3D viewer.
 * 
 * Handles:
 * - 3D selection → editor cursor/scroll sync
 * - Editor cursor → 3D highlight sync
 * - Debouncing to prevent feedback loops
 * - Error state management
 */
import type * as monaco from 'monaco-editor';
import type { SelectableObject, SourceRange } from 'viewer-core';
import type { SelectionManager } from './selection-manager.js';

/**
 * Configuration for EditorViewerSync
 */
export interface EditorViewerSyncConfig {
  /** Debounce delay for editor cursor changes (ms) */
  cursorDebounceMs?: number;
  /** Enable logging for debugging */
  debug?: boolean;
}

/**
 * Entity location in the DSL source
 */
export interface EntityLocation {
  entityType: string;
  entityId: string;
  floorId: string;
  sourceRange: SourceRange;
}

/**
 * Bidirectional sync between Monaco editor and 3D viewer.
 */
export class EditorViewerSync {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private selectionManager: SelectionManager;
  private config: Required<EditorViewerSyncConfig>;
  
  // Sync direction lock to prevent feedback loops
  private syncDirection: 'none' | '3d-to-editor' | 'editor-to-3d' = 'none';
  private syncLockTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Cursor debounce
  private cursorDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Entity location index (populated from JSON with source ranges)
  private entityLocations: Map<string, EntityLocation> = new Map();
  
  // Disposables for cleanup
  private disposables: monaco.IDisposable[] = [];
  
  // Callback for when user selects entity in editor
  private onEditorSelectCallback?: (entityKey: string) => void;
  
  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    selectionManager: SelectionManager,
    config: EditorViewerSyncConfig = {}
  ) {
    this.editor = editor;
    this.selectionManager = selectionManager;
    this.config = {
      cursorDebounceMs: config.cursorDebounceMs ?? 100,
      debug: config.debug ?? false,
    };
    
    this.setupSelectionSync();
    this.setupCursorSync();
  }
  
  /**
   * Update entity locations from parsed JSON data.
   * Call this after each successful parse.
   */
  updateEntityLocations(entities: EntityLocation[]): void {
    this.entityLocations.clear();
    for (const entity of entities) {
      const key = `${entity.floorId}:${entity.entityType}:${entity.entityId}`;
      this.entityLocations.set(key, entity);
    }
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Updated ${entities.length} entity locations`);
    }
  }
  
  /**
   * Set callback for when editor cursor selects an entity.
   */
  onEditorSelect(callback: (entityKey: string) => void): void {
    this.onEditorSelectCallback = callback;
  }
  
  /**
   * Setup 3D selection → editor sync.
   */
  private setupSelectionSync(): void {
    this.selectionManager.onSelectionChange((event) => {
      // Skip if sync is coming from editor
      if (this.syncDirection === 'editor-to-3d') {
        return;
      }
      
      this.lockSync('3d-to-editor');
      
      const selection = event.selection;
      if (selection.size === 0) {
        // Clear editor selection on deselect
        return;
      }
      
      // Get first selected entity with source range
      let firstRange: SourceRange | undefined;
      for (const obj of selection) {
        if (obj.sourceRange) {
          firstRange = obj.sourceRange;
          break;
        }
      }
      
      if (firstRange) {
        this.scrollEditorToRange(firstRange);
        this.highlightEditorRanges(Array.from(selection).filter(s => s.sourceRange));
      }
    });
  }
  
  /**
   * Setup editor cursor → 3D sync.
   */
  private setupCursorSync(): void {
    const disposable = this.editor.onDidChangeCursorPosition((event) => {
      // Skip if sync is coming from 3D
      if (this.syncDirection === '3d-to-editor') {
        return;
      }
      
      // Debounce cursor changes
      if (this.cursorDebounceTimeout) {
        clearTimeout(this.cursorDebounceTimeout);
      }
      
      this.cursorDebounceTimeout = setTimeout(() => {
        this.handleCursorChange(event.position);
      }, this.config.cursorDebounceMs);
    });
    
    this.disposables.push(disposable);
  }
  
  /**
   * Handle cursor position change in editor.
   */
  private handleCursorChange(position: monaco.Position): void {
    this.lockSync('editor-to-3d');
    
    // Find entity at cursor position
    const entityKey = this.findEntityAtPosition(position);
    
    if (entityKey && this.onEditorSelectCallback) {
      this.onEditorSelectCallback(entityKey);
    }
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Cursor at ${position.lineNumber}:${position.column}, entity: ${entityKey || 'none'}`);
    }
  }
  
  /**
   * Find which entity (if any) contains the given position.
   */
  private findEntityAtPosition(position: monaco.Position): string | null {
    const line = position.lineNumber - 1; // Monaco is 1-indexed, source ranges are 0-indexed
    const column = position.column - 1;
    
    for (const [key, entity] of this.entityLocations) {
      const range = entity.sourceRange;
      
      // Check if position is within entity range
      if (this.isPositionInRange(line, column, range)) {
        return key;
      }
    }
    
    return null;
  }
  
  /**
   * Check if a position is within a source range.
   */
  private isPositionInRange(line: number, column: number, range: SourceRange): boolean {
    // Before start line
    if (line < range.startLine) return false;
    // After end line
    if (line > range.endLine) return false;
    // On start line but before start column
    if (line === range.startLine && column < range.startColumn) return false;
    // On end line but after end column
    if (line === range.endLine && column > range.endColumn) return false;
    
    return true;
  }
  
  /**
   * Scroll editor to show a source range.
   */
  private scrollEditorToRange(range: SourceRange): void {
    const monacoRange = this.sourceRangeToMonaco(range);
    
    // Reveal the line in center
    this.editor.revealLineInCenter(monacoRange.startLineNumber);
    
    // Set selection to highlight the range
    this.editor.setSelection(monacoRange);
  }
  
  /**
   * Highlight multiple ranges in the editor (for multi-selection).
   */
  private highlightEditorRanges(objects: SelectableObject[]): void {
    const ranges = objects
      .filter(obj => obj.sourceRange)
      .map(obj => this.sourceRangeToMonaco(obj.sourceRange!));
    
    if (ranges.length === 0) return;
    
    // Use decorations for multi-selection highlighting
    // For now, just select the first range
    if (ranges.length === 1) {
      this.editor.setSelection(ranges[0]);
    } else {
      // Multiple selections - use the primary selection for first, decorations for rest
      this.editor.setSelection(ranges[0]);
      
      // Add decorations for additional selections
      const decorations = ranges.slice(1).map(range => ({
        range,
        options: {
          className: 'selected-entity-decoration',
          isWholeLine: false,
          stickiness: 1, // AlwaysGrowsWhenTypingAtEdges
        },
      }));
      
      // Store decoration IDs for later removal (if needed)
      this.editor.createDecorationsCollection(decorations);
    }
  }
  
  /**
   * Convert SourceRange to Monaco Range.
   * Source ranges are 0-indexed, Monaco is 1-indexed.
   */
  private sourceRangeToMonaco(range: SourceRange): monaco.Range {
    // Import Monaco's Range constructor dynamically to avoid circular deps
    const monaco = (window as unknown as { monaco: typeof import('monaco-editor') }).monaco;
    
    return new monaco.Range(
      range.startLine + 1,     // Monaco is 1-indexed
      range.startColumn + 1,
      range.endLine + 1,
      range.endColumn + 1
    );
  }
  
  /**
   * Lock sync in a direction to prevent feedback loops.
   */
  private lockSync(direction: 'none' | '3d-to-editor' | 'editor-to-3d'): void {
    this.syncDirection = direction;
    
    // Clear existing timeout
    if (this.syncLockTimeout) {
      clearTimeout(this.syncLockTimeout);
    }
    
    // Auto-release lock after a short delay
    if (direction !== 'none') {
      this.syncLockTimeout = setTimeout(() => {
        this.syncDirection = 'none';
      }, 200);
    }
  }
  
  /**
   * Manually select an entity from its key (floorId:entityType:entityId).
   * Used when editor cursor finds an entity.
   */
  selectEntityByKey(entityKey: string): void {
    // This should be called by the consumer to trigger 3D selection
    // The actual mesh lookup happens in the InteractiveEditor
    if (this.onEditorSelectCallback) {
      this.onEditorSelectCallback(entityKey);
    }
  }
  
  /**
   * Clean up resources.
   */
  dispose(): void {
    // Clear timeouts
    if (this.syncLockTimeout) {
      clearTimeout(this.syncLockTimeout);
    }
    if (this.cursorDebounceTimeout) {
      clearTimeout(this.cursorDebounceTimeout);
    }
    
    // Dispose Monaco listeners
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    
    // Clear entity locations
    this.entityLocations.clear();
  }
}

