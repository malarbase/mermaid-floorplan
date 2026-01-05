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
- [x] 1.3.6 **BUG**: Room floor highlight not visible - EdgesGeometry on thin horizontal floor plates produces nearly invisible outline (see design.md for fix options: emission change, overlay plane, or hybrid approach)
  - **Fixed**: Added emission-based highlighting for room floors in addition to edge outlines

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
- [x] 2.2.3 Test: Door mesh userData has connection source range
  - **Done**: Connection meshes now registered via MeshRegistry with sourceRange from JSON

### 2.3 Mesh Metadata Population
- [x] 2.3.1 Modify `generateFloor()` to copy `_sourceRange` to `mesh.userData`
  - Note: Implemented via MeshRegistry.register() which populates mesh.userData.sourceRange
- [x] 2.3.2 Modify wall generator to add source info (see design.md for fix)
  - **BUG**: Walls registered without sourceRange in `InteractiveEditor.loadFloorplan()` - clicking wall in 3D doesn't scroll to editor
  - **Fixed**: Now passing parent room's `_sourceRange` to wall mesh registration
  - **Enhancement**: See 4.1.7 for ephemeral wall decoration showing which wall is selected
- [x] 2.3.3 Modify connection renderer to add source info
  - **Done**: Added connection rendering using `generateFloorConnections()` from floorplan-3d-core
  - Connection meshes registered in MeshRegistry with `_sourceRange` from matching JsonConnection
- [x] 2.3.4 Test: Selected mesh has full source range metadata
  - **Done**: All entity types (room, wall, connection) now have sourceRange in mesh.userData

### 2.4 Registry Design
- [x] 2.4.1 Design `AstMeshRegistry` class interface
  - Note: Implemented as MeshRegistry in viewer-core/src/mesh-registry.ts
- [x] 2.4.2 Implement: Register mesh → entity mapping
- [x] 2.4.3 Implement: Clear and rebuild on reparse
- [x] 2.4.4 Test: Registry survives loadFloorplan() calls

### 2.4a Shared Rendering Utilities (from Phase 0.1.5)

**Goal:** Share viewer's advanced rendering capabilities with interactive-editor so both have identical 3D output with proper wall ownership, CSG cutouts, and floor stacking.

**Architecture Decision:** Move `WallGenerator` to `viewer-core` (not `floorplan-3d-core`) because:
- CSG operations require `three-bvh-csg` which is browser-only
- `floorplan-3d-core` is headless-compatible (no browser deps)
- `viewer-core` is browser-only and already depends on Three.js

**Tasks:**

- [x] 2.4a.1 Add dependencies to `viewer-core/package.json`:
  - Add `three-bvh-csg` as peerDependency (matches viewer/interactive-editor)
  - Add `floorplan-3d-core` as dependency (for types and wall-ownership)
- [x] 2.4a.2 Copy `viewer/src/wall-generator.ts` to `viewer-core/src/wall-generator.ts`
  - Update imports to use `floorplan-3d-core` 
  - Export from `viewer-core/src/index.ts`
- [x] 2.4a.3 Update `viewer` to import `WallGenerator` from `viewer-core` instead of local
  - Delete local `viewer/src/wall-generator.ts`
  - Update imports in `viewer/src/main.ts`
- [x] 2.4a.4 Refactor `interactive-editor/src/interactive-editor.ts` to use `WallGenerator`:
  - Import `WallGenerator` from `viewer-core`
  - Add CSG evaluator initialization
  - Replace simplified wall generation with `WallGenerator.generateWall()`
  - Add `resolveRoomStyle()` method for style resolution
  - Set up style resolver for wall ownership detection
- [x] 2.4a.5 **BUG FIX**: Multi-floor rendering overlaps
  - Add `floorHeights: number[]` tracking to `InteractiveEditor`
  - Add `setExplodedView(factor)` method (port from viewer)
  - Calculate cumulative floor elevations in `loadFloorplan()`
  - Apply floor group Y positions based on cumulative heights
- [x] 2.4a.6 **BUG FIX**: Shared wall selection inconsistency
  - `WallGenerator` already uses `analyzeWallOwnership()` from `floorplan-3d-core`
  - Once we use `WallGenerator`, shared walls only render once (by owner room)
  - No duplicate meshes = deterministic raycast selection
