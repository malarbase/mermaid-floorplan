# Interactive Editor Specification (Draft)

## Purpose

Defines the interactive editing capabilities that extend the 3D viewer into a full floorplan editor with bidirectional synchronization between the Monaco code editor and 3D visualization.

---

## Requirements

### Requirement: Module Architecture

The interactive editor SHALL be implemented as a separate module (`interactive-editor`) that extends the read-only viewer, sharing common code via a `viewer-core` package.

#### Scenario: Viewer remains independently usable

- **GIVEN** a user wants to embed a read-only floorplan visualization
- **WHEN** they import only the `viewer` package
- **THEN** they SHALL get a fully functional 3D viewer
- **AND** the bundle SHALL NOT include editor-specific code (selection, sync, properties, LSP)
- **AND** the bundle size SHALL remain under 1MB (excluding Three.js)

#### Scenario: Interactive editor extends viewer

- **GIVEN** a user wants full editing capabilities
- **WHEN** they import the `interactive-editor` package
- **THEN** they SHALL get all viewer functionality plus editing features
- **AND** the `InteractiveEditor` class SHALL extend the `Viewer` class
- **AND** shared code SHALL come from `viewer-core` (not duplicated)

#### Scenario: Viewer-core provides shared abstractions

- **GIVEN** both `viewer` and `interactive-editor` need common functionality
- **WHEN** the packages are built
- **THEN** shared interfaces and utilities SHALL be in `viewer-core`
- **AND** `viewer-core` SHALL include: scene context, mesh registry, selection API, floor renderer
- **AND** both packages SHALL depend on `viewer-core`

#### Scenario: Selection API available in viewer-core

- **GIVEN** a user wants basic selection in the read-only viewer
- **WHEN** they use the `viewer-core` selection API
- **THEN** they SHALL be able to highlight meshes programmatically
- **AND** they SHALL receive selection events (for analytics, linking, etc.)
- **BUT** advanced features (marquee, properties panel) SHALL require `interactive-editor`

### Requirement: 3D Object Selection

The viewer SHALL support selecting semantic floorplan elements in the 3D scene using mouse interaction, including click selection and marquee (rectangle drag) selection.

#### Scenario: Click to select room

- **GIVEN** a floorplan with multiple rooms rendered in 3D
- **WHEN** the user clicks on a room's floor mesh
- **THEN** that room SHALL be visually highlighted
- **AND** previously selected elements SHALL be deselected (unless Shift held)
- **AND** a selection event SHALL be emitted with room metadata

#### Scenario: Click to select wall

- **GIVEN** a floorplan with walls rendered in 3D
- **WHEN** the user clicks on a wall segment
- **THEN** that wall segment SHALL be visually highlighted
- **AND** the containing room SHALL be identifiable from the selection

#### Scenario: Click to select connection (door/window)

- **GIVEN** a floorplan with door and window connections
- **WHEN** the user clicks on a door or window mesh
- **THEN** the connection element SHALL be highlighted
- **AND** both connected rooms SHALL be identifiable

#### Scenario: Click to select stair

- **GIVEN** a floorplan with stairs
- **WHEN** the user clicks on any part of a stair group
- **THEN** the entire stair SHALL be highlighted as a unit

#### Scenario: Click to select lift

- **GIVEN** a floorplan with lifts
- **WHEN** the user clicks on a lift shaft
- **THEN** the lift SHALL be highlighted

#### Scenario: Click empty space to deselect

- **WHEN** the user clicks on empty 3D space (background, floor not belonging to any room)
- **THEN** any selected element SHALL be deselected
- **AND** the selection event SHALL indicate empty selection

### Requirement: Marquee (Rectangle Drag) Selection

The viewer SHALL support selecting multiple elements by dragging a selection rectangle on the screen.

#### Scenario: Drag to create selection rectangle

- **GIVEN** the user is in selection mode (not orbiting camera)
- **WHEN** the user clicks and drags on the 3D canvas
- **THEN** a visible selection rectangle SHALL be drawn following the cursor
- **AND** the rectangle SHALL have a semi-transparent fill and visible border

#### Scenario: Marquee selects enclosed objects

- **GIVEN** the user drags a selection rectangle
- **WHEN** the user releases the mouse button
- **THEN** all selectable objects whose screen-space bounding box intersects the rectangle SHALL be selected
- **AND** the selection rectangle SHALL disappear

