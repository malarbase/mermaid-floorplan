## 1. Core Infrastructure

- [x] 1.1 Create `createHeaderBar()` UI builder in `viewer-core/src/ui/header-bar.ts`
- [x] 1.2 Create `createFileDropdown()` component in `viewer-core/src/ui/file-dropdown.ts`
- [x] 1.3 Create `createCommandPalette()` component in `viewer-core/src/ui/command-palette.ts`
- [x] 1.4 Create `initializeDragDrop()` handler in `viewer-core/src/ui/drag-drop.ts`
- [x] 1.5 Add header-bar, dropdown, command-palette, and drag-drop CSS to `shared-styles.css`
- [x] 1.6 Export new UI components from `viewer-core/src/ui/index.ts`

## 2. FloorplanApp Class

- [x] 2.1 Create `FloorplanApp` class in `viewer-core/src/floorplan-app.ts`
- [x] 2.2 Implement feature flag configuration (`enableEditing`, `enableSelection`, `enableChat`)
- [x] 2.3 Implement `onAuthRequired` callback for edit mode gating
- [x] 2.4 Add `requestEditMode()` method for runtime mode switching
- [x] 2.5 Wire toolbar to FloorplanApp file operations

## 3. Editor Panel Refactoring

- [x] 3.1 Create `createEditorPanel()` UI builder in `viewer-core/src/ui/editor-panel.ts`
- [x] 3.2 Implement read-only vs editable mode states
- [x] 3.3 Add "Login to Edit" button for unauthenticated users
- [x] 3.4 Ensure cursor-to-3D sync works in read-only mode

## 4. Import/Export Consolidation

- [x] 4.1 Move export functionality from editor header to file dropdown
- [x] 4.2 Move file input from control panel to file dropdown
- [x] 4.3 Add "Open from URL" option to file dropdown
- [x] 4.4 Add "Open Recent" submenu (localStorage-based)
- [x] 4.5 Register all file operations with command palette
- [x] 4.6 Implement auth gating for Save .floorplan action

## 5. Drag-and-Drop

- [x] 5.1 Implement drag-over visual feedback (border + overlay text)
- [x] 5.2 Handle file drop for `.floorplan` and `.json` files
- [x] 5.3 Show error toast for unsupported file types
- [x] 5.4 Integrate with FloorplanApp file loading

## 6. Migrate Viewer Package (Phase 2)

- [x] 6.1 Update `viewer/src/main.ts` to use `FloorplanApp`
- [x] 6.2 Reduce `viewer/index.html` to minimal shell
- [x] 6.3 Verify all viewer features work (camera, lighting, floors, export)
- [x] 6.4 Verify 2D overlay and annotations work

## 7. Migrate Interactive-Editor Package (Phase 2)

- [x] 7.1 Update `interactive-editor/src/main.ts` - consolidated inline JS to TypeScript module
- [x] 7.2 Reduce `interactive-editor/index.html` to minimal shell - removed inline script
- [x] 7.3 Verify all editor features work (selection, properties, DSL sync) - Fixed: `generateFloorWithPenetrations` override
- [x] 7.4 Verify auth gating callback is invoked correctly

## 8. Testing and Cleanup

- [x] 8.1 Add unit tests for `FloorplanApp` configuration
- [x] 8.2 Add unit tests for toolbar interactions
- [x] 8.3 Add unit tests for drag-drop handler
- [x] 8.4 Verify behavioral parity between old and new implementations - improved with layout manager and UI fixes
- [x] 8.5 Remove deprecated code after migration verified (Phase 3) - verified clean: viewer uses FloorplanApp, minimal index.html, CSS fallbacks kept intentionally for backward compatibility

## 9. Parsing Warnings Integration

- [x] 9.1 Add `onDslParsingWarnings` callback to `FloorplanApp` configuration
- [x] 9.2 Create `createValidationWarningsUI()` component for displaying warnings
- [x] 9.3 Implement click-to-navigate: warnings panel jumps to specific line in DSL editor
- [x] 9.4 Wire warnings panel visibility to layout manager

## 10. Layout Management System

- [x] 10.1 Create `LayoutManager` class in `viewer-core/src/layout-manager.ts`
- [x] 10.2 Implement CSS custom properties for dynamic layout (`--layout-header-offset`, `--layout-editor-width`)
- [x] 10.3 Wire header visibility callbacks (`onVisibilityChange` in `HeaderBar`)
- [x] 10.4 Wire editor panel toggle to layout manager (`setEditorOpen`)
- [x] 10.5 Wire overlay2D and floor summary visibility to layout manager
- [x] 10.6 Fix initial header state when `autoHide` is enabled
- [x] 10.7 Export `getLayoutManager()` singleton from `viewer-core`

## 11. Editor Panel UI Enhancements

- [x] 11.1 Add resize handle to editor panel with drag-to-resize functionality
- [x] 11.2 Fix editor collapse button: vertically centered position (consistent Y in both states)
- [x] 11.3 Fix editor collapse button: correct arrow direction (▶ collapsed, ◀ expanded)
- [x] 11.4 Style collapse button as tab-like shape with rounded corners
- [x] 11.5 Fix editor expand/collapse animation consistency (smooth transitions)
- [x] 11.6 Add `onResize` callback and `setEditorWidth` to layout manager

## 12. Panel Layout Fixes

- [x] 12.1 Move keyboard shortcut info panel to bottom-right (offset from control panel)
- [x] 12.2 Move warnings panel to top-left (aligned with header bar)
- [x] 12.3 Fix panels not repositioning when header auto-hides
- [x] 12.4 Fix panels not repositioning when editor expands/collapses
- [x] 12.5 Fix floor summary panel z-index (appears above 2D minimap)

## 13. Development Experience

- [x] 13.1 Configure Vite aliases for direct source imports (`viewer-core`, `floorplans-language`, etc.)
- [x] 13.2 Add watch configuration for workspace package source directories
- [x] 13.3 Enable hot reload for dependency changes in monorepo
- [x] 13.4 Upgrade Vite to v6.3.5 for improved performance

## 14. Selection and Debugging

- [x] 14.1 Add `enableSelectionDebug` option to interactive editor configuration
- [x] 14.2 Enhance selection manager with detailed debug logging
- [x] 14.3 Fix floor generation to support penetrations (stairs/lifts in 3D view)
- [x] 14.4 Create proposal for hierarchical editor selection feature

## 15. Interactive Editor UI Fixes

- [x] 15.1 Fix properties panel sliding right when editor expands
- [x] 15.2 Fix keyboard help overlay alignment when editor expands/collapses
- [x] 15.3 Fix floor summary stacking above 2D minimap (bottom-left corner)
- [x] 15.4 Update class names to use `fp-*` prefix for shared style consistency
- [x] 15.5 Fix properties panel stacking below validation warnings panel

## Dependencies

- Task 2.x depends on Task 1.x completion
- Task 3.x can run in parallel with Task 2.x
- Task 4.x depends on Task 1.1-1.3 (header bar, file dropdown, command palette)
- Task 5.x depends on Task 1.4 (drag-drop handler)
- Task 6.x and 7.x depend on Tasks 2-5 completion
- Task 8.x is final validation
- Task 9.x depends on Task 2.x (FloorplanApp callbacks)
- Task 10.x can run in parallel with Task 9.x
- Task 11.x depends on Task 3.x (editor panel) and Task 10.x (layout manager)
- Task 12.x depends on Task 10.x (layout manager)
- Task 13.x is independent (build tooling)
- Task 14.x depends on Task 7.x (interactive editor migration)
- Task 15.x depends on Task 7.x (interactive editor migration) and Task 12.x (panel layout)