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

### Requirement: Expanded Controls Panel
The viewer SHALL organize all controls in an expandable/collapsible panel.

#### Scenario: Collapsible control sections
- **WHEN** viewing the controls panel
- **THEN** controls SHALL be organized into collapsible sections:
  - Camera (mode, FOV, presets)
  - Lighting (azimuth, elevation, intensity)
  - View (exploded view)
  - Export (GLTF, GLB buttons)

#### Scenario: Panel remembers state
- **WHEN** the user collapses a section
- **THEN** the collapsed state MAY persist during the session

