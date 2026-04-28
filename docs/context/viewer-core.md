# Viewer Core Context

## Architecture

Separates 3D rendering from 2D UI. Three.js handles all 3D; Solid.js handles UI.

## Scene Construction

`floorplan-viewer-core` does **not** maintain its own scene-build pipeline.
`BaseViewer.loadFloorplan` delegates the entire mesh / group hierarchy to
`buildFloorplanScene` from `floorplan-3d-core` (the same entry point used by
the headless renderer in `floorplan-mcp-server`). Selection / source-range
registration is wired via the optional `SceneBuildHooks` callbacks
(`onFloorGroup`, `onRoomMesh`, `onWallMesh`, `onStairMesh`, `onLiftMesh`),
which `BaseViewer` and `InteractiveEditorCore` override to populate
`MeshRegistry`. Stair / lift floor-slab cutouts use mesh-derived bounds
(`THREE.Box3().setFromObject(...)`) so the interactive viewer and the
headless renderer always agree on the cut shape.

## Modes

| Mode | Core Class | Use Case |
|------|------------|----------|
| Viewer | `FloorplanAppCore` | Read-only 3D display |
| Editor | `InteractiveEditorCore` (extends FloorplanAppCore) | Interactive editing, selection, DSL sync |

## Editor-Specific Features (InteractiveEditorCore)

**Parse error state** — When DSL parse fails, the 3D view holds the last valid geometry.
Use `setErrorState(true, msg)` / `clearErrorState()` and observe via the `parseError` event.

**Entity location tracking** — Each successful load populates `entityLocations` with
`EntityLocation[]` (name, type, floorId, sourceRange). Use `findEntitiesAtLine(n)` for
DSL ↔ 3D navigation. The `entityLocationsUpdate` event fires after each rebuild.

**Selection preservation** — `InteractiveEditorCore.loadFloorplan` snapshots selected
entity IDs before the scene rebuild and restores them from the new mesh registry,
so edits don't clear the current selection.

**Editor events** (extends `FloorplanAppCoreEvents`):

| Event | Payload |
|-------|---------|
| `selectionChange` | `{ selection: ReadonlySet<SelectableObject>; source: 'click'\|'marquee'\|'api' }` |
| `parseError` | `{ hasError: boolean; errorMessage?: string }` |
| `entityLocationsUpdate` | `{ locations: EntityLocation[] }` |

## FloorplanAppCore Key API

- `currentLangiumDocument` — Langium document from last successful DSL parse; used by `Overlay2DManager` for 2D overlay rendering.
- `on(event, handler)` — Event subscription; returns unsubscribe function.
- `FloorplanAppCoreOptions` — `enableSelection`, `allowSelectionToggle`, `isAuthenticated`, `onAuthRequired`, etc.

## Three.js Isolation Rule

**NEVER use Solid.js for 3D rendering.** All Three.js scene work lives in FloorplanAppCore / InteractiveEditorCore. UI components observe state via events and signals.

## When to Use What

| Need | Use |
|------|-----|
| Simple static UI | Vanilla DOM |
| Interactive UI (buttons, forms, modals) | Solid.js |
| 3D scene, camera, geometry | FloorplanAppCore |

## Usage Patterns

**Viewer mode:**
```typescript
const core = new FloorplanAppCore(options);
createFloorplanUI(core, container);
```

**Editor mode:**
```typescript
const core = new InteractiveEditorCore(options);
createFloorplanUI(core, container, { mode: 'editor' });
```

## File Structure

```
floorplan-viewer-core/src/
├── floorplan-app-core.ts      # Viewer core
├── interactive-editor-core.ts # Editor core (extends FloorplanAppCore)
├── base-viewer.ts
├── ui/solid/                  # Solid.js UI components
└── ...
```

## Reactive Coordination

FloorplanAppCore emits events; UI subscribes via signals. Use `createEffect` / `createMemo` for derived state. Do not mix Solid.js reactivity with Three.js render loop.

## Cross-Reference

See `solidjs-daisyui` skill for DaisyUI theming (don't duplicate).

<!-- freshness
watches_hash: 08880e7
last_verified: 2026-04-28
watches:
  - floorplan-viewer-core/src/floorplan-app-core.ts
  - floorplan-viewer-core/src/interactive-editor-core.ts
  - floorplan-viewer-core/src/ui/solid/**
-->
