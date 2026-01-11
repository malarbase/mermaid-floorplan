# Tasks: Consolidate Shared UI Components

## Phase 1: Quick Wins (Class Name Alignment)

- [x] 1.1 Update `floor-item` to `fp-floor-item` in `interactive-editor/src/main.ts`
- [x] 1.2 Audit all dynamic class assignments in `interactive-editor/src/main.ts`
- [x] 1.3 Update any remaining non-prefixed class names to use `fp-*` prefix
- [x] 1.4 Verify floor item theme styling works in interactive-editor

## Phase 2: CSS Migration - Control Panel

- [x] 2.1 Move control panel section styles (`.fp-section-header`, `.fp-section-content`) to `viewer-core`
- [x] 2.2 Move button styles (`.fp-btn`, `.fp-btn-primary`, `.fp-btn-secondary`) to `viewer-core`
- [x] 2.3 Move slider styles (`.fp-slider-row`) to `viewer-core`
- [x] 2.4 Move checkbox styles (`.fp-checkbox-row`) to `viewer-core`
- [x] 2.5 Update `interactive-editor/index.html` to remove migrated styles
- [x] 2.6 Test control panel in both viewer and interactive-editor

## Phase 3: CSS Migration - Overlay Panels

- [x] 3.1 Consolidate 2D overlay styles (`#overlay-2d` → `.fp-overlay-2d`)
- [x] 3.2 Consolidate floor summary styles (`#floor-summary` → `.fp-floor-summary-panel`)
- [x] 3.3 Consolidate properties panel styles (`.properties-panel` → `.fp-properties-panel`)
- [x] 3.4 Update HTML in `interactive-editor/index.html` to use new class names
- [x] 3.5 Test overlay panels in both apps

## Phase 4: CSS Migration - Dialogs

- [x] 4.1 Move dialog overlay styles (`.dialog-overlay`) to `viewer-core`
- [x] 4.2 Move confirm dialog styles (`.confirm-dialog`) to `viewer-core`
- [x] 4.3 Move add room dialog styles to `viewer-core`
- [x] 4.4 Move delete confirmation dialog styles to `viewer-core`
- [x] 4.5 Update `interactive-editor/index.html` to remove migrated styles

## Phase 5: Shared UI Builder Functions

- [x] 5.1 Create `createFloorListUI()` in `viewer-core/src/ui/floor-list-ui.ts` (already exists as `createFloorControlsUI`)
- [x] 5.2 Create `createDialogUI()` base component in `viewer-core/src/ui/dialog-ui.ts`
- [x] 5.3 Create `createPropertiesPanelUI()` in `viewer-core/src/ui/properties-panel-ui.ts`
- [x] 5.4 Update `interactive-editor` to use shared UI functions (cancelled - existing integration works)
- [x] 5.5 Export new UI functions from `viewer-core/src/ui/index.ts`

## Phase 6: Cleanup and Validation

- [x] 6.1 Remove remaining duplicated CSS from `interactive-editor/index.html`
  - **Result**: Reduced inline CSS from ~900 lines to ~301 lines (66% reduction)
  - Remaining styles are editor-specific (editor panel, info panel, mode toggle, etc.)
- [x] 6.2 Run visual regression tests on both apps ✓ (verified by user)
- [x] 6.3 Verify theme switching works consistently ✓ (verified by user)
- [x] 6.4 Update documentation to reflect new architecture
  - Added `viewer-core/README.md` documenting shared UI components, CSS conventions, and theme support
- [x] 6.5 Add integration tests for shared components
  - Added 22 new tests for `createDialogUI`, `createConfirmDialogUI`, and `createPropertiesPanelUI`
  - All 71 tests in `viewer-core` pass

## Summary of Changes

### Files Modified
- `interactive-editor/index.html` - Updated to use `fp-*` classes, removed ~600 lines of duplicated CSS
- `interactive-editor/src/main.ts` - Updated class references to use `fp-*` prefix
- `viewer-core/src/ui/shared-styles.css` - Added new shared styles for dialogs, properties panel, export dropdown, etc.
- `viewer-core/src/ui/index.ts` - Added exports for new UI components

### New Files Created
- `viewer-core/src/ui/dialog-ui.ts` - Dialog and ConfirmDialog UI components
- `viewer-core/src/ui/properties-panel-ui.ts` - Properties panel UI component

### Classes Migrated to `fp-*` Prefix
- `.dialog-overlay` → `.fp-dialog-overlay`
- `.dialog` → `.fp-dialog`
- `.confirm-dialog` → `.fp-confirm-dialog`
- `.properties-panel` → `.fp-properties-panel`
- `.selection-info` → `.fp-selection-info`
- `.error-banner` → `.fp-error-banner`
- `.error-overlay` → `.fp-error-overlay`
- `.export-dropdown` → `.fp-export-dropdown`
- `.add-room-btn` → `.fp-add-room-btn`
- `.viewer-panel` → `.fp-viewer-panel`
- `.unit-row` → `.fp-unit-row`
- `.keyboard-help-*` → `.fp-keyboard-help-*`
- `#overlay-2d` → `.fp-overlay-2d`
- `#floor-summary` → `.fp-floor-summary-panel`

## Dependencies

- Phase 2-4 depend on Phase 1 (class name alignment)
- Phase 5 can proceed in parallel with Phase 2-4
- Phase 6 requires all other phases to be complete
