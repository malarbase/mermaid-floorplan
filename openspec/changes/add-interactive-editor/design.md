# Interactive Editor - Design Decisions & Technical Details

This document captures technical decisions, implementation details, and fix guidance for the interactive editor.

---

## Known Issues & Fix Details

### 4.1.6: Monaco Range Error (TypeError: Cannot read properties of undefined)

**Symptom:** Clicking a room in 3D throws:
```
TypeError: Cannot read properties of undefined (reading 'Range')
    at EditorViewerSync.sourceRangeToMonaco (editor-viewer-sync.ts:261:23)
```

**File:** `interactive-editor/src/editor-viewer-sync.ts`

**Root Cause:** Line 259 tries to dynamically access Monaco from the window object:
```typescript
const monaco = (window as unknown as { monaco: typeof import('monaco-editor') }).monaco;
```
But Monaco is imported via npm in `dsl-editor.ts`, not exposed on `window`.

**Fix:**
1. Add import at top of `editor-viewer-sync.ts`:
   ```typescript
   import * as monaco from 'monaco-editor';
   ```
2. Remove the dynamic window lookup at line 259
3. Use the imported `monaco` directly in `sourceRangeToMonaco()`

**Affected Code:**
```typescript
// Before (line 257-266):
private sourceRangeToMonaco(range: SourceRange): monaco.Range {
  const monaco = (window as unknown as { monaco: typeof import('monaco-editor') }).monaco;
  return new monaco.Range(...);
}

// After:
private sourceRangeToMonaco(range: SourceRange): monaco.Range {
  return new monaco.Range(
    range.startLine + 1,
    range.startColumn + 1,
    range.endLine + 1,
    range.endColumn + 1
  );
}
```

---

### 1.3.6: Room Floor Highlight Not Visible

**Symptom:** Selecting a room in editor shows "1 items selected" but no visible highlight in 3D. Walls highlight correctly.

**Root Cause:** Room floor plates are thin horizontal `BoxGeometry`. The `EdgesGeometry` outline is drawn around all edges, but:
- Edges are nearly coplanar (all at floor level)
- Green outline on dark background at floor level is barely visible
- Walls have tall vertical edges that are clearly visible

**File:** `interactive-editor/src/selection-manager.ts` (applyHighlight method, line 564-591)

**Potential Fixes (choose one):**

1. **Material emission change** - Increase floor material emission when selected:
   ```typescript
   if (mesh.material instanceof THREE.MeshStandardMaterial) {
     mesh.material.emissive.setHex(highlight ? 0x00ff00 : 0x000000);
     mesh.material.emissiveIntensity = highlight ? 0.3 : 0;
   }
   ```

2. **Overlay plane** - Add a semi-transparent highlight plane above the floor:
   ```typescript
   const overlayGeom = new THREE.PlaneGeometry(width, height);
   const overlayMat = new THREE.MeshBasicMaterial({ 
     color: 0x00ff00, 
     transparent: true, 
     opacity: 0.2,
     side: THREE.DoubleSide 
   });
   const overlay = new THREE.Mesh(overlayGeom, overlayMat);
   overlay.position.copy(floorMesh.position);
   overlay.position.y += 0.01; // Slightly above floor
   overlay.rotation.x = -Math.PI / 2;
   ```

3. **Hybrid approach** - Use EdgesGeometry for walls (vertical), emission/overlay for floors (horizontal)

**Recommendation:** Option 1 (emission change) is simplest and works well. Check if mesh is floor vs wall by geometry aspect ratio or entity type.

---

### 4.2.7: Multi-Cursor Only Syncs First Cursor

**Symptom:** Using multi-cursor in Monaco editor (Ctrl/Cmd+click) only highlights the first cursor's entity in 3D.

**File:** `interactive-editor/src/editor-viewer-sync.ts`

**Root Cause:** `onDidChangeCursorPosition` only provides the primary cursor position. Multi-cursor positions require `editor.getSelections()`.

**Fix:**
1. In `setupCursorSync()`, use `editor.getSelections()` to get all cursor positions
2. Create new method `handleMultipleCursorChanges(selections: monaco.Selection[])`
3. Collect all unique entity keys from all cursor positions
4. Update `index.html` callback to support additive selection for multiple entities

**Code Changes:**
```typescript
// In setupCursorSync():
this.cursorDebounceTimeout = setTimeout(() => {
  const selections = this.editor.getSelections();
  if (selections && selections.length > 1) {
    this.handleMultipleCursorChanges(selections);
  } else {
    this.handleCursorChange(event.position);
  }
}, this.config.cursorDebounceMs);

// New method:
private handleMultipleCursorChanges(selections: monaco.Selection[]): void {
  this.lockSync('editor-to-3d');
  
  const entityKeys = new Set<string>();
  for (const selection of selections) {
    const entityKey = this.findEntityAtPosition(selection.getPosition());
    if (entityKey) {
      entityKeys.add(entityKey);
    }
  }
  
  // Emit callback for each unique entity (consumer handles additive selection)
  if (this.onEditorSelectCallback) {
    for (const entityKey of entityKeys) {
      this.onEditorSelectCallback(entityKey);
    }
  }
}
```

