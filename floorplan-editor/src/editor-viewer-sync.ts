/**
 * EditorViewerSync - Bidirectional synchronization between Monaco editor and 3D viewer.
 * 
 * Handles:
 * - 3D selection → editor cursor/scroll sync
 * - Editor cursor → 3D highlight sync
 * - Debouncing to prevent feedback loops
 * - Error state management
 */
import * as monaco from 'monaco-editor';
import type { SelectableObject, SourceRange, SelectionManager } from 'floorplan-viewer-core';

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
  /** Parent entity key (e.g., room for walls) */
  parentKey?: string;
}

/**
 * Hierarchy context for an entity
 */
export interface EntityHierarchyContext {
  /** The entity key (floorId:entityType:entityId) */
  entityKey: string;
  /** Entity type (floor, room, wall, connection) */
  entityType: string;
  /** Depth in hierarchy (0=floor, 1=room, 2=wall/door) */
  depth: number;
  /** Parent entity key, if any */
  parentKey?: string;
  /** Child entity keys */
  childKeys: string[];
}

/**
 * Result of hierarchical expansion
 */
export interface HierarchyExpansionResult {
  /** Primary entity key (the one cursor is on) */
  primaryKey: string;
  /** All entity keys to select (primary + children based on hierarchy level) */
  allKeys: string[];
  /** Context for displaying breadcrumb (e.g., "Kitchen > top wall") */
  breadcrumb?: string;
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
  
  // Entity hierarchy index (key -> hierarchy context)
  private entityHierarchy: Map<string, EntityHierarchyContext> = new Map();
  
  // Configuration for hierarchical selection
  private hierarchicalSelectionEnabled = true;
  
  // Disposables for cleanup
  private disposables: monaco.IDisposable[] = [];
  
  // Callback for when user selects entity in editor (cursor position)
  // isAdditive is true when handling multi-cursor (subsequent entities after first)
  private onEditorSelectCallback?: (entityKey: string, isAdditive: boolean) => void;
  
  // Callback for hierarchical selection - returns expansion result with all keys to select
  private onEditorHierarchicalSelectCallback?: (result: HierarchyExpansionResult, isAdditive: boolean) => void;
  
  // Callbacks for text highlight → 3D highlight preview
  private onEditorHighlightCallback?: (entityKeys: string[]) => void;
  private onEditorHighlightClearCallback?: () => void;
  
  // Ephemeral wall decoration
  private wallDecorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private wallDecorationTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Multi-selection decorations (for 3D multi-select → editor highlighting)
  private multiSelectDecorations: monaco.editor.IEditorDecorationsCollection | null = null;
  
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
    this.setupTextHighlightSync();
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
    
