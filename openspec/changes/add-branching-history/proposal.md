# Proposal: Add Branching History System

## Why

The interactive editor currently relies on Monaco's built-in undo/redo, which:
- Uses a linear stack (cannot recover divergent branches)
- Loses history when using `setValue()` for DSL regeneration
- Doesn't group related edits (e.g., bulk style changes)
- Provides no visualization of edit history

Users editing floorplans need robust undo/redo that supports experimentation:
- "Undo the last 5 changes but keep the style change I made 3 steps ago"
- "Compare this design with how it looked 10 edits ago"
- "Go back to a previous state and try a different approach without losing my work"

## What Changes

### Core Features

1. **BranchingHistory Class**
   - Tree-based history structure (not linear stack)
   - Full DSL text snapshots at each node
   - Metadata: timestamp, selection state, scroll position
   - Navigate to any node in the tree

2. **Keyboard Integration**
   - Ctrl/Cmd+Z: Navigate to parent node (undo)
   - Ctrl/Cmd+Shift+Z / Ctrl+Y: Navigate to most recent child (redo)
   - Edit after undo creates new branch (preserves old branch)

3. **History Browser UI**
   - Visual tree/graph of all history nodes
   - Current node highlighted
   - Click to navigate to any state
   - Timestamp and staleness indicators on archived branches

4. **Bulk Edit Grouping**
   - Multiple related edits grouped as single snapshot
   - E.g., changing style on 5 rooms = 1 undo step

### Non-Goals (This Phase)

- Diff view between states
- Named bookmarks/labels for states
- History persistence across sessions
- Collaborative history merging

## Impact

### Affected Specs

| Spec | Impact |
|------|--------|
| `interactive-editor` | Implements branching history requirement |

### Affected Code

| Package | Changes |
|---------|---------|
| `interactive-editor/` | New: `branching-history.ts`, `history-browser.ts` |
| `interactive-editor/index.html` | Add history browser UI panel |

### Dependencies

No new external dependencies. Uses Monaco editor's `getValue()`/`setValue()` for snapshots.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Memory usage with many snapshots | Medium | Medium | Configurable max depth, prune old leaves |
| Performance of large histories | Low | Low | Lazy rendering in history browser |
| Confusion with Monaco's native undo | Medium | Medium | Disable Monaco undo, clear documentation |

## Timeline Estimate

- **BranchingHistory Class**: 1 week
- **Keyboard Integration**: 0.5 weeks
- **History Browser UI**: 1 week
- **Testing & Polish**: 0.5 weeks
- **Total**: 3 weeks

## Related Work

- Git's branching model (inspiration)
- VS Code's timeline view
- Figma's version history
- Existing editor: `interactive-editor/src/dsl-editor.ts`