**Note:** The callback in `index.html` needs to be updated to pass `additive: true` when handling multiple callbacks in sequence.

---

### 2.3.2: Walls Don't Scroll to Editor

**Symptom:** Clicking a wall in 3D highlights it but doesn't scroll editor to the room definition.

**File:** `interactive-editor/src/interactive-editor.ts`

**Root Cause:** Walls are registered without `sourceRange` (line 322-327):
```typescript
this._meshRegistry.register(
  wallMesh,
  'wall',
  `${room.name}_${wall.direction}`,
  floorData.id
  // Missing: room._sourceRange
);
```

**Fix:** Pass the parent room's `_sourceRange` when registering walls:
```typescript
this._meshRegistry.register(
  wallMesh,
  'wall',
  `${room.name}_${wall.direction}`,
  floorData.id,
  room._sourceRange  // Add this
);
```

This will scroll to the parent room definition when clicking any wall.

---

### 4.1.7: Ephemeral Wall Decoration (Enhancement)

**Goal:** When a wall is selected in 3D, show an ephemeral inline decoration in the editor indicating which wall (e.g., "→ top wall selected").

**Implementation Approach:**

1. **Parse wall entity ID** to extract room name and direction:
   ```typescript
   // Entity ID format: "Kitchen_top"
   const match = entityId.match(/^(.+)_(top|bottom|left|right)$/);
   if (match) {
     const [, roomName, direction] = match;
     // ...
   }
   ```

2. **Create inline decoration** using Monaco's decoration API:
   ```typescript
   const decorations = this.editor.createDecorationsCollection([{
     range: monacoRange, // Room's source range
     options: {
       after: {
         content: ` ← ${direction} wall`,
         inlineClassName: 'wall-selection-hint',
       },
       className: 'wall-selection-highlight',
     },
   }]);
   ```

3. **Auto-dismiss** after timeout or on next selection:
   ```typescript
   setTimeout(() => {
     decorations.clear();
   }, 3000);
   ```

4. **CSS styling** in `index.html`:
   ```css
   .wall-selection-hint {
     color: #4a9eff;
     font-style: italic;
     margin-left: 8px;
   }
   .wall-selection-highlight {
     background-color: rgba(74, 158, 255, 0.1);
   }
   ```

**Files to modify:**
- `interactive-editor/src/editor-viewer-sync.ts` - Add wall decoration logic
- `interactive-editor/index.html` - Add CSS styles

---

### 4.3.5: Multi-Selection Not Highlighting All Items in Editor

**Symptom:** When selecting multiple rooms/walls in 3D, only the first item is highlighted in the editor. Additional selections are not visible.

**Root Cause:** Two issues:
1. CSS class `selected-entity-decoration` used for multi-selection highlighting is not defined
2. Decoration collection is not tracked/cleared between selections, causing stale decorations

**File:** `interactive-editor/src/editor-viewer-sync.ts` and `interactive-editor/index.html`

**Fix:**
1. Add CSS styling for `.selected-entity-decoration`:
   ```css
   .selected-entity-decoration {
     background-color: rgba(0, 255, 0, 0.15);
     border: 1px solid rgba(0, 255, 0, 0.3);
   }
   ```

2. Track decoration collection in `EditorViewerSync`:
   ```typescript
   private multiSelectDecorations: monaco.editor.IEditorDecorationsCollection | null = null;
   ```

3. Clear previous decorations in `highlightEditorRanges()`:
   ```typescript
   if (this.multiSelectDecorations) {
     this.multiSelectDecorations.clear();
     this.multiSelectDecorations = null;
   }
   ```

---

### 4.2.8: Select Wall Direction in Editor → Highlight Wall in 3D

**Symptom:** Placing cursor on wall direction text (top/left/bottom/right) in editor doesn't highlight the corresponding wall in 3D.

**Root Cause:** `extractEntityLocations()` only tracks rooms and connections. Walls have no source ranges in JSON and aren't added to entity locations.

**Files:**
- `language/src/diagrams/floorplans/json-converter.ts` - Add `_sourceRange` to walls
- `interactive-editor/index.html` - Add walls to `extractEntityLocations()`

**Grammar Insight:** Each `WallSpecification` AST node has `$cstNode` with exact source range:
```langium
WallSpecification:
    direction=WallDirection ':' type=WallType 
    ('at' position=NUMBER unit=('%')?)?;
```

