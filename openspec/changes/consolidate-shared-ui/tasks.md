# Tasks: Consolidate Shared UI Components

## Phase 1: Quick Wins (Class Name Alignment)

- [x] 1.1 Update `floor-item` to `fp-floor-item` in `interactive-editor/src/main.ts`
- [ ] 1.2 Audit all dynamic class assignments in `interactive-editor/src/main.ts`
- [ ] 1.3 Update any remaining non-prefixed class names to use `fp-*` prefix
- [ ] 1.4 Verify floor item theme styling works in interactive-editor

## Phase 2: CSS Migration - Control Panel

- [ ] 2.1 Move control panel section styles (`.fp-section-header`, `.fp-section-content`) to `viewer-core`
- [ ] 2.2 Move button styles (`.fp-btn`, `.fp-btn-primary`, `.fp-btn-secondary`) to `viewer-core`
- [ ] 2.3 Move slider styles (`.fp-slider-row`) to `viewer-core`
- [ ] 2.4 Move checkbox styles (`.fp-checkbox-row`) to `viewer-core`
- [ ] 2.5 Update `interactive-editor/index.html` to remove migrated styles
- [ ] 2.6 Test control panel in both viewer and interactive-editor

## Phase 3: CSS Migration - Overlay Panels

- [ ] 3.1 Consolidate 2D overlay styles (`#overlay-2d` → `.fp-overlay-2d`)
- [ ] 3.2 Consolidate floor summary styles (`#floor-summary` → `.fp-floor-summary-panel`)
- [ ] 3.3 Consolidate properties panel styles (`.properties-panel` → `.fp-properties-panel`)
- [ ] 3.4 Update HTML in `interactive-editor/index.html` to use new class names
- [ ] 3.5 Test overlay panels in both apps

## Phase 4: CSS Migration - Dialogs

- [ ] 4.1 Move dialog overlay styles (`.dialog-overlay`) to `viewer-core`
- [ ] 4.2 Move confirm dialog styles (`.confirm-dialog`) to `viewer-core`
- [ ] 4.3 Move add room dialog styles to `viewer-core`
- [ ] 4.4 Move delete confirmation dialog styles to `viewer-core`
- [ ] 4.5 Update `interactive-editor/index.html` to remove migrated styles

## Phase 5: Shared UI Builder Functions

- [ ] 5.1 Create `createFloorListUI()` in `viewer-core/src/ui/floor-list-ui.ts`
- [ ] 5.2 Create `createDialogUI()` base component in `viewer-core`
- [ ] 5.3 Create `createPropertiesPanelUI()` in `viewer-core`
- [ ] 5.4 Update `interactive-editor` to use shared UI functions
- [ ] 5.5 Export new UI functions from `viewer-core/src/ui/index.ts`

## Phase 6: Cleanup and Validation

- [ ] 6.1 Remove remaining duplicated CSS from `interactive-editor/index.html`
- [ ] 6.2 Run visual regression tests on both apps
- [ ] 6.3 Verify theme switching works consistently
- [ ] 6.4 Update documentation to reflect new architecture
- [ ] 6.5 Add integration tests for shared components

## Dependencies

- Phase 2-4 depend on Phase 1 (class name alignment)
- Phase 5 can proceed in parallel with Phase 2-4
- Phase 6 requires all other phases to be complete
