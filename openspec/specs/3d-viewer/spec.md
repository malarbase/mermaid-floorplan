<!-- PROPRIETARY - See openspec/LICENSE -->

# 3d-viewer Specification

## Purpose
TBD - created by archiving change add-3d-viewer. Update Purpose after archive.
## Requirements
### Requirement: 3D Visualization
The system SHALL provide a web-based interface to visualize the floorplan in 3D, including floors, walls, stairs, lifts, **doors, and windows**.

#### Scenario: View Floorplan
- **WHEN** the viewer is opened with a valid floorplan data file
- **THEN** the user can see a 3D representation of the floors, rooms, **doors, and windows**.
- **AND** the user can rotate and zoom the camera.

_(Added "doors, and windows" to reflect expanded rendering capabilities)_

### Requirement: Wall Rendering
The viewer SHALL render walls with appropriate dimensions based on the floorplan data, using wall ownership rules to prevent overlapping geometry.

#### Scenario: Wall Height
- **WHEN** the floorplan is rendered
- **THEN** walls appear with a standard vertical height (e.g., 2.5 meters/units).

#### Scenario: Clean Intersections
- **WHEN** two walls meet at a corner
- **THEN** they SHALL appear as a single continuous mesh without visible overlapping faces (z-fighting).

#### Scenario: Shared Wall Ownership
- **GIVEN** two adjacent rooms "A" at position (0, 0) and "B" at position (10, 0) sharing a vertical wall
- **WHEN** the floorplan is rendered
- **THEN** only one room SHALL render the shared wall
- **AND** the room with the lower X position (Room A) SHALL be the wall owner
- **AND** Room B SHALL skip rendering its left wall at that position

#### Scenario: Shared Wall Ownership for Horizontal Walls
- **GIVEN** two adjacent rooms "A" at position (0, 0) and "B" at position (0, 10) sharing a horizontal wall
- **WHEN** the floorplan is rendered
- **THEN** the room with the lower Z position (Room A) SHALL be the wall owner
- **AND** Room A renders its bottom wall; Room B skips its top wall

### Requirement: Multi-Floor Inspection
The viewer SHALL provide tools to inspect individual floors in a multi-story building.

#### Scenario: Exploded View
- **WHEN** the user activates the exploded view control
- **THEN** upper floors SHALL vertically separate from lower floors to reveal the layout underneath.

### Requirement: Style-Based 3D Material Creation
The 3D viewer SHALL create materials based on style definitions.

#### Scenario: Material from style colors
- **WHEN** a room's style defines `floor_color: "#8B4513"`
- **THEN** the MaterialFactory SHALL create a MeshStandardMaterial with color 0x8B4513

#### Scenario: Material from style texture
- **WHEN** a room's style defines `floor_texture: "textures/marble.jpg"`
- **THEN** the MaterialFactory SHALL load the texture
- **AND** apply it as the material's map property

#### Scenario: PBR properties applied to material
- **WHEN** a room's style defines `roughness: 0.3, metalness: 0.1`
- **THEN** the created MeshStandardMaterial SHALL have roughness=0.3 and metalness=0.1

#### Scenario: Texture load failure fallback
- **GIVEN** a style defines `floor_texture: "textures/missing.jpg"`
- **AND** the texture file does not exist or fails to load
- **WHEN** the 3D viewer renders
- **THEN** the material SHALL fall back to `floor_color` if defined
- **OR** to default color if no floor_color defined

### Requirement: Wall Segmentation for Multi-Room Sharing
The viewer SHALL segment shared walls when they are adjacent to multiple rooms on the opposite side, allowing per-segment materials.

#### Scenario: Wall adjacent to two rooms
- **GIVEN** Room A with a bottom wall spanning 20 units
- **AND** Room B (10 units wide) adjacent to the left half of A's bottom wall
- **AND** Room C (10 units wide) adjacent to the right half of A's bottom wall
- **WHEN** the floorplan is rendered
- **THEN** Room A's bottom wall SHALL be split into two segments
- **AND** Segment 1 SHALL span the overlap with Room B
- **AND** Segment 2 SHALL span the overlap with Room C

#### Scenario: Wall with no adjacent rooms
- **GIVEN** Room A with a left wall facing the exterior (no adjacent room)
- **WHEN** the floorplan is rendered
- **THEN** the wall SHALL be rendered as a single unsegmented mesh
- **AND** all faces SHALL use Room A's wall color

#### Scenario: Wall with single adjacent room
- **GIVEN** Room A with a right wall adjacent to Room B
- **AND** Room A owns the wall
- **WHEN** the floorplan is rendered
- **THEN** the wall SHALL be rendered as a single segment
- **AND** the segment SHALL have per-face materials

### Requirement: Per-Face Wall Materials
The viewer SHALL apply different materials to different faces of wall segments based on room ownership and adjacency.

