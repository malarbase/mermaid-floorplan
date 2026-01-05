# Interactive Editor - Implementation Tasks

## Overview

This document tracks implementation tasks for the interactive editor capability.

---

## Phase 0: Module Setup & Refactoring

### 0.1 Create viewer-core Package
- [x] 0.1.1 Create `viewer-core/` directory with `package.json`, `tsconfig.json`
- [x] 0.1.2 Define `SceneContext` interface (scene, camera, renderer, controls)
- [x] 0.1.3 Define `MeshRegistry` class (entity ↔ mesh bidirectional map)
- [x] 0.1.4 Define `SelectionAPI` interface (highlight, select, deselect, onSelect)
- [x] 0.1.5 ~~Extract floor/wall/stair rendering utilities from viewer~~ (N/A - moved to Phase 2.4a)
- [x] 0.1.6 Add build script, verify package exports
- [x] 0.1.7 Test: Import `viewer-core` types in a test file

### 0.2 Refactor Viewer to Use viewer-core
- [x] 0.2.1 Add `viewer-core` as dependency in `viewer/package.json`
- [x] 0.2.2 Implement `SceneContext` interface in `Viewer` class
- [x] 0.2.3 Replace inline mesh tracking with `MeshRegistry`
- [x] 0.2.4 Expose protected members needed for extension (`scene`, `camera`, etc.)
- [x] 0.2.5 Test: Viewer still works identically after refactor
- [x] 0.2.6 Test: Viewer bundle size unchanged (no new dependencies)

### 0.3 Create interactive-editor Package
- [x] 0.3.1 Create `interactive-editor/` directory with `package.json`, `tsconfig.json`
- [x] 0.3.2 Add dependencies: `viewer-core`, `floorplan-3d-core`, etc.
- [x] 0.3.3 Create `InteractiveEditor` class skeleton implementing `SceneContext`
- [x] 0.3.4 Set up Vite build configuration
- [x] 0.3.5 Create basic `index.html` for development/testing
- [x] 0.3.6 Test: `InteractiveEditor` renders and supports basic click selection

### 0.4 Deliverables
- [x] `viewer-core` package with shared interfaces
- [x] `viewer` refactored to use `viewer-core`
- [x] `interactive-editor` skeleton implementing `SceneContext`
- [x] All existing viewer functionality preserved

---

## Phase 1: Three.js Selection (Click & Marquee)

> **Note:** All selection code goes in `interactive-editor/src/`, not `viewer/src/`

### 1.1 Core Raycaster Implementation
- [x] 1.1.1 Create `SelectionManager` class skeleton in `interactive-editor/src/selection-manager.ts`
- [x] 1.1.2 Implement mouse click → ray cast → intersection detection
- [x] 1.1.3 Test: Console logs mesh name on click
- [ ] 1.1.4 Document: Measure raycast performance on `StyledApartment.floorplan`

### 1.2 Selectable Entity Identification
- [x] 1.2.1 Add `userData.selectableType` to floor meshes during generation (via MeshRegistry)
- [x] 1.2.2 Add `userData.entityId` (room name) to floor meshes
- [x] 1.2.3 Add `userData.floorId` to all floor-level meshes
- [x] 1.2.4 Traverse parent hierarchy to find selectable ancestor
- [x] 1.2.5 Test: Click room floor → get room name

### 1.3 Visual Highlight
- [x] 1.3.1 Research: Compare OutlinePass vs emission change vs overlay mesh (chose EdgesGeometry)
- [x] 1.3.2 Prototype: Implement chosen highlight approach
- [x] 1.3.3 Test: Selected room has visible green outline
- [ ] 1.3.4 Handle: Multi-material meshes (per-face walls)
- [x] 1.3.5 Handle: Multiple highlights for multi-selection
- [ ] 1.3.6 **BUG**: Room floor highlight not visible - EdgesGeometry on thin horizontal floor plates produces nearly invisible outline (see design.md for fix options: emission change, overlay plane, or hybrid approach)

### 1.4 Marquee Selection - Rectangle Drawing
- [x] 1.4.1 ~~Create `MarqueeSelection` class~~ (integrated into SelectionManager)
- [x] 1.4.2 Add 2D overlay DOM element for rectangle
- [x] 1.4.3 Implement mousedown → track start position
- [x] 1.4.4 Implement mousemove → draw rectangle (border + semi-transparent fill)
- [x] 1.4.5 Implement mouseup → complete selection
- [x] 1.4.6 Test: Drag on canvas shows rectangle following cursor

