# Branching History - Design Decisions

## Context

Monaco Editor has built-in undo/redo using a linear stack. This breaks when we use `setValue()` to update the editor (which happens during 3D-triggered edits). We need a custom history system that:
- Survives `setValue()` calls
- Supports branching (edit-after-undo creates new branch)
- Groups bulk edits

## Goals / Non-Goals

**Goals:**
- Git-like branching history model
- Fast undo/redo (< 50ms)
- Visual history browser
- Bounded memory usage

**Non-Goals:**
- Diff-based storage (using full snapshots for simplicity)
- Persistent storage across sessions
- Collaborative history merging

## Architecture Decision: Full Snapshots vs Diffs

### Options Considered

1. **Diff-based storage** - Store patches between states
   - ✅ Memory efficient
   - ❌ Complex patch application
   - ❌ Slow navigation to distant states

2. **Full snapshots** ✓ - Store complete DSL text at each node
   - ✅ Simple and reliable
   - ✅ O(1) navigation to any state
   - ❌ Higher memory usage
   - ✅ Mitigated by pruning

**Decision:** Use full snapshots. Typical floorplan DSL is <50KB, so 100 snapshots = ~5MB, which is acceptable.

## Data Model

```typescript
interface HistoryNode {
  id: string;              // UUID
  content: string;         // Full DSL text
  timestamp: Date;         // Creation time
  parent: string | null;   // Parent node ID
  children: string[];      // Child node IDs (branches)
  metadata: {
    cursorPosition?: { lineNumber: number; column: number };
    scrollTop?: number;
    label?: string;        // Optional user label
  };
}

class BranchingHistory {
  private nodes: Map<string, HistoryNode>;
  private rootId: string;
  private currentId: string;
  
  // Core operations
  snapshot(content: string, metadata?: Partial<Metadata>): string;
  navigateTo(nodeId: string): string;  // Returns content
  undo(): string | null;
  redo(): string | null;
  
  // Tree inspection
  getTree(): HistoryNode[];
  getCurrentNode(): HistoryNode;
  getBranches(): string[][];
}
```

## Branch Creation Logic

```
Initial state:
  A ← current

After 2 edits:
  A → B → C ← current

After undo to B:
  A → B ← current
       ↘ C (archived)

After new edit from B:
  A → B → D ← current
       ↘ C (archived, still accessible)
```

When `snapshot()` is called:
1. If current node has no children, append normally
2. If current node already has children, create sibling (new branch)

## Keyboard Handling

```typescript
// Disable Monaco's native undo
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
  const content = history.undo();
  if (content !== null) {
    editor.getModel()?.setValue(content);
  }
});

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
  const content = history.redo();
  if (content !== null) {
    editor.getModel()?.setValue(content);
  }
});
```

## Snapshot Triggers

Snapshots are created on:
1. **CRUD operations** - Immediately after add/delete room/connection
2. **Property changes** - After debounce (500ms of no typing)
3. **Bulk operations** - After batch completes

```typescript
// Debounced snapshot for typing
let snapshotTimeout: number;
editor.onDidChangeModelContent(() => {
  clearTimeout(snapshotTimeout);
  snapshotTimeout = setTimeout(() => {
    history.snapshot(editor.getValue());
  }, 500);
});

// Immediate snapshot for CRUD
function addRoom() {
  // ... add room logic ...
  history.snapshot(editor.getValue(), { label: 'Add room' });
}
```

## Bulk Edit Batching

```typescript
class BranchingHistory {
  private batchDepth = 0;
  private batchedContent: string | null = null;
  
  beginBatch(): void {
    this.batchDepth++;
    if (this.batchDepth === 1) {
      // Save pre-batch state
      this.batchedContent = this.getCurrentContent();
    }
  }
  
  endBatch(finalContent: string, metadata?: Partial<Metadata>): void {
    this.batchDepth--;
    if (this.batchDepth === 0) {
      // Create single snapshot for entire batch
      this.snapshot(finalContent, metadata);
      this.batchedContent = null;
    }
  }
}

// Usage
history.beginBatch();
rooms.forEach(room => updateStyle(room, newStyle));
history.endBatch(editor.getValue(), { label: `Update ${rooms.length} rooms` });
```

## History Browser UI

```
┌─────────────────────────────┐
│ History                   ⌃ │
├─────────────────────────────┤
│ ● Current (now)             │
│ │                           │
│ ○ Changed Kitchen width     │
│ │  2 mins ago               │
│ │                           │
│ ├─○ [Archived branch]       │
│ │   Deleted Hallway         │
│ │   5 mins ago              │
│ │                           │
│ ○ Added LivingRoom          │
│ │  10 mins ago              │
│ │                           │
│ ○ Initial state             │
│   1 hour ago                │
└─────────────────────────────┘
```

Visual elements:
- **●** Current node (filled circle, green)
- **○** Other nodes (empty circle)
- **│** Branch line
- **├─** Branch point
- Archived branches shown dimmed with "[Archived]" label

## Memory Management

### Pruning Strategy

1. Keep all nodes on path from root to current
2. Keep recent N nodes (configurable, default 50)
3. Prune oldest leaf nodes first
4. Never prune nodes with multiple children (branch points)

```typescript
pruneOldLeaves(): void {
  const maxNodes = this.config.maxNodes ?? 50;
  
  while (this.nodes.size > maxNodes) {
    const oldestLeaf = this.findOldestPrunableLeaf();
    if (!oldestLeaf) break;
    
    // Remove from parent's children
    const parent = this.nodes.get(oldestLeaf.parent!);
    if (parent) {
      parent.children = parent.children.filter(id => id !== oldestLeaf.id);
    }
    
    // Delete node
    this.nodes.delete(oldestLeaf.id);
  }
}
```

## Integration with Editor

```typescript
// In InteractiveEditor or index.html
const history = new BranchingHistory();

// Initial snapshot
history.snapshot(editor.getValue());

// Wire undo/redo
editor.addCommand(/* Ctrl+Z */, () => {
  const content = history.undo();
  if (content) {
    // Prevent this setValue from creating a snapshot
    history.beginBatch();
    editor.getModel()?.setValue(content);
    history.endBatch(content);
    
    // Re-render 3D view
    reparse();
  }
});

// Wire history browser navigation
historyBrowser.onNavigate((nodeId) => {
  const content = history.navigateTo(nodeId);
  editor.getModel()?.setValue(content);
  reparse();
});
```

## Open Questions

1. ~~Should cursor position be restored on undo?~~ **Decision: Optionally restore, configurable**
2. ~~How long to keep archived branches?~~ **Decision: Until pruned by max node limit**
3. Should we show diff preview on hover? **Deferred to future enhancement**