#### Scenario: Interior face uses adjacent room's color
- **GIVEN** Room A (owner, wall_color: "#0000FF") shares a wall with Room B (wall_color: "#FF0000")
- **WHEN** the wall segment is rendered
- **THEN** the exterior face (facing Room A) SHALL use blue (#0000FF)
- **AND** the interior face (facing Room B) SHALL use red (#FF0000)

#### Scenario: Side faces use owner's color
- **GIVEN** Room A (owner, wall_color: "#0000FF") shares a wall with Room B (wall_color: "#FF0000")
- **WHEN** the wall segment is rendered
- **THEN** the side faces (edges of the wall) SHALL use blue (#0000FF)
- **AND** this allows visual identification of wall ownership

#### Scenario: Top and bottom faces use owner's color
- **GIVEN** Room A (owner, wall_color: "#0000FF") shares a wall with Room B
- **WHEN** the wall segment is rendered
- **THEN** the top face (ceiling contact) SHALL use owner's color
- **AND** the bottom face (floor contact) SHALL use owner's color

#### Scenario: Multiple segments with different adjacent styles
- **GIVEN** Room A owns a wall adjacent to Room B (red) and Room C (green)
- **WHEN** the wall is rendered as two segments
- **THEN** Segment 1's interior face SHALL be red
- **AND** Segment 2's interior face SHALL be green
- **AND** both segments' exterior and side faces SHALL use Room A's color

### Requirement: Adjacency Detection
The viewer SHALL detect adjacent rooms for wall rendering decisions.

#### Scenario: Detect horizontally adjacent rooms
- **GIVEN** Room A at (0, 0) size (10 x 10)
- **AND** Room B at (10, 0) size (10 x 10)
- **WHEN** adjacency is checked for Room A's right wall
- **THEN** Room B SHALL be detected as adjacent
- **AND** the overlap extent SHALL be the full wall height (10 units)

#### Scenario: Detect partially overlapping adjacency
- **GIVEN** Room A at (0, 0) size (10 x 20)
- **AND** Room B at (10, 5) size (10 x 10)
- **WHEN** adjacency is checked for Room A's right wall
- **THEN** Room B SHALL be detected as adjacent
- **AND** the overlap extent SHALL be from position 5 to 15 along the wall

#### Scenario: Non-adjacent rooms not detected
- **GIVEN** Room A at (0, 0) size (10 x 10)
- **AND** Room B at (20, 0) size (10 x 10) with a gap between them
- **WHEN** adjacency is checked for Room A's right wall
- **THEN** Room B SHALL NOT be detected as adjacent

#### Scenario: Multiple adjacent rooms detected
- **GIVEN** Room A with a wall 30 units long
- **AND** Room B adjacent to the first 10 units
- **AND** Room C adjacent to the middle 10 units
- **AND** Room D adjacent to the last 10 units
- **WHEN** adjacency is checked
- **THEN** all three rooms (B, C, D) SHALL be detected with their respective overlap extents

### Requirement: CSG Material Preservation

The 3D viewer SHALL preserve per-face material assignments when performing CSG operations (door/window holes) on wall segments.

When a wall segment has:
- An owner room style (for interior-facing faces)
- An adjacent room style (for exterior-facing faces toward the adjacent room)
- A CSG operation creating a hole (door or window)

The resulting geometry MUST maintain correct material assignments:
- Faces pointing toward the owner room display the owner's wall color
- Faces pointing toward the adjacent room display the adjacent room's wall color
- Newly created faces around holes use contextually appropriate colors

#### Scenario: Door hole in shared wall segment

- **GIVEN** Room A owns a wall segment shared with Room B
- **AND** Room A has wall_color blue, Room B has wall_color red
- **AND** There is a door connection creating a hole in the segment
- **WHEN** the wall is rendered
- **THEN** the face pointing into Room A displays blue
- **AND** the face pointing into Room B displays red
- **AND** faces around the door hole use appropriate colors based on orientation

#### Scenario: Window hole in shared wall segment

- **GIVEN** Room A owns a wall segment shared with Room B
- **AND** Room A has wall_color green, Room B has wall_color yellow
- **AND** There is a window in the segment
- **WHEN** the wall is rendered
- **THEN** the face pointing into Room A displays green
- **AND** the face pointing into Room B displays yellow
- **AND** the window glass is rendered correctly within the hole

#### Scenario: Multiple holes in shared wall segment

- **GIVEN** Room A owns a wall segment shared with Room B
- **AND** There are multiple door/window connections creating holes
- **WHEN** the wall is rendered
- **THEN** per-face material assignments are preserved for all visible faces
- **AND** each hole is correctly rendered with appropriate surrounding materials

### Requirement: Light Position Control
The viewer SHALL provide UI controls to adjust the directional light position for shadow customization.

#### Scenario: Light azimuth adjustment
- **WHEN** the user adjusts the light azimuth slider (0-360°)
- **THEN** the directional light SHALL rotate around the Y-axis
- **AND** shadows SHALL update in real-time

#### Scenario: Light elevation adjustment
- **WHEN** the user adjusts the light elevation slider (0-90°)
- **THEN** the directional light SHALL change its vertical angle
- **AND** shadow length and direction SHALL update accordingly

#### Scenario: Light intensity adjustment
- **WHEN** the user adjusts the light intensity slider (0-2)
- **THEN** the directional light intensity SHALL change
- **AND** scene brightness SHALL reflect the new value

### Requirement: GLTF/GLB Export
The viewer SHALL support exporting the loaded floorplan as a GLTF or GLB file.

#### Scenario: Export as GLB (binary)
- **WHEN** the user clicks the "Export GLB" button
- **THEN** the current scene geometry and materials SHALL be exported as a .glb file
- **AND** the browser SHALL trigger a file download

#### Scenario: Export as GLTF (JSON)
- **WHEN** the user clicks the "Export GLTF" button
- **THEN** the current scene SHALL be exported as a .gltf file with embedded resources
- **AND** the browser SHALL trigger a file download

#### Scenario: Export includes all floors
- **GIVEN** a multi-floor building is loaded
- **WHEN** the user exports to GLTF/GLB
- **THEN** all visible floors SHALL be included in the export
- **AND** floor hierarchy SHALL be preserved as named groups

#### Scenario: Export respects exploded view state
- **GIVEN** the exploded view slider is set to 50%
- **WHEN** the user exports to GLTF/GLB
- **THEN** the exported model SHALL reflect the current floor positions
- **AND** floor separation SHALL match the viewer display

### Requirement: Camera Mode Toggle
The viewer SHALL support switching between perspective and orthographic camera projections.

#### Scenario: Switch to orthographic
- **WHEN** the user clicks the "Orthographic" button or presses Numpad 5
- **THEN** the camera SHALL switch to orthographic projection
- **AND** parallel lines SHALL remain parallel in the view

#### Scenario: Switch to perspective
- **WHEN** the user clicks the "Perspective" button while in orthographic mode
- **THEN** the camera SHALL switch to perspective projection
- **AND** FOV controls SHALL become available

#### Scenario: Camera mode persistence
- **WHEN** the user changes camera mode
- **THEN** the viewing angle and position SHALL be preserved
- **AND** only the projection type SHALL change

### Requirement: Field of View Control
The viewer SHALL provide FOV adjustment for perspective camera mode.

#### Scenario: FOV slider adjustment
- **GIVEN** the camera is in perspective mode
- **WHEN** the user adjusts the FOV slider (30-120°)
- **THEN** the camera field of view SHALL update in real-time
- **AND** the default value SHALL be 75°

#### Scenario: FOV control disabled in orthographic
- **GIVEN** the camera is in orthographic mode
- **WHEN** viewing the FOV control
- **THEN** the slider SHALL be disabled or hidden
- **AND** a tooltip MAY explain why

### Requirement: Isometric View Preset
The viewer SHALL provide a one-click isometric view preset.

#### Scenario: Activate isometric view
- **WHEN** the user clicks the "Isometric" button
- **THEN** the camera SHALL switch to orthographic projection
- **AND** the camera SHALL position at 45° azimuth, 35.264° elevation (arctan(1/√2))
- **AND** all three axes SHALL appear equally foreshortened

#### Scenario: Isometric with frame fit
- **WHEN** the user activates isometric view
- **THEN** the camera zoom SHALL adjust to fit the entire model in view

### Requirement: Validation Warnings Overlay
The viewer SHALL display DSL validation warnings in a toggleable UI overlay.

#### Scenario: Warnings collected at parse time
- **GIVEN** a floorplan DSL file is loaded
- **WHEN** the parser detects validation warnings (door misalignments, wall conflicts, height mismatches)
- **THEN** the warnings SHALL be stored and made available to the UI
- **AND** warnings SHALL include message text and line numbers

#### Scenario: Warnings badge visibility
- **GIVEN** validation warnings exist
- **WHEN** the floorplan is loaded
- **THEN** a warning count badge SHALL be displayed (e.g., "⚠️ 5 warnings")
- **AND** the badge SHALL remain visible even when the warnings panel is collapsed

#### Scenario: Toggle warnings panel
- **WHEN** the user clicks the warning count badge or "Show Warnings" toggle
- **THEN** the warnings panel SHALL expand/collapse
- **AND** the panel SHALL not obstruct the 3D view by default

#### Scenario: Warnings panel contents
- **GIVEN** the warnings panel is expanded
- **THEN** the panel SHALL display:
  - Each warning message with line number (e.g., "line 301: Door misalignment...")
  - Warning severity icons (⚠️)
  - Scrollable list if warnings exceed available space
- **AND** the panel SHALL use warning colors (#FFD700, #FFA500)

#### Scenario: No warnings state
- **GIVEN** the loaded floorplan has no validation warnings
- **WHEN** viewing the UI
- **THEN** the warning badge SHALL not be displayed
- **OR** SHALL show "✓ No warnings"

#### Scenario: Warnings cleared on reload
- **GIVEN** warnings are displayed from a previous file
- **WHEN** a new floorplan file is loaded
- **THEN** old warnings SHALL be cleared
- **AND** new warnings SHALL be displayed if present

### Requirement: Expanded Controls Panel

The viewer SHALL organize all controls in an expandable/collapsible panel, including theme controls.

#### Scenario: Collapsible control sections
- **WHEN** viewing the controls panel
- **THEN** controls SHALL be organized into collapsible sections:
  - Theme (light/dark toggle)
  - Camera (mode, FOV, presets)
  - Lighting (azimuth, elevation, intensity)
  - View (exploded view)
  - Annotations (area, dimensions, floor summary)
  - Validation (warnings display toggle)
  - Export (GLTF, GLB buttons)

#### Scenario: Theme section contents
- **WHEN** expanding the Theme section
- **THEN** it SHALL contain:
  - Light/Dark toggle button with sun/moon icon
  - (Optional) Theme preset dropdown if multiple themes available

#### Scenario: Panel remembers state
- **WHEN** the user collapses a section
- **THEN** the collapsed state MAY persist during the session

### Requirement: Room Area Annotations
The viewer SHALL display room area labels in 3D space.

#### Scenario: Enable room area display
- **WHEN** the user toggles "Show Areas" on
- **THEN** each room SHALL display its area as a label above the floor
- **AND** the label SHALL use the selected area unit (sqft/sqm)

#### Scenario: Area labels follow camera
- **GIVEN** room area display is enabled
- **WHEN** the camera moves or rotates
- **THEN** area labels SHALL remain readable (facing camera or horizontal)

#### Scenario: Disable room area display
- **WHEN** the user toggles "Show Areas" off
- **THEN** all room area labels SHALL be hidden

### Requirement: Dimension Line Annotations
The viewer SHALL display room dimension measurements in 3D space.

#### Scenario: Enable dimension lines
- **WHEN** the user toggles "Show Dimensions" on
- **THEN** the viewer SHALL display dimension lines showing room width and depth
- **AND** dimension values SHALL use the selected length unit (ft/m)

#### Scenario: Dimension line appearance
- **GIVEN** dimension lines are enabled
- **THEN** dimension lines SHALL include:
  - Horizontal lines along room edges
  - Tick marks at endpoints
  - Measurement labels with unit suffix (e.g., "10ft", "3.5m")

#### Scenario: Height labels
- **GIVEN** dimension lines are enabled
- **AND** a room has a non-default height
- **THEN** the room SHALL display a height label (e.g., "h: 12ft")

### Requirement: Floor Summary Display
The viewer SHALL display aggregate metrics for each floor.

#### Scenario: Enable floor summary
- **WHEN** the user toggles "Show Floor Summary" on
- **THEN** each floor SHALL display a summary panel showing:
  - Floor name
  - Number of rooms
  - Net area (sum of room areas)
  - Efficiency percentage (net area / bounding box area)

#### Scenario: Floor summary positioning
- **GIVEN** floor summary is enabled
- **THEN** the summary panel SHALL appear as an HTML overlay or positioned in 3D space
- **AND** it SHALL update when floor visibility or exploded view changes

### Requirement: Unit Selection Controls
The viewer SHALL provide controls to select display units for annotations.

#### Scenario: Area unit selection
- **WHEN** the user selects an area unit (sqft or sqm)
- **THEN** all room area labels SHALL update to display in the selected unit

#### Scenario: Length unit selection
- **WHEN** the user selects a length unit (ft, m, cm, in, mm)
- **THEN** all dimension labels SHALL update to display in the selected unit

#### Scenario: Default units from DSL config
- **GIVEN** the loaded floorplan has `area_unit` or `default_unit` in config
- **WHEN** annotations are displayed
- **THEN** the viewer SHALL use the DSL-specified units as defaults

### Requirement: Scene Theme Toggle

The viewer SHALL provide controls to toggle between light and dark visual themes for the 3D scene.

#### Scenario: Toggle to dark theme
- **WHEN** the user clicks the theme toggle button (showing sun icon)
- **THEN** the scene background SHALL change to a dark color (e.g., `0x1a1a2e`)
- **AND** the toggle icon SHALL change to a moon icon
- **AND** grid lines and ambient lighting SHALL adjust for dark mode visibility

#### Scenario: Toggle to light theme
- **WHEN** the user clicks the theme toggle button (showing moon icon)
- **THEN** the scene background SHALL change to a light color (e.g., `0xf5f5f7`)
- **AND** the toggle icon SHALL change to a sun icon
- **AND** grid lines and ambient lighting SHALL adjust for light mode

#### Scenario: Theme persists during session
- **GIVEN** the user has toggled to dark theme
- **WHEN** the user interacts with other controls (camera, exploded view, etc.)
- **THEN** the dark theme SHALL remain applied

### Requirement: DSL Theme Synchronization

The viewer SHALL respect theme settings defined in the DSL configuration when loading a floorplan.

#### Scenario: DSL darkMode applies to viewer
- **GIVEN** a floorplan with `config { darkMode: true }`
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with dark theme
- **AND** the theme toggle SHALL show the moon icon (indicating dark mode active)

#### Scenario: DSL theme: dark applies to viewer
- **GIVEN** a floorplan with `config { theme: dark }`
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with dark theme

#### Scenario: DSL theme: blueprint applies to viewer
- **GIVEN** a floorplan with `config { theme: blueprint }`
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with a blue-tinted dark theme
- **AND** scene background SHALL use blueprint-style colors

#### Scenario: No DSL theme defaults to light
- **GIVEN** a floorplan with no `theme` or `darkMode` config
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with light theme (default)

### Requirement: Theme Override Control

The viewer SHALL allow users to temporarily override the DSL-defined theme without modifying the source file.

#### Scenario: Override DSL light theme to dark
- **GIVEN** a floorplan with default (light) theme
- **WHEN** the user toggles to dark theme in the viewer
- **THEN** the viewer SHALL display in dark theme
- **AND** the DSL source SHALL NOT be modified
- **AND** a visual indicator MAY show that theme is overridden

#### Scenario: Reset to DSL theme
- **GIVEN** the user has overridden the theme
- **WHEN** the floorplan is reloaded
- **THEN** the viewer SHALL reset to the DSL-defined theme

### Requirement: Dark Theme Color Constants

The viewer SHALL define color constants for dark theme rendering.

#### Scenario: Dark theme colors defined
- **GIVEN** the dark theme is active
- **THEN** the following colors SHALL be used:
  | Element | Dark Theme Color |
  |---------|-----------------|
  | Scene background | Dark blue-gray (`0x1a1a2e`) |
  | Grid lines | Light gray (`0x444444`) |
  | Ambient light | Reduced intensity (`0x404040`) |
  | Text labels | Light (`0xe0e0e0`) |

#### Scenario: Light theme colors (default)
- **GIVEN** the light theme is active
- **THEN** the following colors SHALL be used:
  | Element | Light Theme Color |
  |---------|------------------|
  | Scene background | Off-white (`0xf5f5f7`) |
  | Grid lines | Light gray (`0xcccccc`) |
  | Ambient light | Standard intensity (`0xffffff`) |
  | Text labels | Dark (`0x333333`) |

### Requirement: Theme-Aware Material Colors

The 3D viewer SHALL apply theme-appropriate colors to floor, wall, door, and window materials when no explicit room style is specified.

#### Scenario: Dark theme material colors
- **WHEN** the viewer theme is set to `dark`
- **AND** a room has no explicit style
- **THEN** floor material uses dark theme floor color
- **AND** wall material uses dark theme wall color
- **AND** door material uses dark theme door color
- **AND** window material uses dark theme window color

#### Scenario: Blueprint theme material colors
- **WHEN** the viewer theme is set to `blueprint`
- **AND** a room has no explicit style
- **THEN** materials use the blueprint color palette

#### Scenario: Explicit style takes precedence
- **WHEN** a room has an explicit style defined
- **AND** the viewer theme changes
- **THEN** the room's materials remain unchanged

### Requirement: Dynamic Material Updates

The 3D viewer SHALL update material colors dynamically when the theme changes without requiring a full scene reload.

#### Scenario: Theme toggle updates materials
- **WHEN** the user toggles the theme
- **THEN** non-styled room materials update to match the new theme
- **AND** the scene does not reload from scratch

### Requirement: Editor Panel Integration
The viewer SHALL provide a collapsible side panel containing a Monaco code editor and AI chat interface for editing floorplan DSL.

#### Scenario: Toggle Editor Panel
- **WHEN** the user clicks the editor toggle button
- **THEN** the editor panel SHALL slide in/out from the left side
- **AND** the toggle arrow SHALL indicate the current state (▶ closed, ◀ open)

#### Scenario: Live Preview
- **WHEN** the user edits the floorplan DSL in the editor
- **THEN** the 3D view SHALL update automatically after a debounce delay
- **AND** validation errors SHALL be displayed in the warnings panel

#### Scenario: AI Chat Integration
- **WHEN** the user enters an OpenAI API key and sends a chat message
- **THEN** the AI SHALL respond with floorplan suggestions or modifications
- **AND** if the response contains a floorplan code block, it SHALL be applied to the editor

#### Scenario: Configurable API Endpoint
- **WHEN** the user enters a custom API base URL
- **THEN** API requests SHALL be sent to that endpoint instead of the default OpenAI URL
- **AND** the URL and API key SHALL be persisted to localStorage

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

### Requirement: Floor Visibility Controls
The viewer SHALL provide controls to toggle the visibility of individual floors in the 3D view.

#### Scenario: Floor Checkboxes
- **WHEN** a floorplan with multiple floors is loaded
- **THEN** the Floors control section SHALL display a checkbox for each floor
- **AND** all floors SHALL be visible (checked) by default

#### Scenario: Toggle Floor Visibility
- **WHEN** the user unchecks a floor's checkbox
- **THEN** that floor SHALL be hidden in the 3D view
- **AND** the floor summary SHALL update to reflect only visible floors

#### Scenario: Show All / Hide All
- **WHEN** the user clicks "Show All" or "Hide All" button
- **THEN** all floor checkboxes SHALL be checked or unchecked respectively
- **AND** the 3D view SHALL update to show or hide all floors

### Requirement: GitHub Pages Deployment
The viewer SHALL be deployable to GitHub Pages as the primary application.

#### Scenario: Base Path Configuration
- **WHEN** the viewer is built for GitHub Pages deployment
- **THEN** all asset paths SHALL use the configured base path (e.g., `/mermaid-floorplan/`)
- **AND** the application SHALL load correctly at the deployed URL

### Requirement: Door Rendering in 3D
The 3D viewer SHALL render door connections as 3D mesh geometry with proper positioning, swing direction, and materials.

#### Scenario: Single door rendered at connection
- **GIVEN** a connection `connect Office.right to Kitchen.left door at 50%`
- **WHEN** the 3D viewer renders the floorplan
- **THEN** a door mesh appears at the center of the shared wall
- **AND** the door has a swing arc indicating opening direction

#### Scenario: Door positioned by percentage
- **GIVEN** a connection with `at 75%` position
- **WHEN** the 3D scene is rendered
- **THEN** the door is positioned at 75% along the shared wall segment between the two rooms

#### Scenario: Double door with mirrored panels
- **GIVEN** a connection specifying `double-door`
- **WHEN** the 3D viewer renders
- **THEN** two door panels are rendered opening in opposite directions

#### Scenario: Door swing direction from specification
- **GIVEN** a connection with `swing: left`
- **WHEN** the 3D scene is rendered
- **THEN** the door panel rotates to swing toward the left side

#### Scenario: Door opens into specified room
- **GIVEN** a connection with `opens into Kitchen`
- **WHEN** the 3D viewer renders
- **THEN** the door panel swings into the Kitchen room space

### Requirement: Window Rendering in 3D
The 3D viewer SHALL render window connections as transparent 3D meshes positioned at the configured sill height.

#### Scenario: Window rendered with transparency
- **GIVEN** a connection of type `window`
- **WHEN** the 3D viewer renders the floorplan
- **THEN** a semi-transparent mesh appears at the wall location
- **AND** the mesh uses a glass-like material (opacity ~0.6)

#### Scenario: Window positioned at sill height
- **GIVEN** a window connection on a wall
- **AND** config `window_sill: 0.9`
- **WHEN** the 3D scene is rendered
- **THEN** the window bottom edge is positioned 0.9 units above the floor

#### Scenario: Window dimensions from connection
- **GIVEN** a connection with `size (1.5 x 1.2)`
- **WHEN** the window is rendered in 3D
- **THEN** the window mesh has width 1.5 and height 1.2

### Requirement: Connection Deduplication in 3D Rendering
The 3D renderer SHALL avoid rendering duplicate door meshes when a single connection references two walls.

#### Scenario: Single door mesh per connection
- **GIVEN** a connection `connect RoomA.right to RoomB.left door`
- **WHEN** the 3D viewer renders
- **THEN** exactly one door mesh is created
- **AND** the door appears at the shared wall between RoomA and RoomB

#### Scenario: Door rendered on solid wall when one wall is open
- **GIVEN** RoomA with solid right wall and RoomB with open left wall
- **AND** a connection between them
- **WHEN** the 3D scene is rendered
- **THEN** the door mesh is rendered on RoomA's side (solid wall)

#### Scenario: Door rendered on fromRoom when both walls solid
- **GIVEN** both connected rooms have solid walls
- **WHEN** the 3D viewer renders
- **THEN** the door is rendered on the `fromRoom` wall

### Requirement: Pivot Point Visualization
The viewer SHALL display a visible indicator at the camera's orbit pivot point to aid spatial orientation during navigation.

#### Scenario: Pivot indicator shown during rotation
- **WHEN** the user rotates the camera using mouse or keyboard
- **THEN** a 3D axis gizmo (RGB colored X/Y/Z axes) SHALL appear at the pivot point
- **AND** the indicator SHALL fade out after 1-2 seconds of inactivity

#### Scenario: Toggle pivot visibility
- **WHEN** the user presses the `P` key
- **THEN** the pivot indicator visibility SHALL toggle between always-visible and auto-fade modes

### Requirement: Keyboard Camera Navigation
The viewer SHALL support keyboard-based camera navigation following standard 3D software conventions.

#### Scenario: WASD pan navigation
- **WHEN** the user presses W/A/S/D keys
- **THEN** the camera SHALL pan forward/left/backward/right relative to the current view direction
- **AND** the pivot point SHALL move with the camera

#### Scenario: Vertical movement
- **WHEN** the user presses Q/E keys
- **THEN** the camera SHALL move down/up along the world Y-axis

#### Scenario: Zoom with keyboard
- **WHEN** the user presses +/- or Page Up/Page Down keys
- **THEN** the camera SHALL zoom in/out toward the pivot point

#### Scenario: Precision modifier
- **WHEN** the user holds Shift while pressing movement keys
- **THEN** the movement speed SHALL be reduced for fine-grained control

### Requirement: Preset Camera Views
The viewer SHALL support keyboard shortcuts for common orthographic views.

#### Scenario: Front view
- **WHEN** the user presses Numpad 1 (or `1` on keyboards without numpad)
- **THEN** the camera SHALL snap to a front orthographic view looking at -Z

#### Scenario: Right side view
- **WHEN** the user presses Numpad 3 (or `3`)
- **THEN** the camera SHALL snap to a right-side view looking at -X

#### Scenario: Top-down view
- **WHEN** the user presses Numpad 7 (or `7`)
- **THEN** the camera SHALL snap to a top-down view looking at -Y

#### Scenario: Reset camera
- **WHEN** the user presses Home
- **THEN** the camera SHALL reset to the default initial position and orientation

### Requirement: Focus on Geometry
The viewer SHALL support centering the pivot point on the loaded geometry.

#### Scenario: Center on floorplan
- **WHEN** the user presses `F` or Numpad `.`
- **THEN** the pivot point SHALL move to the center of the loaded floorplan geometry
- **AND** the camera SHALL frame the entire model in view

#### Scenario: Center pivot manually
- **WHEN** the user presses `C`
- **THEN** the pivot point SHALL move to the geometric center of all visible floors

### Requirement: Keyboard Shortcuts Help Overlay
The viewer SHALL display available keyboard shortcuts to users.

#### Scenario: Show shortcuts overlay
- **WHEN** the user presses `?` or `H`
- **THEN** a help overlay SHALL appear listing all keyboard shortcuts
- **AND** pressing the key again SHALL hide the overlay

### Requirement: Viewer Code Organization
The 3D viewer SHALL organize its codebase using specialized manager classes and a shared base class to separate concerns and improve maintainability.

#### Scenario: BaseViewer provides common Three.js setup
- **GIVEN** the viewer-core package exports a BaseViewer abstract class
- **WHEN** viewer or interactive-editor is instantiated
- **THEN** common Three.js initialization (scene, cameras, renderer, controls) SHALL be provided by BaseViewer
- **AND** subclasses SHALL extend BaseViewer rather than duplicating setup code

#### Scenario: BaseViewer provides floorplan loading
- **GIVEN** a JSON floorplan is loaded
- **WHEN** loadFloorplan() is called
- **THEN** BaseViewer SHALL handle floor generation, material creation, and scene updates
- **AND** subclasses MAY override onFloorplanLoaded() for additional behavior

#### Scenario: BaseViewer provides theme switching
- **WHEN** viewer needs theme switching (light/dark/blueprint)
- **THEN** setTheme() and applyTheme() methods SHALL be provided by BaseViewer
- **AND** materials SHALL regenerate via regenerateMaterialsForTheme()

#### Scenario: Camera operations delegated to CameraManager
- **WHEN** viewer needs camera mode switching, FOV adjustment, or isometric view setup
- **THEN** operations are delegated to CameraManager instance
- **AND** CameraManager provides activeCamera, toggleCameraMode(), setIsometricView(), and updateOrthographicSize() methods

#### Scenario: Annotation operations delegated to AnnotationManager
- **WHEN** viewer needs to show/hide area labels, dimensions, or floor summaries
- **THEN** operations are delegated to AnnotationManager instance
- **AND** AnnotationManager manages CSS2DObject labels and formatting

#### Scenario: Floor visibility delegated to FloorManager
- **WHEN** viewer needs to show/hide individual floors or update floor list UI
- **THEN** operations are delegated to FloorManager instance
- **AND** FloorManager maintains floorVisibility state map

#### Scenario: 2D overlay delegated to Overlay2DManager
- **WHEN** viewer needs to render 2D SVG overlay or handle drag/resize
- **THEN** operations are delegated to Overlay2DManager instance
- **AND** Overlay2DManager stores Langium document and renders SVG

#### Scenario: Subclass customization via setupUIControls
- **GIVEN** BaseViewer defines abstract setupUIControls() method
- **WHEN** viewer or interactive-editor initializes
- **THEN** subclass SHALL implement setupUIControls() to wire up app-specific UI
- **AND** BaseViewer construction SHALL call setupUIControls() at appropriate time

### Requirement: Manager Communication
Managers SHALL communicate through callback-based dependency injection rather than direct coupling.

#### Scenario: Manager requests data from viewer
- **WHEN** manager needs access to viewer state (floors, floorplan data, config)
- **THEN** manager invokes callback function provided during construction
- **AND** callback returns current state without exposing internal structure

#### Scenario: Manager notifies viewer of state changes
- **WHEN** manager changes state that affects other managers (e.g., floor visibility)
- **THEN** manager invokes onVisibilityChange callback
- **AND** viewer coordinates updates across affected managers

### Requirement: Camera Manager
The viewer SHALL provide a CameraManager class to handle all camera-related operations.

#### Scenario: Camera mode switching
- **WHEN** user toggles between perspective and orthographic cameras
- **THEN** CameraManager updates activeCamera property
- **AND** synchronizes position between cameras
- **AND** updates keyboard controls to match orthographic mode

#### Scenario: Isometric view setup
- **WHEN** user requests isometric view
- **THEN** CameraManager switches to orthographic mode if needed
- **AND** positions camera at 45° azimuth and 35.264° elevation
- **AND** calculates distance to fit all visible floors

### Requirement: Annotation Manager
The viewer SHALL provide an AnnotationManager class to handle all annotation rendering.

#### Scenario: Area annotations
- **WHEN** user enables area display
- **THEN** AnnotationManager creates CSS2DObject labels for each room
- **AND** formats area values according to current unit setting (sqft or sqm)
- **AND** positions labels at room centers

#### Scenario: Dimension annotations
- **WHEN** user enables dimension display
- **THEN** AnnotationManager creates width, depth, and height labels
- **AND** formats lengths according to current unit setting (ft, m, cm, in, mm)
- **AND** shows height labels only for non-default room heights

#### Scenario: Floor summary panel
- **WHEN** user enables floor summary
- **THEN** AnnotationManager displays panel with room count, total area, and efficiency percentage
- **AND** filters to show only visible floors
- **AND** updates when floor visibility changes

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

### Requirement: Shared CSS Style Injection
The viewer packages SHALL use shared CSS styles from viewer-core to eliminate duplication and ensure consistent appearance.

#### Scenario: Shared styles injected at startup
- **GIVEN** viewer-core exports injectStyles() function
- **WHEN** viewer or interactive-editor page loads
- **THEN** shared CSS styles SHALL be injected into the document head
- **AND** styles SHALL use fp-* class prefix to avoid conflicts

#### Scenario: Control panel uses shared styles
- **WHEN** the control panel is rendered
- **THEN** HTML elements SHALL use fp-control-panel, fp-control-section, fp-section-header classes
- **AND** appearance SHALL match existing visual design

#### Scenario: 2D overlay uses shared styles
- **WHEN** the 2D overlay is rendered
- **THEN** HTML elements SHALL use fp-overlay-2d class hierarchy
- **AND** appearance SHALL match existing visual design

#### Scenario: Keyboard help overlay uses shared styles
- **WHEN** the keyboard help overlay is rendered
- **THEN** HTML elements SHALL use fp-keyboard-help class hierarchy
- **AND** appearance SHALL match existing visual design

#### Scenario: Theme switching affects shared styles
- **WHEN** the user toggles between light and dark theme
- **THEN** shared styles SHALL provide dark-theme variants via body.dark-theme selector
- **AND** all fp-* styled elements SHALL update appearance

### Requirement: Behavioral Parity Between Viewer Packages
The viewer and interactive-editor packages SHALL maintain identical behavior for all shared functionality to ensure consistent user experience.

#### Scenario: Camera controls identical
- **GIVEN** viewer and interactive-editor both use BaseViewer
- **WHEN** user performs camera operations (pan, rotate, zoom, mode switch)
- **THEN** behavior SHALL be identical in both packages

#### Scenario: Keyboard shortcuts identical
- **GIVEN** viewer and interactive-editor both use BaseViewer
- **WHEN** user presses keyboard shortcuts (WASD, number keys, +/-, etc.)
- **THEN** behavior SHALL be identical in both packages

#### Scenario: Theme appearance identical
- **GIVEN** viewer and interactive-editor both use shared styles
- **WHEN** comparing the same floorplan in both packages
- **THEN** visual appearance (colors, spacing, fonts) SHALL be identical

#### Scenario: Annotation formatting identical
- **GIVEN** viewer and interactive-editor both use AnnotationManager
- **WHEN** area labels or dimension labels are displayed
- **THEN** formatting and positioning SHALL be identical in both packages

#### Scenario: 2D overlay behavior identical
- **GIVEN** viewer and interactive-editor both use Overlay2DManager
- **WHEN** 2D overlay is shown, dragged, or resized
- **THEN** behavior SHALL be identical in both packages