#### Scenario: Marquee uses frustum culling from camera perspective

- **GIVEN** the user draws a selection rectangle on screen
- **WHEN** determining which objects are selected
- **THEN** the system SHALL project each object's bounding box to screen space
- **AND** objects behind the camera SHALL NOT be selected
- **AND** only visible objects (from current camera angle) SHALL be considered

#### Scenario: Marquee selection mode toggle

- **GIVEN** the user opens the control plane / settings
- **WHEN** the user views marquee selection options
- **THEN** the user SHALL be able to toggle between:
  - **Intersection mode**: Objects partially inside the rectangle are selected
  - **Containment mode**: Only objects fully inside the rectangle are selected
- **AND** the current mode SHALL be indicated in the UI

#### Scenario: Marquee selects partially enclosed objects (intersection mode)

- **GIVEN** marquee selection is in intersection mode (default)
- **AND** a room's floor mesh is partially inside the selection rectangle
- **WHEN** the selection completes
- **THEN** that room SHALL be selected

#### Scenario: Marquee requires full containment (containment mode)

- **GIVEN** marquee selection is in containment mode
- **AND** a room's floor mesh is partially inside the selection rectangle
- **WHEN** the selection completes
- **THEN** that room SHALL NOT be selected
- **BUT** rooms fully inside the rectangle SHALL be selected

#### Scenario: Small drag treated as click

- **GIVEN** the user clicks and drags less than 5 pixels
- **WHEN** the mouse is released
- **THEN** the action SHALL be treated as a click selection (not marquee)

#### Scenario: Marquee clears previous selection by default

- **GIVEN** some elements are already selected
- **WHEN** the user drags a new selection rectangle (without Shift)
- **THEN** previous selection SHALL be cleared
- **AND** only objects in the new rectangle SHALL be selected

### Requirement: Multi-Selection Support

The viewer SHALL support selecting multiple elements simultaneously.

#### Scenario: Shift-click adds to selection

- **GIVEN** a room "Kitchen" is already selected
- **WHEN** the user Shift-clicks on room "LivingRoom"
- **THEN** both "Kitchen" and "LivingRoom" SHALL be selected
- **AND** both rooms SHALL be highlighted

#### Scenario: Shift-click toggles selection

- **GIVEN** rooms "Kitchen" and "LivingRoom" are both selected
- **WHEN** the user Shift-clicks on "Kitchen"
- **THEN** "Kitchen" SHALL be deselected
- **AND** "LivingRoom" SHALL remain selected

#### Scenario: Shift-marquee adds to selection

- **GIVEN** room "Kitchen" is already selected
- **WHEN** the user holds Shift and drags a selection rectangle over "LivingRoom" and "Hallway"
- **THEN** all three rooms ("Kitchen", "LivingRoom", "Hallway") SHALL be selected

#### Scenario: Ctrl/Cmd-A selects all

- **WHEN** the user presses Ctrl+A (Windows/Linux) or Cmd+A (Mac)
- **THEN** all selectable objects in the current view SHALL be selected

#### Scenario: Multi-selection count display

- **GIVEN** multiple elements are selected
- **WHEN** viewing the properties panel or selection indicator
- **THEN** the count of selected elements SHALL be displayed (e.g., "3 rooms selected")

### Requirement: Selection Mode vs Camera Mode

The viewer SHALL distinguish between selection interactions and camera orbit interactions.

#### Scenario: Left-click for selection

- **WHEN** the user left-clicks on the 3D canvas
- **THEN** selection mode SHALL be activated
- **AND** clicking/dragging SHALL perform selection operations

#### Scenario: Right-click or middle-click for camera

- **WHEN** the user right-clicks or middle-clicks on the 3D canvas
- **THEN** camera orbit mode SHALL be activated
- **AND** dragging SHALL rotate/pan the camera (existing OrbitControls behavior)

#### Scenario: Alt-drag for camera orbit

- **WHEN** the user holds Alt and left-drags
- **THEN** camera orbit mode SHALL be activated (industry-standard shortcut)
- **AND** selection rectangle SHALL NOT appear

#### Scenario: Distinguish marquee from orbit

- **GIVEN** the user left-clicks and starts dragging
- **WHEN** the drag begins
- **THEN** a selection rectangle SHALL appear (not camera orbit)
- **AND** camera SHALL remain stationary during marquee selection

### Requirement: Selection Visual Feedback

The viewer SHALL provide clear visual indication of selected elements.

