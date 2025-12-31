## ADDED Requirements

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
The viewer SHALL organize all controls in an expandable/collapsible panel.

#### Scenario: Collapsible control sections
- **WHEN** viewing the controls panel
- **THEN** controls SHALL be organized into collapsible sections:
  - Camera (mode, FOV, presets)
  - Lighting (azimuth, elevation, intensity)
  - View (exploded view)
  - Annotations (area, dimensions, floor summary)
  - Validation (warnings display toggle)
  - Export (GLTF, GLB buttons)

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

