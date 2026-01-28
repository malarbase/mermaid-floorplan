# Tasks: Unify UI with DaisyUI + Tailwind

## 1. Setup & Infrastructure

- [x] 1.1 Install Tailwind CSS, DaisyUI, and PostCSS dependencies
- [x] 1.2 Configure `tailwind.config.js` with DaisyUI plugin and theme settings
- [x] 1.3 Configure PostCSS for Vite integration
- [x] 1.4 Create base `styles.css` with Tailwind directives (`@tailwind base/components/utilities`)
- [x] 1.5 Configure DaisyUI themes (light/dark matching current app themes)
- [x] 1.6 Update Vite config to process Tailwind CSS

## 2. Component Migration (shared-styles.css → DaisyUI)

- [x] 2.1 Audit `shared-styles.css` and map each component to DaisyUI equivalent
- [x] 2.2 Migrate `.fp-control-panel` → DaisyUI `card` + `collapse` components
- [x] 2.3 Migrate `.fp-btn` / `.fp-btn-secondary` → DaisyUI `btn` classes
- [x] 2.4 Migrate `.fp-slider` → DaisyUI `range` input
- [x] 2.5 Migrate `.fp-checkbox-row` → DaisyUI `checkbox` / `toggle`
- [x] 2.6 Migrate `.fp-select` → DaisyUI `select`
- [x] 2.7 Migrate `.fp-dialog-*` → DaisyUI `modal` component
- [x] 2.8 Migrate `.fp-confirm-dialog-*` → DaisyUI `modal` with `modal-action`
- [x] 2.9 Migrate `.fp-overlay-2d` → DaisyUI `card` with custom positioning
- [x] 2.10 Migrate `.fp-floor-summary-panel` → DaisyUI `card`
- [x] 2.11 Migrate `.fp-selection-info` → DaisyUI `badge` / `alert`
- [x] 2.12 Migrate `.fp-warnings-panel` → DaisyUI `alert alert-warning`
- [x] 2.13 Migrate `.fp-shortcut-info` → DaisyUI `kbd` component
- [x] 2.14 Migrate `.fp-header-bar` → DaisyUI `navbar`
- [x] 2.15 Migrate `.fp-properties-panel` → DaisyUI `card` with form inputs
- [x] 2.16 Create Tailwind utility classes for layout positioning (CSS variables)

## 3. Solid.js Component Updates

- [x] 3.1 Update `HeaderBar.tsx` to use DaisyUI `navbar` classes (via tailwind-styles.css mapping)
- [x] 3.2 Update `FileDropdown.tsx` to use DaisyUI `dropdown` component (via tailwind-styles.css mapping)
- [x] 3.3 Update `CommandPalette.tsx` to use DaisyUI `modal` + `input` (via tailwind-styles.css mapping)
- [x] 3.4 Update `PropertiesPanel.tsx` to use DaisyUI `card` + form classes (via tailwind-styles.css mapping)
- [x] 3.5 Update `FloorplanUI.tsx` to use `data-theme` for theming
- [x] 3.6 Update `EditorUI.tsx` to use `data-theme` for theming
- [ ] 3.7 Remove `classList` dark-theme conditionals (DaisyUI handles this) - deferred for incremental removal

## 4. Editor HTML Migration

- [ ] 4.1 Extract editor panel HTML into `createEditorPanel()` component factory
- [ ] 4.2 Extract export dropdown into `createExportDropdown()` component
- [ ] 4.3 Extract add room dialog into Solid.js `AddRoomDialog.tsx`
- [ ] 4.4 Extract delete confirm dialog into Solid.js `DeleteConfirmDialog.tsx`
- [ ] 4.5 Extract keyboard help overlay into `createKeyboardHelpOverlay()` (DaisyUI modal)
- [ ] 4.6 Extract error banner/overlay into `createErrorBanner()` component
- [ ] 4.7 Migrate properties panel inline CSS to DaisyUI classes
- [ ] 4.8 Migrate control panel inline CSS to DaisyUI classes
- [ ] 4.9 Reduce `floorplan-editor/index.html` to minimal ~30-line shell

## 5. Unified UI Factory

- [ ] 5.1 Create unified `createFloorplanUI()` with mode options interface
- [ ] 5.2 Add `editable: boolean` flag (false=viewer, true=editor)
- [ ] 5.3 Add `showPropertiesPanel: boolean` flag
- [ ] 5.4 Add `showAddRoomButton: boolean` flag
- [ ] 5.5 Add `showDeleteConfirmDialog: boolean` flag
- [ ] 5.6 Add `showExportMenu: boolean` flag
- [ ] 5.7 Conditionally render editor-only components based on flags
- [ ] 5.8 Update `floorplan-viewer/src/main.ts` to use unified factory
- [ ] 5.9 Update `floorplan-editor/src/main.ts` to use unified factory
- [ ] 5.10 Deprecate separate `createEditorUI()` export

## 6. Cleanup & Testing

- [ ] 6.1 Delete `shared-styles.css` after all migrations complete
- [ ] 6.2 Remove inline `<style>` blocks from editor `index.html`
- [ ] 6.3 Update `injectStyles()` to inject Tailwind CSS instead
- [ ] 6.4 Test light/dark theme switching in both viewer and editor
- [ ] 6.5 Test all control panel interactions
- [ ] 6.6 Test command palette keyboard navigation
- [ ] 6.7 Test add room / delete dialogs in editor
- [ ] 6.8 Test 2D overlay resizing and positioning
- [ ] 6.9 Test responsive behavior on mobile viewports
- [ ] 6.10 Visual regression testing (screenshot comparison)

## 7. Documentation

- [ ] 7.1 Update CLAUDE.md with DaisyUI component patterns
- [ ] 7.2 Update `.cursor/skills/solidjs-daisyui/SKILL.md` with project-specific examples
- [ ] 7.3 Add migration notes to CHANGELOG.md
- [ ] 7.4 Document breaking changes for `shared-styles.css` removal