#### Scenario: Highlight with outline

- **WHEN** an element is selected
- **THEN** a visible outline or glow effect SHALL appear around the element
- **AND** the highlight color SHALL contrast with the element's base color

#### Scenario: Multiple elements highlighted simultaneously

- **GIVEN** multiple elements are selected
- **WHEN** viewing the 3D scene
- **THEN** all selected elements SHALL be highlighted
- **AND** highlights SHALL be visually consistent across all selected items

#### Scenario: Highlight persists during camera movement

- **GIVEN** one or more elements are selected
- **WHEN** the user rotates or zooms the camera
- **THEN** all highlights SHALL remain visible and correctly positioned

#### Scenario: Multiple highlight styles for entity types

- **WHEN** different entity types are selected (room vs wall vs connection)
- **THEN** each type MAY have a distinct highlight style for clarity

#### Scenario: Selection rectangle visual feedback

- **GIVEN** the user is dragging a marquee selection
- **WHEN** the rectangle is being drawn
- **THEN** it SHALL have a visible border (e.g., dashed blue line)
- **AND** it SHALL have a semi-transparent fill (e.g., 10% opacity blue)
- **AND** objects that would be selected SHALL show a preview highlight

### Requirement: AST Source Location Preservation

The system SHALL preserve source code locations from the Langium AST through to 3D mesh metadata.

#### Scenario: JSON includes source ranges

- **GIVEN** a floorplan DSL file is parsed
- **WHEN** converted to JSON format
- **THEN** each JsonRoom SHALL include `_sourceRange` with startLine, endLine, startColumn, endColumn

#### Scenario: 3D mesh stores source range

- **GIVEN** a room is rendered in 3D
- **WHEN** the floor mesh is created
- **THEN** `mesh.userData.sourceRange` SHALL contain the DSL source location

#### Scenario: Connection source ranges

- **GIVEN** a connection statement in DSL
- **WHEN** the connection is rendered as a door/window mesh
- **THEN** the mesh SHALL contain the connection's source range

### Requirement: 3D to Editor Synchronization

Selecting element(s) in 3D SHALL synchronize with the Monaco editor.

#### Scenario: Single room selection scrolls editor

- **GIVEN** the editor panel is open
- **WHEN** the user selects a single room in 3D
- **THEN** the editor SHALL scroll to the room's definition
- **AND** the room definition text SHALL be selected/highlighted

#### Scenario: Multi-selection highlights multiple ranges

- **GIVEN** the user selects multiple rooms via marquee or Shift-click
- **WHEN** the selection completes
- **THEN** the editor SHALL scroll to the first selected element
- **AND** all selected elements' definitions SHALL be highlighted (using Monaco's multi-cursor or highlight decorations)

#### Scenario: Connection selection jumps to connect statement

- **GIVEN** a door is selected in 3D
- **WHEN** the selection completes
- **THEN** the editor SHALL scroll to the `connect` statement
- **AND** the connect statement SHALL be highlighted

### Requirement: Parse Error State Handling

The viewer SHALL gracefully handle DSL parse errors by maintaining the last valid state with clear visual indication.

#### Scenario: Parse error keeps last valid geometry

- **GIVEN** the viewer is displaying a valid floorplan
- **WHEN** the user edits the DSL and introduces a parse error
- **THEN** the 3D scene SHALL continue displaying the last successfully parsed geometry
- **AND** existing selection SHALL remain functional

#### Scenario: Parse error shows error overlay

- **GIVEN** the DSL has a parse error
- **WHEN** the viewer is in error state
- **THEN** a visible error indicator SHALL be displayed (banner, badge, or border)
- **AND** the indicator SHALL communicate that the view is stale
- **AND** the specific parse error(s) SHALL be shown in the Monaco editor

#### Scenario: Parse error visual treatment

- **GIVEN** the DSL has a parse error
- **WHEN** viewing the 3D scene
- **THEN** the scene MAY have a dimmed appearance or colored border
- **AND** it SHALL be visually distinct from the valid state

#### Scenario: Selection during editor error state

- **GIVEN** the DSL has a parse error
- **WHEN** the user selects an element in 3D
- **THEN** the last valid source range SHALL be used for editor sync
- **AND** selection highlighting SHALL work normally on stale geometry

#### Scenario: Error state clears on valid parse