- [ ] 2.4a.7 Test: Verify wall ownership works - shared walls only rendered once
- [ ] 2.4a.8 Test: Verify door/window CSG cutouts render correctly
- [ ] 2.4a.9 Test: Verify multi-floor stacking with StairsAndLifts.floorplan
- [ ] 2.4a.10 Test: Both packages render identical geometry for StyledApartment.floorplan

### 2.4b Shared Viewer Managers

**Goal:** Move viewer's manager classes to `viewer-core` so interactive-editor has full feature parity, including keyboard navigation, camera controls, annotations, floor visibility, and 2D overlay.

**Files to Move:**
| File | Purpose | Dependencies |
|------|---------|--------------|
| `pivot-indicator.ts` | Visual pivot point during camera movement | Minimal |
| `keyboard-controls.ts` | WASD pan, Q/E vertical, +/- zoom, view presets | `pivot-indicator.ts` |
| `camera-manager.ts` | Perspective/orthographic toggle, isometric, FOV | `keyboard-controls.ts` |
| `floor-manager.ts` | Floor visibility toggles, show/hide all | Minimal |
| `annotation-manager.ts` | Area labels, dimensions, floor summary | CSS2DObject |
| `overlay-2d-manager.ts` | 2D SVG overlay rendering, drag/resize | `floorplans-language` |

**Tasks:**

- [ ] 2.4b.1 Move `viewer/src/pivot-indicator.ts` to `viewer-core/src/pivot-indicator.ts`
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import from `viewer-core`
- [ ] 2.4b.2 Move `viewer/src/keyboard-controls.ts` to `viewer-core/src/keyboard-controls.ts`
  - Update import for `PivotIndicator` to use local path
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import from `viewer-core`
- [ ] 2.4b.3 Move `viewer/src/camera-manager.ts` to `viewer-core/src/camera-manager.ts`
  - Update import for `KeyboardControls` type
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import from `viewer-core`
- [ ] 2.4b.4 Move `viewer/src/floor-manager.ts` to `viewer-core/src/floor-manager.ts`
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import from `viewer-core`
- [ ] 2.4b.5 Move `viewer/src/annotation-manager.ts` to `viewer-core/src/annotation-manager.ts`
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import from `viewer-core`
- [ ] 2.4b.6 Move `viewer/src/overlay-2d-manager.ts` to `viewer-core/src/overlay-2d-manager.ts`
  - Add `floorplans-language` as dependency to `viewer-core/package.json`
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import from `viewer-core`
- [ ] 2.4b.6a Move `viewer/src/materials.ts` to `viewer-core/src/materials.ts`
  - Contains `BrowserMaterialFactory` with async texture loading (extends `floorplan-3d-core` `MaterialFactory`)
  - Export from `viewer-core/src/index.ts`
  - Update `viewer` to import `BrowserMaterialFactory` from `viewer-core`
- [ ] 2.4b.7 Update `InteractiveEditor` to initialize all managers:
  - Add manager instance variables (pivotIndicator, keyboardControls, cameraManager, etc.)
  - Initialize managers in constructor with appropriate callbacks
  - Update animation loop to call `keyboardControls.update(deltaTime)`
  - Update pivot indicator size based on active camera
- [ ] 2.4b.8 Update `interactive-editor/index.html` with UI controls:
  - Camera controls section (mode toggle, FOV slider, isometric button)
  - Light controls section (azimuth, elevation, intensity sliders)
  - Annotation controls (area labels, dimensions, floor summary toggles)
  - Floor visibility controls (floor list checkboxes, show/hide all)
  - 2D overlay controls (toggle, opacity slider, drag/resize container)
  - Keyboard help overlay (triggered by ? or H key)
- [ ] 2.4b.9 Test: Keyboard controls work (WASD, Q/E, +/-, 1/3/7, Home, F)
- [ ] 2.4b.10 Test: Camera mode toggle switches between perspective/orthographic
- [ ] 2.4b.11 Test: Annotations display area labels and dimensions
- [ ] 2.4b.12 Test: Floor visibility controls hide/show individual floors
- [ ] 2.4b.13 Test: 2D overlay renders and can be dragged/resized

### 2.4c Shared UI Components

**Goal:** Extract reusable UI components to `viewer-core` so interactive-editor inherits viewer's UI capabilities without code duplication. UI components create DOM elements programmatically while preserving the same element IDs, ensuring existing managers work unchanged.

