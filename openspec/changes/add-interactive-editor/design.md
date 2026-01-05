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

| Component | File | Purpose |
|-----------|------|---------|
| Selection Manager | `interactive-editor/src/selection-manager.ts` | 3D click/marquee selection |
| Editor-Viewer Sync | `interactive-editor/src/editor-viewer-sync.ts` | Bidirectional sync |
| DSL Editor | `interactive-editor/src/dsl-editor.ts` | Monaco setup |
| Interactive Editor | `interactive-editor/src/interactive-editor.ts` | Main editor class |
| Base Selection | `viewer-core/src/selection-api.ts` | Selection interfaces |
| Mesh Registry | `viewer-core/src/mesh-registry.ts` | Entity-mesh mapping |

