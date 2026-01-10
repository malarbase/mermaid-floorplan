## MODIFIED Requirements

### Requirement: Module Architecture

The interactive editor SHALL be implemented using the unified `FloorplanApp` class from `viewer-core`, configured with full editing capabilities enabled.

#### Scenario: Viewer remains independently usable

- **GIVEN** a user wants to embed a read-only floorplan visualization
- **WHEN** they instantiate `FloorplanApp` with `enableEditing: false`
- **THEN** they SHALL get a fully functional 3D viewer
- **AND** the bundle SHALL NOT include editor-specific code when tree-shaken
- **AND** the bundle size SHALL remain under 1MB (excluding Three.js)

#### Scenario: Interactive editor uses FloorplanApp

- **GIVEN** a user wants full editing capabilities
- **WHEN** they instantiate `FloorplanApp` with `enableEditing: true`
- **THEN** they SHALL get all viewer functionality plus editing features
- **AND** the same `FloorplanApp` class SHALL be used (not a separate class)
- **AND** shared code SHALL come from `viewer-core` (not duplicated)

#### Scenario: Viewer-core provides shared abstractions

- **GIVEN** both viewer and editor modes need common functionality
- **WHEN** `FloorplanApp` is instantiated
- **THEN** shared interfaces and utilities SHALL be in `viewer-core`
- **AND** `viewer-core` SHALL include: scene context, mesh registry, selection API, floor renderer, toolbar, drag-drop
- **AND** feature enablement SHALL be controlled via constructor options

#### Scenario: Selection API available in both modes

- **GIVEN** a user wants basic selection in the read-only viewer
- **WHEN** they use the `viewer-core` selection API
- **THEN** they SHALL be able to highlight meshes programmatically
- **AND** they SHALL receive selection events (for analytics, linking, etc.)
- **AND** advanced features (properties panel editing) SHALL require `enableEditing: true`

## ADDED Requirements

### Requirement: Auth-Gated Edit Mode

The editor SHALL gate editing features behind an authentication callback to enable SSO/social login integration.

#### Scenario: Edit attempt without auth triggers callback

- **GIVEN** the app is configured with `onAuthRequired` callback
- **WHEN** user attempts to edit (click in editor, modify properties)
- **THEN** the `onAuthRequired` callback SHALL be invoked
- **AND** the edit operation SHALL be blocked until callback resolves true

#### Scenario: Successful auth enables editing

- **GIVEN** the `onAuthRequired` callback returns true
- **WHEN** the auth flow completes
- **THEN** the editor SHALL become fully editable
- **AND** selection mode SHALL be enabled
- **AND** properties panel SHALL allow modifications
- **AND** AI chat SHALL be accessible

#### Scenario: Auth rejection keeps viewer mode

- **GIVEN** the `onAuthRequired` callback returns false
- **WHEN** the auth flow completes
- **THEN** the app SHALL remain in read-only mode
- **AND** a message MAY be displayed explaining auth is required

#### Scenario: Pre-authenticated instantiation

- **GIVEN** the user is already authenticated
- **WHEN** instantiating `FloorplanApp({ enableEditing: true, isAuthenticated: true })`
- **THEN** edit features SHALL be enabled immediately
- **AND** no auth callback SHALL be invoked

### Requirement: Unified Export Interface

The editor SHALL provide all export options via the toolbar Save dropdown, consolidating previously scattered export locations.

#### Scenario: DSL export from toolbar

- **GIVEN** the user has a floorplan loaded
- **WHEN** the user clicks Save → "Save .floorplan"
- **THEN** the current DSL SHALL be downloaded as a `.floorplan` file
- **AND** authentication SHALL be required

#### Scenario: JSON export from toolbar

- **GIVEN** the user has a floorplan loaded
- **WHEN** the user clicks Save → "Export JSON"
- **THEN** the JSON representation SHALL be downloaded
- **AND** no authentication SHALL be required

#### Scenario: 3D export from toolbar

- **GIVEN** the user has a floorplan loaded
- **WHEN** the user clicks Save → "Export GLB" or "Export GLTF"
- **THEN** the 3D model SHALL be exported (existing functionality)
- **AND** no authentication SHALL be required

### Requirement: Consistent File Loading

The editor SHALL support multiple file loading methods through the unified toolbar and drag-drop interface.

#### Scenario: File picker from toolbar

- **WHEN** the user clicks Open → "Open File..."
- **THEN** a file picker dialog SHALL open
- **AND** the user can select `.floorplan` or `.json` files
- **AND** the selected file SHALL be loaded into viewer and editor

#### Scenario: URL loading from toolbar

- **WHEN** the user clicks Open → "Open from URL..."
- **THEN** a URL input dialog SHALL appear
- **AND** the user can enter a URL to a floorplan file
- **AND** the file SHALL be fetched and loaded

#### Scenario: Drag-drop loading

- **WHEN** the user drags a file onto the 3D canvas
- **THEN** the file SHALL be loaded (per drag-drop requirement)
- **AND** the editor panel SHALL update with the loaded content
