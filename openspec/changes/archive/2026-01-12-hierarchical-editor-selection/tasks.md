# Hierarchical Editor Selection - Tasks

## Status: In Progress

## 1. Core Infrastructure

- [x] 1.1 Define `EntityHierarchy` interface with parent/children relationships
- [x] 1.2 Add `buildEntityHierarchy()` function to construct hierarchy from JSON
- [x] 1.3 Add `getHierarchyContext()` to determine entity's position in hierarchy

## 2. EditorViewerSync Enhancements

- [x] 2.1 Modify `findEntityAtPosition()` to return hierarchy context
- [x] 2.2 Add `expandToHierarchy(entityKey, hierarchyLevel)` method
- [x] 2.3 Update cursor sync to pass hierarchy-expanded entities
- [x] 2.4 Add breadcrumb decoration (e.g., "Kitchen › top wall")

## 3. SelectionManager Updates

- [x] 3.1 Add `selectMultiple(entities[], options)` for batch selection with hierarchy support
- [x] 3.2 Add secondary highlight style for hierarchical children (dimmed green)
- [x] 3.3 Update selection events to include hierarchy metadata

## 4. Interactive Editor Integration

- [x] 4.1 Update `onEditorSelect` callback to handle hierarchical selection
- [x] 4.2 Update `extractEntityLocations()` to include parent references
- [ ] 4.3 Update selection info UI to show hierarchy breadcrumb
- [x] 4.4 Add config option `hierarchicalSelection: boolean` (via `setHierarchicalSelection()`)

## 5. Testing

- [ ] 5.1 Unit tests for hierarchy building
- [ ] 5.2 Unit tests for entity expansion
- [ ] 5.3 Integration tests for cursor → selection mapping
- [ ] 5.4 Manual E2E testing checklist

## 6. Documentation

- [ ] 6.1 Update keyboard shortcuts help with hierarchy behavior
- [x] 6.2 Add inline comments explaining hierarchy logic
