# 3d-viewer Specification (Delta)

## ADDED Requirements

### Requirement: That Open Viewer Option

The system SHALL support an optional That Open-based 3D viewer as an alternative to the current Three.js custom viewer.

#### Scenario: Load floorplan in That Open viewer

- **GIVEN** a valid floorplan exported to Fragments format
- **WHEN** the That Open viewer is initialized with the Fragments data
- **THEN** the 3D model SHALL be displayed
- **AND** standard BIM navigation controls SHALL be available

#### Scenario: Viewer selection configuration

- **GIVEN** a viewer configuration option `viewer: "thatopen" | "custom"`
- **WHEN** `viewer: "thatopen"` is specified
- **THEN** the That Open viewer SHALL be loaded
- **AND** the custom Three.js viewer SHALL NOT be initialized

#### Scenario: Default viewer unchanged

- **GIVEN** no viewer configuration is specified
- **WHEN** the viewer is initialized
- **THEN** the custom Three.js viewer SHALL be used (backward compatible)

### Requirement: That Open 2D Floor Plan Views

The That Open viewer SHALL support generating 2D floor plan views from the 3D model.

#### Scenario: Generate floor plan view

- **GIVEN** a multi-floor building loaded in That Open viewer
- **WHEN** the user selects "Floor Plan" mode
- **THEN** an orthographic 2D view SHALL be displayed
- **AND** the view SHALL show the selected floor from above

#### Scenario: Floor plan styling

- **GIVEN** a floor plan view is active
- **WHEN** elements are rendered
- **THEN** walls SHALL be displayed as thick lines
- **AND** doors SHALL be displayed with swing arcs
- **AND** windows SHALL be displayed as dashed lines

#### Scenario: Floor plan from IFC storeys

- **GIVEN** a Fragments model with IfcBuildingStorey data
- **WHEN** floor plan views are requested
- **THEN** views SHALL be generated for each storey
- **AND** storey names SHALL be used as view labels

### Requirement: That Open Element Selection

The That Open viewer SHALL support selecting and highlighting individual elements.

#### Scenario: Click to select element

- **GIVEN** a 3D model displayed in That Open viewer
- **WHEN** the user clicks on a room
- **THEN** the room SHALL be highlighted
- **AND** the room properties SHALL be displayed

#### Scenario: Property display for selected element

- **GIVEN** a room is selected
- **WHEN** properties are displayed
- **THEN** the room name, dimensions, and area SHALL be shown
- **AND** style properties (if any) SHALL be shown

### Requirement: That Open Camera Controls

The That Open viewer SHALL provide standard BIM navigation controls.

#### Scenario: Orbit camera control

- **WHEN** the user drags with left mouse button
- **THEN** the camera SHALL orbit around the model

#### Scenario: Pan camera control

- **WHEN** the user drags with right mouse button or Shift+left drag
- **THEN** the camera SHALL pan laterally

#### Scenario: Zoom camera control

- **WHEN** the user scrolls the mouse wheel
- **THEN** the camera SHALL zoom in/out

#### Scenario: Fit to view

- **WHEN** the user presses 'F' or clicks "Fit" button
- **THEN** the camera SHALL adjust to show the entire model

### Requirement: That Open Lazy Loading

The That Open viewer SHALL be lazy-loaded to minimize initial bundle size.

#### Scenario: Initial load without That Open

- **GIVEN** the application starts with custom viewer (default)
- **WHEN** the page loads
- **THEN** That Open libraries SHALL NOT be loaded
- **AND** only custom Three.js code SHALL be in the initial bundle

#### Scenario: That Open loaded on demand

- **GIVEN** the user switches to That Open viewer
- **WHEN** the viewer is initialized
- **THEN** `@thatopen/components` SHALL be dynamically imported
- **AND** `@thatopen/fragments` SHALL be dynamically imported

