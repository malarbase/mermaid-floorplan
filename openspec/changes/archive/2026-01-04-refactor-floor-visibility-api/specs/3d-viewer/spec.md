# 3d-viewer Spec Deltas

## ADDED Requirements

### Requirement: Editor Panel Resize
The editor panel SHALL support drag-to-resize functionality to allow users to customize the workspace layout.

#### Scenario: Resize handle present
- **WHEN** the editor panel is rendered
- **THEN** a vertical resize handle SHALL appear on the right edge of the panel
- **AND** the handle SHALL be 12px wide with hover effects

#### Scenario: Drag to resize
- **WHEN** the user drags the resize handle
- **THEN** the panel width SHALL dynamically update to follow the cursor
- **AND** the minimum width SHALL be constrained to 300px
- **AND** the maximum width SHALL be constrained to 80% of viewport width

#### Scenario: Resize updates dependent elements
- **WHEN** the editor panel width changes
- **THEN** CSS variable `--editor-width` SHALL be updated
- **AND** info panel and 2D overlay positions SHALL adjust to respect new editor width

#### Scenario: Visual feedback during resize
- **WHEN** user is actively dragging the resize handle
- **THEN** cursor SHALL change to `ew-resize`
- **AND** text selection SHALL be disabled to prevent interference
- **AND** resize handle SHALL show active state visual indicator

#### Scenario: Resize persists during session
- **WHEN** user resizes the editor panel
- **THEN** the new width SHALL persist when toggling panel open/closed
- **AND** width SHALL reset to default on page reload (no localStorage persistence)

## MODIFIED Requirements

### Requirement: 2D Overlay Mini-map
The viewer SHALL provide a draggable, resizable 2D SVG overlay showing the current floor plan, respecting floor visibility settings.

#### Scenario: Toggle 2D Overlay
- **WHEN** the user enables the "Show 2D Mini-map" checkbox
- **THEN** a 2D SVG representation of the floor plan SHALL appear in a floating window
- **AND** the overlay SHALL have configurable opacity

#### Scenario: Drag Overlay
- **WHEN** the user drags the overlay header
- **THEN** the overlay SHALL move to follow the cursor
- **AND** the overlay SHALL be constrained within the viewport bounds

#### Scenario: Resize Overlay
- **WHEN** the user drags the resize handle in the bottom-right corner
- **THEN** the overlay SHALL resize with the bottom-right corner following the cursor
- **AND** the overlay SHALL respect minimum size constraints (200x150 pixels)

#### Scenario: Close Overlay
- **WHEN** the user clicks the close button on the overlay header
- **THEN** the overlay SHALL be hidden
- **AND** the "Show 2D Mini-map" checkbox SHALL be unchecked

#### Scenario: Overlay respects floor visibility
- **WHEN** user toggles floor visibility in the 3D viewer
- **THEN** the 2D overlay SHALL automatically re-render
- **AND** only visible floors SHALL be shown in the 2D overlay
- **AND** the overlay SHALL use the new visibleFloors API for rendering

### Requirement: Floor Manager
The viewer SHALL provide a FloorManager class to handle floor visibility state and UI, with methods to query visible floor IDs.

#### Scenario: Floor visibility control
- **WHEN** user toggles floor visibility checkbox
- **THEN** FloorManager updates visibility map
- **AND** sets THREE.Group visibility accordingly
- **AND** triggers onVisibilityChange callback for dependent updates

#### Scenario: Bulk visibility operations
- **WHEN** user clicks "Show All Floors" or "Hide All Floors"
- **THEN** FloorManager updates all floor visibility states
- **AND** updates all UI checkboxes to match
- **AND** triggers single onVisibilityChange callback

#### Scenario: Query visible floor IDs
- **WHEN** other components need list of visible floor IDs
- **THEN** FloorManager provides getVisibleFloorIds() method
- **AND** method returns array of floor IDs that are currently visible
- **AND** returned array can be passed directly to RenderOptions.visibleFloors

### Requirement: 2D Overlay Manager
The viewer SHALL provide an Overlay2DManager class to handle 2D SVG overlay rendering and interactions, using floor visibility state for filtering.

#### Scenario: Langium document rendering
- **WHEN** DSL file is loaded and parsed
- **THEN** Overlay2DManager stores Langium document
- **AND** renders 2D SVG using floorplans-language render function
- **AND** applies current theme colors to SVG

#### Scenario: Overlay drag and resize
- **WHEN** user drags overlay header or resize handle
- **THEN** Overlay2DManager updates overlay position or dimensions
- **AND** constrains to viewport boundaries
- **AND** supports both mouse and touch events

#### Scenario: JSON file handling
- **WHEN** JSON file is loaded (no Langium document)
- **THEN** Overlay2DManager displays "JSON files don't support 2D overlay" message
- **AND** clears any existing SVG content

#### Scenario: Filtered floor rendering
- **WHEN** Overlay2DManager renders 2D SVG
- **THEN** it SHALL call getVisibleFloorIds() callback to get current visibility state
- **AND** pass the visible floor IDs to RenderOptions.visibleFloors
- **AND** only render floors that are currently visible in 3D view

#### Scenario: Update on visibility change
- **WHEN** floor visibility changes in FloorManager
- **THEN** FloorManager triggers onVisibilityChange callback
- **AND** callback invokes Overlay2DManager.render() to update SVG
- **AND** 2D overlay synchronizes with 3D visibility state

