# Interactive Editor - Research Tasks

## Overview

This document tracks the research prototyping tasks needed before creating a formal change proposal.

---

## Phase 0: Module Setup & Refactoring

### 0.1 Create viewer-core Package
- [ ] 0.1.1 Create `viewer-core/` directory with `package.json`, `tsconfig.json`
- [ ] 0.1.2 Define `SceneContext` interface (scene, camera, renderer, controls)
- [ ] 0.1.3 Define `MeshRegistry` class (entity ↔ mesh bidirectional map)
- [ ] 0.1.4 Define `SelectionAPI` interface (highlight, select, deselect, onSelect)
- [ ] 0.1.5 Extract floor/wall/stair rendering utilities from viewer
- [ ] 0.1.6 Add build script, verify package exports
- [ ] 0.1.7 Test: Import `viewer-core` types in a test file

### 0.2 Refactor Viewer to Use viewer-core
- [ ] 0.2.1 Add `viewer-core` as dependency in `viewer/package.json`
- [ ] 0.2.2 Implement `SceneContext` interface in `Viewer` class
- [ ] 0.2.3 Replace inline mesh tracking with `MeshRegistry`
- [ ] 0.2.4 Expose protected members needed for extension (`scene`, `camera`, etc.)
- [ ] 0.2.5 Test: Viewer still works identically after refactor
- [ ] 0.2.6 Test: Viewer bundle size unchanged (no new dependencies)

### 0.3 Create interactive-editor Package
- [ ] 0.3.1 Create `interactive-editor/` directory with `package.json`, `tsconfig.json`
- [ ] 0.3.2 Add dependencies: `viewer`, `viewer-core`, `monaco-languageclient`, etc.
- [ ] 0.3.3 Create `InteractiveEditor` class skeleton extending `Viewer`
- [ ] 0.3.4 Set up Vite build configuration
- [ ] 0.3.5 Create basic `index.html` for development/testing
- [ ] 0.3.6 Test: `InteractiveEditor` renders same as `Viewer`

### 0.4 Deliverables
- [ ] `viewer-core` package with shared interfaces
- [ ] `viewer` refactored to use `viewer-core`
- [ ] `interactive-editor` skeleton extending `viewer`
- [ ] All existing viewer functionality preserved

---

## Phase 1: Three.js Selection (Click & Marquee)

> **Note:** All selection code goes in `interactive-editor/src/`, not `viewer/src/`

### 1.1 Core Raycaster Implementation
- [ ] 1.1.1 Create `SelectionManager` class skeleton in `interactive-editor/src/selection-manager.ts`
- [ ] 1.1.2 Implement mouse click → ray cast → intersection detection
- [ ] 1.1.3 Test: Console logs mesh name on click
- [ ] 1.1.4 Document: Measure raycast performance on `StyledApartment.floorplan`

### 1.2 Selectable Entity Identification
- [ ] 1.2.1 Add `userData.selectableType` to floor meshes during generation
- [ ] 1.2.2 Add `userData.entityId` (room name) to floor meshes
- [ ] 1.2.3 Add `userData.floorId` to all floor-level meshes
- [ ] 1.2.4 Traverse parent hierarchy to find selectable ancestor
- [ ] 1.2.5 Test: Click room floor → get room name

### 1.3 Visual Highlight
- [ ] 1.3.1 Research: Compare OutlinePass vs emission change vs overlay mesh
- [ ] 1.3.2 Prototype: Implement chosen highlight approach
- [ ] 1.3.3 Test: Selected room has visible green outline
- [ ] 1.3.4 Handle: Multi-material meshes (per-face walls)
- [ ] 1.3.5 Handle: Multiple highlights for multi-selection

### 1.4 Marquee Selection - Rectangle Drawing
- [ ] 1.4.1 Create `MarqueeSelection` class in `interactive-editor/src/marquee-selection.ts`
- [ ] 1.4.2 Add 2D overlay canvas or DOM element for rectangle
- [ ] 1.4.3 Implement mousedown → track start position
- [ ] 1.4.4 Implement mousemove → draw rectangle (border + semi-transparent fill)
- [ ] 1.4.5 Implement mouseup → complete selection
- [ ] 1.4.6 Test: Drag on canvas shows rectangle following cursor