    // Build hierarchy index
    this.buildEntityHierarchy();
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Updated ${entities.length} entity locations`);
      console.log(`[EditorViewerSync] Built hierarchy with ${this.entityHierarchy.size} entries`);
    }
  }
  
  /**
   * Build entity hierarchy from locations.
   * Hierarchy structure:
   *   floor (depth 0)
   *     └── room (depth 1)
   *           └── wall (depth 2)
   *           └── connection (depth 2, spans rooms)
   */
  private buildEntityHierarchy(): void {
    this.entityHierarchy.clear();
    
    // Group entities by floor and room
    const floorRooms = new Map<string, string[]>(); // floor key -> room keys
    const roomWalls = new Map<string, string[]>();  // room key -> wall keys
    
    for (const [key, entity] of this.entityLocations) {
      if (entity.entityType === 'room') {
        const floorKey = `${entity.floorId}:floor:${entity.floorId}`;
        if (!floorRooms.has(floorKey)) {
          floorRooms.set(floorKey, []);
        }
        floorRooms.get(floorKey)!.push(key);
      } else if (entity.entityType === 'wall') {
        // Wall entityId is "RoomName_direction", extract room name
        const match = entity.entityId.match(/^(.+)_(top|bottom|left|right)$/);
        if (match) {
          const roomName = match[1];
          const roomKey = `${entity.floorId}:room:${roomName}`;
          if (!roomWalls.has(roomKey)) {
            roomWalls.set(roomKey, []);
          }
          roomWalls.get(roomKey)!.push(key);
        }
      }
    }
    
    // Build hierarchy contexts for each entity
    for (const [key, entity] of this.entityLocations) {
      const context: EntityHierarchyContext = {
        entityKey: key,
        entityType: entity.entityType,
        depth: this.getEntityDepth(entity.entityType),
        childKeys: [],
      };
      
      if (entity.entityType === 'floor') {
        // Floor's children are all rooms on this floor
        context.childKeys = floorRooms.get(key) || [];
      } else if (entity.entityType === 'room') {
        // Room's parent is the floor, children are its walls
        context.parentKey = `${entity.floorId}:floor:${entity.floorId}`;
        context.childKeys = roomWalls.get(key) || [];
      } else if (entity.entityType === 'wall') {
        // Wall's parent is its room
        const match = entity.entityId.match(/^(.+)_(top|bottom|left|right)$/);
        if (match) {
          const roomName = match[1];
          context.parentKey = `${entity.floorId}:room:${roomName}`;
        }
      } else if (entity.entityType === 'connection') {
        // Connections don't have a strict parent in this hierarchy
        // They span between rooms
      }
      
      this.entityHierarchy.set(key, context);
    }
  }
  
  /**
   * Get the depth of an entity type in the hierarchy.
   */
  private getEntityDepth(entityType: string): number {
    switch (entityType) {
      case 'floor': return 0;
      case 'room': return 1;
      case 'wall': return 2;
      case 'connection': return 2;
      default: return 1;
    }
  }
  
  /**
   * Get hierarchy context for an entity.
   */
  getHierarchyContext(entityKey: string): EntityHierarchyContext | undefined {
    return this.entityHierarchy.get(entityKey);
  }
  
  /**
   * Expand an entity to its hierarchical selection.
   * Based on cursor position context:
   * - On floor: select all rooms + walls on that floor
   * - On room: select room + all its walls
   * - On wall: select just that wall
   * - On connection: select just that connection
   */
  expandToHierarchy(entityKey: string): HierarchyExpansionResult {
    const context = this.entityHierarchy.get(entityKey);
    const entity = this.entityLocations.get(entityKey);
    
    if (!context || !entity) {
      return { primaryKey: entityKey, allKeys: [entityKey] };
    }
    
    const allKeys: string[] = [entityKey];
    let breadcrumb: string | undefined;
    
    if (entity.entityType === 'floor') {
      // Floor selected: add all rooms and their walls
      breadcrumb = `Floor: ${entity.entityId}`;
      
      // Add all rooms on this floor
      for (const roomKey of context.childKeys) {
        allKeys.push(roomKey);
        
        // Also add all walls of each room
        const roomContext = this.entityHierarchy.get(roomKey);
        if (roomContext) {
          allKeys.push(...roomContext.childKeys);
        }
      }
    } else if (entity.entityType === 'room') {
      // Room selected: add all its walls
      allKeys.push(...context.childKeys);
      breadcrumb = entity.entityId;
    } else if (entity.entityType === 'wall') {
      // Wall selected: just the wall, show breadcrumb
      const match = entity.entityId.match(/^(.+)_(top|bottom|left|right)$/);
      if (match) {
        const [, roomName, direction] = match;
        breadcrumb = `${roomName} › ${direction} wall`;
      }
    } else if (entity.entityType === 'connection') {
      // Connection: just the connection
      breadcrumb = `Connection: ${entity.entityId}`;
    }
    
    return {
      primaryKey: entityKey,
      allKeys,
      breadcrumb,
    };
  }
  
  /**
   * Enable or disable hierarchical selection.
   */
  setHierarchicalSelection(enabled: boolean): void {
    this.hierarchicalSelectionEnabled = enabled;
  }
  
  /**
   * Check if hierarchical selection is enabled.
   */
  isHierarchicalSelectionEnabled(): boolean {
    return this.hierarchicalSelectionEnabled;
  }
  
  /**
   * Set callback for when editor cursor selects an entity.
   * @param callback - Called with entityKey and isAdditive flag.
   *                   isAdditive is true for multi-cursor (2nd+ entities).
   */
  onEditorSelect(callback: (entityKey: string, isAdditive: boolean) => void): void {
    this.onEditorSelectCallback = callback;
  }
  
  /**
   * Set callback for hierarchical selection (cursor position expands to hierarchy).
   * @param callback - Called with expansion result containing all keys to select.
   *                   isAdditive is true for multi-cursor (2nd+ entities).
   */
  onEditorHierarchicalSelect(callback: (result: HierarchyExpansionResult, isAdditive: boolean) => void): void {
    this.onEditorHierarchicalSelectCallback = callback;
  }
  
  /**
   * Set callback for when text is highlighted in editor (preview mode).
   * Called with array of entity keys that overlap with highlighted text range.
   * @param callback - Called with array of entity keys to highlight in 3D
   */
  onEditorHighlight(callback: (entityKeys: string[]) => void): void {
    this.onEditorHighlightCallback = callback;
  }
  
  /**
   * Set callback to clear 3D highlights when editor text selection is cleared.
   */
  onEditorHighlightClear(callback: () => void): void {
    this.onEditorHighlightClearCallback = callback;
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
      
      // Clear any existing wall decoration
      this.clearWallDecoration();
      
      const selection = event.selection;
      if (selection.size === 0) {
        // Clear editor decorations on deselect
        this.clearMultiSelectDecorations();
        return;
      }
      
      // Get first selected entity with source range
      let firstEntity: SelectableObject | undefined;
      for (const obj of selection) {
        if (obj.sourceRange) {
          firstEntity = obj;
          break;
        }
      }
      
      if (firstEntity && firstEntity.sourceRange) {
        this.scrollEditorToRange(firstEntity.sourceRange);
        this.highlightEditorRanges(Array.from(selection).filter(s => s.sourceRange));
        
        // Show ephemeral decoration for wall selection
        if (firstEntity.entityType === 'wall') {
          this.showWallDecoration(firstEntity);
        }
      }
    });
  }
  
  /**
   * Show ephemeral inline decoration for wall selection.
   * Parses wall entity ID (e.g., "Kitchen_top") and shows "← top wall" hint.
   */
  private showWallDecoration(wallEntity: SelectableObject): void {
    if (!wallEntity.sourceRange) return;
    
    // Parse wall entity ID: "RoomName_direction"
    const match = wallEntity.entityId.match(/^(.+)_(top|bottom|left|right)$/);
    if (!match) return;
    
    const [, , direction] = match;
    const monacoRange = this.sourceRangeToMonaco(wallEntity.sourceRange);
    
    // Create inline decoration at end of first line of the room definition
    this.wallDecorationCollection = this.editor.createDecorationsCollection([{
      range: new monaco.Range(
        monacoRange.startLineNumber,
        1,
        monacoRange.startLineNumber,
        1000 // End of line
      ),
      options: {
        after: {
          content: ` ← ${direction} wall`,
          inlineClassName: 'wall-selection-hint',
        },
        isWholeLine: false,
      },
    }]);
    
    // Auto-dismiss after 3 seconds
    this.wallDecorationTimeout = setTimeout(() => {
      this.clearWallDecoration();
    }, 3000);
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Showing wall decoration: ${direction} wall`);
    }
  }
  
  /**
   * Clear any active wall decoration.
   */
  private clearWallDecoration(): void {
    if (this.wallDecorationTimeout) {
      clearTimeout(this.wallDecorationTimeout);
      this.wallDecorationTimeout = null;
    }
    if (this.wallDecorationCollection) {
      this.wallDecorationCollection.clear();
      this.wallDecorationCollection = null;
    }
  }
  
  // Breadcrumb decoration for hierarchical context
  private breadcrumbDecorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  private breadcrumbDecorationTimeout: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * Show breadcrumb decoration for hierarchical context.
   * E.g., "Kitchen › top wall" when a wall is selected.
   */
  private showBreadcrumbDecoration(breadcrumb: string, lineNumber: number): void {
    // Clear existing breadcrumb
    this.clearBreadcrumbDecoration();
    
    // Create inline decoration at end of line
    this.breadcrumbDecorationCollection = this.editor.createDecorationsCollection([{
      range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
      options: {
        after: {
          content: ` ${breadcrumb}`,
          inlineClassName: 'hierarchy-breadcrumb-hint',
        },
        isWholeLine: false,
      },
    }]);
    
    // Auto-dismiss after 4 seconds
    this.breadcrumbDecorationTimeout = setTimeout(() => {
      this.clearBreadcrumbDecoration();
    }, 4000);
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Showing breadcrumb: ${breadcrumb}`);
    }
  }
  
  /**
   * Clear any active breadcrumb decoration.
   */
  private clearBreadcrumbDecoration(): void {
    if (this.breadcrumbDecorationTimeout) {
      clearTimeout(this.breadcrumbDecorationTimeout);
      this.breadcrumbDecorationTimeout = null;
    }
    if (this.breadcrumbDecorationCollection) {
      this.breadcrumbDecorationCollection.clear();
      this.breadcrumbDecorationCollection = null;
    }
  }
  
  /**
   * Setup editor cursor → 3D sync.
   */
  private setupCursorSync(): void {
    const disposable = this.editor.onDidChangeCursorPosition(() => {
      // Skip if sync is coming from 3D
      if (this.syncDirection === '3d-to-editor') {
        return;
      }
      
      // Debounce cursor changes
      if (this.cursorDebounceTimeout) {
        clearTimeout(this.cursorDebounceTimeout);
      }
      
      this.cursorDebounceTimeout = setTimeout(() => {
        // Get all selections for multi-cursor support
        const selections = this.editor.getSelections();
        if (selections && selections.length > 1) {
          this.handleMultipleCursorChanges(selections);
        } else if (selections && selections.length === 1) {
          this.handleCursorChange(selections[0].getPosition(), false);
        }
      }, this.config.cursorDebounceMs);
    });
    
    this.disposables.push(disposable);
  }
  
  /**
   * Handle cursor position change in editor (single cursor).
   */
  private handleCursorChange(position: monaco.Position, isAdditive: boolean): void {
    this.lockSync('editor-to-3d');
    
    // Find entity at cursor position
    const entityKey = this.findEntityAtPosition(position);
    
    if (entityKey) {
      // If hierarchical selection is enabled and we have a callback, use it
      if (this.hierarchicalSelectionEnabled && this.onEditorHierarchicalSelectCallback) {
        const expansion = this.expandToHierarchy(entityKey);
        this.onEditorHierarchicalSelectCallback(expansion, isAdditive);
        
        // Show breadcrumb decoration if available
        if (expansion.breadcrumb) {
          this.showBreadcrumbDecoration(expansion.breadcrumb, position.lineNumber);
        }
      } else if (this.onEditorSelectCallback) {
        // Fall back to simple selection
        this.onEditorSelectCallback(entityKey, isAdditive);
      }
    }
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Cursor at ${position.lineNumber}:${position.column}, entity: ${entityKey || 'none'}, additive: ${isAdditive}, hierarchical: ${this.hierarchicalSelectionEnabled}`);
    }
  }
  
  /**
   * Handle multiple cursor positions (multi-cursor support).
   */
  private handleMultipleCursorChanges(selections: readonly monaco.Selection[]): void {
    this.lockSync('editor-to-3d');
    
    // Collect unique entity keys from all cursor positions
    const primaryEntityKeys = new Set<string>();
    const allEntityKeys = new Set<string>();
    
    for (const selection of selections) {
      const entityKey = this.findEntityAtPosition(selection.getPosition());
      if (entityKey) {
        primaryEntityKeys.add(entityKey);
        
        // If hierarchical selection enabled, expand each entity
        if (this.hierarchicalSelectionEnabled) {
          const expansion = this.expandToHierarchy(entityKey);
          for (const key of expansion.allKeys) {
            allEntityKeys.add(key);
          }
        } else {
          allEntityKeys.add(entityKey);
        }
      }
    }
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Multi-cursor: ${primaryEntityKeys.size} primary entities, ${allEntityKeys.size} total (hierarchical) from ${selections.length} cursors`);
    }
    
    // If hierarchical selection is enabled and we have the callback
    if (this.hierarchicalSelectionEnabled && this.onEditorHierarchicalSelectCallback) {
      // Emit as a combined hierarchical selection
      const combinedResult: HierarchyExpansionResult = {
        primaryKey: Array.from(primaryEntityKeys)[0] || '',
        allKeys: Array.from(allEntityKeys),
      };
      this.onEditorHierarchicalSelectCallback(combinedResult, false);
    } else if (this.onEditorSelectCallback) {
      // Fall back to simple selection - emit callbacks for each unique entity
      let isFirst = true;
      for (const entityKey of primaryEntityKeys) {
        this.onEditorSelectCallback(entityKey, !isFirst);
        isFirst = false;
      }
    }
  }
  
  /**
   * Setup text highlight → 3D highlight preview sync.
   * When user highlights text (not just cursor position), preview those entities in 3D.
   */
  private setupTextHighlightSync(): void {
    const disposable = this.editor.onDidChangeCursorSelection(() => {
      // Skip if sync is coming from 3D
      if (this.syncDirection === '3d-to-editor') {
        return;
      }
      
      const selections = this.editor.getSelections();
      if (!selections) return;
      
      // Check if any selection has actual text range (not just cursor)
      const hasTextHighlight = selections.some(s => !s.isEmpty());
      
      if (hasTextHighlight) {
        // Text is highlighted - show preview in 3D
        this.handleTextHighlight(selections);
      } else {
        // No text selected - clear previews
        if (this.onEditorHighlightClearCallback) {
          this.onEditorHighlightClearCallback();
        }
      }
    });
    
    this.disposables.push(disposable);
  }
  
  /**
   * Handle text highlight → find entities in range and preview them in 3D.
   */
  private handleTextHighlight(selections: readonly monaco.Selection[]): void {
    // Collect all entity keys that overlap with any selection range
    const entityKeys = new Set<string>();
    
    for (const selection of selections) {
      if (selection.isEmpty()) continue;
      
      // Find all entities whose ranges overlap with this text selection
      const entitiesInRange = this.findEntitiesInRange(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      );
      
      for (const key of entitiesInRange) {
        entityKeys.add(key);
      }
    }
    
    if (this.config.debug) {
      console.log(`[EditorViewerSync] Text highlight preview: ${entityKeys.size} entities`);
    }
    
    // Emit callback with all entity keys to preview
    if (this.onEditorHighlightCallback && entityKeys.size > 0) {
      this.onEditorHighlightCallback(Array.from(entityKeys));
    } else if (this.onEditorHighlightClearCallback && entityKeys.size === 0) {
      this.onEditorHighlightClearCallback();
    }
  }
  
  /**
   * Find all entities whose source ranges overlap with the given text range.
   * Returns entity keys (floorId:entityType:entityId).
   */
  private findEntitiesInRange(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ): string[] {
    const result: string[] = [];
    
    // Convert Monaco 1-indexed to source range 0-indexed
    const selStart = { line: startLine - 1, column: startColumn - 1 };
    const selEnd = { line: endLine - 1, column: endColumn - 1 };
    
    for (const [key, entity] of this.entityLocations) {
      const range = entity.sourceRange;
      
      // Check if ranges overlap
      if (this.rangesOverlap(selStart, selEnd, range)) {
        result.push(key);
      }
    }
    
    return result;
  }
  
  /**
   * Check if two ranges overlap.
   * Selection is selStart-selEnd (0-indexed), entity range is SourceRange.
   */
  private rangesOverlap(
    selStart: { line: number; column: number },
    selEnd: { line: number; column: number },
    range: SourceRange
  ): boolean {
    // Selection ends before range starts
    if (selEnd.line < range.startLine) return false;
    if (selEnd.line === range.startLine && selEnd.column < range.startColumn) return false;
    
    // Selection starts after range ends
    if (selStart.line > range.endLine) return false;
    if (selStart.line === range.endLine && selStart.column > range.endColumn) return false;
    
    // Ranges overlap
    return true;
  }
  
  /**
   * Find which entity (if any) contains the given position.
   * Returns the most specific (smallest range) match to prioritize
   * walls over their parent rooms.
   */
  private findEntityAtPosition(position: monaco.Position): string | null {
    const line = position.lineNumber - 1; // Monaco is 1-indexed, source ranges are 0-indexed
    const column = position.column - 1;
    
    let bestMatch: { key: string; size: number } | null = null;
    
    for (const [key, entity] of this.entityLocations) {
      const range = entity.sourceRange;
      
      // Check if position is within entity range
      if (this.isPositionInRange(line, column, range)) {
        // Calculate range size (smaller = more specific)
        const size = this.getRangeSize(range);
        
        // Keep the smallest (most specific) match
        if (bestMatch === null || size < bestMatch.size) {
          bestMatch = { key, size };
        }
      }
    }
    
    return bestMatch?.key ?? null;
  }
  
  /**
   * Calculate the "size" of a source range for specificity comparison.
   * Smaller values = more specific matches (walls < rooms).
   */
  private getRangeSize(range: SourceRange): number {
    // Use line count as primary, column span as tiebreaker
    const lineSpan = range.endLine - range.startLine;
    const columnSpan = (range.endLine === range.startLine) 
      ? range.endColumn - range.startColumn 
      : 1000; // Multi-line ranges use large column value
    
    return lineSpan * 10000 + columnSpan;
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
    // Clear previous multi-select decorations
    this.clearMultiSelectDecorations();
    
    const ranges = objects
      .filter(obj => obj.sourceRange)
      .map(obj => this.sourceRangeToMonaco(obj.sourceRange!));
    
    if (ranges.length === 0) return;
    
    if (ranges.length === 1) {
      // Single selection - just use setSelection
      this.editor.setSelection(ranges[0]);
    } else {
      // Multiple selections - use primary selection for first, decorations for ALL
      this.editor.setSelection(ranges[0]);
      
      // Add decorations for ALL ranges (including first for consistent highlighting)
      const decorations = ranges.map(range => ({
        range,
        options: {
          className: 'selected-entity-decoration',
          isWholeLine: false,
          stickiness: 1, // AlwaysGrowsWhenTypingAtEdges
        },
      }));
      
      // Track decoration collection for cleanup
      this.multiSelectDecorations = this.editor.createDecorationsCollection(decorations);
    }
  }
  
  /**
   * Clear multi-selection decorations.
   */
  private clearMultiSelectDecorations(): void {
    if (this.multiSelectDecorations) {
      this.multiSelectDecorations.clear();
      this.multiSelectDecorations = null;
    }
  }
  
  /**
   * Convert SourceRange to Monaco Range.
   * Source ranges are 0-indexed, Monaco is 1-indexed.
   */
  private sourceRangeToMonaco(range: SourceRange): monaco.Range {
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
   * @param isAdditive - If true, add to existing selection instead of replacing
   */
  selectEntityByKey(entityKey: string, isAdditive = false): void {
    // This should be called by the consumer to trigger 3D selection
    // The actual mesh lookup happens in the InteractiveEditor
    if (this.onEditorSelectCallback) {
      this.onEditorSelectCallback(entityKey, isAdditive);
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
    
    // Clear wall decoration
    this.clearWallDecoration();
    
    // Clear breadcrumb decoration
    this.clearBreadcrumbDecoration();
    
    // Clear multi-select decorations
    this.clearMultiSelectDecorations();
    
    // Dispose Monaco listeners
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    
    // Clear entity locations and hierarchy
    this.entityLocations.clear();
    this.entityHierarchy.clear();
  }
}

