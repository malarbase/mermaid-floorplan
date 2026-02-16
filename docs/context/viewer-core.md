# Viewer Core Context

## Architecture

Separates 3D rendering from 2D UI. Three.js handles all 3D; Solid.js handles UI.

## Modes

| Mode | Core Class | Use Case |
|------|------------|----------|
| Viewer | `FloorplanAppCore` | Read-only 3D display |
| Editor | `InteractiveEditorCore` (extends FloorplanAppCore) | Interactive editing, selection, DSL sync |

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
watches_hash: 6db341a
last_verified: 2026-02-17
watches:
  - floorplan-viewer-core/src/floorplan-app-core.ts
  - floorplan-viewer-core/src/interactive-editor-core.ts
  - floorplan-viewer-core/src/ui/solid/*
-->
