# Proposal: Unify UI with DaisyUI + Tailwind

## Why

The floorplan-editor has ~740 lines of inline CSS in `index.html` with duplicated light/dark theme styles, while floorplan-viewer uses programmatic UI creation with a 3,097-line `shared-styles.css`. This duplication creates maintenance burden and inconsistent styling. Both apps share the same core functionality but cannot be easily reconciled due to divergent HTML/CSS approaches.

Adopting DaisyUI + Tailwind will:
- Eliminate ~700+ lines of theme-aware CSS through `data-theme` automatic theming
- Provide production-tested, accessible components (modals, buttons, dropdowns)
- Enable unification of editor and viewer into a single codebase with feature flags
- Reduce CSS maintenance by using semantic classes (`btn`, `card`, `modal`) instead of custom styles

## What Changes

### Phase 1: DaisyUI Integration
- Add Tailwind CSS + DaisyUI to the build pipeline
- Create a DaisyUI-based component library in `floorplan-viewer-core`
- Migrate `shared-styles.css` components to DaisyUI equivalents
- Update Solid.js components to use DaisyUI classes

### Phase 2: Editor HTML Migration  
- Convert editor's inline HTML to programmatic component creation
- Replace custom dialog/modal CSS with DaisyUI `modal` component
- Replace custom dropdown CSS with DaisyUI `dropdown` component
- Replace custom button styles with DaisyUI `btn` classes
- Migrate properties panel, error banners, and keyboard help overlay

### Phase 3: Unified Codebase
- Merge `createFloorplanUI()` and `createEditorUI()` into unified factory
- Add feature flags: `editable`, `showPropertiesPanel`, `showAddRoomButton`
- Reduce both `index.html` files to ~30-line shells
- **BREAKING**: Remove `shared-styles.css` (replaced by DaisyUI)

## Impact

- **Affected specs**: `3d-viewer`, `interactive-editor`
- **Affected code**:
  - `floorplan-viewer-core/src/ui/shared-styles.css` (deleted)
  - `floorplan-viewer-core/src/ui/solid/*.tsx` (updated to DaisyUI)
  - `floorplan-editor/index.html` (reduced to minimal shell)
  - `floorplan-viewer/index.html` (no change, already minimal)
  - `floorplan-editor/src/main.ts` (use unified UI factory)
  - `floorplan-viewer/src/main.ts` (use unified UI factory)
- **Dependencies added**: `tailwindcss`, `daisyui`, `@tailwindcss/typography`
- **Bundle size**: Slight increase from Tailwind/DaisyUI CSS, offset by removing custom CSS
