# Research Plan: Interactive Floorplan Editor

## Executive Summary

This research plan outlines the technical investigation needed to expand the 3D viewer into a full interactive editor with:
- **3D Object Selection**: Click selection via ray casting AND marquee (rectangle drag) selection for multi-select
- **Multi-Selection Support**: Select multiple rooms/elements simultaneously with Shift-click or drag rectangle
- **Bidirectional Sync**: Click in 3D → highlight in editor; click in editor → highlight in 3D
- **CRUD Operations**: Create, read, update, delete floorplan elements through both UI and DSL (including bulk operations)
- **Full LSP Integration**: Code completion, go-to-definition, semantic highlighting via monaco-languageclient

## Research Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 1-2 days | Three.js Ray Casting & Selection |
| Phase 2 | 2-3 days | AST-to-3D Mapping Architecture |
| Phase 3 | 3-5 days | Monaco-Languageclient Integration |
| Phase 4 | 2-3 days | Bidirectional Sync Implementation |
| Phase 5 | 3-5 days | CRUD Operations & Properties Panel |
| Phase 6 | 2-3 days | Integration Testing & Polish |

**Total Estimated Time**: 13-21 days

---

## Phase 1: Three.js Selection (Click & Marquee)

### Objective
Implement 3D object selection using both click (ray casting) and marquee (rectangle drag) selection to enable selecting single or multiple elements.

### Research Questions

1. **Ray Casting Performance**
   - How does Raycaster perform with complex CSG-generated geometry?
   - Should we use bounding boxes for initial hit detection, then refine?
   - What's the optimal `recursion` depth for `intersectObjects()`?

2. **Hit Target Identification**
   - How do we distinguish floor meshes from wall meshes from door meshes?
   - Should we use `userData` on meshes or `name` properties?
   - How do we handle overlapping geometries (walls inside walls)?

3. **Visual Feedback**
   - What highlight approach: outline shader, emission change, or separate highlight mesh?
   - How do we handle multi-material meshes (per-face wall materials)?
   - How do we highlight multiple selected objects efficiently?

4. **Marquee Selection Algorithm**
   - How do we project 3D bounding boxes to screen space from current camera?
   - Should we use frustum culling or screen-space rectangle intersection?
   - How do we handle partially visible objects (clipped by camera)?
   - Performance: iterating all selectables vs spatial indexing?

5. **Selection Mode vs Camera Mode**
   - How do we distinguish left-drag for selection vs camera orbit?
   - Should we use modifier keys (Alt for orbit) or separate mouse buttons?
   - How does this interact with existing OrbitControls?

### Technical Spikes

```typescript
// Spike 1.1: Basic Raycaster setup
// File: viewer/src/selection-manager.ts (new)
// Test: Click detection on floor meshes
// Success: Console logs room name on click

// Spike 1.2: Visual highlight
// Test: Selected room gets green outline/glow
// Options: Three.js OutlinePass, EffectComposer, or simple material swap

// Spike 1.3: Performance baseline
// Test: Measure raycast time on StyledApartment.floorplan vs StairsAndLifts.floorplan
// Target: <16ms per frame (60fps capable)

// Spike 1.4: Marquee rectangle overlay
// File: viewer/src/marquee-selection.ts (new)
// Test: Draw 2D rectangle on canvas during drag
// Success: Semi-transparent rectangle follows cursor

// Spike 1.5: Screen-space bounding box projection
// Test: Project mesh.geometry.boundingBox to screen coordinates
// Success: 2D rect correctly represents 3D object from camera angle

// Spike 1.6: Marquee selection logic
// Test: Drag rectangle over multiple rooms → all selected
// Success: All rooms whose screen bounds intersect rectangle are selected

// Spike 1.7: Selection mode toggle
// Test: Left-drag = selection, Alt+drag = orbit, Right-drag = pan
// Success: No conflict between selection and camera controls
```

### Marquee Selection Algorithm

