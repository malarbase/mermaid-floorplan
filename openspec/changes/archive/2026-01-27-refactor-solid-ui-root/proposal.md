# Refactor: Solid.js UI Root Component

## Why

The current Solid.js integration uses vanilla wrappers around Solid components, requiring imperative APIs (`show()`, `hide()`, `preventAutoHide()`) to coordinate UI state between components. This approach:

1. **Doesn't leverage Solid's reactive state management** - State coordination happens via imperative calls rather than reactive signals
2. **Requires complex workarounds** - The HeaderBar/FileDropdown auto-hide coordination needed `preventAutoHide()`/`allowAutoHide()` APIs because the vanilla orchestrator can't participate in Solid's reactive system
3. **Mixes concerns** - `FloorplanApp` handles both Three.js 3D rendering and 2D UI orchestration, even though they have no coupling

A pure Solid.js UI root would handle all 2D UI state reactively, with clean separation from the Three.js core.

## What Changes

### Architecture Refactor

**Current:**
```
FloorplanApp (vanilla class)
├── Three.js (scene, camera, renderer)
├── HeaderBar (vanilla wrapper → Solid component)
├── FileDropdown (vanilla wrapper → Solid component)  
├── CommandPalette (vanilla wrapper → Solid component)
└── All state coordination via imperative APIs
```

**Proposed:**
```
FloorplanApp (vanilla class) - 3D only
├── Three.js (scene, camera, renderer, controls)
├── Exposes methods: loadFile(), handleAction(), getState()
└── Emits events for UI to observe

FloorplanUI (Solid root component) - 2D UI only
├── HeaderBar (pure Solid)
├── FileDropdown (pure Solid)
├── CommandPalette (pure Solid)
├── Owns all UI state via signals
└── Calls FloorplanApp methods for actions
```

### Key Benefits

1. **Reactive state coordination** - HeaderBar/FileDropdown coordination via shared signals
2. **No wrapper boilerplate** - Solid components used directly without imperative APIs
3. **Clear separation** - Three.js code isolated from UI framework
4. **Testable UI** - Solid components can be tested without Three.js
5. **Incremental migration** - Can migrate one component at a time

## Impact

- **Affected code:**
  - `floorplan-viewer-core/src/floorplan-app.ts` - Split into FloorplanAppCore + FloorplanUI
  - `floorplan-viewer-core/src/ui/solid/*.tsx` - Refactor to pure Solid (remove wrappers)
  - `viewer/src/main.ts` - Update initialization
  - `interactive-editor/src/editor-app.ts` - Update initialization

- **Not affected:**
  - Three.js rendering code (base-viewer, scene-context, mesh-builder)
  - Grammar/parsing (language package)
  - MCP server

- **Migration from `add-solidjs-ui-framework`:**
  - Tasks 9.6, 9.8, 9.9, 9.10 moved here (reimplemented with new architecture)
  - Wrapper pattern replaced with pure Solid pattern
