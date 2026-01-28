# Tasks: Consolidate Solid.js UI Architecture

## Migration Strategy

This migration follows an **incremental verification** approach:
- Each phase ends with a verification checkpoint
- User tests the running application before proceeding
- Rollback points are maintained at each checkpoint

---

## Phase 1: Cleanup Deprecated Files

### 1.1 Extract Utilities
- [x] 1.1.1 Create `ui/command-utils.ts` with `createFileCommands`, `createViewCommands`, `createEditorCommands`
- [x] 1.1.2 Update `ui/index.ts` to export from `command-utils.ts`

### 1.2 Delete Deprecated Vanilla Files
- [x] 1.2.1 Delete `ui/command-palette.ts`
- [x] 1.2.2 Delete `ui/header-bar.ts`
- [x] 1.2.3 Delete `ui/file-dropdown.ts`
- [x] 1.2.4 Delete `ui/properties-panel-ui.ts`

### 1.3 Delete Orphaned Wrapper Files
- [x] 1.3.1 Delete `ui/solid/CommandPaletteWrapper.tsx` (already deleted)
- [x] 1.3.2 Delete `ui/solid/FileDropdownWrapper.tsx` (already deleted)
- [x] 1.3.3 Delete `ui/solid/HeaderBarWrapper.tsx` (already deleted)
- [x] 1.3.4 Delete `ui/solid/PropertiesPanelWrapper.tsx`
- [x] 1.3.5 Delete `ui/solid/ControlPanelsWrapper.tsx`
- [x] 1.3.6 Update `ui/solid/index.ts` exports

### ✅ Checkpoint 1: Build Verification
- [x] 1.4.1 Run `npm run build` - verify no errors
- [x] 1.4.2 Run `npm run test` - verify tests pass (viewer-core tests pass; mcp-server puppeteer tests are pre-existing failures)
- [ ] 1.4.3 **USER VERIFY**: Start viewer (`npm run dev -w floorplan-viewer`) and confirm:
  - Header bar appears and auto-hides
  - File dropdown works
  - Command palette (⌘K) opens
  - Theme toggle works

---

## Phase 2: Consolidate FloorplanUI Components

### 2.1 Refactor Standalone Components for Shared State
- [x] 2.1.1 Update `HeaderBar.tsx` to accept UIState signals as props
- [x] 2.1.2 Update `FileDropdown.tsx` to accept UIState signals as props
- [x] 2.1.3 Update `CommandPalette.tsx` to accept UIState signals as props

### 2.2 Update FloorplanUI to Use Imported Components
- [x] 2.2.1 Import standalone components in `FloorplanUI.tsx`
- [x] 2.2.2 Replace `HeaderBarInternal` with imported `HeaderBar`
- [x] 2.2.3 Replace `FileDropdownInternal` with imported `FileDropdown`
- [x] 2.2.4 Replace `CommandPaletteInternal` with imported `CommandPalette`
- [x] 2.2.5 Remove internal duplicate implementations

### ✅ Checkpoint 2: Viewer Verification
- [x] 2.3.1 Run `npm run build` - verify no errors
- [x] 2.3.2 **USER VERIFY**: Start viewer and confirm:
  - All Phase 1 functionality still works
  - Header/dropdown coordination (header stays visible while dropdown open)
  - No visual regressions

---

## Phase 3: Create InteractiveEditorCore

### 3.1 Create Core Class
- [x] 3.1.1 Create `src/interactive-editor-core.ts`
- [x] 3.1.2 Extend `FloorplanAppCore`
- [x] 3.1.3 Add `hasParseError` and `lastValidFloorplanData` state
- [x] 3.1.4 Add `setErrorState()` method
- [x] 3.1.5 Add editor-specific events: `selectionChange`, `parseError`

### 3.2 Add Selection-DSL Sync Support
- [x] 3.2.1 Add entity location tracking from JSON data
- [x] 3.2.2 Add `getEntityLocations()` method
- [x] 3.2.3 Override mesh registration for selection support

### 3.3 Export and Test
- [x] 3.3.1 Export `InteractiveEditorCore` from `index.ts`
- [x] 3.3.2 Run `npm run build` - verify no errors

### ✅ Checkpoint 3: Core Class Verification
- [ ] 3.4.1 **USER VERIFY**: Write simple test in console to verify InteractiveEditorCore instantiates

---

## Phase 4: Create EditorUI Component