### 1.5 Marquee Selection - Screen-Space Projection
- [x] 1.5.1 Implement `projectBoundingBoxToScreen(mesh, camera)` utility
- [x] 1.5.2 Handle 8 corners of Box3 → project to screen coordinates
- [x] 1.5.3 Skip objects behind camera (z > 1 after projection)
- [x] 1.5.4 Compute 2D screen-space bounding rect from projected points
- [x] 1.5.5 Test: Log screen bounds for a known room mesh

### 1.6 Marquee Selection - Hit Testing
- [x] 1.6.1 Implement `getObjectsInMarquee(rect)` function
- [x] 1.6.2 Iterate selectables, project each to screen space
- [x] 1.6.3 Test rect intersection with projected bounds
- [x] 1.6.4 Return list of intersecting meshes
- [x] 1.6.5 Test: Drag rectangle over 3 rooms → returns 3 meshes

### 1.7 Multi-Selection State
- [x] 1.7.1 SelectionManager uses `Set<SelectableObject>` (inherited from BaseSelectionManager)
- [x] 1.7.2 Implement `select(obj, additive)` - add to set if additive=true
- [x] 1.7.3 Implement `selectMultiple(objs, additive)` for marquee results
- [x] 1.7.4 Implement `toggleSelection(obj)` for Shift-click
- [x] 1.7.5 Implement `selectAll()` for Ctrl/Cmd+A
- [x] 1.7.6 Emit selection event with full Set contents
- [x] 1.7.7 Test: Shift-click adds to existing selection

### 1.8 Selection vs Camera Mode Separation
- [x] 1.8.1 Intercept mousedown before OrbitControls
- [x] 1.8.2 Left-click/drag without modifier → selection mode
- [x] 1.8.3 Alt+left-drag → camera orbit (pass to OrbitControls)
- [x] 1.8.4 Right-drag → camera pan (existing behavior)
- [x] 1.8.5 Middle-drag → camera orbit (existing behavior)
- [x] 1.8.6 Test: Can marquee select without accidentally orbiting camera

### 1.9 Small Drag Detection
- [x] 1.9.1 Track drag distance (pixels)
- [x] 1.9.2 If drag < 5px on mouseup → treat as click, not marquee
- [x] 1.9.3 Test: Small accidental drag still triggers click selection

### 1.10 Marquee Selection Mode Toggle
- [x] 1.10.1 Add selection mode state to SelectionManager (intersection vs containment)
- [x] 1.10.2 Add UI toggle in control plane for selection mode
- [x] 1.10.3 Update `getObjectsInMarquee()` to respect mode:
  - Intersection mode: select if bounding box intersects rectangle
  - Containment mode: select only if bounding box fully inside rectangle
- [x] 1.10.4 Persist mode preference in localStorage
- [x] 1.10.5 Show current mode indicator near marquee or in status bar
- [x] 1.10.6 Test: Toggle mode and verify different selection behavior

### 1.12 Deliverables
- [x] Working demo: Click room → highlight → selection info
- [x] Working demo: Drag rectangle → select multiple rooms
- [x] Working demo: Shift-click → add to selection
- [x] Working demo: Toggle intersection/containment mode
- [ ] Performance benchmark document
- [x] Multi-selection architecture documented (SelectionManager class)

---

## Phase 2: AST-to-3D Mapping Architecture

### 2.1 Source Location Extraction
- [x] 2.1.1 Define `JsonSourceRange` interface in `language/src/diagrams/floorplans/json-converter.ts`
- [x] 2.1.2 Extract `$cstNode.range` from Room AST during conversion
- [x] 2.1.3 Add `_sourceRange` to `JsonRoom` type
- [x] 2.1.4 Test: JSON output includes line/column info for rooms

### 2.2 Connection Source Ranges
- [x] 2.2.1 Extract source range from Connection AST nodes
- [x] 2.2.2 Add `_sourceRange` to `JsonConnection` type
- [ ] 2.2.3 Test: Door mesh userData has connection source range

