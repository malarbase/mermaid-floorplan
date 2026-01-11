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
- [ ] 8.4 Verify behavioral parity between old and new implementations (Phase 2)
- [ ] 8.5 Remove deprecated code after migration verified (Phase 3)

## Dependencies

- Task 2.x depends on Task 1.x completion
- Task 3.x can run in parallel with Task 2.x
- Task 4.x depends on Task 1.1-1.3 (header bar, file dropdown, command palette)
- Task 5.x depends on Task 1.4 (drag-drop handler)
- Task 6.x and 7.x depend on Tasks 2-5 completion
- Task 8.x is final validation