**Fix:**
1. Add `_sourceRange` to `JsonWall` interface:
   ```typescript
   export interface JsonWall {
     direction: "top" | "bottom" | "left" | "right";
     type: string;
     // ... existing fields
     _sourceRange?: JsonSourceRange;
   }
   ```

2. Extract source range in json-converter:
   ```typescript
   walls.push({
     direction: spec.direction as JsonWall['direction'],
     type: spec.type,
     // ... existing fields
     _sourceRange: extractSourceRange(spec.$cstNode)
   });
   ```

3. Add walls to `extractEntityLocations()`:
   ```javascript
   for (const floor of jsonData.floors) {
     for (const room of floor.rooms) {
       // ... existing room code
       for (const wall of room.walls) {
         if (wall._sourceRange) {
           locations.push({
             entityType: 'wall',
             entityId: `${room.name}_${wall.direction}`,
             floorId: floor.id,
             sourceRange: wall._sourceRange,
           });
         }
       }
     }
   }
   ```

---

### 2.4a.6: Multi-Floor Rendering Overlaps (Deferred)

**Symptom:** When loading a floorplan with multiple floors, all floors render at the same Y level, creating an overlapped mess.

**Root Cause:** `InteractiveEditor.loadFloorplan()` doesn't compute floor elevations. Unlike the viewer, it renders all floors at elevation 0.

**Status:** Deferred to task 2.4a (Shared Rendering Utilities). Fix requires adopting viewer's floor elevation calculation which properly stacks floors based on cumulative heights.

---

### 2.4a.7: Shared Wall Selection Inconsistency (Deferred)

**Symptom:** When clicking a shared wall in 3D, selection inconsistently assigns to either adjacent room depending on camera angle.

**Root Cause:** InteractiveEditor creates **independent wall meshes** for each room. Shared walls produce **duplicate overlapping meshes** (one from each adjacent room). Raycasting hits whichever mesh happens to be "in front" - this is camera-dependent and inconsistent.

**How Viewer Solves This:** The viewer uses `floorplan-3d-core/src/wall-ownership.ts` with deterministic ownership rules:
- **Vertical walls** (left/right): Room with smaller X position owns the wall
- **Horizontal walls** (top/bottom): Room with smaller Z position owns the wall
- Only the "owner" room creates the mesh, preventing duplicate overlapping meshes

The viewer uses `analyzeWallOwnership()` in `wall-generator.ts` (line 82) to skip walls owned by adjacent rooms:
```typescript
const ownership = analyzeWallOwnership(room, wall, allRooms, styleResolver);
if (!ownership.shouldRender) continue; // Skip - owned by adjacent room
```

**Resolution:** Fixed when adopting viewer's `WallGenerator` via task 2.4a.3. The `analyzeWallOwnership()` function ensures single-owner wall rendering with no duplicate meshes.

---

### 4.2.9: Wall Range Prioritization Over Room Range

**Symptom:** When cursor is on wall direction text (e.g., `top: solid`), the room gets selected instead of the wall because room's range encompasses wall's range.

**Root Cause:** `findEntityAtPosition()` returned the first matching entity. Since rooms are often iterated before their child walls, and room ranges contain wall ranges, rooms matched first.

**Fix:** Updated `findEntityAtPosition()` to find ALL matching entities and return the **most specific** (smallest range) one. Added `getRangeSize()` helper method.

```typescript
// New approach: Find smallest matching range
let bestMatch: { key: string; size: number } | null = null;
for (const [key, entity] of this.entityLocations) {
  if (this.isPositionInRange(line, column, range)) {
    const size = this.getRangeSize(range);
    if (bestMatch === null || size < bestMatch.size) {
      bestMatch = { key, size };
    }
  }
}
return bestMatch?.key ?? null;
```

---

### 4.2.10: Text Highlight → 3D Highlight Preview (Enhancement)

**Goal:** When user selects a text range in the editor (e.g., highlighting code for copy/paste), preview the contained entities in 3D by highlighting them—without changing the actual selection state.

**UX Rationale:**
- **Current behavior:** Cursor position triggers 3D selection (solid commitment)
- **New behavior:** Text highlight triggers 3D preview (ephemeral visual feedback)
- This mirrors 3D hover behavior: hovering shows preview, clicking commits selection
- Enables "what would I get?" preview before any action
- Natural for copy/paste workflows: user sees what entities their selection spans

**Distinction: Cursor vs Text Selection**
| Action | Editor State | 3D Response |
|--------|--------------|-------------|
| Click/arrow keys | Cursor moves, no selection | **Select** entity at cursor |
| Shift+click/Shift+arrows | Text range selected | **Highlight** (preview) entities in range |
| Multi-cursor (Cmd+click) | Multiple cursors | **Select** entities at each cursor |

**Implementation Approach:**

**File:** `interactive-editor/src/editor-viewer-sync.ts`

