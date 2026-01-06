# Branching History - Implementation Tasks

## Overview

This document tracks implementation tasks for the branching history system with time-travel undo/redo.

---

## Phase 1: BranchingHistory Class

### 1.1 Core Data Structures
- [ ] 1.1.1 Create `interactive-editor/src/branching-history.ts`
- [ ] 1.1.2 Define `HistoryNode` interface:
  - `id: string` (unique node identifier, e.g., UUID)
  - `content: string` (full DSL text snapshot)
  - `timestamp: Date`
  - `parent: string | null` (parent node id)
  - `children: string[]` (child branch ids)
  - `metadata: { selection, scrollPosition, label? }`
- [ ] 1.1.3 Define `BranchingHistory` class with node map
- [ ] 1.1.4 Implement `rootNode` and `currentNode` tracking

### 1.2 Snapshot Operations
- [ ] 1.2.1 Implement `snapshot(content: string, metadata?)` method
  - Create new node with current content
  - Link to current node as parent
  - Update current node's children array
  - Set new node as current
- [ ] 1.2.2 Implement `getCurrentContent()` method
- [ ] 1.2.3 Implement `getNodeContent(nodeId)` method
- [ ] 1.2.4 Test: Create 5 snapshots, verify tree structure

### 1.3 Navigation Operations
- [ ] 1.3.1 Implement `navigateTo(nodeId)` method
  - Update current node pointer
  - Return node content for restoration
- [ ] 1.3.2 Implement `undo()` method
  - Navigate to parent node
  - Return null if at root
- [ ] 1.3.3 Implement `redo()` method
  - Navigate to most recent child
  - Return null if no children
- [ ] 1.3.4 Test: Navigate back 3 steps, forward 2 steps

### 1.4 Branch Creation
- [ ] 1.4.1 Implement branch detection in `snapshot()`
  - If current node already has children, new snapshot creates sibling branch
- [ ] 1.4.2 Track branch creation timestamps
- [ ] 1.4.3 Test: Undo 2 steps, make new edit, verify new branch created
- [ ] 1.4.4 Test: Original branch preserved with original timestamps

### 1.5 Deliverables
- [ ] BranchingHistory class with tree structure
- [ ] Snapshot, navigate, undo, redo operations
- [ ] Branch creation on edit-after-undo

---

## Phase 2: Keyboard Integration

### 2.1 Override Monaco Undo
- [ ] 2.1.1 Disable Monaco's built-in undo/redo actions
- [ ] 2.1.2 Wire Ctrl/Cmd+Z to `history.undo()`
- [ ] 2.1.3 Wire Ctrl/Cmd+Shift+Z and Ctrl+Y to `history.redo()`
- [ ] 2.1.4 Restore content via `editor.getModel().setValue()`

### 2.2 Snapshot Triggers
- [ ] 2.2.1 Create snapshot on significant edits (debounced)
- [ ] 2.2.2 Define "significant edit" (>1 character, after 500ms pause)
- [ ] 2.2.3 Create snapshot on CRUD operations (add room, delete, etc.)
- [ ] 2.2.4 Test: Type quickly, verify single snapshot created after pause

### 2.3 Selection Preservation
- [ ] 2.3.1 Store cursor position in snapshot metadata
- [ ] 2.3.2 Store scroll position in snapshot metadata
- [ ] 2.3.3 Optionally restore selection on navigate (configurable)
- [ ] 2.3.4 Test: Undo restores reasonable cursor position

### 2.4 Deliverables
- [ ] Ctrl+Z/Ctrl+Shift+Z work with branching history
- [ ] Monaco's native undo disabled
- [ ] Snapshots created at appropriate times

---

## Phase 3: Bulk Edit Grouping

### 3.1 Edit Batching
- [ ] 3.1.1 Implement `beginBatch()` / `endBatch()` API
- [ ] 3.1.2 Batch all edits between begin/end as single snapshot
- [ ] 3.1.3 Wire bulk operations to use batching:
  - Multi-room style change
  - Multi-room delete
  - Add room with auto-connections
