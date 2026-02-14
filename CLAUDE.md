
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

floorplan-app/                      # SolidStart full-stack app
├── src/routes/                     # File-based routing
├── src/components/                 # Solid.js UI components
├── src/lib/                        # Auth, utilities
└── convex/                         # Convex database schema and functions
```

### SolidStart App (floorplan-app/)

Full-stack application for authenticated floorplan design with cloud storage:

| Feature | Technology |
|---------|------------|
| Framework | SolidStart with SSR |
| Auth | Better Auth + Google OAuth |
| Database | Convex (real-time) |
| 3D Rendering | floorplan-viewer-core |
| Styling | DaisyUI + Tailwind CSS v4 |

#### Key Architecture

- **GitHub-Inspired Versioning**: Projects → Versions (mutable) → Snapshots (immutable)
- **URL Structure**: `/u/{username}/{project}/v/{version}` (mutable), `/u/{username}/{project}/s/{hash}` (permalink)
- **Viewer-Core Embedding**: Uses `FloorplanEmbed` wrapper with `onMount`/`onCleanup` lifecycle

#### Viewer-Core Integration

```typescript
// Proper embedding pattern for SolidStart
import { onMount, onCleanup } from "solid-js";
import { FloorplanAppCore } from "floorplan-viewer-core";

function FloorplanEmbed(props: { dsl: string }) {
  let container: HTMLDivElement;
  let app: FloorplanAppCore;

  onMount(async () => {
    app = new FloorplanAppCore({
      containerId: container.id,
      initialTheme: 'dark',
      initialDsl: props.dsl,
    });
  });

  onCleanup(() => app?.dispose?.());

  return <div ref={container!} id="floorplan-container" class="w-full h-full" />;
}
```

#### Development

```bash
# From workspace root
npm run --workspace floorplan-app dev    # Start dev server at localhost:3000
npx convex dev                            # Start Convex dev (separate terminal)

# From floorplan-app/
npm run dev
npm test                                  # Run Vitest tests
```

See `floorplan-app/README.md` for full setup instructions including Google OAuth and Convex configuration.

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
│ For Viewer (read-only): mode: 'viewer'                       │
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
│ For Editor (full editing): mode: 'editor'                    │
├─────────────────────────────────────────────────────────────┤
│ InteractiveEditorCore extends FloorplanAppCore               │
│ ├── Selection → DSL bidirectional sync                      │
│ ├── Parse error state management                            │
│ └── Editor-specific events (selectionChange, parseError)    │
│                                                             │
│ FloorplanUI (Solid.js root via createFloorplanUI)           │
│ ├── HeaderBar, FileDropdown, CommandPalette                 │
│ ├── PropertiesPanel for single selection editing            │
│ ├── AddRoomDialog, DeleteConfirmDialog (editor mode only)   │
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

### Using InteractiveEditorCore + Unified createFloorplanUI (Editor)

```typescript
import { InteractiveEditorCore } from 'floorplan-viewer-core';
import { createFloorplanUI } from 'floorplan-viewer-core/ui/solid';

const editorCore = new InteractiveEditorCore({
  containerId: 'app',
  initialTheme: 'dark',
  selectionDebug: false,
});

// Use unified factory with mode: 'editor'
const editorUI = createFloorplanUI(editorCore, {
  mode: 'editor',  // Enables editor-specific features
  initialFilename: 'Untitled.floorplan',
  initialEditorOpen: true,
  commands: [...],
  onPropertyChange: (entityType, entityId, property, value) => { ... },
  onDelete: (entityType, entityId) => { ... },
  getEntityData: (entityType, entityId) => { ... },
  onAddRoom: (room) => { ... },
});

// Editor-specific events
editorCore.on('selectionChange', ({ selection }) => { ... });
editorCore.on('parseError', ({ hasError, errorMessage }) => { ... });
```

### DaisyUI Theming

The UI uses DaisyUI v5 with Tailwind CSS v4 for theming. Theme switching works via `data-theme` attribute:

```typescript
// Theme is set on document.documentElement by FloorplanUI
document.documentElement.setAttribute('data-theme', 'dark'); // or 'light'

// CSS uses DaisyUI semantic color variables
.my-panel {
  background: oklch(var(--color-base-100));  // Theme-aware background
  color: oklch(var(--color-base-content));   // Theme-aware text
}
```

For DaisyUI component patterns and gotchas, see `.cursor/skills/solidjs-daisyui/SKILL.md`.

### File Structure

```
floorplan-viewer-core/src/
├── floorplan-app-core.ts        # 3D viewer core with event emitter
├── interactive-editor-core.ts   # Editor core (extends FloorplanAppCore)
└── ui/solid/
    ├── FloorplanUI.tsx          # Unified Solid root (mode: 'viewer' | 'editor')
    ├── EditorUI.tsx             # DEPRECATED: delegates to FloorplanUI
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
