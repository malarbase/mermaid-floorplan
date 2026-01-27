<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Architecture

### Mermaid-Aligned Floorplan DSL

This project implements a floorplan diagram DSL following [Mermaid.js conventions](https://mermaid.js.org/community/new-diagram.html).

### Package Structure

```
language/                           # floorplan-language (npm package)
├── src/diagrams/floorplans/        # ← Diagram folder (grammar + rendering together)
│   ├── floorplans.langium          # Langium grammar
│   ├── renderer.ts                 # render(), renderFloor(), renderToFile()
│   ├── styles.ts                   # getStyles(), theme presets
│   └── floor.ts, room.ts, ...      # Component renderers
├── src/generated/                  # Langium-generated AST types
└── src/index.ts                    # Package exports

mcp-server/                         # floorplans-mcp-server (AI tools)
├── src/tools/                      # render_floorplan, validate_floorplan, modify_floorplan
└── src/utils/renderer.ts           # Imports from floorplan-language + svgToPng

src/                                # Web app (Monaco editor)
└── renderer.ts                     # Imports from floorplan-language
```

### Single Source of Truth

All rendering code lives in `language/src/diagrams/floorplans/`. Consumers import:

```typescript
import { render, renderToFile, getStyles, createFloorplansServices } from "floorplan-language";
```

### Key Files

| File | Purpose |
|------|---------|
| `language/src/diagrams/floorplans/floorplans.langium` | Grammar definition |
| `language/src/diagrams/floorplans/renderer.ts` | SVG rendering |
| `language/src/diagrams/floorplans/styles.ts` | Theming |
| `language/langium-config.json` | Langium configuration |

### Related Context

For Mermaid alignment details, see:
- `openspec/changes/mermaid-alignment/context.md` - Full comparison with Mermaid PR #4839
- `openspec/changes/mermaid-alignment/quick-reference.md` - Quick reference

## Solid.js Integration

### Architecture: FloorplanAppCore + FloorplanUI

This project separates 3D rendering from 2D UI via two main classes:

```
FloorplanAppCore (3D-only)
├── BaseViewer (Three.js scene, camera, renderer, controls)
├── SelectionManager, Overlay2DManager, LayoutManager
├── Event emitter for UI subscription
└── Public API: loadFromDsl(), handleFileAction(), toggleEditorPanel(), etc.

FloorplanUI (Solid.js root)
├── HeaderBar (pure Solid)
├── FileDropdown (pure Solid)
├── CommandPalette (pure Solid)
├── Shared state signals for reactive coordination
└── Subscribes to appCore events for reactive updates
```

### Key Rule: Three.js Isolation

**NEVER use Solid.js for 3D rendering.** Solid's fine-grained reactivity conflicts with Three.js's imperative scene graph:
- Solid components live in `src/ui/solid/`
- Three.js code lives in base-viewer, scene-context, etc.
- Communication happens via events and method calls

### When to Use What

| Use Case | Approach |
|----------|----------|
| Simple static UI (tooltip, badge) | Vanilla DOM |
| Interactive UI with state (command palette, header) | Solid.js via FloorplanUI |
| 3D scene manipulation | FloorplanAppCore (Three.js) |
| Cross-component state (dropdown open, header visible) | Solid signals |

### Using FloorplanAppCore + FloorplanUI (Recommended)

```typescript
import { FloorplanAppCore, createFloorplanUI, createFileCommands } from 'floorplan-viewer-core';

// Create 3D core
const appCore = new FloorplanAppCore({
  containerId: 'app',
  initialTheme: 'dark',
  initialDsl: myFloorplanDsl,
});

// Create UI layer with shared state
const ui = createFloorplanUI(appCore, {
  initialFilename: 'MyFloorplan.floorplan',
  headerAutoHide: true,
  commands: createFileCommands({ ... }),
});

// UI state updates automatically via event subscription
appCore.loadFromDsl(newContent);  // UI filename signal updates
appCore.handleThemeToggle();       // UI theme signal updates
```

### Using FloorplanApp (Legacy/Simple)

For simpler use cases, the original `FloorplanApp` class still works:

```typescript
import { FloorplanApp } from 'floorplan-viewer-core';

const app = new FloorplanApp({
  containerId: 'app',
  initialDsl: myFloorplanDsl,
  showHeaderBar: true,
  enableDragDrop: true,
});
```

### File Structure

```
floorplan-viewer-core/src/
├── floorplan-app-core.ts     # 3D-only class with event emitter
├── floorplan-app.ts          # Legacy unified class
└── ui/solid/
    ├── FloorplanUI.tsx       # Solid root component (HeaderBar, FileDropdown, CommandPalette)
    ├── CommandPalette.tsx    # Standalone component
    ├── FileDropdown.tsx      # Standalone component
    ├── HeaderBar.tsx         # Standalone component
    ├── *Wrapper.tsx          # Deprecated vanilla wrappers
    └── index.ts              # Module exports
```

### Reactive Coordination via Signals

UI components coordinate via shared Solid signals without imperative APIs:

```typescript
// In FloorplanUI: auto-hide respects dropdown state
const isVisible = () => {
  if (!props.autoHide) return true;
  return isHovered() || state.dropdownOpen();  // Stays visible while dropdown open
};
```