- **GIVEN** the viewer is in error state
- **WHEN** the user fixes the DSL and it parses successfully
- **THEN** the error indicator SHALL be removed
- **AND** the 3D scene SHALL update to the new valid state
- **AND** any visual dimming SHALL be removed

### Requirement: Editor to 3D Synchronization

Cursor position changes in the Monaco editor SHALL update 3D highlighting.

#### Scenario: Cursor inside room definition

- **GIVEN** the editor is focused
- **WHEN** the cursor is placed inside a `room ...` definition
- **THEN** the corresponding 3D room SHALL be highlighted

#### Scenario: Cursor inside connect statement

- **GIVEN** the editor is focused
- **WHEN** the cursor is placed inside a `connect ...` statement
- **THEN** the corresponding door/window mesh SHALL be highlighted

#### Scenario: Cursor movement debouncing

- **GIVEN** the user is rapidly typing or moving the cursor
- **WHEN** cursor position changes multiple times quickly
- **THEN** 3D highlighting updates SHALL be debounced (≤100ms delay)

#### Scenario: Cursor outside selectable entities

- **WHEN** the cursor is in config block, style definition, or comments
- **THEN** no 3D highlighting SHALL occur
- **AND** existing 3D highlights MAY be cleared

### Requirement: Bidirectional Sync Conflict Prevention

The system SHALL prevent infinite feedback loops between editor and 3D sync.

#### Scenario: 3D selection does not re-trigger 3D highlight

- **WHEN** a 3D selection triggers an editor selection change
- **THEN** that editor change SHALL NOT trigger another 3D highlight update
- **AND** sync direction SHALL be locked for a brief period (≤100ms)

#### Scenario: Editor selection does not re-trigger editor selection

- **WHEN** an editor cursor change triggers a 3D highlight
- **THEN** any resulting cursor adjustment SHALL NOT trigger another 3D highlight

### Requirement: Language Server Protocol Support

The Monaco editor SHALL provide full LSP features via monaco-languageclient.

#### Scenario: Code completion for keywords

- **WHEN** the user types in the editor
- **THEN** keyword completions SHALL appear (room, floor, connect, style, config)
- **AND** completions SHALL be context-aware

#### Scenario: Code completion for room names

- **GIVEN** rooms "Kitchen" and "LivingRoom" are defined
- **WHEN** the user types `connect ` and triggers completion
- **THEN** "Kitchen" and "LivingRoom" SHALL appear as options

#### Scenario: Code completion for style names

- **GIVEN** styles "Modern" and "Rustic" are defined
- **WHEN** the user types `style ` after a room definition
- **THEN** "Modern" and "Rustic" SHALL appear as completion options

#### Scenario: Go-to-definition for style reference

- **GIVEN** a room uses `style Modern`
- **WHEN** the user Ctrl/Cmd-clicks on "Modern"
- **THEN** the cursor SHALL jump to the `style Modern { ... }` definition

#### Scenario: Hover information for room

- **GIVEN** a room "Kitchen at (0,0) size (10 x 8)"
- **WHEN** the user hovers over "Kitchen" in the editor
- **THEN** a tooltip SHALL display: "Room: Kitchen, Position: (0, 0), Size: 10 × 8, Area: 80 sq units"

#### Scenario: Inline error diagnostics

- **GIVEN** a DSL with a missing room reference in a connect statement
- **WHEN** the file is edited
- **THEN** the error SHALL be underlined in red
- **AND** hovering SHALL show the error message

#### Scenario: Semantic highlighting

- **WHEN** the DSL is displayed in the editor
- **THEN** room names SHALL have distinct coloring from keywords
- **AND** style names SHALL have distinct coloring
- **AND** numbers SHALL have distinct coloring

### Requirement: Properties Panel

The viewer SHALL provide a properties panel for editing selected elements, supporting both single and multi-selection.

#### Scenario: Panel shows room properties

- **WHEN** a single room is selected
- **THEN** the properties panel SHALL display:
  - Name (text input)
  - Position X, Y (number inputs)
  - Size Width, Height (number inputs)
  - Height (number input)
  - Elevation (number input)
  - Walls configuration (dropdown per wall)
  - Style reference (dropdown)
  - Label (text input)

#### Scenario: Panel shows connection properties

- **WHEN** a single door/window is selected
- **THEN** the properties panel SHALL display:
  - Connection type (door/double-door/opening/window)
  - Position percentage (number slider)
  - Size width × height (number inputs)
  - Swing direction (dropdown)
  - Opens into (dropdown)