1. **Listen to selection changes** (not just cursor):
   ```typescript
   this.editor.onDidChangeSelection((event) => {
     const selections = this.editor.getSelections();
     for (const selection of selections) {
       if (!selection.isEmpty()) {
         // Text is highlighted - preview mode
         this.handleTextHighlight(selection);
       }
     }
   });
   ```

2. **Find entities within text range:**
   ```typescript
   private handleTextHighlight(selection: monaco.Selection): void {
     const entitiesInRange = this.findEntitiesInRange(
       selection.startLineNumber,
       selection.startColumn,
       selection.endLineNumber,
       selection.endColumn
     );
     
     // Use highlight (preview) instead of select
     if (this.onEditorHighlightCallback && entitiesInRange.length > 0) {
       this.onEditorHighlightCallback(entitiesInRange);
     }
   }
   ```

3. **New callback for highlight preview:**
   ```typescript
   onEditorHighlight(callback: (entityKeys: string[]) => void): void {
     this.onEditorHighlightCallback = callback;
   }
   ```

4. **Wire up in index.html:**
   ```javascript
   editorSync.onEditorHighlight((entityKeys) => {
     editor3d.selectionManager.clearHighlights();
     for (const key of entityKeys) {
       const mesh = editor3d.meshRegistry.getMeshByEntityKey(key);
       if (mesh) {
         editor3d.selectionManager.highlight(mesh, true); // Preview highlight
       }
     }
   });
   ```

5. **Clear highlights when selection cleared:**
   ```typescript
   // In onDidChangeSelection handler
   if (selection.isEmpty()) {
     if (this.onEditorHighlightClearCallback) {
       this.onEditorHighlightClearCallback();
     }
   }
   ```

**Visual Distinction:**
- **Selection:** Green edge outline (EdgesGeometry)
- **Highlight/Preview:** Emission glow or different color (e.g., blue tint)

This keeps selection (commitment) and highlight (preview) visually distinct.

**Files to modify:**
- `interactive-editor/src/editor-viewer-sync.ts` - Add highlight detection and callbacks
- `interactive-editor/src/selection-manager.ts` - Ensure `highlight()` method works independently of `select()`
- `interactive-editor/index.html` - Wire up highlight callback

---

## Phase 2.4b: Shared Viewer Managers

### Goal

Move viewer's manager classes to `viewer-core` so interactive-editor has full feature parity with viewer, including:
- Keyboard navigation (WASD, zoom, view presets)
- Camera mode switching (perspective/orthographic/isometric)
- Annotations (area labels, dimensions, floor summaries)
- 2D SVG overlay
- Floor visibility controls
- Pivot indicator

### Files to Move to viewer-core

| File | Purpose | Dependencies |
|------|---------|--------------|
| `keyboard-controls.ts` | WASD pan, Q/E vertical, +/- zoom, 1/3/7 views, Home reset, F frame | `pivot-indicator.ts` |
| `camera-manager.ts` | Perspective/orthographic toggle, isometric view, FOV control | `keyboard-controls.ts` |
| `annotation-manager.ts` | Area labels, dimension labels, floor summary panel | CSS2DObject |
| `floor-manager.ts` | Floor visibility toggles, show/hide all buttons | Minimal |
| `overlay-2d-manager.ts` | 2D SVG overlay rendering, drag/resize | `floorplans-language` |
| `pivot-indicator.ts` | Visual pivot point that shows during camera movement | Minimal |
| `materials.ts` | BrowserMaterialFactory with async texture loading | `floorplan-3d-core/materials.ts` |

**Note on materials.ts:**
- `floorplan-3d-core/src/materials.ts` contains the base `MaterialFactory` (headless-compatible)
- `viewer/src/materials.ts` contains `BrowserMaterialFactory` which extends it with async texture loading
- Moving `BrowserMaterialFactory` to `viewer-core` allows interactive-editor to share async texture loading

### Implementation Steps

#### 2.4b.1 Move `pivot-indicator.ts` to viewer-core
- Copy `viewer/src/pivot-indicator.ts` → `viewer-core/src/pivot-indicator.ts`
- Export from `viewer-core/src/index.ts`
- Update `viewer` to import from `viewer-core`

#### 2.4b.2 Move `keyboard-controls.ts` to viewer-core
- Copy `viewer/src/keyboard-controls.ts` → `viewer-core/src/keyboard-controls.ts`
- Update import for `PivotIndicator` to use local path
- Export from `viewer-core/src/index.ts`
- Update `viewer` to import from `viewer-core`

#### 2.4b.3 Move `camera-manager.ts` to viewer-core
- Copy `viewer/src/camera-manager.ts` → `viewer-core/src/camera-manager.ts`
- Update import for `KeyboardControls` type
- Export from `viewer-core/src/index.ts`
- Update `viewer` to import from `viewer-core`