### 2.3 Mesh Metadata Population
- [x] 2.3.1 Modify `generateFloor()` to copy `_sourceRange` to `mesh.userData`
  - Note: Implemented via MeshRegistry.register() which populates mesh.userData.sourceRange
- [ ] 2.3.2 Modify wall generator to add source info (see design.md for fix)
  - **BUG**: Walls registered without sourceRange in `InteractiveEditor.loadFloorplan()` - clicking wall in 3D doesn't scroll to editor
  - **Fix**: Pass parent room's `_sourceRange` to wall mesh registration
  - **Enhancement**: See 4.1.7 for ephemeral wall decoration showing which wall is selected
- [ ] 2.3.3 Modify connection renderer to add source info
- [ ] 2.3.4 Test: Selected mesh has full source range metadata

### 2.4 Registry Design
- [x] 2.4.1 Design `AstMeshRegistry` class interface
  - Note: Implemented as MeshRegistry in viewer-core/src/mesh-registry.ts
- [x] 2.4.2 Implement: Register mesh → entity mapping
- [x] 2.4.3 Implement: Clear and rebuild on reparse
- [x] 2.4.4 Test: Registry survives loadFloorplan() calls

### 2.4a Shared Rendering Utilities (from Phase 0.1.5)
- [ ] 2.4a.1 Extract `WallGenerator` from `viewer/src/wall-generator.ts` to `viewer-core`
- [ ] 2.4a.2 Update `viewer` to import from `viewer-core` instead of local
- [ ] 2.4a.3 Update `interactive-editor` to use shared `WallGenerator` for proper mesh generation
- [ ] 2.4a.4 Ensure door/window CSG cutouts work in both packages
- [ ] 2.4a.5 Test: Both packages render identical geometry for same floorplan

### 2.5 Deliverables
- [x] Source ranges in JSON export
- [x] Source ranges in mesh userData (via MeshRegistry)
- [x] Working registry with rebuild
- [ ] Shared `WallGenerator` in `viewer-core` used by both packages

---

## Phase 3: Monaco-Languageclient Integration

### 3.1 Language Server Web Worker
- [ ] 3.1.1 Create `interactive-editor/src/language-server-worker.ts`
- [ ] 3.1.2 Import Langium services with worker-compatible configuration
- [ ] 3.1.3 Set up BrowserMessageReader/Writer
- [ ] 3.1.4 Start language server
- [ ] 3.1.5 Test: Worker loads without errors

### 3.2 Monaco-Languageclient Setup
- [ ] 3.2.1 Add dependencies: monaco-languageclient, vscode-languageclient, vscode-languageserver-protocol
- [ ] 3.2.2 Create `interactive-editor/src/lsp-editor.ts` with MonacoLanguageClient (extends basic editor)
- [ ] 3.2.3 Configure document selector for 'floorplans' language
- [ ] 3.2.4 Test: LSP initialization handshake completes

### 3.3 Completion Provider
- [ ] 3.3.1 Verify Langium's built-in completion works
- [ ] 3.3.2 Test: Keyword completions appear
- [ ] 3.3.3 Test: Room name completions in `connect` statement
- [ ] 3.3.4 Test: Style name completions after `style` keyword

### 3.4 Definition Provider
- [ ] 3.4.1 Verify Langium's built-in go-to-definition works
- [ ] 3.4.2 Test: Ctrl-click style reference → jumps to definition
- [ ] 3.4.3 Test: Ctrl-click room reference in connect → jumps to room

### 3.5 Hover Provider
- [ ] 3.5.1 Research: Custom hover provider in Langium
- [ ] 3.5.2 Implement: HoverProvider for Room nodes
- [ ] 3.5.3 Display: Room name, position, size, computed area
- [ ] 3.5.4 Test: Hover shows room information

### 3.6 Semantic Tokens
- [ ] 3.6.1 Verify Langium's semantic token support
- [ ] 3.6.2 Test: Room names have distinct color
- [ ] 3.6.3 Test: Style names have distinct color

### 3.7 Deliverables
- [ ] Working LSP in web worker
- [ ] Code completion functional
- [ ] Go-to-definition functional
- [ ] Hover information functional

---

## Phase 4: Bidirectional Sync Implementation