### 1.5 Marquee Selection - Screen-Space Projection
- [ ] 1.5.1 Implement `projectBoundingBoxToScreen(mesh, camera)` utility
- [ ] 1.5.2 Handle 8 corners of Box3 → project to screen coordinates
- [ ] 1.5.3 Skip objects behind camera (z > 1 after projection)
- [ ] 1.5.4 Compute 2D screen-space bounding rect from projected points
- [ ] 1.5.5 Test: Log screen bounds for a known room mesh

### 1.6 Marquee Selection - Hit Testing
- [ ] 1.6.1 Implement `getSelectablesInRect(rect, selectables, camera)` function
- [ ] 1.6.2 Iterate selectables, project each to screen space
- [ ] 1.6.3 Test rect intersection with projected bounds
- [ ] 1.6.4 Return list of intersecting meshes
- [ ] 1.6.5 Test: Drag rectangle over 3 rooms → returns 3 meshes

### 1.7 Multi-Selection State
- [ ] 1.7.1 Change SelectionManager to use `Set<SelectableObject>`
- [ ] 1.7.2 Implement `select(obj, additive)` - add to set if additive=true
- [ ] 1.7.3 Implement `selectMultiple(objs, additive)` for marquee results
- [ ] 1.7.4 Implement `toggleSelection(obj)` for Shift-click
- [ ] 1.7.5 Implement `selectAll()` for Ctrl/Cmd+A
- [ ] 1.7.6 Emit selection event with full Set contents
- [ ] 1.7.7 Test: Shift-click adds to existing selection

### 1.8 Selection vs Camera Mode Separation
- [ ] 1.8.1 Intercept mousedown before OrbitControls
- [ ] 1.8.2 Left-click/drag without modifier → selection mode
- [ ] 1.8.3 Alt+left-drag → camera orbit (pass to OrbitControls)
- [ ] 1.8.4 Right-drag → camera pan (existing behavior)
- [ ] 1.8.5 Middle-drag → camera orbit (existing behavior)
- [ ] 1.8.6 Test: Can marquee select without accidentally orbiting camera

### 1.9 Small Drag Detection
- [ ] 1.9.1 Track drag distance (pixels)
- [ ] 1.9.2 If drag < 5px on mouseup → treat as click, not marquee
- [ ] 1.9.3 Test: Small accidental drag still triggers click selection

### 1.10 Marquee Selection Mode Toggle
- [ ] 1.10.1 Add selection mode state to SelectionManager (intersection vs containment)
- [ ] 1.10.2 Add UI toggle in control plane for selection mode
- [ ] 1.10.3 Update `getSelectablesInRect()` to respect mode:
  - Intersection mode: select if bounding box intersects rectangle
  - Containment mode: select only if bounding box fully inside rectangle
- [ ] 1.10.4 Persist mode preference in localStorage
- [ ] 1.10.5 Show current mode indicator near marquee or in status bar
- [ ] 1.10.6 Test: Toggle mode and verify different selection behavior

### 1.12 Deliverables
- [ ] Working demo: Click room → highlight → console log
- [ ] Working demo: Drag rectangle → select multiple rooms
- [ ] Working demo: Shift-click → add to selection
- [ ] Working demo: Toggle intersection/containment mode
- [ ] Performance benchmark document
- [ ] Multi-selection architecture documented

---

## Phase 2: AST-to-3D Mapping Architecture

### 2.1 Source Location Extraction
- [ ] 2.1.1 Define `JsonSourceRange` interface in `language/src/diagrams/floorplans/json-converter.ts`
- [ ] 2.1.2 Extract `$cstNode.range` from Room AST during conversion
- [ ] 2.1.3 Add `_sourceRange` to `JsonRoom` type
- [ ] 2.1.4 Test: JSON output includes line/column info for rooms

### 2.2 Connection Source Ranges
- [ ] 2.2.1 Extract source range from Connection AST nodes
- [ ] 2.2.2 Add `_sourceRange` to `JsonConnection` type
- [ ] 2.2.3 Test: Door mesh userData has connection source range

### 2.3 Mesh Metadata Population
- [ ] 2.3.1 Modify `generateFloor()` to copy `_sourceRange` to `mesh.userData`
- [ ] 2.3.2 Modify wall generator to add source info
- [ ] 2.3.3 Modify connection renderer to add source info
- [ ] 2.3.4 Test: Selected mesh has full source range metadata

