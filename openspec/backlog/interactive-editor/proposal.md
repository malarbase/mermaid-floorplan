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

1. **3D Object Selection (Click & Marquee)**
   - Click on rooms, walls, doors, windows, stairs, lifts to select
   - **Marquee selection**: Drag rectangle to select multiple objects at once
   - **Multi-selection**: Hold Shift to add to selection, Ctrl/Cmd+A to select all
   - Visual highlight (outline/glow) for all selected objects
   - Support for keyboard navigation between elements

2. **AST-to-3D Bidirectional Mapping**
   - Source locations preserved from Langium AST to JSON to 3D meshes
   - Click in 3D → cursor jumps to corresponding DSL line
   - Cursor in editor → corresponding 3D object highlights

3. **Full LSP Integration via monaco-languageclient**
   - Code completion (keywords, room names, style names)
   - Go-to-definition (click style reference → jump to definition)
   - Find references
   - Semantic highlighting
   - Hover information (room size, computed position)

4. **Properties Panel for CRUD Operations**
   - Select element → edit properties in form UI
   - **Bulk editing**: Select multiple rooms → change style for all at once
   - Changes apply to DSL editor (Monaco undo support)
   - Delete with cascade detection for connections
   - **Bulk delete**: Delete multiple selected elements with impact summary
   - Add new rooms/connections through UI

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
├── viewer-core/               # NEW: Shared abstractions
│   └── src/
│       ├── scene-context.ts   # Three.js scene, camera, renderer interfaces
│       ├── floor-renderer.ts  # Floor/wall/stair generation
│       ├── mesh-registry.ts   # Map entities ↔ meshes
│       ├── selection-api.ts   # Selection interface (highlight, callbacks)
│       └── index.ts
│
├── interactive-editor/        # NEW: Full editor (extends viewer)
│   └── src/
│       ├── main.ts            # InteractiveEditor extends Viewer
│       ├── selection-manager.ts
│       ├── marquee-selection.ts
│       ├── branching-history.ts
│       ├── history-browser.ts
│       ├── properties-panel.ts
│       ├── editor-viewer-sync.ts
│       ├── lsp-worker.ts
│       └── index.ts
```

**Benefits:**
- **Embeddable viewer**: Lightweight `viewer` for docs, previews (~500KB)
- **Full editor opt-in**: Load `interactive-editor` only when needed (+2-3MB)
- **Clear API boundary**: Viewer exposes scene context, editor extends it
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
| `viewer/` | Refactor to use `viewer-core`, keep read-only functionality |
| NEW: `viewer-core/` | Extract: scene context, mesh registry, selection API, floor renderer |
| NEW: `interactive-editor/` | All new editor features: selection, sync, properties, history, LSP |
| `language/` | `json-converter.ts` (source ranges), `floorplans-module.ts` (LSP customization) |

### Dependencies

**viewer-core** (minimal):
```json
{
  "three": "^0.170.0"
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

