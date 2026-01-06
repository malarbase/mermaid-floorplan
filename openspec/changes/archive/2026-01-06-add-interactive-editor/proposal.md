# Proposal: Add Interactive Editor Capabilities

## Why

The current viewer provides excellent 3D visualization and a basic Monaco editor for DSL editing, but there is no bidirectional connection between them. Users cannot:
- Click on a room in 3D to locate it in the DSL
- See which 3D elements correspond to their cursor position
- Edit room properties through a UI panel
- Get full IDE features (completion, go-to-definition, hover info)

This limits productivity and makes the tool less intuitive for non-developers.

## What Changes

### Core Features

#### Shared Capabilities (viewer-core) — Available in Both Viewer and Editor

1. **3D Object Selection (Click & Marquee)** — *Read-only exploration*
   - Click on rooms, walls, doors, windows, stairs, lifts to select
   - **Marquee selection**: Drag rectangle to select multiple objects at once
   - **Multi-selection**: Hold Shift to add to selection, Ctrl/Cmd+A to select all
   - Visual highlight (outline/glow) for all selected objects
   - Support for keyboard navigation between elements

2. **AST-to-3D Bidirectional Sync** — *Navigate between code and 3D*
   - Source locations preserved from Langium AST to JSON to 3D meshes
   - Click in 3D → cursor jumps to corresponding DSL line
   - Cursor in editor → corresponding 3D object highlights

3. **Full Viewer Feature Parity**
   - Keyboard navigation (WASD pan, Q/E vertical, zoom, view presets)
   - Camera mode switching (perspective/orthographic/isometric)
   - Annotations (area labels, dimension labels, floor summaries)
   - 2D SVG overlay for plan view
   - Floor visibility controls
   - Light controls, theme switching, exploded view

#### Editor-Only Capabilities (interactive-editor) — Extends Viewer

4. **Properties Panel for CRUD Operations** — *Edit mode*
   - Select element → edit properties in form UI
   - **Bulk editing**: Select multiple rooms → change style for all at once
   - Changes apply to DSL editor (Monaco undo support)
   - Delete with cascade detection for connections
   - **Bulk delete**: Delete multiple selected elements with impact summary
   - Add new rooms/connections through UI

5. **Full LSP Integration via monaco-languageclient**
   - Code completion (keywords, room names, style names)
   - Go-to-definition (click style reference → jump to definition)
   - Find references
   - Semantic highlighting
   - Hover information (room size, computed position)

### Non-Goals (Phase 1)

- Drag-and-drop room positioning in 3D
- Visual room drawing tools
- Collaborative editing
- Version control integration

## Impact

### Architecture: New Module Structure

The interactive editor will be a **separate module** that extends the viewer, sharing common code via a new `viewer-core` package:

```
mermaid-floorplan/
├── viewer/                    # Read-only viewer (existing, refactored)
│   └── src/
│       ├── main.ts            # Viewer class (uses viewer-core)
│       └── ...
│
├── viewer-core/               # NEW: Shared abstractions (read-only capabilities)
│   └── src/
│       ├── scene-context.ts   # Three.js scene, camera, renderer interfaces
│       ├── mesh-registry.ts   # Map entities ↔ meshes
│       ├── selection-api.ts   # Selection interface (highlight, callbacks)
│       ├── selection-manager.ts  # Click/marquee selection (SHARED)
│       ├── editor-viewer-sync.ts # Bidirectional text↔3D sync (SHARED)
│       ├── wall-generator.ts  # CSG-based wall generation with ownership
│       ├── keyboard-controls.ts  # WASD navigation, zoom, view presets
│       ├── camera-manager.ts  # Perspective/orthographic/isometric switching
│       ├── annotation-manager.ts # Area labels, dimensions, floor summaries
│       ├── floor-manager.ts   # Floor visibility controls
│       ├── overlay-2d-manager.ts # 2D SVG overlay rendering
│       ├── pivot-indicator.ts # Visual pivot point indicator
│       ├── ui/                # Shared UI components
│       │   ├── styles.ts      # Shared CSS as template literal
│       │   ├── camera-controls-ui.ts
│       │   ├── light-controls-ui.ts
│       │   ├── floor-controls-ui.ts
│       │   ├── annotation-controls-ui.ts
│       │   ├── overlay-2d-ui.ts
│       │   ├── keyboard-help-ui.ts
│       │   └── selection-info-ui.ts  # Selection status display
│       └── index.ts
│
├── interactive-editor/        # NEW: Full editor (extends viewer with edit capabilities)
│   └── src/
│       ├── main.ts            # InteractiveEditor extends Viewer
│       ├── properties-panel.ts   # Edit selected entity (EDITOR-ONLY)
│       ├── dsl-generator.ts      # Generate DSL code (EDITOR-ONLY)
│       ├── dsl-property-editor.ts # Modify DSL properties (EDITOR-ONLY)
│       ├── branching-history.ts  # Undo/redo with branches (EDITOR-ONLY)
│       ├── history-browser.ts    # Time-travel UI (EDITOR-ONLY)
│       ├── lsp-worker.ts         # Language server worker (EDITOR-ONLY)
│       └── index.ts
```

