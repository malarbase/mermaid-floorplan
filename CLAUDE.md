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

### Architecture Overview

This project separates 3D rendering from 2D UI via core classes and Solid.js components:

```
┌─────────────────────────────────────────────────────────────┐
│ For Viewer (read-only)                                       │
├─────────────────────────────────────────────────────────────┤
│ FloorplanAppCore (3D-only)                                   │
│ ├── BaseViewer (Three.js scene, camera, renderer, controls) │
│ ├── SelectionManager, Overlay2DManager, LayoutManager       │
│ └── Event emitter for UI subscription                       │
│                                                             │
│ FloorplanUI (Solid.js root via createFloorplanUI)           │
│ ├── HeaderBar, FileDropdown, CommandPalette                 │
│ └── Subscribes to appCore events for reactive updates       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ For Editor (full editing capabilities)                       │
├─────────────────────────────────────────────────────────────┤
│ InteractiveEditorCore extends FloorplanAppCore               │
│ ├── Selection → DSL bidirectional sync                      │
│ ├── Parse error state management                            │
│ └── Editor-specific events (selectionChange, parseError)    │
│                                                             │
│ EditorUI (Solid.js root via createEditorUI)                 │
│ ├── HeaderBar, FileDropdown, CommandPalette                 │
│ ├── PropertiesPanel for single selection editing            │
│ ├── AddRoomDialog, DeleteConfirmDialog, ExportMenu          │
│ └── Parse error banner                                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Rule: Three.js Isolation

**NEVER use Solid.js for 3D rendering.** Solid's fine-grained reactivity conflicts with Three.js's imperative scene graph:
- Solid components live in `ui/solid/`
- Three.js code lives in base-viewer, scene-context, etc.
- Communication happens via events and method calls

### When to Use What

| Use Case | Approach |
|----------|----------|
| Simple static UI (tooltip, badge) | Vanilla DOM |
| Interactive UI with state (command palette, header) | Solid.js via FloorplanUI/EditorUI |
| 3D scene manipulation | FloorplanAppCore/InteractiveEditorCore |
| Cross-component state (dropdown open, header visible) | Solid signals |

### Using FloorplanAppCore + FloorplanUI (Viewer)

```typescript
import { FloorplanAppCore, createFloorplanUI } from 'floorplan-viewer-core';

const appCore = new FloorplanAppCore({
  containerId: 'app',
  initialTheme: 'dark',
  initialDsl: myFloorplanDsl,
});

const ui = createFloorplanUI(appCore, {
  initialFilename: 'MyFloorplan.floorplan',
  headerAutoHide: true,
  commands: [...],
});

// UI state updates automatically via event subscription
appCore.loadFromDsl(newContent);  // UI filename signal updates
appCore.handleThemeToggle();       // UI theme signal updates
```

### Using InteractiveEditorCore + EditorUI (Editor)

```typescript
import { InteractiveEditorCore, createEditorUI } from 'floorplan-viewer-core';

const editorCore = new InteractiveEditorCore({
  containerId: 'app',
  initialTheme: 'dark',
  selectionDebug: false,
});

const editorUI = createEditorUI(editorCore, {
  initialFilename: 'Untitled.floorplan',
  initialEditorOpen: true,
  commands: [...],
  onPropertyChange: (entityType, entityId, property, value) => { ... },
  onDelete: (entityType, entityId) => { ... },
  getEntityData: (entityType, entityId) => { ... },
});

// Editor-specific events
editorCore.on('selectionChange', ({ selection }) => { ... });
editorCore.on('parseError', ({ hasError, errorMessage }) => { ... });
```

### File Structure

```
floorplan-viewer-core/src/
├── floorplan-app-core.ts        # 3D viewer core with event emitter
├── interactive-editor-core.ts   # Editor core (extends FloorplanAppCore)
└── ui/solid/
    ├── FloorplanUI.tsx          # Viewer Solid root component
    ├── EditorUI.tsx             # Editor Solid root component
    ├── CommandPalette.tsx       # Standalone component
    ├── FileDropdown.tsx         # Standalone component
    ├── HeaderBar.tsx            # Standalone component
    ├── PropertiesPanel.tsx      # Properties editing panel
    └── index.ts                 # Module exports
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