**Architecture:**
```
viewer-core/src/ui/
├── index.ts                    # Export all UI components
├── styles.ts                   # Shared CSS as template literal + injectStyles()
├── control-panel-section.ts    # Collapsible section component
├── camera-controls-ui.ts       # Camera mode, FOV, isometric buttons
├── light-controls-ui.ts        # Azimuth, elevation, intensity sliders
├── floor-controls-ui.ts        # Floor list, show/hide all buttons
├── annotation-controls-ui.ts   # Area, dimensions, floor summary toggles
├── overlay-2d-ui.ts            # 2D mini-map container with drag/resize
├── keyboard-help-ui.ts         # Keyboard shortcuts overlay
└── slider-control.ts           # Reusable slider with label component
```

**Tasks:**

- [ ] 2.4c.1 Create `viewer-core/src/ui/styles.ts`:
  - Export `SHARED_STYLES` constant with CSS from viewer/index.html
  - Export `injectStyles(id?)` function to inject CSS into document head
  - Include dark theme support via body.dark-theme selectors
- [ ] 2.4c.2 Create `viewer-core/src/ui/control-panel-section.ts`:
  - Collapsible section with header + content
  - Toggle via click on header
  - Preserves collapsed state
- [ ] 2.4c.3 Create `viewer-core/src/ui/slider-control.ts`:
  - Reusable slider with label, value display, and callbacks
  - Used by camera, light, and other control UIs