#### Scenario: Multi-selection shows common properties

- **GIVEN** multiple rooms are selected
- **WHEN** viewing the properties panel
- **THEN** the panel SHALL show:
  - Selection count (e.g., "3 rooms selected")
  - Common editable properties (e.g., Style, Height)
  - Properties with mixed values SHALL show "(multiple)" placeholder
  - Editing a property SHALL apply to ALL selected elements

#### Scenario: Multi-selection bulk style change

- **GIVEN** 3 rooms are selected with different styles
- **WHEN** the user selects a new style from the dropdown
- **THEN** all 3 rooms SHALL have their style updated to the new value
- **AND** 3 DSL edits SHALL be applied (one per room)

#### Scenario: Multi-selection with mixed entity types

- **GIVEN** a room and a door are both selected
- **WHEN** viewing the properties panel
- **THEN** the panel SHALL show "2 elements selected (1 room, 1 door)"
- **AND** properties common to both types SHALL be editable (e.g., style if applicable)
- **AND** type-specific properties SHALL be hidden or disabled

#### Scenario: Mixed-type selection shows shared attributes

- **GIVEN** 2 rooms and 1 connection are selected
- **WHEN** viewing the properties panel
- **THEN** shared attributes (if any) SHALL be displayed and editable
- **AND** editing a shared attribute SHALL apply to all selected elements
- **AND** attributes unique to one type SHALL show "(not applicable to all)" or be hidden

#### Scenario: Property changes update editor

- **GIVEN** a room "Kitchen" is selected
- **WHEN** the user changes the width from 10 to 12 in the properties panel
- **THEN** the editor DSL SHALL update to show `size (12 x ...)`
- **AND** the 3D view SHALL re-render with the new dimensions

#### Scenario: Apply vs immediate mode

- **GIVEN** the properties panel is configured for immediate mode
- **WHEN** any property value changes
- **THEN** the DSL SHALL update immediately without requiring an "Apply" button

### Requirement: CRUD Operations

The editor SHALL support creating, reading, updating, and deleting floorplan elements.

#### Scenario: Create new room via UI

- **WHEN** the user clicks "Add Room" button
- **THEN** a new room definition SHALL be inserted into the DSL at an appropriate position
- **AND** the new room SHALL appear in 3D
- **AND** the room SHALL be auto-selected

#### Scenario: Delete single room with confirmation

- **GIVEN** a single room "Kitchen" is selected
- **WHEN** the user clicks "Delete" in the properties panel
- **THEN** a confirmation dialog SHALL appear
- **AND** upon confirmation, the room definition SHALL be removed from DSL
- **AND** the 3D view SHALL update

#### Scenario: Delete room with connection cascade warning

- **GIVEN** a room "Kitchen" has 2 connections to other rooms
- **WHEN** the user attempts to delete "Kitchen"
- **THEN** the dialog SHALL warn: "This will also remove 2 connections"
- **AND** SHALL list the affected connections

#### Scenario: Delete multiple rooms

- **GIVEN** 3 rooms are selected
- **WHEN** the user clicks "Delete" or presses Delete key
- **THEN** a confirmation dialog SHALL appear: "Delete 3 rooms?"
- **AND** upon confirmation, all 3 room definitions SHALL be removed
- **AND** any connections involving those rooms SHALL also be removed

#### Scenario: Bulk delete shows total impact

- **GIVEN** 2 rooms are selected, together having 5 connections
- **WHEN** the delete confirmation dialog appears
- **THEN** it SHALL show: "Delete 2 rooms and 5 affected connections?"

### Requirement: Export Edited Floorplan

The editor SHALL support downloading the edited floorplan in various formats.

#### Scenario: Download DSL source file

- **GIVEN** the user has edited a floorplan in the editor
- **WHEN** the user clicks "Download" or "Export" → "Floorplan (.floorplan)"
- **THEN** the current DSL text SHALL be downloaded as a `.floorplan` file
- **AND** the filename SHALL default to the original filename or "untitled.floorplan"

#### Scenario: Download preserves edits

- **GIVEN** the user has made unsaved edits to the floorplan
- **WHEN** the user downloads the DSL file
- **THEN** the downloaded file SHALL contain all current edits from the editor

#### Scenario: Export JSON representation