### 2.4 Registry Design
- [ ] 2.4.1 Design `AstMeshRegistry` class interface
- [ ] 2.4.2 Implement: Register mesh → entity mapping
- [ ] 2.4.3 Implement: Clear and rebuild on reparse
- [ ] 2.4.4 Test: Registry survives loadFloorplan() calls

### 2.5 Deliverables
- [ ] Source ranges in JSON export
- [ ] Source ranges in mesh userData
- [ ] Working registry with rebuild

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
- [ ] 4.1.1 Create `EditorViewerSync` class in `interactive-editor/src/editor-viewer-sync.ts`
- [ ] 4.1.2 On SelectionManager selection event, get source range
- [ ] 4.1.3 Convert source range to Monaco Range
- [ ] 4.1.4 Call `editor.setSelection()` and `editor.revealLineInCenter()`
- [ ] 4.1.5 Test: Click room → editor scrolls to room definition

### 4.2 Editor to 3D Sync
- [ ] 4.2.1 Listen to `editor.onDidChangeCursorPosition`
- [ ] 4.2.2 Implement/export `findNodeAtOffset()` from Langium services
- [ ] 4.2.3 Find AST node containing cursor offset
- [ ] 4.2.4 Look up corresponding mesh in registry
- [ ] 4.2.5 Call `SelectionManager.select()` for that mesh
- [ ] 4.2.6 Test: Place cursor in room definition → room highlights in 3D

### 4.3 Debouncing & Loop Prevention
- [ ] 4.3.1 Implement sync direction lock in EditorViewerSync
- [ ] 4.3.2 Debounce editor cursor changes (100ms)
- [ ] 4.3.3 Test: No infinite loops when clicking rapidly
- [ ] 4.3.4 Test: No feedback during typing

### 4.4 Error State Handling (Hybrid Approach)
- [ ] 4.4.1 Detect parse errors from DSL parser
- [ ] 4.4.2 Keep last valid 3D scene when parse fails (don't clear)
- [ ] 4.4.3 Keep last valid source range mappings for selection sync
- [ ] 4.4.4 Add error state flag to viewer state management

### 4.5 Error State Visual Overlay
- [ ] 4.5.1 Create error indicator component (banner or badge)
- [ ] 4.5.2 Display error indicator when parse fails
- [ ] 4.5.3 Show specific error message(s) from parser
- [ ] 4.5.4 Add visual treatment to 3D scene in error state (dimming, border)
- [ ] 4.5.5 Clear error indicator when DSL parses successfully
- [ ] 4.5.6 Test: Error state shows overlay + stale geometry is interactive
- [ ] 4.5.7 Test: Fixing DSL clears error state and updates 3D

### 4.6 Deliverables
- [ ] Bidirectional sync working
- [ ] No feedback loops
- [ ] Hybrid error handling (last valid state + error overlay)
- [ ] Error state visual treatment working

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

## Prototype Checkpoints

### Checkpoint 0: Module Setup Complete (End of Phase 0)
- `viewer-core` package exists with shared interfaces
- `viewer` refactored to implement `SceneContext`
- `interactive-editor` package extends `Viewer`
- All existing viewer tests still pass
- Bundle sizes verified (viewer unchanged, editor +dependencies)

### Checkpoint A: Selection Works (End of Phase 1)
- Can click room in 3D → room highlights
- Can drag rectangle → multiple rooms highlight
- Can Shift-click → add to selection
- Can toggle intersection/containment mode
- Selection doesn't conflict with camera orbit
- Performance is acceptable

### Checkpoint B: Mapping Works (End of Phase 2)
- Mesh userData contains source ranges
- Registry tracks all entities

### Checkpoint C: LSP Works (End of Phase 3)
- Completion shows room/style names
- Go-to-definition works

### Checkpoint D: Sync Works (End of Phase 4)
- Click 3D → editor scrolls
- Cursor in editor → 3D highlights
- No infinite loops
- Parse errors show overlay + keep last valid state
- Selection works on stale geometry during error state

### Checkpoint E: CRUD Works (End of Phase 5)
- Edit property → DSL updates → 3D updates
- Create and delete operations work
- Export works: DSL download, JSON export, GLB/GLTF (inherited)
- Branching history system works (git-like undo tree)
- Edit after undo creates new branch (old branch preserved)
- History browser allows navigation to any past state
- Bulk edits treated as single history node

### Checkpoint F: Ready for Formal Proposal (End of Phase 6)
- All features working
- Performance validated
- Ready to convert to formal change proposal

