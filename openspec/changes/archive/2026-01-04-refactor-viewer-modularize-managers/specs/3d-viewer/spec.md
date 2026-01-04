## ADDED Requirements

### Requirement: Viewer Code Organization
The 3D viewer SHALL organize its codebase using specialized manager classes to separate concerns and improve maintainability.

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
The viewer SHALL provide a FloorManager class to handle floor visibility state and UI.

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

### Requirement: 2D Overlay Manager
The viewer SHALL provide an Overlay2DManager class to handle 2D SVG overlay rendering and interactions.

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

