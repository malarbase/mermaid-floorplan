# Consolidate Solid.js UI Architecture

## Why

The current codebase has **triple implementation** of several UI components:

1. **Vanilla TypeScript** - Original implementations (marked deprecated)
2. **Solid.js Standalone** - Reusable components with wrappers
3. **FloorplanUI Internal** - Duplicated implementations inside FloorplanUI.tsx

This creates:
- Maintenance burden (fixing bugs in 3 places)
- Confusion about which implementation to use
- ~2000 lines of dead/duplicate code
- Inconsistent behavior between implementations

Additionally, the `floorplan-editor` package:
- Uses `InteractiveEditor` which extends `BaseViewer` directly (not `FloorplanAppCore`)
- Has 1400+ lines of imperative UI wiring in `main.ts`
- Doesn't benefit from the new reactive architecture

## What Changes

### 1. Remove Deprecated Vanilla Files

Delete these deprecated vanilla implementations:
- `ui/command-palette.ts` (480 lines)
- `ui/header-bar.ts` (311 lines)  
- `ui/file-dropdown.ts` (266 lines)
- `ui/properties-panel-ui.ts` (195 lines)

Keep utility functions (`createFileCommands`, `createViewCommands`) by moving to a new file.

### 2. Remove Orphaned Wrapper Files

Delete wrapper files that are no longer exported:
- `ui/solid/CommandPaletteWrapper.tsx`
- `ui/solid/FileDropdownWrapper.tsx`
- `ui/solid/HeaderBarWrapper.tsx`
- `ui/solid/PropertiesPanelWrapper.tsx`
- `ui/solid/ControlPanelsWrapper.tsx`

### 3. Consolidate FloorplanUI

Refactor `FloorplanUI.tsx` to import standalone components instead of having internal duplicates:
- Use `HeaderBar` from `./HeaderBar.tsx`
- Use `FileDropdown` from `./FileDropdown.tsx`  
- Use `CommandPalette` from `./CommandPalette.tsx`

The internal implementations (`HeaderBarInternal`, `FileDropdownInternal`, `CommandPaletteInternal`) will be removed.

### 4. Create InteractiveEditorCore

New class that extends `FloorplanAppCore` with editor-specific features:
- Selection → DSL bidirectional sync
- Parse error state management
- Mesh registration for selection support
- Editor-specific events

### 5. Create EditorUI Component

New Solid root component for the editor that extends `FloorplanUI`:
- Properties panel integration
- Add room dialog
- Delete confirmation dialog
- Export menu
- Validation warnings panel
- DSL editor panel state

### 6. Migrate floorplan-editor

Update `floorplan-editor/src/main.ts` to use:
- `InteractiveEditorCore` instead of `InteractiveEditor`
- `createEditorUI()` instead of manual UI wiring

This reduces main.ts from ~1450 lines to ~150 lines.

## Impact

- **Deleted files:** 9 files (~1700 lines removed)
- **Created files:** 2 files (InteractiveEditorCore.ts, EditorUI.tsx)
- **Modified files:** 5 files (FloorplanUI.tsx, index.ts exports, main.ts, etc.)
- **Net reduction:** ~1000 lines of duplicate/dead code

## Benefits

1. **Single source of truth** for each component
2. **Reactive state** throughout (no imperative APIs)
3. **Testable** - Components can be tested in isolation
4. **Maintainable** - Fix once, works everywhere
5. **Consistent** - Same behavior viewer and editor
