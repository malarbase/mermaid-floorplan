## ADDED Requirements

### Requirement: Viewer Controls Integration

The floorplan-app SHALL mount the FloorplanUI component from floorplan-viewer-core to provide full viewer/editor controls within the application.

#### Scenario: Viewer mode controls displayed
- **WHEN** a user views a project they do not own
- **THEN** the viewer displays camera controls, lighting controls, floor visibility, annotations panel, and 2D overlay options
- **AND** the control panel is positioned on the right side of the viewport
- **AND** no editing controls (add room, properties panel) are shown

#### Scenario: Editor mode controls displayed
- **WHEN** a project owner views their own project
- **THEN** the viewer displays all viewer controls plus editing controls
- **AND** the properties panel is available for selected entities
- **AND** the add room button is visible

#### Scenario: Snapshot permalink view
- **WHEN** a user views a snapshot permalink (/s/[hash])
- **THEN** the viewer displays in read-only viewer mode
- **AND** no editing controls are shown regardless of ownership

### Requirement: Camera Controls

The FloorplanUI component SHALL provide camera controls allowing users to adjust the 3D view.

#### Scenario: Switch camera mode
- **WHEN** user clicks the camera mode toggle
- **THEN** the view switches between perspective and orthographic projections

#### Scenario: Adjust field of view
- **WHEN** user adjusts the FOV slider in perspective mode
- **THEN** the camera field of view updates in real-time

#### Scenario: Isometric view preset
- **WHEN** user clicks the isometric view button
- **THEN** the camera moves to a standard isometric viewing angle

### Requirement: Lighting Controls

The FloorplanUI component SHALL provide lighting controls for adjusting scene illumination.

#### Scenario: Adjust light azimuth
- **WHEN** user adjusts the azimuth slider
- **THEN** the main directional light rotates horizontally around the scene

#### Scenario: Adjust light elevation
- **WHEN** user adjusts the elevation slider
- **THEN** the main directional light changes its vertical angle

#### Scenario: Adjust light intensity
- **WHEN** user adjusts the intensity slider
- **THEN** the brightness of the scene lighting changes

### Requirement: Floor Visibility Controls

The FloorplanUI component SHALL provide floor visibility toggles for multi-floor floorplans.

#### Scenario: Toggle floor visibility
- **WHEN** user clicks a floor visibility checkbox
- **THEN** that floor's geometry is shown or hidden in the 3D view

#### Scenario: Single floor floorplan
- **WHEN** the floorplan contains only one floor
- **THEN** the floor visibility section is hidden or shows a single non-toggleable item

### Requirement: Annotation Controls

The FloorplanUI component SHALL provide controls for room annotations and dimensions.

#### Scenario: Toggle area labels
- **WHEN** user toggles the area labels option
- **THEN** room area labels (e.g., "120 sq ft") are shown or hidden

#### Scenario: Toggle dimension annotations
- **WHEN** user toggles the dimensions option
- **THEN** room dimension labels (width x height) are shown or hidden

#### Scenario: Change area unit
- **WHEN** user selects a different area unit (sqm/sqft)
- **THEN** all area labels update to display in the selected unit

### Requirement: 2D Overlay Mini-Map

The FloorplanUI component SHALL provide an optional 2D overlay mini-map.

#### Scenario: Toggle 2D overlay
- **WHEN** user toggles the 2D overlay option
- **THEN** a top-down 2D view is overlaid on the 3D viewport

#### Scenario: 2D overlay position
- **WHEN** 2D overlay is enabled
- **THEN** it appears in a corner of the viewport without blocking primary controls

### Requirement: Command Palette

The FloorplanUI component SHALL provide a command palette for quick actions.

#### Scenario: Open command palette
- **WHEN** user presses ⌘K (Mac) or Ctrl+K (Windows/Linux)
- **THEN** the command palette modal opens

#### Scenario: Search commands
- **WHEN** user types in the command palette search field
- **THEN** matching commands are filtered and displayed

#### Scenario: Execute command
- **WHEN** user selects a command from the palette
- **THEN** the command is executed and the palette closes

### Requirement: Keyboard Shortcuts

The FloorplanUI component SHALL provide keyboard shortcuts for common actions.

#### Scenario: Help overlay
- **WHEN** user presses H or ? key
- **THEN** a keyboard shortcuts help overlay is displayed

#### Scenario: Close help overlay
- **WHEN** user presses Escape or clicks outside the overlay
- **THEN** the keyboard shortcuts help overlay closes

### Requirement: Theme Synchronization

The FloorplanUI component SHALL synchronize its theme with the application theme.

#### Scenario: App theme changes
- **WHEN** the application theme changes (light/dark)
- **THEN** the FloorplanUI updates to match the new theme
- **AND** the 3D scene lighting adjusts for the theme

#### Scenario: Initial theme from app
- **WHEN** the FloorplanUI component mounts
- **THEN** it uses the theme value passed from the app