#### 2.4b.4 Move `floor-manager.ts` to viewer-core
- Copy `viewer/src/floor-manager.ts` → `viewer-core/src/floor-manager.ts`
- Export from `viewer-core/src/index.ts`
- Update `viewer` to import from `viewer-core`

#### 2.4b.5 Move `annotation-manager.ts` to viewer-core
- Copy `viewer/src/annotation-manager.ts` → `viewer-core/src/annotation-manager.ts`
- Export from `viewer-core/src/index.ts`
- Update `viewer` to import from `viewer-core`

#### 2.4b.6 Move `overlay-2d-manager.ts` to viewer-core
- Add `floorplans-language` as dependency to `viewer-core/package.json`
- Copy `viewer/src/overlay-2d-manager.ts` → `viewer-core/src/overlay-2d-manager.ts`
- Export from `viewer-core/src/index.ts`
- Update `viewer` to import from `viewer-core`

#### 2.4b.7 Update interactive-editor to use managers
- Add manager instance variables to `InteractiveEditor` class
- Initialize managers in constructor (similar to viewer's `main.ts`)
- Wire up manager callbacks to InteractiveEditor methods
- Update animation loop to call `keyboardControls.update(deltaTime)`

#### 2.4b.8 Update interactive-editor/index.html
- Add UI controls for keyboard help overlay
- Add UI controls for camera mode toggle, FOV slider, isometric button
- Add UI controls for annotations (area labels, dimensions, floor summary)
- Add UI controls for floor visibility (floor list, show/hide all)
- Add 2D overlay container with drag/resize handles

### Manager Callback Interfaces

Each manager follows a callback-based pattern for accessing shared state. Here are the interfaces:

```typescript
// keyboard-controls.ts constructor options
interface KeyboardControlsOptions {
  onCameraModeToggle: () => void;           // Toggle perspective/orthographic
  onUpdateOrthographicSize: () => void;     // Recalculate ortho frustum
  getBoundingBox: () => THREE.Box3 | null;  // Scene bounds for framing
  setHelpOverlayVisible: (visible: boolean) => void;
}

// camera-manager.ts callbacks
interface CameraManagerCallbacks {
  getFloors: () => THREE.Group[];
  getKeyboardControls: () => KeyboardControls | null;
}

// floor-manager.ts callbacks
interface FloorManagerCallbacks {
  getFloors: () => THREE.Group[];
  getFloorplanData: () => JsonExport | null;
  onVisibilityChange: () => void;  // Called when any floor visibility changes
}

// annotation-manager.ts callbacks
interface AnnotationCallbacks {
  getFloors: () => THREE.Group[];
  getFloorplanData: () => JsonExport | null;
  getConfig: () => JsonConfig;
  getFloorVisibility: (id: string) => boolean;
}

// overlay-2d-manager.ts callbacks
interface Overlay2DCallbacks {
  getCurrentTheme: () => ViewerTheme;
  getFloorplanData: () => JsonExport | null;
  getVisibleFloorIds: () => string[];
}
```

### Manager Initialization Pattern

```typescript
// In InteractiveEditor constructor:

// Initialize pivot indicator first (no dependencies)
this.pivotIndicator = new PivotIndicator(this._scene, this._controls);

// FloorManager first (minimal deps, needed by others)
this.floorManager = new FloorManager({
  getFloors: () => this._floors,
  getFloorplanData: () => this.currentFloorplanData,
  onVisibilityChange: () => {
    this.annotationManager?.updateFloorSummary();
    this.overlay2DManager?.render();
  },
});

// AnnotationManager (depends on floorManager)
this.annotationManager = new AnnotationManager({
  getFloors: () => this._floors,
  getFloorplanData: () => this.currentFloorplanData,
  getConfig: () => this.currentFloorplanData?.config ?? {},
  getFloorVisibility: (id) => this.floorManager.getFloorVisibility(id),
});

// CameraManager (depends on keyboardControls, but we pass getter)
this.cameraManager = new CameraManager(
  this._perspectiveCamera,
  this._orthographicCamera,
  this._controls,
  {
    getFloors: () => this._floors,
    getKeyboardControls: () => this.keyboardControls,
  }
);

// KeyboardControls (depends on cameraManager)
this.keyboardControls = new KeyboardControls(
  this._controls,
  this._perspectiveCamera,
  this._orthographicCamera,
  {
    onCameraModeToggle: () => this.cameraManager.toggleCameraMode(),
    onUpdateOrthographicSize: () => this.cameraManager.updateOrthographicSize(),
    getBoundingBox: () => this.cameraManager.getSceneBoundingBox(),
    setHelpOverlayVisible: (visible) => this.setHelpOverlayVisible(visible),
  }
);
this.keyboardControls.setPivotIndicator(this.pivotIndicator);

// Overlay2DManager (depends on floorManager for visible floors)
this.overlay2DManager = new Overlay2DManager({
  getCurrentTheme: () => this.currentTheme,
  getFloorplanData: () => this.currentFloorplanData,
  getVisibleFloorIds: () => this.floorManager.getVisibleFloorIds(),
});
```

### Manager UI Setup Pattern

Each manager has a `setupControls()` method that binds to DOM elements by ID. Call these after the HTML is loaded:

```typescript
// After DOM is ready and managers are initialized
this.cameraManager.setupControls();       // Binds to #camera-mode-btn, #fov-slider, #isometric-btn
this.floorManager.setupControls();        // Binds to #show-all-floors, #hide-all-floors
this.annotationManager.setupControls();   // Binds to #show-area, #show-dimensions, etc.
this.overlay2DManager.setupControls();    // Binds to #show-2d-overlay, #overlay-opacity, etc.
// KeyboardControls binds listeners in constructor (no setupControls needed)
```

### Animation Loop Update

```typescript
private animate(): void {
  this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  
  // Calculate delta time
  const now = performance.now();
  const deltaTime = this.lastFrameTime ? now - this.lastFrameTime : 16;
  this.lastFrameTime = now;
  
  // Update keyboard controls (WASD movement)
  this.keyboardControls?.update(deltaTime);
  
  // Update pivot indicator (fade in/out)
  this.pivotIndicator?.update(deltaTime);
  this.pivotIndicator?.updateSize(this.cameraManager?.activeCamera ?? this._activeCamera);
  
  this._controls.update();
  
  const activeCamera = this.cameraManager?.activeCamera ?? this._activeCamera;
  this._renderer.render(this._scene, activeCamera);
  this.labelRenderer.render(this._scene, activeCamera);
}
```

### UI Controls Required in index.html

The interactive-editor's `index.html` needs these additional UI controls (can be copied from viewer's `index.html`):

