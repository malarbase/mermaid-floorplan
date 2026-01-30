## MODIFIED Requirements

### Requirement: Module Architecture

The interactive editor SHALL be implemented with a layered architecture where `InteractiveEditorCore` extends `FloorplanAppCore` to add editor-specific functionality, and the **unified** `createFloorplanUI()` factory with `mode: 'editor'` provides full editing capabilities using DaisyUI components.

#### Scenario: InteractiveEditorCore extends FloorplanAppCore

- **GIVEN** a developer wants to build an interactive editor
- **WHEN** they import from `floorplan-viewer-core`
- **THEN** `InteractiveEditorCore` SHALL extend `FloorplanAppCore`
- **AND** it SHALL add selection → DSL bidirectional sync
- **AND** it SHALL add parse error state management
- **AND** it SHALL emit editor-specific events (`selectionChange`, `parseError`)

#### Scenario: Unified factory provides editor interface

- **GIVEN** a developer wants a reactive editor UI
- **WHEN** they call `createFloorplanUI(editorCore, { mode: 'editor', onPropertyChange: fn })`
- **THEN** it SHALL return a Solid.js root component
- **AND** it SHALL include all viewer UI features (HeaderBar, FileDropdown, CommandPalette)
- **AND** it SHALL add PropertiesPanel for selection editing
- **AND** it SHALL add AddRoomDialog, DeleteConfirmDialog, ExportMenu
- **AND** it SHALL display parse error banners when DSL has errors

#### Scenario: Standalone Solid components are reused

- **GIVEN** viewer and editor modes need common UI components
- **WHEN** the components are rendered
- **THEN** both modes SHALL import from standalone files (`HeaderBar.tsx`, `FileDropdown.tsx`, `CommandPalette.tsx`)
- **AND** no duplicate implementations SHALL exist
- **AND** component behavior SHALL be consistent between viewer and editor modes

#### Scenario: createEditorUI is deprecated

- **GIVEN** a developer imports `createEditorUI` from `floorplan-viewer-core`
- **WHEN** they call it
- **THEN** it SHALL internally delegate to `createFloorplanUI(core, { mode: 'editor', ... })`
- **AND** a deprecation warning SHALL be logged to console
- **AND** the function SHALL be removed in a future major version

## ADDED Requirements

### Requirement: Editor HTML Minimization

The editor entry point (`floorplan-editor/index.html`) SHALL contain only minimal HTML markup, with all UI components created programmatically.

#### Scenario: Minimal HTML shell

- **GIVEN** the editor HTML file
- **WHEN** inspected
- **THEN** it SHALL contain fewer than 50 lines total
- **AND** it SHALL include only `<div id="app">` container
- **AND** all UI components (dialogs, panels, overlays) SHALL be created by JavaScript

#### Scenario: No inline CSS for components

- **GIVEN** the editor HTML file
- **WHEN** inspected
- **THEN** it SHALL NOT contain component-specific CSS styles
- **AND** only base CSS (body reset, theme background) SHALL be inline
- **AND** all component styling SHALL come from DaisyUI/Tailwind classes

### Requirement: DaisyUI Dialog Components

The editor's dialogs (Add Room, Delete Confirm) SHALL use DaisyUI's native `<dialog>` modal pattern.

#### Scenario: Add Room dialog uses DaisyUI modal

- **WHEN** the user clicks "Add Room" button
- **THEN** a DaisyUI modal SHALL open using `<dialog>` element
- **AND** form inputs SHALL use `input input-bordered` classes
- **AND** buttons SHALL use `btn btn-primary` and `btn` classes
- **AND** clicking backdrop or pressing Escape SHALL close the modal

#### Scenario: Delete Confirm dialog uses DaisyUI modal

- **WHEN** the user initiates a delete action
- **THEN** a DaisyUI modal SHALL open with warning styling
- **AND** the delete button SHALL use `btn btn-error` class
- **AND** cascade warnings SHALL use `alert alert-warning` styling

### Requirement: Editor Properties Panel with DaisyUI

The properties panel SHALL use DaisyUI form components for editing entity properties.

#### Scenario: Properties panel styling

- **WHEN** an element is selected in the 3D view
- **THEN** the properties panel SHALL appear as a DaisyUI `card`
- **AND** input fields SHALL use `input input-bordered input-sm` classes
- **AND** labels SHALL use `label` and `label-text` classes
- **AND** the delete button SHALL use `btn btn-error btn-sm` class

#### Scenario: Properties panel theme adaptation

- **GIVEN** the editor theme is set to "dark"
- **WHEN** the properties panel is visible
- **THEN** it SHALL automatically use dark theme colors via `data-theme`
- **AND** no explicit dark-mode CSS selectors SHALL be needed

### Requirement: Error Banner with DaisyUI Alert

The editor SHALL display parse errors using DaisyUI alert components.

#### Scenario: Parse error banner styling

- **WHEN** the DSL contains a parse error
- **THEN** an error banner SHALL appear at the top of the viewport
- **AND** it SHALL use `alert alert-error` classes
- **AND** it SHALL include the error message from the parser

#### Scenario: Error overlay with DaisyUI styling

- **WHEN** the 3D view is showing stale geometry due to parse error
- **THEN** a semi-transparent overlay SHALL dim the 3D view
- **AND** a badge SHALL indicate "Viewing stale geometry"
- **AND** the badge SHALL use `badge badge-error` classes
