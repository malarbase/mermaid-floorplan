## MODIFIED Requirements

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

## ADDED Requirements

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