1. **Camera Section**
   - Camera mode toggle button (perspective/orthographic)
   - FOV slider (visible only in perspective mode)
   - Isometric view button

2. **Light Section**
   - Light azimuth slider
   - Light elevation slider
   - Light intensity slider

3. **Annotations Section**
   - Show area labels toggle
   - Show dimensions toggle
   - Show floor summary toggle
   - Area unit dropdown (sqft/sqm)
   - Length unit dropdown (m/ft/cm/in/mm)

4. **Floors Section**
   - Floor list with visibility checkboxes
   - Show all / Hide all buttons

5. **2D Overlay Section**
   - Show 2D overlay toggle
   - Opacity slider

6. **Keyboard Help Overlay**
   - Full keyboard shortcuts panel (triggered by ? or H key)

---

## Phase 2.4c: Shared UI Components

### Goal

Extract reusable UI components from `viewer/index.html` to `viewer-core` so both viewer and interactive-editor can share the same UI code without duplication. The key constraint is **no viewer functionality regression**.

### Architecture Pattern

UI components are TypeScript classes that:
1. Create DOM elements programmatically
2. Use the **same element IDs** as the original HTML
3. Inject shared CSS via `injectStyles()`
4. Return typed element references for direct access

This allows existing managers (`CameraManager.setupControls()`, etc.) to work unchanged since they find elements by ID.

### Component Interface Pattern

```typescript
// Each UI component follows this pattern:
export interface XxxControlsUIOptions {
  container: HTMLElement;           // Parent element to append to
  onSetup?: (elements: XxxElements) => void;  // Optional callback with element refs
}

export interface XxxElements {
  someButton: HTMLButtonElement;
  someSlider: HTMLInputElement;
  // ... typed element references
}

export class XxxControlsUI {
  private elements: XxxElements;
  
  constructor(options: XxxControlsUIOptions) {
    const section = this.createSection();
    options.container.appendChild(section);
    this.elements = this.queryElements(section);
    options.onSetup?.(this.elements);
  }
  
  private createSection(): HTMLElement {
    const el = document.createElement('div');
    el.innerHTML = `...`; // HTML with same IDs as viewer/index.html
    return el;
  }
  
  private queryElements(section: HTMLElement): XxxElements {
    return {
      someButton: section.querySelector('#some-button')!,
      // ...
    };
  }
  
  public getElements(): XxxElements {
    return this.elements;
  }
}
```

### Styles Injection

```typescript
// viewer-core/src/ui/styles.ts
export const SHARED_STYLES = `
  .control-section { ... }
  .section-header { ... }
  /* All shared CSS */
  
  /* Dark theme via body class */
  body.dark-theme .control-section { ... }
`;

export function injectStyles(id: string = 'viewer-core-styles'): void {
  if (document.getElementById(id)) return; // Idempotent
  const style = document.createElement('style');
  style.id = id;
  style.textContent = SHARED_STYLES;
  document.head.appendChild(style);
}
```

### Usage in Viewer (Minimal Changes)

