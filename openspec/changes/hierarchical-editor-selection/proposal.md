# Hierarchical Editor Selection

## Status: Draft

## Why

Currently, the interactive editor treats each entity (floor, room, wall, door) as an independent selectable item. When a user clicks on a room definition in the Monaco editor, only that specific entity is selected in the 3D view. This makes it difficult to:

1. **Quickly select related elements** - If you want to modify all walls of a room, you must click each wall individually
2. **Navigate hierarchies** - No visual feedback showing the parent-child relationship between floors, rooms, and walls
3. **Bulk operations** - Cannot easily select "everything in this room" or "all rooms on this floor"

Users expect intuitive hierarchical selection similar to file explorers or design tools:
- Click a folder → selects all files inside
- Click a group in Figma → selects all elements in the group

## What Changes

### 1. DSL Hierarchy Understanding

The editor will understand the DSL structure hierarchy:
```
floor (id)
  └── room (name)
        ├── walls: top, right, bottom, left
        ├── doors/windows (on walls)
        └── style reference
```

### 2. Selection Behavior Based on Cursor Position

| Cursor Position | Selection Behavior |
|-----------------|-------------------|
| On `floor` keyword or floor ID | Select all rooms and their walls on that floor |
| On `room` keyword or room name | Select the room floor mesh + all 4 walls |
| On `walls:` section or specific wall directive | Select just that wall |
| On door/window in wall | Select just that door/window |

### 3. Multi-Cursor Support

- Multiple cursors → union of all hierarchical selections
- Shift+click in 3D → add to selection (existing behavior preserved)
- Ctrl+click in 3D → toggle selection (existing behavior preserved)

### 4. Visual Feedback

- **Primary selection**: Full highlight (existing green outline)
- **Hierarchical children**: Dimmed/secondary highlight to show relationship
- **Editor decorations**: Show hierarchy breadcrumb when wall is selected (e.g., "Kitchen > top wall")

## Impact

### Files to Modify

1. **`interactive-editor/src/editor-viewer-sync.ts`**
   - Add hierarchy-aware entity lookup
   - Modify `findEntityAtPosition()` to return hierarchy context
   - Add `expandToHierarchy()` method

2. **`interactive-editor/src/main.ts`**
   - Update `onEditorSelect` callback to handle hierarchical expansion
   - Add logic to select parent + children based on entity type

3. **`viewer-core/src/selection-manager.ts`**
   - Add `selectMultiple(entities[], additive)` method for batch selection
   - Add secondary highlight style for hierarchical children

4. **`interactive-editor/src/dsl-generator.ts`** (possibly)
   - Expose helper to find all children of an entity

### Migration

- **Non-breaking**: Existing single-entity selection still works
- **Progressive enhancement**: Hierarchical selection is additive behavior
- **Config option**: Could add `hierarchicalSelection: boolean` flag if users prefer old behavior

### Testing

- Unit tests for hierarchy expansion logic
- Integration tests for cursor position → selection mapping
- E2E tests for multi-cursor hierarchical selection

## Alternatives Considered

1. **Double-click for hierarchy expansion**: Requires extra user action, less intuitive
2. **Context menu "Select Children"**: Hidden discoverability, slower workflow
3. **Modifier key (Alt+click)**: Additional cognitive load, not standard UX pattern

## Open Questions

1. Should selecting a floor also select stairs/lifts on that floor?
2. What about connections that span multiple rooms?
3. Should there be a keyboard shortcut to "expand selection to parent" or "contract to single entity"?