- [ ] 3.1.4 Test: Change style on 5 rooms, undo reverts all 5

### 3.2 Automatic Batching
- [ ] 3.2.1 Auto-batch rapid sequential edits (< 100ms apart)
- [ ] 3.2.2 Configurable batch timeout
- [ ] 3.2.3 Test: Quick property changes batch together

### 3.3 Deliverables
- [ ] Bulk edits treated as single undo step
- [ ] Rapid edits auto-batched

---

## Phase 4: History Browser UI

### 4.1 UI Component
- [ ] 4.1.1 Create `interactive-editor/src/history-browser.ts`
- [ ] 4.1.2 Add history browser panel to `index.html` (collapsible sidebar or modal)
- [ ] 4.1.3 Style history browser to match editor theme

### 4.2 Tree Visualization
- [ ] 4.2.1 Render history as vertical tree/graph
- [ ] 4.2.2 Highlight current node
- [ ] 4.2.3 Show branch points clearly
- [ ] 4.2.4 Display relative timestamps ("2 mins ago", "1 hour ago")

### 4.3 Node Interaction
- [ ] 4.3.1 Click node to navigate to that state
- [ ] 4.3.2 Hover shows timestamp and preview (optional)
- [ ] 4.3.3 Visual indication of "stale" branches (not recently used)
- [ ] 4.3.4 Keyboard navigation in history browser (arrow keys)

### 4.4 State Indicators
- [ ] 4.4.1 Show "current" badge on active node
- [ ] 4.4.2 Show branch age/staleness with color coding
- [ ] 4.4.3 Show node count per branch
- [ ] 4.4.4 Collapse/expand branches

### 4.5 Deliverables
- [ ] Visual history browser
- [ ] Click-to-navigate functionality
- [ ] Clear indication of current state and branches

---

## Phase 5: Memory Management

### 5.1 History Limits
- [ ] 5.1.1 Implement configurable max history depth
- [ ] 5.1.2 Implement oldest-leaf-first pruning strategy
- [ ] 5.1.3 Never prune nodes on path to current
- [ ] 5.1.4 Test: Create 100 snapshots with limit of 50, verify pruning

### 5.2 Performance
- [ ] 5.2.1 Lazy-load node content in history browser
- [ ] 5.2.2 Virtualize long node lists
- [ ] 5.2.3 Test: 500 history nodes, verify UI remains responsive

### 5.3 Deliverables
- [ ] Memory usage bounded
- [ ] History browser performant with large histories

---

## Phase 6: Testing & Documentation

### 6.1 Integration Testing
- [ ] 6.1.1 Test: Undo single property edit
- [ ] 6.1.2 Test: Undo bulk edit reverts all changes at once
- [ ] 6.1.3 Test: Redo after undo works correctly
- [ ] 6.1.4 Test: Edit after undo creates new branch (old branch preserved)
- [ ] 6.1.5 Test: Navigate to archived branch via history browser
- [ ] 6.1.6 Test: History survives DSL parse errors

### 6.2 Documentation
- [ ] 6.2.1 Update keyboard shortcuts in help overlay
- [ ] 6.2.2 Add history browser usage instructions
- [ ] 6.2.3 Document branching model in README

### 6.3 Deliverables
- [ ] All test scenarios passing
- [ ] Documentation complete

---

## Implementation Checkpoints

### Checkpoint A: Core History Working
- [ ] BranchingHistory class implemented
- [ ] Snapshot/navigate/undo/redo working
- [ ] Branch creation working

### Checkpoint B: Keyboard Working
- [ ] Ctrl+Z/Y work with branching history
- [ ] Monaco native undo disabled
- [ ] Snapshots created appropriately

### Checkpoint C: UI Complete
- [ ] History browser renders tree
- [ ] Click navigation works
- [ ] Staleness indicators visible

### Checkpoint D: Ready for Release
- [ ] All tests passing
- [ ] Memory bounded
- [ ] Documentation complete