- **GIVEN** the user wants the intermediate JSON format
- **WHEN** the user clicks "Export" → "JSON"
- **THEN** the parsed JSON representation SHALL be downloaded
- **AND** source ranges MAY be included for debugging

#### Scenario: Export 3D model (inherited)

- **GIVEN** the editor extends the viewer
- **WHEN** the user clicks "Export" → "GLB" or "GLTF"
- **THEN** the 3D scene SHALL be exported (existing viewer functionality)

### Requirement: Branching History (Time-Travel Undo/Redo)

The editor SHALL support undo/redo for all edit operations using a branching history tree with state snapshots, similar to git's model.

#### Scenario: Undo after property edit

- **GIVEN** a room width was changed from 10 to 12
- **WHEN** the user presses Ctrl/Cmd+Z
- **THEN** the width SHALL revert to 10 in both DSL and 3D

#### Scenario: Undo stack captures all edit operations

- **GIVEN** the user performs multiple edits (create room, change style, delete connection)
- **WHEN** the user repeatedly presses Ctrl/Cmd+Z
- **THEN** each edit SHALL be undone in reverse order
- **AND** both DSL and 3D SHALL reflect each historical state

#### Scenario: Redo restores undone operations

- **GIVEN** the user has undone 3 operations
- **WHEN** the user presses Ctrl/Cmd+Shift+Z (or Ctrl+Y)
- **THEN** the operations SHALL be redone in order
- **AND** both DSL and 3D SHALL update accordingly

#### Scenario: Undo after bulk edit

- **GIVEN** 5 rooms were bulk-edited to change style
- **WHEN** the user presses Ctrl/Cmd+Z once
- **THEN** all 5 rooms SHALL revert to their previous styles
- **AND** the bulk edit SHALL be treated as a single undo step

#### Scenario: Edit after undo preserves history branch

- **GIVEN** the user has undone 2 operations (navigated from state S3 → S2 → S1)
- **WHEN** the user makes a new edit
- **THEN** a new branch SHALL be created from S1 (S1 → S4)
- **AND** the previous branch (S1 → S2 → S3) SHALL be archived, not deleted
- **AND** archived states SHALL display timestamps showing staleness
- **AND** the user MAY navigate to any archived state via history browser

#### Scenario: History browser shows all branches

- **GIVEN** the user has created multiple history branches through edits and undos
- **WHEN** the user opens the history browser
- **THEN** all branches SHALL be visible as a tree/graph structure
- **AND** the current state SHALL be highlighted
- **AND** each node SHALL show its timestamp
- **AND** clicking any node SHALL restore that state

#### Scenario: Undo preserves selection state

- **GIVEN** the user edits a room and then selects a different room
- **WHEN** the user presses Ctrl/Cmd+Z
- **THEN** the edit SHALL be undone
- **AND** the current selection MAY be preserved (not reverted)

#### Scenario: Create new connection via UI

- **WHEN** the user clicks "Add Connection" with two rooms selected
- **THEN** a connection dialog SHALL appear
- **AND** upon confirmation, a `connect` statement SHALL be added to DSL

### Requirement: Keyboard Navigation

The editor SHALL support keyboard-based element navigation.

#### Scenario: Tab cycles through elements

- **GIVEN** an element is selected in 3D
- **WHEN** the user presses Tab
- **THEN** selection SHALL move to the next element in document order

#### Scenario: Escape deselects

- **GIVEN** an element is selected
- **WHEN** the user presses Escape
- **THEN** the selection SHALL be cleared

#### Scenario: Enter opens properties

- **GIVEN** an element is selected
- **WHEN** the user presses Enter
- **THEN** the properties panel SHALL open/focus with the selected element

#### Scenario: Delete key triggers deletion

- **GIVEN** an element is selected
- **WHEN** the user presses Delete or Backspace
- **THEN** the delete confirmation flow SHALL begin

---

## Non-Functional Requirements

### Performance

- Selection response time: < 50ms from click to visual highlight
- LSP completion popup: < 100ms from keystroke
- Editor-to-3D sync: < 200ms debounced
- Full reparse after edit: < 500ms for typical floorplans (< 50 rooms)

### Accessibility

- All UI controls SHALL be keyboard accessible
- Properties panel SHALL use proper ARIA labels
- Selection state changes SHALL be announced to screen readers
- High contrast mode SHALL be supported

---

## Design Considerations

### Module Structure

