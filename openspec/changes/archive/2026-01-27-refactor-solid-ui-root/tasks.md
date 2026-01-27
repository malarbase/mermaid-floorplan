# Tasks: Solid.js UI Root Refactor

## 1. Create FloorplanAppCore (3D-only)

- [x] 1.1 Extract 3D-related code from FloorplanApp into FloorplanAppCore class
- [x] 1.2 Define public API for UI to call: `loadFloorplan()`, `handleFileAction()`, `toggleEditorPanel()`, etc.
- [x] 1.3 Define event emitter interface for state changes: `onFloorplanLoaded`, `onThemeChange`, `onAuthChange`
- [x] 1.4 Remove UI orchestration code (header, dropdown, command palette setup)
- [x] 1.5 Keep LayoutManager integration for viewport adjustments

## 2. Create FloorplanUI Solid Root Component

- [x] 2.1 Create `floorplan-viewer-core/src/ui/solid/FloorplanUI.tsx`
- [x] 2.2 Define shared state signals: `dropdownOpen`, `headerVisible`, `editorOpen`, `currentTheme`, `isAuthenticated`
- [x] 2.3 Create props interface for FloorplanAppCore reference
- [x] 2.4 Implement mount/unmount lifecycle with `render()` from solid-js/web
- [x] 2.5 Export vanilla-compatible factory: `createFloorplanUI(container, appCore)`

## 3. Refactor HeaderBar to Pure Solid

- [x] 3.1 Update HeaderBar.tsx to receive reactive props (no imperative wrapper)
- [x] 3.2 Implement auto-hide via `createEffect` observing `dropdownOpen` signal
- [x] 3.3 Handle hover zone with Solid event handlers
- [x] 3.4 Mark HeaderBarWrapper.tsx as deprecated ✓ Added @deprecated notice
- [x] 3.5 Test: hover zone triggers visibility ✓ Verified manually
- [x] 3.6 Test: auto-hide respects dropdown open state ✓ Fixed mouseInHeader tracking
- [x] 3.7 Test: body class updates reactively ✓ Verified manually

## 4. Refactor FileDropdown to Pure Solid

- [x] 4.1 Update FileDropdown.tsx to receive reactive props
- [x] 4.2 Implement visibility via parent signal (not internal state)
- [x] 4.3 Handle click-outside and escape via Solid event system
- [x] 4.4 Mark FileDropdownWrapper.tsx as deprecated ✓ Added @deprecated notice
- [x] 4.5 Test: dropdown opens/closes via signal ✓ Verified manually
- [x] 4.6 Test: click-outside closes dropdown ✓ Verified manually
- [x] 4.7 Test: escape key closes dropdown ✓ Verified manually
- [x] 4.8 Test: header stays visible while dropdown open (reactive coordination) ✓ Verified manually

## 5. Refactor CommandPalette to Pure Solid

- [x] 5.1 Update CommandPalette.tsx to receive reactive props
- [x] 5.2 Implement visibility via parent signal
- [x] 5.3 Mark CommandPaletteWrapper.tsx as deprecated ✓ Added @deprecated notice
- [x] 5.4 Test: Cmd+K triggers visibility signal ✓ Verified manually
- [x] 5.5 Test: command execution callbacks work ✓ Verified manually

## 6. Integration and Testing

- [x] 6.1 Update `viewer/src/main.ts` to use FloorplanAppCore + FloorplanUI ✓ Migrated from FloorplanApp
- [x] 6.2 Update `interactive-editor/src/editor-app.ts` if applicable - Not needed, both patterns coexist
- [x] 6.3 Test: Full application flow (load floorplan, interact with UI, 3D renders) ✓ Verified manually
- [x] 6.4 Test: HeaderBar/FileDropdown coordination (auto-hide while dropdown open) ✓ Verified manually
- [x] 6.5 Test: Theme toggle updates both UI and 3D scene ✓ Verified manually
- [x] 6.6 Run full build: `npm run build:all` ✓ Passed
- [x] 6.7 Run tests: `npm run test` ✓ viewer-core tests pass (83/83)

## 7. Cleanup

- [x] 7.1 Mark wrapper files (*Wrapper.tsx) as deprecated ✓ Kept for backwards compatibility with FloorplanApp
- [x] 7.2 Update exports in `ui/solid/index.ts`
- [x] 7.3 Update CLAUDE.md hybrid pattern documentation
- [x] 7.4 Mark vanilla UI files (header-bar.ts, file-dropdown.ts, command-palette.ts) as deprecated ✓ Added @deprecated notices pointing to FloorplanUI

## Migrated from add-solidjs-ui-framework

The following tasks were migrated from the previous change and reimplemented with the new architecture:

- ~~9.6 Fix Solid HeaderBar to match vanilla behavior~~ → Tasks 3.1-3.7
- ~~9.8 Integrate and test HeaderBar~~ → Tasks 3.5-3.7, 6.4
- ~~9.9 Integrate and test FileDropdown~~ → Tasks 4.5-4.8, 6.4
- ~~9.10 Run full build and tests~~ → Tasks 6.6-6.7

## Implementation Notes

### Architecture Overview

The refactor creates a clean separation:

```
FloorplanAppCore (3D-only)
├── BaseViewer (Three.js scene, camera, renderer, controls)
├── SelectionManager
├── Overlay2DManager
├── LayoutManager
├── Event emitter for UI subscription
└── Public API: loadFromDsl(), handleFileAction(), toggleEditorPanel(), etc.

FloorplanUI (Solid root)
├── HeaderBarInternal (pure Solid, no wrapper)
├── FileDropdownInternal (pure Solid, no wrapper)
├── CommandPaletteInternal (pure Solid, no wrapper)
├── Shared state signals (dropdownOpen, headerVisible, etc.)
└── Subscribes to appCore events for reactive updates
```

### Key Benefits

1. **Reactive state coordination** - HeaderBar stays visible while dropdown is open via shared `dropdownOpen` signal
2. **No wrapper boilerplate** - Components rendered directly without imperative APIs
3. **Clean separation** - Three.js code completely isolated from UI framework
4. **Testable UI** - Solid components can be tested without Three.js
5. **Event-driven** - UI subscribes to appCore events instead of polling

### Files Created

- `floorplan-viewer-core/src/floorplan-app-core.ts` - 3D-only class
- `floorplan-viewer-core/src/ui/solid/FloorplanUI.tsx` - Solid UI root

### Exports Added

- `FloorplanAppCore` - 3D-only application class
- `createFloorplanUI()` - Vanilla-compatible factory for Solid UI
- `FloorplanUI` - Direct Solid component export
- `createUIState()` - Helper for creating shared signals