### 4.1 3D to Editor Sync
- [x] 4.1.1 Create `EditorViewerSync` class in `interactive-editor/src/editor-viewer-sync.ts`
- [x] 4.1.2 On SelectionManager selection event, get source range
- [x] 4.1.3 Convert source range to Monaco Range
- [x] 4.1.4 Call `editor.setSelection()` and `editor.revealLineInCenter()`
- [ ] 4.1.5 Test: Click room → editor scrolls to room definition
- [ ] 4.1.6 **BUG**: Fix Monaco Range error - import monaco directly instead of using `window.monaco` in `sourceRangeToMonaco()` (see design.md for fix details)
- [ ] 4.1.7 **ENHANCEMENT**: Show ephemeral editor decoration for wall selection (see design.md)
  - When wall selected in 3D (e.g., "Kitchen_top"), scroll to parent room
  - Display inline decoration showing "← top wall" near the room definition
  - Auto-dismiss decoration after 2-3 seconds or on next selection

### 4.2 Editor to 3D Sync
- [x] 4.2.1 Listen to `editor.onDidChangeCursorPosition`
- [x] 4.2.2 Implement entity location lookup via source ranges (alternative to findNodeAtOffset)
- [x] 4.2.3 Find entity containing cursor offset
- [x] 4.2.4 Look up corresponding mesh in registry
- [x] 4.2.5 Call `SelectionManager.select()` for that mesh
- [ ] 4.2.6 Test: Place cursor in room definition → room highlights in 3D
- [ ] 4.2.7 **ENHANCEMENT**: Support multi-cursor selection - use `editor.getSelections()` instead of single cursor position (see design.md for implementation details)

### 4.3 Debouncing & Loop Prevention
- [x] 4.3.1 Implement sync direction lock in EditorViewerSync
- [x] 4.3.2 Debounce editor cursor changes (100ms)
- [ ] 4.3.3 Test: No infinite loops when clicking rapidly
- [ ] 4.3.4 Test: No feedback during typing