```typescript
// viewer/src/main.ts
import { injectStyles, CameraControlsUI, FloorControlsUI } from 'viewer-core/ui';

// Inject shared styles once
injectStyles();

// Create UI components - they add elements with same IDs
const controlsContainer = document.getElementById('controls')!;
new CameraControlsUI({ container: controlsContainer });
new FloorControlsUI({ container: controlsContainer });
// ...

// Existing manager code works unchanged!
this.cameraManager.setupControls(); // Finds #camera-mode-btn, #fov-slider by ID
```

### Usage in Interactive Editor

```typescript
// interactive-editor/src/main.ts
import { injectStyles, CameraControlsUI, KeyboardHelpUI } from 'viewer-core/ui';

injectStyles();

// Only add the controls we want
const controlsContainer = document.getElementById('viewer-controls')!;
new CameraControlsUI({ container: controlsContainer });

// Keyboard help available via shared component
new KeyboardHelpUI({ container: document.body });

// Editor-specific UI (properties panel, etc.) stays in index.html
```

### Migration Strategy

1. **Phase 1**: Create `styles.ts` with all shared CSS
2. **Phase 2**: Create one UI component (e.g., `KeyboardHelpUI`)
3. **Phase 3**: Update viewer to use it, run tests
4. **Phase 4**: Update interactive-editor to use it
5. **Repeat** for each component
6. **Final**: Remove duplicate CSS/HTML from both index.html files

### Benefits

- **No viewer regression**: Same element IDs, managers work identically
- **Composable**: Each app picks which components to include
- **Type-safe**: TypeScript interfaces for element access
- **Testable**: Can unit test UI creation
- **Single source**: CSS and HTML in one place

---

## Shared Selection & Sync Architecture

### Design Principle: Read vs Write Separation

Selection and text↔3D sync are **read-only exploration capabilities** that benefit both viewer and editor. Only the properties panel and CRUD operations are **write capabilities** that belong exclusively to the editor.

| Capability | Type | Package | Notes |
|------------|------|---------|-------|
| SelectionManager | Read | `viewer-core` | Click/marquee selection, highlights |
| EditorViewerSync | Read | `viewer-core` | Cursor↔3D sync, no edits |
| MeshRegistry | Read | `viewer-core` | Entity↔mesh mapping |
| PropertiesPanel | Write | `interactive-editor` | Edit selected entity |
| DslPropertyEditor | Write | `interactive-editor` | Modify DSL code |
| DslGenerator | Write | `interactive-editor` | Generate new DSL |

### SelectionManager in viewer-core

The `SelectionManager` provides read-only selection:
- Click to select entity (room, wall, connection)
- Shift-click to add/remove from selection
- Marquee drag to select multiple
- Visual highlight via `EdgesGeometry` + emission
- Emits `onSelectionChange` callback with selected entities

**Key Design**: SelectionManager has no knowledge of editing. It only:
1. Tracks which entities are selected
2. Applies visual highlights
3. Emits selection events

The editor listens to these events and shows the properties panel.

### EditorViewerSync in viewer-core

The `EditorViewerSync` provides read-only sync:
- Cursor position in Monaco → highlight entity in 3D
- Click entity in 3D → scroll Monaco to source line
- Multi-cursor support for multiple highlights

**Key Design**: EditorViewerSync does not modify the DSL. It only:
1. Maps cursor positions to entity keys
2. Maps entity keys to source ranges
3. Scrolls/reveals without editing

### Viewer Usage Pattern

```typescript
// viewer/src/main.ts
import { SelectionManager, EditorViewerSync } from 'viewer-core';

// Viewer uses selection for exploration (read-only)
this.selectionManager = new SelectionManager(this.scene, this.meshRegistry);
this.selectionManager.onSelectionChange((event) => {
  // Show selection info (count, names) - NO properties panel
  this.updateSelectionInfo(event.selection);
});

// Viewer uses sync for navigation (read-only)
this.editorSync = new EditorViewerSync(this.monacoEditor, this.selectionManager);
// Click in 3D → scroll to DSL line (no editing)
```

### Editor Usage Pattern

```typescript
// interactive-editor/src/interactive-editor.ts
import { SelectionManager, EditorViewerSync } from 'viewer-core';
import { PropertiesPanel } from './properties-panel.js';

// Editor inherits same selection/sync from viewer-core
this.selectionManager = new SelectionManager(this.scene, this.meshRegistry);
this.editorSync = new EditorViewerSync(this.monacoEditor, this.selectionManager);

// Editor ADDS properties panel on top
this.propertiesPanel = new PropertiesPanel({
  container: 'properties-panel',
  onPropertyChange: (event) => {
    // EDITOR-ONLY: Modify DSL via DslPropertyEditor
    const edit = this.dslPropertyEditor.generateEdit(event);
    this.monacoEditor.executeEdits(edit);
  },
});

this.selectionManager.onSelectionChange((event) => {
  // Same selection info as viewer
  this.updateSelectionInfo(event.selection);
  // PLUS: Show properties panel (editor-only)
  if (event.selection.size === 1) {
    this.propertiesPanel.show(event.selection.values().next().value);
  } else {
    this.propertiesPanel.hide();
  }
});
```

