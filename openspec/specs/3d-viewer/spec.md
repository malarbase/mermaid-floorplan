# 3d-viewer Specification

## Purpose
TBD - created by archiving change add-3d-viewer. Update Purpose after archive.
## Requirements
### Requirement: 3D Visualization
The system SHALL provide a web-based interface to visualize the floorplan in 3D.

#### Scenario: View Floorplan
- **WHEN** the viewer is opened with a valid floorplan data file
- **THEN** the user can see a 3D representation of the floors and rooms.
- **AND** the user can rotate and zoom the camera.

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