```typescript
// Pseudocode for screen-space marquee selection
function marqueeSelect(rect: Rect2D, camera: Camera, selectables: Mesh[]): Mesh[] {
  const selected: Mesh[] = [];
  
  for (const mesh of selectables) {
    // Get world-space bounding box
    const bbox = new THREE.Box3().setFromObject(mesh);
    
    // Project 8 corners to screen space
    const corners = [
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
    ];
    
    // Project to NDC then to screen pixels
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let allBehindCamera = true;
    
    for (const corner of corners) {
      corner.project(camera);
      if (corner.z < 1) { // In front of camera
        allBehindCamera = false;
        const screenX = (corner.x + 1) / 2 * canvas.width;
        const screenY = (1 - corner.y) / 2 * canvas.height;
        minX = Math.min(minX, screenX);
        minY = Math.min(minY, screenY);
        maxX = Math.max(maxX, screenX);
        maxY = Math.max(maxY, screenY);
      }
    }
    
    if (allBehindCamera) continue; // Skip objects behind camera
    
    // Test intersection with selection rectangle
    const screenBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    if (rectsIntersect(rect, screenBounds)) {
      selected.push(mesh);
    }
  }
  
  return selected;
}
```

### Key Resources
- [Three.js Raycaster Documentation](https://threejs.org/docs/#api/en/core/Raycaster)
- [Three.js OutlinePass for Selection](https://threejs.org/examples/#webgl_postprocessing_outline)
- [Three.js Frustum](https://threejs.org/docs/#api/en/math/Frustum) - Alternative to screen-space
- [Vector3.project()](https://threejs.org/docs/#api/en/math/Vector3.project) - World to NDC
- Current codebase: `viewer/src/wall-generator.ts`, `floorplan-3d-core/src/scene-builder.ts`

### Deliverables
- [ ] Working click selection via raycaster
- [ ] Working marquee selection via rectangle drag
- [ ] Multi-selection support (Set-based selection state)
- [ ] Visual highlight for multiple selected objects
- [ ] Shift-click additive selection
- [ ] Selection mode vs camera orbit mode separation
- [ ] Performance benchmarks documented

---

## Phase 2: AST-to-3D Mapping Architecture

### Objective
Design and implement a mapping system that links Langium AST nodes to their corresponding 3D meshes.

### Research Questions

1. **Source Location Preservation**
   - How do we access `$cstNode` source range from Room/Connection AST nodes?
   - Should we store source locations in JsonRoom/JsonConnection at conversion time?
   - What's the memory overhead of storing source info on every mesh?

2. **Mapping Strategy**
   - Flat map (mesh ID → AST info) vs hierarchical (floor → room → mesh)?
   - How do we handle dynamic mesh regeneration (on editor change)?
   - Should mapping be stored in a separate registry or in mesh.userData?

3. **Entity Types**
   - What's the complete list of selectable entities?
     - Room (floor mesh)
     - Wall (per-face segments)
     - Door/Window (connection mesh)
     - Stair (stair group)
     - Lift (lift group)
   - Do we need sub-element selection (individual wall face)?

### Technical Spikes

```typescript
// Spike 2.1: Source location extraction
// File: language/src/diagrams/floorplans/json-converter.ts (modify)
// Test: Add _sourceRange to JsonRoom during conversion
// Verify: Range includes line/column from original DSL

// Spike 2.2: Mesh userData population
// File: viewer/src/main.ts (modify generateFloor)
// Test: Floor mesh has userData.sourceRange after generation
// Verify: Can reconstruct editor selection from mesh

// Spike 2.3: Mapping registry
// File: viewer/src/ast-mesh-registry.ts (new)
// Test: Registry survives regeneration, updates correctly
// Verify: Old mappings cleared, new ones populated
```

### Data Structures

```typescript
// Proposed: Source location info added to JSON types
interface JsonSourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface JsonRoom {
  // ... existing fields
  _sourceRange?: JsonSourceRange; // Underscore prefix = metadata
}

// Proposed: Selectable object metadata
interface SelectableMetadata {
  type: 'room' | 'wall' | 'door' | 'window' | 'stair' | 'lift';
  entityId: string;        // Room name, connection ID, etc.
  floorId: string;
  sourceRange?: JsonSourceRange;
  parentRoom?: string;     // For walls/doors within a room
}
```

### Key Resources
- Langium AstNode: `language/src/generated/ast.ts`
- Current JSON conversion: `language/src/diagrams/floorplans/json-converter.ts`
- CST node access: `node.$cstNode.range`

### Deliverables
- [ ] JsonSourceRange type defined
- [ ] Conversion pipeline populates source ranges
- [ ] SelectionManager uses source ranges for editor sync
- [ ] Registry handles mesh regeneration

---

## Phase 3: Monaco-Languageclient Integration

### Objective
Replace basic Monaco editor setup with full Language Server Protocol support via monaco-languageclient.

### Research Questions

1. **Architecture Options**
   - Web Worker language server vs in-process?
   - Does Langium 4.x support browser web workers natively?
   - What's the bundle size impact?

2. **LSP Features to Enable**
   - Code completion (room names, style names, keywords)
   - Go-to-definition (click style name → jump to definition)
   - Find references (where is this room referenced?)
   - Hover information (show room dimensions, computed position)
   - Semantic highlighting (rooms, styles, connections, keywords)
   - Diagnostics (errors and warnings)

3. **Integration Challenges**
   - How to share Langium services between parser and LSP?
   - Memory management with multiple documents?
   - Hot reload during development?

### Technical Spikes

```typescript
// Spike 3.1: Language Server Web Worker
// File: viewer/src/language-server-worker.ts (new)
// Test: Worker responds to initialize request
// Verify: LSP handshake completes

// Spike 3.2: Monaco-languageclient setup
// File: viewer/src/editor.ts (modify)
// Test: Completion triggers on "style " prefix
// Verify: Style names appear in completion list

// Spike 3.3: Custom LSP handlers
// File: language/src/floorplans-module.ts (extend)
// Test: textDocument/hover returns room info
// Verify: Hover shows "Room: Living, Size: 12x10, Area: 120 sqm"
```

### Dependencies

```json
{
  "dependencies": {
    "monaco-languageclient": "^10.0.0",
    "vscode-languageclient": "^9.0.1",
    "vscode-languageserver-protocol": "^3.17.5"
  }
}
```

### Key Resources
- [TypeFox: monaco-languageclient v10](https://www.typefox.io/blog/monaco-languageclient-v10/)
- [Langium Browser Integration](https://langium.org/docs/recipes/browser-integration/)
- [langium-ai Examples](https://github.com/eclipse-langium/langium-ai)

### Deliverables
- [ ] Language server running in web worker
- [ ] Code completion for keywords, room names, styles
- [ ] Go-to-definition for style references
- [ ] Error diagnostics inline in editor
- [ ] Hover information for rooms and connections

---

## Phase 4: Bidirectional Sync Implementation

### Objective
Implement two-way synchronization between 3D selection and editor cursor position.

### Research Questions

1. **3D → Editor Sync**
   - On mesh click, how do we set Monaco selection?
   - Should we highlight the entire room definition or just the name?
   - How do we scroll the editor to the selection?

2. **Editor → 3D Sync**
   - On cursor move, how do we find the containing AST node?
   - Does Langium provide `findNodeAtOffset()` or similar?
   - Should we highlight on cursor move or only on explicit selection?

3. **Conflict Resolution**
   - What happens if user clicks 3D while editing in Monaco?
   - Should sync be debounced?
   - How do we handle invalid DSL states (parse errors)?

### Technical Spikes

```typescript
// Spike 4.1: 3D to Editor
// File: viewer/src/editor-viewer-sync.ts (new)
// Test: Click room in 3D → editor selects "room Kitchen..."
// Verify: Editor scrolls to selection

// Spike 4.2: Editor to 3D
// Test: Place cursor inside "room Kitchen" → Kitchen highlighted in 3D
// Options: 
//   A) Use onDidChangeCursorPosition
//   B) Use onDidChangeModelContent + debounce

// Spike 4.3: Langium findNodeAtOffset
// File: language/src/diagrams/floorplans/index.ts (export utility)
// Test: Given offset 150, return Room AST node
// Verify: Works with nested structures
```

### Implementation Pattern

```typescript
class EditorViewerSync {
  private syncDirection: '3d-to-editor' | 'editor-to-3d' | null = null;
  
  // Prevent feedback loops
  private lockSync(direction: '3d-to-editor' | 'editor-to-3d') {
    this.syncDirection = direction;
    setTimeout(() => this.syncDirection = null, 100);
  }

  onViewerSelect(obj: SelectableObject) {
    if (this.syncDirection === 'editor-to-3d') return;
    this.lockSync('3d-to-editor');
    // Set editor selection
  }

  onEditorCursorChange(position: monaco.Position) {
    if (this.syncDirection === '3d-to-editor') return;
    this.lockSync('editor-to-3d');
    // Highlight 3D object
  }
}
```

### Deliverables
- [ ] 3D click → editor selection (with scroll)
- [ ] Editor cursor → 3D highlight
- [ ] No infinite feedback loops
- [ ] Graceful handling of parse errors

---

## Phase 5: CRUD Operations & Properties Panel

### Objective
Enable creation, modification, and deletion of floorplan elements through UI interactions.

### Research Questions

1. **Edit Operations**
   - How do we generate valid DSL text for new elements?
   - Should we use AST manipulation or text insertion?
   - How do we handle formatting/indentation?

2. **Properties Panel Design**
   - What fields are editable per entity type?
   - Should changes apply immediately or require "Apply" button?
   - How do we validate values before applying?

3. **Deletion Handling**
   - What about connections referencing a deleted room?
   - Should we cascade delete or warn?
   - How do we handle undo?

### Entity Properties by Type

| Entity | Editable Properties |
|--------|-------------------|
| Room | name, position, size, height, elevation, walls, label, style |
| Connection | rooms, position%, door type, size, swing |
| Style | name, floor_color, wall_color, roughness, metalness |
| Stair | name, position, shape, rise, width, handrail |
| Lift | name, position, size, doors |

### Technical Spikes

```typescript
// Spike 5.1: DSL text generation
// File: viewer/src/dsl-generator.ts (new)
// Test: generateRoom({ name: "Office", x: 0, y: 0, width: 10, height: 8 })
// Output: 'room Office at (0,0) size (10 x 8) walls [top: solid, ...]'

// Spike 5.2: Properties panel
// File: viewer/src/properties-panel.ts (new)
// Test: Select room → panel shows editable form
// Verify: Changes apply to editor and 3D updates

// Spike 5.3: Delete with cascade detection
// Test: Delete room that has 2 connections
// Verify: Warning dialog shows affected connections
```

### UI Mockup

```
┌─────────────────────────────────┐
│ Properties: LivingRoom          │
├─────────────────────────────────┤
│ Name:     [LivingRoom     ]     │
│ Position: X: [0  ] Y: [0  ]     │
│ Size:     W: [12 ] H: [10 ]     │
│ Height:   [3.35    ] m          │
│ Elevation:[0       ] m          │
│                                 │
│ Walls:                          │
│ ┌─────┬──────────┬─────────┐   │
│ │ Top │ [solid ▼]│ [Edit]  │   │
│ │Right│ [solid ▼]│ [Edit]  │   │
│ │Bttm │ [door  ▼]│ [Edit]  │   │
│ │Left │ [window▼]│ [Edit]  │   │
│ └─────┴──────────┴─────────┘   │
│                                 │
│ Style:   [Modern         ▼]    │
│                                 │
│ [Apply] [Reset] [Delete]        │
└─────────────────────────────────┘
```

### Deliverables
- [ ] DSL text generator for all entity types
- [ ] Properties panel with form controls
- [ ] Inline editing applies to Monaco editor
- [ ] Delete with cascade warning
- [ ] Undo support (via Monaco undo stack)

---

## Phase 6: Integration Testing & Polish

### Objective
End-to-end testing, performance optimization, and UX polish.

### Test Scenarios

| Scenario | Steps | Expected |
|----------|-------|----------|
| Click Select | Click room in 3D | Room highlights, editor syncs |
| Marquee Select | Drag rectangle over 3 rooms | All 3 rooms highlight |
| Shift-Click Add | Select room, Shift-click another | Both rooms selected |
| Shift-Click Toggle | Shift-click already selected room | Room deselected |
| Marquee + Shift | Select room, Shift-drag over others | Original + new rooms selected |
| Select All | Press Ctrl/Cmd+A | All rooms selected |
| Multi-Delete | Select 3 rooms → Delete | Confirm shows "3 rooms" |
| Bulk Style | Select 3 rooms → Change style | All 3 rooms update |
| Create Room | Click "Add Room" → Draw bounds → Fill form | New room in DSL and 3D |
| Select & Edit | Click room in 3D → Change size in panel | DSL and 3D update |
| Delete Room | Select room → Click delete → Confirm | Room removed from DSL |
| Bidirectional | Click in editor → 3D highlights | Sync works both ways |
| LSP Completion | Type "style " → See completions | Style names listed |
| Error Recovery | Break DSL syntax → Fix → 3D recovers | No stuck states |

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Selection response | <50ms | Time from click to highlight |
| LSP completion | <100ms | Time from keystroke to popup |
| Editor-to-3D sync | <200ms | Debounced cursor tracking |
| Full reparse | <500ms | After DSL edit |

### Accessibility Considerations

- Keyboard navigation for selection (Tab, Enter, Escape)
- ARIA labels on properties panel
- Screen reader announcements for selection changes
- High contrast mode support

### Deliverables
- [ ] E2E test suite covering major flows
- [ ] Performance meets targets
- [ ] Keyboard navigation complete
- [ ] Documentation for editor features

---

## Appendix A: External Resources

### TypeFox Blog Posts
- [Boost your AI apps with DSLs](https://www.typefox.io/blog/boost-your-ai-apps-with-dsls/)
- [Turn AI prompts into web apps using a semiformal DSL](https://www.typefox.io/blog/turn-ai-prompts-into-web-apps-using-a-semiformal-dsl/)
- [Monaco Languageclient v10](https://www.typefox.io/blog/monaco-languageclient-v10/)

### GitHub Repositories
- [langium-ai](https://github.com/eclipse-langium/langium-ai) - AI integration examples
- [monaco-languageclient](https://github.com/TypeFox/monaco-languageclient) - LSP integration
- [langium](https://github.com/eclipse-langium/langium) - Core framework

### Three.js Resources
- [Raycaster](https://threejs.org/docs/#api/en/core/Raycaster) - Click selection
- [Vector3.project()](https://threejs.org/docs/#api/en/math/Vector3.project) - World to screen projection
- [Box3.setFromObject()](https://threejs.org/docs/#api/en/math/Box3.setFromObject) - Bounding boxes
- [Frustum](https://threejs.org/docs/#api/en/math/Frustum) - Alternative selection approach
- [Object3D.userData](https://threejs.org/docs/#api/en/core/Object3D.userData) - Metadata storage
- [EffectComposer + OutlinePass](https://threejs.org/examples/#webgl_postprocessing_outline) - Selection highlight

---

## Appendix B: Current Codebase Reference

### Files to Modify

| File | Changes |
|------|---------|
| `viewer/src/main.ts` | Add SelectionManager, EditorViewerSync |
| `viewer/src/editor.ts` | Replace with monaco-languageclient setup |
| `viewer/src/dsl-parser.ts` | Keep, used for non-LSP fallback |
| `language/src/diagrams/floorplans/json-converter.ts` | Add source range extraction |
| `language/src/floorplans-module.ts` | Add LSP service customizations |
| `viewer/index.html` | Add properties panel DOM |

### New Files to Create

| File | Purpose |
|------|---------|
| `viewer/src/selection-manager.ts` | Click selection, highlight, multi-selection state (Set) |
| `viewer/src/marquee-selection.ts` | Rectangle drag selection, screen-space projection |
| `viewer/src/ast-mesh-registry.ts` | AST ↔ 3D mesh mapping |
| `viewer/src/editor-viewer-sync.ts` | Bidirectional sync coordination |
| `viewer/src/properties-panel.ts` | Entity properties UI (single & multi-selection) |
| `viewer/src/dsl-generator.ts` | Generate DSL text from UI inputs |
| `viewer/src/language-server-worker.ts` | Web worker for LSP |

---

## Appendix C: Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| TBD | Multi-selection with marquee | Standard UX for 3D editors, enables bulk operations | Single-select only (rejected: productivity) |
| TBD | Screen-space projection for marquee | Works from any camera angle, predictable for users | Frustum culling (considered: may be more performant for many objects) |
| TBD | Left-drag=select, Alt+drag=orbit | Industry standard (Blender, Maya, etc.) | Separate mode toggle button (rejected: extra UI) |
| TBD | Intersection-based selection | Matches user expectation from other tools | Containment-based (rejected: frustrating for large objects) |
| TBD | Web Worker LSP | Keeps main thread responsive | In-process (rejected: blocks UI) |
| TBD | userData for metadata | Built into Three.js, no registry overhead | External map (rejected: out of sync risk) |
| TBD | Debounced editor sync | Prevents flicker during typing | Immediate (rejected: performance) |

---

## Success Criteria

The research is complete when we have:

1. **Prototypes** for each phase passing their spike tests
2. **Performance baselines** documented
3. **Architecture decisions** made and documented
4. **Implementation plan** with file-level task breakdown
5. **Risk assessment** with mitigations identified

This research plan will inform the formal change proposal (`add-interactive-editor/proposal.md`) with concrete implementation tasks.