**Benefits:**
- **Interactive viewer**: Viewer gains selection and sync—users can explore floorplans by clicking rooms
- **Embeddable viewer**: Lightweight `viewer` for docs, previews (~500KB)
- **Full editor opt-in**: Load `interactive-editor` only when editing is needed (+2-3MB)
- **Clear separation**: Read-only exploration (viewer) vs write/edit (editor)
- **Code reuse**: Selection and sync logic written once, used in both packages
- **Independent versioning**: Can update editor without breaking viewer embeds

### Affected Specs

| Spec | Impact |
|------|--------|
| `3d-viewer` | MODIFIED - Extract shared interfaces to viewer-core |
| `dsl-grammar` | No changes to grammar itself |
| NEW: `viewer-core` | New capability spec for shared abstractions |
| NEW: `interactive-editor` | New capability spec for editor features |

### Affected Code

| Package | Changes |
|---------|---------|
| `viewer/` | Refactor to use `viewer-core`, gains selection and sync capabilities |
| NEW: `viewer-core/` | Extract: scene context, mesh registry, selection manager, editor-viewer sync, rendering utilities |
| NEW: `interactive-editor/` | Editor-only features: properties panel, CRUD operations, history, LSP |
| `language/` | `json-converter.ts` (source ranges), `floorplans-module.ts` (LSP customization) |

### Dependencies

**viewer-core** (shared viewer functionality):
```json
{
  "dependencies": {
    "floorplan-3d-core": "*",
    "floorplans-language": "*"
  },
  "peerDependencies": {
    "three": ">=0.150.0",
    "three-bvh-csg": ">=0.0.16"
  }
}
```

**interactive-editor** (extends viewer, adds LSP):
```json
{
  "viewer": "workspace:*",
  "viewer-core": "workspace:*",
  "monaco-languageclient": "^10.0.0",
  "vscode-languageclient": "^9.0.1",
  "vscode-languageserver-protocol": "^3.17.5"
}
```

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation from raycasting | Medium | Medium | Use bounding boxes, benchmark early |
| LSP web worker complexity | High | Medium | Start with minimal features, iterate |
| Bundle size increase | Medium | Low | Code-split LSP worker |
| Langium 4.x browser compatibility | Low | High | Use existing EmptyFileSystem pattern |

## Timeline Estimate

- **Research & Prototyping**: 2-3 weeks
- **Implementation**: 3-4 weeks
- **Testing & Polish**: 1-2 weeks
- **Total**: 6-9 weeks

## Open Questions

1. ~~Should selection be single-select or multi-select?~~ **Decided: Multi-select with click, Shift-click, and marquee**
2. ~~Should properties panel changes apply immediately or require "Apply" button?~~ **Decided: Apply immediately (no confirmation button)**
3. ~~How to handle selection during DSL parse errors?~~ **Decided: Hybrid - render last valid state with error overlay. Scene shows last successfully parsed geometry (selection still works), plus visible error indicator (banner/badge) showing parse errors exist. Clear visual treatment (e.g., dimmed scene or border) indicates view is stale.**
4. ~~Should we support undo for 3D-triggered edits?~~ **Decided: Yes - all edit operations revertable via time-travel history (state snapshots)**
5. ~~Should marquee select objects that are only partially inside the rectangle?~~ **Decided: Toggleable from control plane - user can switch between intersection-based (partial overlap) and containment-based (fully inside) modes**
6. ~~What's the visual preview during marquee drag?~~ **Decided: Semi-transparent rectangle + hover highlights on intersected objects**
7. ~~How to handle mixed-type multi-selection in properties panel?~~ **Decided: Show and allow editing of shared attributes only (e.g., if selecting rooms and doors, show properties common to both)**

## Related Work

- [TypeFox: Boost your AI apps with DSLs](https://www.typefox.io/blog/boost-your-ai-apps-with-dsls/)
- [langium-ai](https://github.com/eclipse-langium/langium-ai)
- Current editor: `viewer/src/editor.ts`
- Current 3D generation: `viewer/src/main.ts:generateFloor()`