```
mermaid-floorplan/
├── viewer-core/               # Shared abstractions
│   └── src/
│       ├── scene-context.ts   # SceneContext interface
│       ├── mesh-registry.ts   # MeshRegistry class
│       ├── selection-api.ts   # SelectionAPI interface
│       ├── floor-renderer.ts  # FloorRenderer utilities
│       └── index.ts
│
├── viewer/                    # Read-only viewer
│   └── src/
│       ├── main.ts            # Viewer implements SceneContext
│       └── ...
│
├── interactive-editor/        # Full editor
│   └── src/
│       ├── main.ts            # InteractiveEditor extends Viewer
│       ├── selection-manager.ts
│       ├── branching-history.ts
│       └── ...
```

**viewer-core exports:**
- `SceneContext` - interface for Three.js scene, camera, renderer, controls
- `MeshRegistry` - bidirectional map of entities ↔ meshes
- `SelectionAPI` - interface for highlight, select, deselect operations
- `FloorRenderer` - utilities for floor/wall/stair mesh generation

**Extension pattern:**
```typescript
// viewer/src/main.ts
export class Viewer implements SceneContext {
  protected scene: THREE.Scene;
  protected meshRegistry: MeshRegistry;
  // ...
}

// interactive-editor/src/main.ts
export class InteractiveEditor extends Viewer {
  private selectionManager: SelectionManager;
  private history: BranchingHistory;
  // ...
}
```

### Selection State Management

The SelectionManager class SHALL:
- Maintain current selection as `Set<SelectableObject>` (supports multi-selection)
- Emit events for selection changes with full selection set
- Provide methods: 
  - `select(obj, additive?: boolean)` - select object, optionally add to existing
  - `selectMultiple(objs, additive?: boolean)` - select multiple objects
  - `deselect(obj?)` - deselect one or all
  - `isSelected(mesh)` - check if mesh is in selection
  - `getSelection()` - return current selection set
  - `selectAll()` - select all selectable objects
- Store selectable metadata in `mesh.userData`
- Track selection mode (click vs marquee)

### Marquee Selection Architecture

The MarqueeSelection class SHALL:
- Listen for mousedown/mousemove/mouseup on canvas
- Distinguish selection drag from camera orbit (check modifiers, button)
- Draw 2D rectangle overlay on canvas during drag
- On drag end, perform frustum-based selection:
  1. Create a frustum from the 2D rectangle corners
  2. Test each selectable object's bounding box against frustum
  3. Return intersecting objects to SelectionManager
- Use screen-space projection for accurate selection from any camera angle

### Screen-Space Bounding Box Calculation

For marquee selection from camera perspective:
```
1. For each selectable object:
   a. Get world-space bounding box (Box3)
   b. Project 8 corners to screen space (NDC → pixels)
   c. Compute 2D bounding rectangle from projected points
2. Test 2D rect intersection with selection rectangle
3. Objects with intersection are selected
```

### AST-Mesh Registry

The AstMeshRegistry class SHALL:
- Map entity IDs to mesh references
- Map mesh UUIDs to entity metadata
- Clear and rebuild on DSL reparse
- Survive partial updates when possible
- Support bulk lookups for multi-selection

### Branching History Architecture

The BranchingHistory class SHALL:
- Store history as a tree of `HistoryNode` objects (not a linear stack)
- Each node contains: `id`, `content` (full DSL snapshot), `timestamp`, `parent`, `children[]`, `metadata`
- Use full DSL text snapshots (not diffs) for simplicity and reliability
- Navigate via `setValue()` on Monaco model (clears Monaco's internal undo - intentional)
- Provide methods:
  - `snapshot()` - capture current state, create child node
  - `navigateTo(nodeId)` - restore state from any node
  - `undo()` - navigate to parent node
  - `redo()` - navigate to most recent child
  - `getBranches()` - return all branches for history browser
- Support configurable max depth with pruning of oldest leaf branches

Note: Monaco Editor does not natively support branching undo. This implementation builds a custom history layer on top of Monaco, using `getModel().getValue()` to capture snapshots and `getModel().setValue()` to restore them.

### Properties Panel Architecture

The PropertiesPanel class SHALL:
- Render dynamically based on selected entity type(s)
- Handle single selection: show all properties
- Handle multi-selection same type: show common properties with "(multiple)" for differing values
- Handle multi-selection mixed types: show count and type breakdown
- Use form controls appropriate to property types
- Validate input before applying
- Generate DSL text edits for Monaco (multiple edits for bulk changes)

