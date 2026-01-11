## ADDED Requirements

### Requirement: Unified FloorplanApp Entry Point

The viewer SHALL provide a unified `FloorplanApp` class that supports both read-only viewer and full-editor modes via feature flags.

#### Scenario: Viewer-only mode instantiation

- **GIVEN** a user wants a read-only 3D viewer
- **WHEN** they instantiate `new FloorplanApp({ enableEditing: false })`
- **THEN** the viewer SHALL render with all viewing features (camera, lighting, floors, annotations)
- **AND** edit features (DSL editing, selection, properties) SHALL be disabled
- **AND** no authentication SHALL be required

#### Scenario: Full-editor mode instantiation

- **GIVEN** a user wants full editing capabilities
- **WHEN** they instantiate `new FloorplanApp({ enableEditing: true, onAuthRequired: callback })`
- **THEN** viewer features SHALL be available immediately
- **AND** edit features SHALL require authentication via the callback

#### Scenario: Runtime edit mode request

- **GIVEN** an app instantiated in viewer-only mode
- **WHEN** user calls `app.requestEditMode()`
- **THEN** the `onAuthRequired` callback SHALL be invoked
- **AND** if authenticated, edit features SHALL be enabled
- **AND** if not authenticated, the app SHALL remain in viewer mode

### Requirement: Header Bar with File Operations

The viewer SHALL provide a minimal header bar with file name dropdown and command palette for file operations.

#### Scenario: Header bar always visible

- **WHEN** the viewer is rendered
- **THEN** a header bar SHALL appear at the top of the viewport
- **AND** the header SHALL contain a clickable file name (or "Untitled.floorplan")
- **AND** the header SHALL contain an Editor toggle button
- **AND** the header SHALL contain a command palette trigger (⌘K icon)

#### Scenario: File name dropdown menu

- **WHEN** the user clicks the file name in the header
- **THEN** a dropdown SHALL appear with options:
  - Open File... (⌘O)
  - Open from URL...
  - Open Recent (submenu, if available)
  - Separator
  - Save .floorplan (⌘S) with lock icon if not authenticated
  - Export JSON
  - Export GLB
  - Export GLTF
- **AND** keyboard shortcuts SHALL be displayed next to applicable items

#### Scenario: Command palette activation

- **WHEN** the user presses ⌘K (Mac) or Ctrl+K (Windows/Linux)
- **OR** clicks the ⌘K icon in the header
- **THEN** a command palette overlay SHALL appear
- **AND** the palette SHALL be searchable
- **AND** all file operations and app commands SHALL be listed with shortcuts

#### Scenario: Command palette search

- **GIVEN** the command palette is open
- **WHEN** the user types "export"
- **THEN** the palette SHALL filter to show matching commands (Export JSON, Export GLB, Export GLTF)
- **AND** the user can select with arrow keys and Enter

#### Scenario: Save requires authentication

- **GIVEN** the user is not authenticated
- **WHEN** the user selects "Save .floorplan" from dropdown or command palette
- **THEN** the `onAuthRequired` callback SHALL be invoked
- **AND** the save operation SHALL proceed only if authenticated

### Requirement: Drag-and-Drop File Loading

The viewer SHALL support loading floorplan files via drag-and-drop on the 3D canvas.

#### Scenario: Drag file over canvas

- **WHEN** the user drags a file over the 3D canvas
- **THEN** a visual overlay SHALL appear indicating drop target
- **AND** the overlay SHALL show "Drop to open floorplan" text
- **AND** the canvas border SHALL highlight

#### Scenario: Drop valid floorplan file

- **GIVEN** the user drags a `.floorplan` or `.json` file over the canvas
- **WHEN** the user releases the drag
- **THEN** the file SHALL be loaded and rendered
- **AND** the overlay SHALL disappear
- **AND** the editor panel SHALL update with file content (if visible)

#### Scenario: Drop invalid file type

- **GIVEN** the user drags an unsupported file type
- **WHEN** the user releases the drag
- **THEN** an error toast SHALL appear with message "Unsupported file type"
- **AND** the existing floorplan SHALL remain unchanged

#### Scenario: Drag leave cancels

- **WHEN** the user drags a file over the canvas and then moves away
- **THEN** the visual overlay SHALL disappear
- **AND** no file loading SHALL occur

### Requirement: Editor Panel in Viewer Mode

The viewer SHALL display a collapsible editor panel that shows DSL code in read-only mode, with full editing available after authentication.

#### Scenario: Editor panel visible in viewer mode

- **GIVEN** the app is in viewer-only mode (enableEditing: false)
- **WHEN** the user expands the editor panel
- **THEN** the DSL code SHALL be displayed
- **AND** the code SHALL be read-only (no cursor editing)
- **AND** a "Login to Edit" button SHALL be visible

#### Scenario: Cursor highlighting works in read-only mode

- **GIVEN** the editor panel is in read-only mode
- **WHEN** the user clicks on a room definition in the code
- **THEN** the corresponding 3D room SHALL be highlighted
- **AND** no text modification SHALL occur

#### Scenario: Edit mode unlocks editor

- **GIVEN** the editor panel is in read-only mode
- **WHEN** the user authenticates via "Login to Edit"
- **THEN** the editor SHALL become fully editable
- **AND** the "Login to Edit" button SHALL be replaced with edit status indicator
- **AND** DSL changes SHALL live-sync to 3D view

## MODIFIED Requirements

### Requirement: Editor Panel Integration

The viewer SHALL provide a collapsible side panel containing a Monaco code editor and AI chat interface for editing floorplan DSL.

#### Scenario: Toggle Editor Panel

- **WHEN** the user clicks the editor toggle button in the toolbar
- **THEN** the editor panel SHALL slide in/out from the left side
- **AND** the toggle SHALL indicate the current state (◀ open, ▶ closed)

#### Scenario: Editor panel default state

- **GIVEN** the app is configured with `editorPanelDefaultOpen` option
- **WHEN** the app initializes
- **THEN** the editor panel SHALL be open or closed based on the option
- **AND** viewer-only mode SHALL default to closed
- **AND** editor mode SHALL default to open

#### Scenario: Live Preview

- **GIVEN** the editor is in editable mode
- **WHEN** the user edits the floorplan DSL in the editor
- **THEN** the 3D view SHALL update automatically after a debounce delay
- **AND** validation errors SHALL be displayed in the warnings panel

#### Scenario: AI Chat Integration

- **GIVEN** the editor is in editable mode
- **WHEN** the user enters an OpenAI API key and sends a chat message
- **THEN** the AI SHALL respond with floorplan suggestions or modifications
- **AND** if the response contains a floorplan code block, it SHALL be applied to the editor

#### Scenario: Configurable API Endpoint

- **WHEN** the user enters a custom API base URL
- **THEN** API requests SHALL be sent to that endpoint instead of the default OpenAI URL
- **AND** the URL and API key SHALL be persisted to localStorage
