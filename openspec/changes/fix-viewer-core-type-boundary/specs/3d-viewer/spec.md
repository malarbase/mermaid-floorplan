## MODIFIED Requirements

### Requirement: Viewer Code Organization

The 3D viewer SHALL organize its codebase using specialized manager classes and a shared base class to separate concerns and improve maintainability. The viewer SHALL also export a public interface (`ViewerPublicApi`) for external consumers to access viewer state without depending on concrete class internals.

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

#### Scenario: Public theme getter available
- **GIVEN** `currentTheme` is a protected property on BaseViewer
- **WHEN** an external consumer needs to read the current theme
- **THEN** `getTheme()` SHALL return the current theme as a string
- **AND** the consumer SHALL NOT need to access protected members

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

#### Scenario: Public API surface for external consumers
- **GIVEN** external consumers (SolidStart app bridge components) need viewer state access
- **WHEN** they import from `floorplan-viewer-core`
- **THEN** they SHALL use the exported `ViewerPublicApi` interface
- **AND** the interface SHALL provide getters for theme, selection, annotations, and layout
- **AND** consumers SHALL NOT need `as unknown as` casts to access these features

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

#### Scenario: Selection state accessible through public API
- **WHEN** an external consumer needs to read the current selection
- **THEN** it SHALL call `getSelectionState()` on the `ViewerPublicApi` interface
- **AND** the method SHALL return `SelectionEntity[]` (array, not Set)
- **AND** no access to the internal `SelectionManager` instance SHALL be required