---

## Architecture Decisions

### Selection Highlighting Strategy

**Decision:** Use `EdgesGeometry` + `LineSegments` for selection outlines.

**Rationale:**
- Simpler than OutlinePass (no composer setup)
- More visible than emission changes alone
- Works with multi-material meshes
- Lower performance overhead than post-processing

**Trade-off:** Thin/flat geometry (like floor plates) may need supplemental highlighting (see 1.3.6).

### Sync Direction Locking

**Decision:** Use a sync direction lock with auto-release timeout to prevent feedback loops.

**Rationale:**
- Simple state machine: `'none' | '3d-to-editor' | 'editor-to-3d'`
- 200ms auto-release handles async events
- No need for complex transaction tracking

**Code:** `EditorViewerSync.lockSync()` method

### Entity Location Index

**Decision:** Build entity location index from JSON source ranges rather than walking AST.

**Rationale:**
- JSON already has `_sourceRange` from Langium conversion
- Avoids needing AST access in browser (large dependency)
- Index is rebuilt on each successful parse
- Simple `Map<string, EntityLocation>` lookup

---

## File Reference

### viewer-core (Shared Read-Only Capabilities)

| Component | File | Purpose |
|-----------|------|---------|
| Selection Manager | `viewer-core/src/selection-manager.ts` | 3D click/marquee selection (SHARED) |
| Editor-Viewer Sync | `viewer-core/src/editor-viewer-sync.ts` | Bidirectional sync (SHARED) |
| Selection API | `viewer-core/src/selection-api.ts` | Selection interfaces |
| Mesh Registry | `viewer-core/src/mesh-registry.ts` | Entity-mesh mapping |
| Wall Generator | `viewer-core/src/wall-generator.ts` | Shared wall rendering with CSG (complete) |
| Keyboard Controls | `viewer-core/src/keyboard-controls.ts` (planned) | WASD nav, zoom, view presets |
| Camera Manager | `viewer-core/src/camera-manager.ts` (planned) | Camera mode switching |
| Annotation Manager | `viewer-core/src/annotation-manager.ts` (planned) | Labels and dimensions |
| Floor Manager | `viewer-core/src/floor-manager.ts` (planned) | Floor visibility controls |
| Overlay 2D Manager | `viewer-core/src/overlay-2d-manager.ts` (planned) | 2D SVG overlay |
| Pivot Indicator | `viewer-core/src/pivot-indicator.ts` (planned) | Visual pivot point |

### viewer-core/ui (Shared UI Components)

| Component | File | Purpose |
|-----------|------|---------|
| UI Styles | `viewer-core/src/ui/styles.ts` (planned) | Shared CSS + injectStyles() |
| Camera Controls UI | `viewer-core/src/ui/camera-controls-ui.ts` (planned) | Camera mode, FOV, isometric |
| Light Controls UI | `viewer-core/src/ui/light-controls-ui.ts` (planned) | Light azimuth, elevation, intensity |
| Floor Controls UI | `viewer-core/src/ui/floor-controls-ui.ts` (planned) | Floor visibility list |
| Annotation Controls UI | `viewer-core/src/ui/annotation-controls-ui.ts` (planned) | Area, dimensions toggles |
| Overlay 2D UI | `viewer-core/src/ui/overlay-2d-ui.ts` (planned) | 2D mini-map container |
| Keyboard Help UI | `viewer-core/src/ui/keyboard-help-ui.ts` (planned) | Shortcuts overlay |
| Selection Info UI | `viewer-core/src/ui/selection-info-ui.ts` (planned) | Selection status display |

### interactive-editor (Editor-Only Write Capabilities)

| Component | File | Purpose |
|-----------|------|---------|
| Interactive Editor | `interactive-editor/src/interactive-editor.ts` | Main editor class (extends viewer) |
| Properties Panel | `interactive-editor/src/properties-panel.ts` | Edit selected entity (EDITOR-ONLY) |
| DSL Editor | `interactive-editor/src/dsl-editor.ts` | Monaco setup |
| DSL Generator | `interactive-editor/src/dsl-generator.ts` | Generate new DSL code (EDITOR-ONLY) |
| DSL Property Editor | `interactive-editor/src/dsl-property-editor.ts` | Modify DSL properties (EDITOR-ONLY) |
| Branching History | `interactive-editor/src/branching-history.ts` (planned) | Undo/redo with branches |
| History Browser | `interactive-editor/src/history-browser.ts` (planned) | Time-travel UI |
| LSP Worker | `interactive-editor/src/lsp-worker.ts` (planned) | Language server worker |