- [ ] 2.4c.4 Create `viewer-core/src/ui/camera-controls-ui.ts`:
  - Creates camera mode button (#camera-mode-btn)
  - Creates FOV slider (#fov-slider, #fov-value)
  - Creates isometric button (#isometric-btn)
  - Same element IDs as viewer/index.html
- [ ] 2.4c.5 Create `viewer-core/src/ui/light-controls-ui.ts`:
  - Creates azimuth slider (#light-azimuth, #light-azimuth-value)
  - Creates elevation slider (#light-elevation, #light-elevation-value)
  - Creates intensity slider (#light-intensity, #light-intensity-value)
- [ ] 2.4c.6 Create `viewer-core/src/ui/floor-controls-ui.ts`:
  - Creates floor list container (#floor-list)
  - Creates show/hide all buttons (#show-all-floors, #hide-all-floors)
- [ ] 2.4c.7 Create `viewer-core/src/ui/annotation-controls-ui.ts`:
  - Creates area toggle (#show-area)
  - Creates dimensions toggle (#show-dimensions)
  - Creates floor summary toggle (#show-floor-summary)
  - Creates unit dropdowns (#area-unit, #length-unit)
- [ ] 2.4c.8 Create `viewer-core/src/ui/overlay-2d-ui.ts`:
  - Creates 2D overlay container (#overlay-2d)
  - Creates header with close button (#overlay-2d-header, #overlay-2d-close)
  - Creates content area (#overlay-2d-content)
  - Creates resize handle (#overlay-2d-resize)
- [ ] 2.4c.9 Create `viewer-core/src/ui/keyboard-help-ui.ts`:
  - Creates keyboard shortcuts overlay (#keyboard-help-overlay)
  - Creates close button (#keyboard-help-close)
  - Includes all shortcut sections (Navigation, Camera Views, Focus & Pivot, Help)
- [ ] 2.4c.10 Create `viewer-core/src/ui/index.ts`:
  - Export all UI components
  - Export `injectStyles` function
  - Export element interface types
- [ ] 2.4c.11 Update `viewer/index.html` to use shared UI components:
  - Remove inline CSS that's now in styles.ts
  - Replace control panel HTML with JS-created components
  - Verify managers still find elements by ID
- [ ] 2.4c.12 Update `interactive-editor/index.html` to use shared UI components:
  - Add camera controls section
  - Add floor controls section
  - Add keyboard help overlay
  - Add 2D overlay container
  - Keep editor-specific UI (properties panel, selection info)
- [ ] 2.4c.13 Test: Viewer functionality unchanged after refactor
- [ ] 2.4c.14 Test: Interactive-editor has camera controls working
- [ ] 2.4c.15 Test: Interactive-editor has keyboard help overlay
- [ ] 2.4c.16 Test: Interactive-editor has floor visibility controls
- [ ] 2.4c.17 Test: Dark theme works in both viewer and interactive-editor

### 2.5 Deliverables
- [x] Source ranges in JSON export
- [x] Source ranges in mesh userData (via MeshRegistry)
- [x] Working registry with rebuild
- [x] Shared `WallGenerator` in `viewer-core` used by both packages
- [x] Multi-floor elevation stacking working in both packages
- [x] Shared wall ownership working (no duplicate walls)
- [ ] Shared keyboard controls, camera manager, annotation manager in `viewer-core`
- [ ] Shared UI components in `viewer-core/src/ui/` for both packages
- [ ] Interactive-editor has full viewer UI parity (keyboard nav, annotations, floor controls, 2D overlay)
- [ ] No viewer functionality regression after UI refactor

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
- [x] 4.1.5 Test: Click room → editor scrolls to room definition
- [x] 4.1.6 **BUG**: Fix Monaco Range error - import monaco directly instead of using `window.monaco` in `sourceRangeToMonaco()` (see design.md for fix details)
  - **Fixed**: Changed `import type * as monaco` to `import * as monaco` and removed window lookup
- [x] 4.1.7 **ENHANCEMENT**: Show ephemeral editor decoration for wall selection (see design.md)
  - When wall selected in 3D (e.g., "Kitchen_top"), scroll to parent room
  - Display inline decoration showing "← top wall" near the room definition
  - Auto-dismiss decoration after 3 seconds or on next selection
  - **Implemented**: Added showWallDecoration() and clearWallDecoration() methods

### 4.2 Editor to 3D Sync
- [x] 4.2.1 Listen to `editor.onDidChangeCursorPosition`
- [x] 4.2.2 Implement entity location lookup via source ranges (alternative to findNodeAtOffset)
- [x] 4.2.3 Find entity containing cursor offset
- [x] 4.2.4 Look up corresponding mesh in registry
- [x] 4.2.5 Call `SelectionManager.select()` for that mesh
- [x] 4.2.6 Test: Place cursor in room definition → room highlights in 3D
- [x] 4.2.7 **ENHANCEMENT**: Support multi-cursor selection - use `editor.getSelections()` instead of single cursor position (see design.md for implementation details)
  - **Implemented**: Added handleMultipleCursorChanges() method and isAdditive flag to callbacks
- [x] 4.2.8 **ENHANCEMENT**: Select wall direction in editor → highlight wall in 3D (see design.md)
  - **Implemented**: Extract wall source ranges from grammar (`WallSpecification.$cstNode`)
  - **Implemented**: Added `_sourceRange` to `JsonWall` interface in json-converter.ts
  - **Implemented**: Added walls to `extractEntityLocations()` in index.html
- [x] 4.2.9 **BUG**: Wall range inside room range - room selected instead of wall (see design.md)
  - **Fixed**: Updated `findEntityAtPosition()` to return most specific (smallest) matching range
  - **Implemented**: Added `getRangeSize()` helper to calculate range specificity
- [x] 4.2.10 **ENHANCEMENT**: Text highlight → 3D highlight preview (see design.md)
  - Listen to `onDidChangeCursorSelection` for text range selections (not just cursor)
  - When text range spans entities, HIGHLIGHT (preview) those entities in 3D without selecting
  - Use existing `SelectionManager.highlight()` API for non-destructive preview
  - Clear highlights when text selection is cleared
  - Keep existing cursor position → SELECT behavior unchanged
  - **Implemented**: Added `setupTextHighlightSync()` with `onEditorHighlight`/`onEditorHighlightClear` callbacks
  - **Implemented**: Added `findEntitiesInRange()` helper to find overlapping entities
  - Test: Select room definition text → room highlights (green glow) in 3D
  - Test: Clear text selection → highlight clears, cursor selection remains

### 4.3 Debouncing & Loop Prevention
- [x] 4.3.1 Implement sync direction lock in EditorViewerSync
- [x] 4.3.2 Debounce editor cursor changes (100ms)
- [ ] 4.3.3 Test: No infinite loops when clicking rapidly
- [ ] 4.3.4 Test: No feedback during typing
- [x] 4.3.5 **BUG**: Multi-selection in 3D doesn't highlight all items in editor (see design.md)
  - **Fixed**: Added CSS for `selected-entity-decoration` class
  - **Fixed**: Track and clear decoration collection via `multiSelectDecorations` property

### 4.4 Error State Handling (Hybrid Approach)
- [x] 4.4.1 Detect parse errors from DSL parser
- [x] 4.4.2 Keep last valid 3D scene when parse fails (don't clear)
- [x] 4.4.3 Keep last valid source range mappings for selection sync
- [x] 4.4.4 Add error state flag to viewer state management
  - **Done**: Added `hasParseError`, `lastValidFloorplanData`, `setErrorState()` to InteractiveEditor
  - index.html calls `setErrorState(true)` on parse/conversion errors

### 4.5 Error State Visual Overlay
- [x] 4.5.1 Create error indicator component (banner or badge)
- [x] 4.5.2 Display error indicator when parse fails
- [x] 4.5.3 Show specific error message(s) from parser
- [x] 4.5.4 Add visual treatment to 3D scene in error state (dimming, border)
  - **Done**: Added semi-transparent overlay with red border and "Viewing stale geometry" badge
  - Overlay uses `pointer-events: none` so selection still works on stale geometry
- [x] 4.5.5 Clear error indicator when DSL parses successfully
- [x] 4.5.6 Test: Error state shows overlay + stale geometry is interactive
  - Overlay allows click-through via `pointer-events: none`
- [x] 4.5.7 Test: Fixing DSL clears error state and updates 3D
  - hideError() removes overlay when parse succeeds

### 4.6 Deliverables
- [x] Bidirectional sync working (basic implementation)
- [x] No feedback loops (sync direction lock implemented)
- [x] Hybrid error handling (last valid state + error overlay)
- [x] Error state visual treatment working (error banner)
- [x] Error state flag in viewer state management (hasParseError, setErrorState)

---

## Phase 5: CRUD Operations & Properties Panel

### 5.1 DSL Text Generator
- [x] 5.1.1 Create `interactive-editor/src/dsl-generator.ts`
- [x] 5.1.2 Implement `generateRoom(options): string`
- [x] 5.1.3 Implement `generateConnection(options): string`
- [x] 5.1.4 Handle indentation and formatting
- [x] 5.1.5 Test: Generated DSL parses correctly (verified via Add Room feature)

### 5.2 Properties Panel HTML/CSS
- [x] 5.2.1 Add properties panel DOM to `interactive-editor/index.html`
- [x] 5.2.2 Style panel with CSS (matches existing UI)
- [x] 5.2.3 Implement show/hide logic based on selection
- [x] 5.2.4 Test: Panel appears when element selected

### 5.3 Properties Panel Logic
- [x] 5.3.1 Create `interactive-editor/src/properties-panel.ts`
- [x] 5.3.2 Implement `render(selectableObject)` method
  - `show(selection, data)` renders form for entity type
- [x] 5.3.3 Generate form controls based on entity type
  - Property definitions for room, wall, connection
  - Supports text, number, select, readonly types
- [x] 5.3.4 Populate form with current values from mesh/JSON
  - `updatePropertiesPanel()` in index.html extracts entity data from JSON

### 5.4 Property Editing
- [x] 5.4.1 Add change event listeners to form inputs (already implemented in properties-panel.ts)
- [x] 5.4.2 Generate Monaco edit operation from property change (DslPropertyEditor class)
- [x] 5.4.3 Apply edit to editor using `model.pushEditOperations()`
- [x] 5.4.4 Test: Change width → DSL updates → 3D updates

### 5.5 Create Operations
- [x] 5.5.1 Add "Add Room" button to UI (editor header)
- [x] 5.5.2 Find insertion point in DSL (after last room in floor)
- [x] 5.5.3 Generate default room DSL (using DslGenerator.generateRoom())
- [x] 5.5.4 Insert at position and select new room
- [x] 5.5.5 Test: New room appears in DSL and 3D

### 5.6 Delete Operations
- [x] 5.6.1 Add "Delete" button to properties panel (PropertiesPanel class)
- [x] 5.6.2 Detect connections referencing the room
- [x] 5.6.3 Show confirmation dialog with cascade warning
- [x] 5.6.4 Remove room (and connections if confirmed) from DSL
- [x] 5.6.5 Test: Delete room with connections shows warning

### 5.7 Export Operations
- [x] 5.7.1 Add "Download" / "Export" button to editor toolbar (export dropdown)
- [x] 5.7.2 Implement DSL download: `editor.getValue()` → `.floorplan` file
- [x] 5.7.3 Implement JSON export: parsed JSON with source ranges stripped
- [x] 5.7.4 Implement GLB/GLTF export using THREE.GLTFExporter (dynamic import)
- [x] 5.7.5 Add export dropdown menu (Floorplan / JSON / GLB / GLTF)
- [x] 5.7.6 Track original filename, use as default download name
- [x] 5.7.7 Test: Downloaded DSL file parses correctly when re-imported

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
- [x] Properties panel functional for rooms
- [x] Create/delete operations working
- [x] Export operations working (DSL, JSON, GLB/GLTF)
- [ ] Branching history system working (git-like undo tree) (deferred to 5.8)
- [ ] History browser UI for navigating all states (deferred to 5.9)
- [ ] Bulk edits treated as single history nodes (deferred to 5.8)

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
- [x] 6.3.1 Implement Tab to cycle selection (cycleSelection() method)
- [x] 6.3.2 Implement Escape to deselect (already implemented)
- [x] 6.3.3 Implement Enter to focus properties (onEnterPressed callback)
- [x] 6.3.4 Help panel updated with new keyboard shortcuts

### 6.4 Accessibility
- [x] 6.4.1 Add ARIA labels to panels (properties panel, viewer, editor)
- [x] 6.4.2 Add aria-live regions for selection status and error banner
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

### Checkpoint B: Mapping Works (End of Phase 2) ✓
- [x] JsonSourceRange defined and exported from language and floorplan-3d-core
- [x] Rooms have `_sourceRange` in JSON output
- [x] Connections have `_sourceRange` in JSON output
- [x] MeshRegistry stores and propagates source ranges to mesh.userData
- [x] Registry tracks all entities with bidirectional lookup
- [x] Shared `WallGenerator` in `viewer-core` used by both packages
- [x] Multi-floor elevation stacking working
- [x] Shared wall ownership working (no duplicate walls)

### Checkpoint C: LSP Works (End of Phase 3)
- Completion shows room/style names
- Go-to-definition works

### Checkpoint D: Sync Works (End of Phase 4) ✓
- [x] Click 3D → editor scrolls and highlights (EditorViewerSync.scrollEditorToRange)
- [x] Cursor in editor → 3D highlights (EditorViewerSync.onEditorSelect)
- [x] Text highlight in editor → 3D preview (EditorViewerSync.onEditorHighlight)
- [x] No infinite loops (sync direction lock implemented)
- [x] Parse errors show overlay + keep last valid state
- [x] Error state flag implemented in InteractiveEditor (4.4.4)
- [x] **Fixed Issues:**
  - 4.1.6: Monaco Range undefined error - fixed by importing monaco directly
  - 4.2.7: Multi-cursor now syncs all cursors with additive selection
  - 1.3.6: Room floor highlight now visible via emission + edges
  - 2.3.2: Walls now scroll to parent room definition
  - 4.1.7: Ephemeral wall decoration shows "← direction wall" hint
  - 4.2.10: Text highlight → 3D preview via highlight() API
  - 2.3.3: Connections now rendered with source ranges (using generateFloorConnections)

### Checkpoint E: CRUD Works (End of Phase 5) (Partial ✓)
- [x] Edit property → DSL updates → 3D updates (via DslPropertyEditor)
- [x] Create and delete operations work (Add Room dialog, Delete with cascade)
- [x] Export works: DSL download, JSON export, GLB/GLTF
- [ ] Branching history system works (git-like undo tree) (deferred)
- [ ] Edit after undo creates new branch (old branch preserved) (deferred)
- [ ] History browser allows navigation to any past state (deferred)
- [ ] Bulk edits treated as single history node (deferred)

### Checkpoint F: Ready for Release (End of Phase 6) (Partial ✓)
- [x] Core features working (selection, sync, CRUD, export)
- [x] Keyboard navigation working (Tab, Escape, Enter, Ctrl+A)
- [x] Basic accessibility (ARIA labels, live regions)
- [ ] Performance validated (benchmark tests pending)
- [ ] Full accessibility audit (screen reader testing pending)
- [ ] Documentation complete