### 4.4 Error State Handling (Hybrid Approach)
- [x] 4.4.1 Detect parse errors from DSL parser
- [x] 4.4.2 Keep last valid 3D scene when parse fails (don't clear)
- [x] 4.4.3 Keep last valid source range mappings for selection sync
- [ ] 4.4.4 Add error state flag to viewer state management

### 4.5 Error State Visual Overlay
- [x] 4.5.1 Create error indicator component (banner or badge)
- [x] 4.5.2 Display error indicator when parse fails
- [x] 4.5.3 Show specific error message(s) from parser
- [ ] 4.5.4 Add visual treatment to 3D scene in error state (dimming, border)
- [x] 4.5.5 Clear error indicator when DSL parses successfully
- [ ] 4.5.6 Test: Error state shows overlay + stale geometry is interactive
- [ ] 4.5.7 Test: Fixing DSL clears error state and updates 3D

### 4.6 Deliverables
- [x] Bidirectional sync working (basic implementation)
- [x] No feedback loops (sync direction lock implemented)
- [x] Hybrid error handling (last valid state + error overlay)
- [x] Error state visual treatment working (error banner)

---

## Phase 5: CRUD Operations & Properties Panel

### 5.1 DSL Text Generator
- [ ] 5.1.1 Create `interactive-editor/src/dsl-generator.ts`
- [ ] 5.1.2 Implement `generateRoom(options): string`
- [ ] 5.1.3 Implement `generateConnection(options): string`
- [ ] 5.1.4 Handle indentation and formatting
- [ ] 5.1.5 Test: Generated DSL parses correctly

### 5.2 Properties Panel HTML/CSS
- [ ] 5.2.1 Add properties panel DOM to `interactive-editor/index.html`
- [ ] 5.2.2 Style panel with CSS (matches existing UI)
- [ ] 5.2.3 Implement show/hide logic based on selection
- [ ] 5.2.4 Test: Panel appears when element selected

### 5.3 Properties Panel Logic
- [ ] 5.3.1 Create `interactive-editor/src/properties-panel.ts`
- [ ] 5.3.2 Implement `render(selectableObject)` method
- [ ] 5.3.3 Generate form controls based on entity type
- [ ] 5.3.4 Populate form with current values from mesh/JSON

### 5.4 Property Editing
- [ ] 5.4.1 Add change event listeners to form inputs
- [ ] 5.4.2 Generate Monaco edit operation from property change
- [ ] 5.4.3 Apply edit to editor using `editor.executeEdits()`
- [ ] 5.4.4 Test: Change width → DSL updates → 3D updates

### 5.5 Create Operations
- [ ] 5.5.1 Add "Add Room" button to UI
- [ ] 5.5.2 Find insertion point in DSL (after last room in floor)
- [ ] 5.5.3 Generate default room DSL
- [ ] 5.5.4 Insert at position and select new room
- [ ] 5.5.5 Test: New room appears in DSL and 3D

### 5.6 Delete Operations
- [ ] 5.6.1 Add "Delete" button to properties panel
- [ ] 5.6.2 Detect connections referencing the room
- [ ] 5.6.3 Show confirmation dialog with cascade warning
- [ ] 5.6.4 Remove room (and connections if confirmed) from DSL
- [ ] 5.6.5 Test: Delete room with connections shows warning

### 5.7 Export Operations
- [ ] 5.7.1 Add "Download" / "Export" button to editor toolbar
- [ ] 5.7.2 Implement DSL download: `editor.getValue()` → `.floorplan` file
- [ ] 5.7.3 Implement JSON export: parsed JSON with optional source ranges
- [ ] 5.7.4 Inherit GLB/GLTF export from Viewer base class
- [ ] 5.7.5 Add export dropdown menu (Floorplan / JSON / GLB / GLTF)
- [ ] 5.7.6 Track original filename, use as default download name
- [ ] 5.7.7 Test: Downloaded DSL file parses correctly when re-imported

### 5.8 Branching History System
- [ ] 5.8.1 Create `BranchingHistory` class in `interactive-editor/src/branching-history.ts`
- [ ] 5.8.2 Define `HistoryNode` interface:
  - `id: string` (unique node identifier)
  - `content: string` (full DSL text snapshot)
  - `timestamp: Date`
  - `parent: string | null` (parent node id)
  - `children: string[]` (child branch ids)
  - `metadata: { selection, scrollPosition, label? }`
- [ ] 5.8.3 Implement `snapshot()` - capture current state, create new node
- [ ] 5.8.4 Implement history as tree structure:
  - New edits create child nodes from current position
  - Editing after undo creates new branch (sibling), preserves old branch
  - Archived branches preserved with timestamps showing staleness
- [ ] 5.8.5 Implement `navigateTo(nodeId)` - restore state via `setValue()`
- [ ] 5.8.6 Note: `setValue()` clears Monaco's internal undo - this is intentional
- [ ] 5.8.7 Wire Ctrl/Cmd+Z to undo (navigate to parent node)
- [ ] 5.8.8 Wire Ctrl/Cmd+Shift+Z (and Ctrl+Y) to redo (navigate to most recent child)
- [ ] 5.8.9 Group bulk edits as single snapshot (e.g., 5 style changes → 1 node)
- [ ] 5.8.10 Implement configurable max history depth (prune oldest leaf branches)
- [ ] 5.8.11 Test: Undo single property edit
- [ ] 5.8.12 Test: Undo bulk edit reverts all changes at once
- [ ] 5.8.13 Test: Redo after undo works correctly
- [ ] 5.8.14 Test: Edit after undo creates new branch (old branch preserved)

### 5.9 History Browser UI
- [ ] 5.9.1 Create `HistoryBrowser` component in `interactive-editor/src/history-browser.ts`
- [ ] 5.9.2 Visualize history as tree/graph (current node highlighted)
- [ ] 5.9.3 Display timestamps and staleness indicators on archived branches
- [ ] 5.9.4 Click node to navigate to that state
- [ ] 5.9.5 Show node preview on hover (optional: diff from current)
- [ ] 5.9.6 Add keyboard navigation for history tree
- [ ] 5.9.7 Test: Navigate to archived branch via history browser
- [ ] 5.9.8 Test: Visual staleness indicators update correctly

### 5.10 Deliverables
- [ ] Properties panel functional for rooms
- [ ] Create/delete operations working
- [ ] Export operations working (DSL, JSON, GLB/GLTF)
- [ ] Branching history system working (git-like undo tree)
- [ ] History browser UI for navigating all states
- [ ] Bulk edits treated as single history nodes

---

## Phase 6: Integration Testing & Polish

### 6.1 End-to-End Test Scenarios
- [ ] 6.1.1 Test: Create room → Edit properties → Delete room
- [ ] 6.1.2 Test: Bidirectional sync with multiple floors
- [ ] 6.1.3 Test: LSP features during editing session
- [ ] 6.1.4 Test: Recovery from parse errors

### 6.2 Performance Validation
- [ ] 6.2.1 Benchmark: Selection response time
- [ ] 6.2.2 Benchmark: LSP completion latency
- [ ] 6.2.3 Benchmark: Full reparse time
- [ ] 6.2.4 Optimize any metrics exceeding targets

### 6.3 Keyboard Navigation
- [ ] 6.3.1 Implement Tab to cycle selection
- [ ] 6.3.2 Implement Escape to deselect
- [ ] 6.3.3 Implement Enter to focus properties
- [ ] 6.3.4 Test: Full keyboard-only workflow

### 6.4 Accessibility
- [ ] 6.4.1 Add ARIA labels to properties panel
- [ ] 6.4.2 Add screen reader announcements for selection
- [ ] 6.4.3 Test with screen reader (VoiceOver/NVDA)

### 6.5 Documentation
- [ ] 6.5.1 Document keyboard shortcuts in help overlay
- [ ] 6.5.2 Add tooltips to properties panel controls
- [ ] 6.5.3 Update README with editor features

### 6.6 Final Deliverables
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Accessibility audit complete
- [ ] Documentation complete

---

## Implementation Checkpoints

### Checkpoint 0: Module Setup Complete (End of Phase 0)
- `viewer-core` package exists with shared interfaces
- `viewer` refactored to implement `SceneContext`
- `interactive-editor` package extends `Viewer`
- All existing viewer tests still pass
- Bundle sizes verified (viewer unchanged, editor +dependencies)

### Checkpoint A: Selection Works (End of Phase 1) ✅
- [x] Can click room in 3D → room highlights
- [x] Can drag rectangle → multiple rooms highlight
- [x] Can Shift-click → add to selection
- [x] Can toggle intersection/containment mode
- [x] Selection doesn't conflict with camera orbit
- [ ] Performance is acceptable (not yet benchmarked)

### Checkpoint B: Mapping Works (End of Phase 2) (Partial ✓)
- [x] JsonSourceRange defined and exported from language and floorplan-3d-core
- [x] Rooms have `_sourceRange` in JSON output
- [x] Connections have `_sourceRange` in JSON output
- [x] MeshRegistry stores and propagates source ranges to mesh.userData
- [x] Registry tracks all entities with bidirectional lookup
- [ ] Shared `WallGenerator` produces identical geometry in viewer and editor (deferred to 2.4a)

### Checkpoint C: LSP Works (End of Phase 3)
- Completion shows room/style names
- Go-to-definition works

### Checkpoint D: Sync Works (End of Phase 4) (Partial ✓)
- [x] Click 3D → editor scrolls and highlights (EditorViewerSync.scrollEditorToRange)
- [x] Cursor in editor → 3D highlights (EditorViewerSync.onEditorSelect)
- [x] No infinite loops (sync direction lock implemented)
- [x] Parse errors show overlay + keep last valid state
- [ ] Selection works on stale geometry during error state (needs testing)
- [ ] **Known Issues (see design.md for detailed fix guidance):**
  - 4.1.6: Monaco Range undefined error (missing import)
  - 4.2.7: Multi-cursor only syncs first cursor
  - 1.3.6: Room floor highlight not visible (thin geometry)
  - 2.3.2: Walls don't scroll to editor (missing sourceRange)
  - 4.1.7: Ephemeral wall decoration enhancement (nice-to-have)

### Checkpoint E: CRUD Works (End of Phase 5)
- Edit property → DSL updates → 3D updates
- Create and delete operations work
- Export works: DSL download, JSON export, GLB/GLTF (inherited)
- Branching history system works (git-like undo tree)
- Edit after undo creates new branch (old branch preserved)
- History browser allows navigation to any past state
- Bulk edits treated as single history node

### Checkpoint F: Ready for Release (End of Phase 6)
- All features working
- Performance validated
- Accessibility verified
- Documentation complete

