## ADDED Requirements

### Requirement: Optional Solid.js for Viewer UI

The 3D viewer SHALL support optional Solid.js components for control panels and overlays while maintaining vanilla Three.js rendering.

#### Scenario: Viewer works without Solid components

- **GIVEN** a user embeds the 3D viewer
- **WHEN** they instantiate BaseViewer or FloorplanApp with `enableEditing: false`
- **THEN** the viewer SHALL work with vanilla-only UI components
- **AND** Solid.js code SHALL be tree-shaken if unused
- **AND** bundle size SHALL remain under 1 MB (excluding Three.js)

#### Scenario: Solid control panels optional

- **GIVEN** the viewer includes control panels (camera, light, annotations)
- **WHEN** the panels are implemented in Solid.js
- **THEN** they SHALL be lazy-loaded only when needed
- **AND** vanilla fallback panels SHALL be available for maximum compatibility

### Requirement: Three.js Rendering Isolation

The 3D viewer SHALL maintain strict separation between Solid.js UI components and vanilla Three.js rendering code.

#### Scenario: Three.js scene managed in vanilla

- **GIVEN** the BaseViewer class manages the Three.js scene
- **WHEN** floorplan data is loaded
- **THEN** scene initialization, geometry creation, and rendering SHALL remain in vanilla TypeScript
- **AND** Solid components SHALL NOT directly manipulate Three.js objects
- **AND** Solid components SHALL trigger updates via callbacks only

#### Scenario: Canvas mounting uses vanilla DOM

- **GIVEN** the Three.js renderer needs a canvas element
- **WHEN** BaseViewer initializes
- **THEN** canvas creation and mounting SHALL use vanilla `document.createElement()`
- **AND** Solid SHALL NOT be used for canvas rendering
- **AND** refs to the canvas SHALL be passed to Solid components only for positioning calculations if needed

#### Scenario: Material updates triggered by Solid UI

- **GIVEN** a Solid control panel for theme switching
- **WHEN** the user toggles the theme
- **THEN** the Solid component SHALL invoke a vanilla callback
- **AND** BaseViewer SHALL handle material regeneration in vanilla code
- **AND** Solid SHALL re-render UI controls only

### Requirement: Solid-Vanilla Communication

Solid UI components and vanilla code SHALL communicate through well-defined callback interfaces.

#### Scenario: Solid component calls vanilla method

- **GIVEN** a Solid control panel component
- **WHEN** the user interacts (clicks button, adjusts slider)
- **THEN** the component SHALL invoke a callback prop
- **AND** the callback SHALL be a vanilla function from BaseViewer
- **AND** the vanilla function SHALL update state and scene

#### Scenario: Vanilla updates Solid props

- **GIVEN** the viewer state changes in vanilla code (floorplan loaded, selection changed)
- **WHEN** Solid components need to reflect the new state
- **THEN** vanilla code SHALL update reactive signals/stores
- **AND** Solid components SHALL automatically re-render
- **AND** no manual DOM updates SHALL be required

### Requirement: Performance Preservation

Adding Solid.js SHALL NOT degrade Three.js rendering performance.

#### Scenario: 60 FPS maintained

- **GIVEN** the viewer renders a complex floorplan
- **WHEN** camera moves, animations play, or lights update
- **THEN** the frame rate SHALL remain at 60 FPS
- **AND** Solid reactivity SHALL NOT block the render loop
- **AND** Solid updates SHALL occur outside the animation frame

#### Scenario: Solid updates debounced

- **GIVEN** rapid state changes (slider drag, camera movement)
- **WHEN** Solid UI components need to update
- **THEN** updates SHALL be debounced (≤100 ms)
- **AND** Three.js rendering SHALL NOT wait for UI updates
- **AND** UI SHALL update asynchronously without blocking 3D rendering

### Requirement: Backward Compatibility

Existing viewer integrations SHALL continue working without requiring Solid.js knowledge.

#### Scenario: Existing vanilla API unchanged

- **GIVEN** external code using BaseViewer or FloorplanApp
- **WHEN** Solid.js is added to the project
- **THEN** existing public APIs SHALL remain unchanged
- **AND** constructor options SHALL be backward compatible
- **AND** no Solid-specific configuration SHALL be required

#### Scenario: Vanilla-only builds possible

- **GIVEN** a user wants minimal bundle size
- **WHEN** they build the viewer without Solid components
- **THEN** tree-shaking SHALL remove all Solid.js code
- **AND** the viewer SHALL function identically with vanilla UI
- **AND** no runtime errors SHALL occur from missing Solid