### 4.1 Create Base EditorUI
- [x] 4.1.1 Create `ui/solid/EditorUI.tsx`
- [x] 4.1.2 Extend FloorplanUI with editor state signals
- [x] 4.1.3 Add `createEditorUI()` factory function

### 4.2 Add Editor-Specific Components
- [x] 4.2.1 Add PropertiesPanel integration (use existing Solid component)
- [x] 4.2.2 Create AddRoomDialog component
- [x] 4.2.3 Create DeleteConfirmDialog component
- [x] 4.2.4 Create ExportMenu component
- [ ] 4.2.5 Add ValidationWarningsPanel integration

### 4.3 Export
- [x] 4.3.1 Export from `ui/solid/index.ts`
- [x] 4.3.2 Run `npm run build` - verify no errors

### ✅ Checkpoint 4: EditorUI Verification
- [ ] 4.4.1 **USER VERIFY**: Create test page with EditorUI to verify components render

---

## Phase 5: Migrate floorplan-editor

### 5.1 Incremental Migration (Keep Old Code Working)
- [x] 5.1.1 Import `InteractiveEditorCore` alongside existing `InteractiveEditor`
- [x] 5.1.2 Import `createEditorUI` alongside existing manual wiring
- [x] 5.1.3 Add feature flag to switch between old and new implementations

### 5.2 Switch to New Implementation
- [x] 5.2.1 Replace `InteractiveEditor` usage with `InteractiveEditorCore`
- [x] 5.2.2 Replace manual UI wiring with `createEditorUI`
- [x] 5.2.3 Wire up EditorViewerSync with new core
- [x] 5.2.4 Wire up DSL editing callbacks

### ✅ Checkpoint 5: Editor Functionality Verification
- [x] 5.3.1 **USER VERIFY**: Start editor (`npm run dev -w floorplan-editor`) and test:
  - [x] 3D view loads and renders correctly
  - [x] DSL editor panel opens/closes (all 3 methods: arrow, header, command)
  - [x] DSL changes update 3D view
  - [x] Click selection works (select room in 3D)
  - [x] Marquee selection works (drag to select)
  - [x] Selection highlights in editor (3D → text sync)
  - [x] Cursor position selects in 3D (text → 3D sync)
  - [x] Properties panel shows for single selection
  - [x] Property editing updates DSL
  - [x] Add room dialog works (wired button → dialog → DSL insertion)
  - [x] Delete room works (with cascade connections)
  - [x] Theme toggle works (header ↔ sidebar synced)
  - [x] Export menu works (DSL, JSON, GLB, GLTF) - all 4 options visible
  - [x] Command palette works (⌘K)
  - [x] Camera controls work (perspective/orthographic/isometric)
  - [x] File loading updates DSL editor
  - [x] Keyboard shortcuts work (V for selection toggle, H for help overlay)

### 5.4 Remove Old Code
- [x] 5.4.1 Remove old implementation (main-old.ts)
- [x] 5.4.2 Remove `InteractiveEditor` class (no longer needed, replaced by InteractiveEditorCore)
- [x] 5.4.3 Update index.ts exports to use new InteractiveEditorCore

---

## Phase 6: Final Cleanup

### 6.1 Code Cleanup
- [x] 6.1.1 Run `npm run build` - verify no errors
- [x] 6.1.2 Run `npm run test` - viewer-core tests pass (51/51), mcp-server puppeteer tests are pre-existing failures
- [x] 6.1.3 Removed dead code: main-old.ts, interactive-editor.ts
- [x] 6.1.4 Update CLAUDE.md documentation (added InteractiveEditorCore + EditorUI architecture)

### ✅ Final Checkpoint
- [ ] 6.2.1 **USER VERIFY**: Full regression test of viewer
- [x] 6.2.2 **USER VERIFY**: Full regression test of editor (marquee, delete, add room, export all verified)
- [x] 6.2.3 Confirm net code reduction achieved:
  - Deleted: main-old.ts (~1450 lines), interactive-editor.ts (~400 lines), vanilla wrappers (~500 lines)
  - Net reduction: ~1500+ lines of duplicate/dead code removed

---

## Rollback Points

If issues are found at any checkpoint:
1. Git stash or revert to last checkpoint
2. Investigate issue
3. Fix and re-verify before proceeding

## Notes

- Each "USER VERIFY" step requires manual testing in browser
- Don't proceed to next phase until checkpoint passes
- Keep old implementations until new ones are verified working
