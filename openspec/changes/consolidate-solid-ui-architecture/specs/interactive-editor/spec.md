# interactive-editor Delta

## MODIFIED Requirements

### Requirement: Module Architecture

The interactive editor SHALL be implemented with a layered architecture where `InteractiveEditorCore` extends `FloorplanAppCore` to add editor-specific functionality, and `EditorUI` extends the viewer UI pattern for full editing capabilities.

#### Scenario: InteractiveEditorCore extends FloorplanAppCore

- **GIVEN** a developer wants to build an interactive editor
- **WHEN** they import from `floorplan-viewer-core`
- **THEN** `InteractiveEditorCore` SHALL extend `FloorplanAppCore`
- **AND** it SHALL add selection → DSL bidirectional sync
- **AND** it SHALL add parse error state management
- **AND** it SHALL emit editor-specific events (`selectionChange`, `parseError`)

#### Scenario: EditorUI provides complete editor interface

- **GIVEN** a developer wants a reactive editor UI
- **WHEN** they call `createEditorUI(editorCore, options)`
- **THEN** it SHALL return a Solid.js root component
- **AND** it SHALL include all viewer UI features (HeaderBar, FileDropdown, CommandPalette)
- **AND** it SHALL add PropertiesPanel for selection editing
- **AND** it SHALL add AddRoomDialog, DeleteConfirmDialog, ExportMenu
- **AND** it SHALL display parse error banners when DSL has errors

#### Scenario: Standalone Solid components are reused

- **GIVEN** `FloorplanUI` and `EditorUI` need common UI components
- **WHEN** the components are rendered
- **THEN** both SHALL import from standalone files (`HeaderBar.tsx`, `FileDropdown.tsx`, `CommandPalette.tsx`)
- **AND** no duplicate implementations SHALL exist within `FloorplanUI.tsx` or `EditorUI.tsx`
- **AND** component behavior SHALL be consistent between viewer and editor

### Requirement: Deprecated Vanilla UI Removal

The project SHALL remove deprecated vanilla TypeScript UI implementations in favor of Solid.js components.

#### Scenario: Vanilla UI files removed

- **GIVEN** the codebase previously had vanilla UI implementations
- **WHEN** the consolidation is complete
- **THEN** `ui/command-palette.ts` SHALL be deleted
- **AND** `ui/header-bar.ts` SHALL be deleted
- **AND** `ui/file-dropdown.ts` SHALL be deleted
- **AND** `ui/properties-panel-ui.ts` SHALL be deleted
- **AND** utility functions (`createFileCommands`, `createViewCommands`) SHALL be preserved in `ui/command-utils.ts`

#### Scenario: Wrapper files removed

- **GIVEN** orphaned wrapper components existed for Solid/vanilla bridging
- **WHEN** the consolidation is complete
- **THEN** `ui/solid/ControlPanelsWrapper.tsx` SHALL be deleted
- **AND** `ui/solid/PropertiesPanelWrapper.tsx` SHALL be deleted
- **AND** all UI rendering SHALL go through `FloorplanUI` or `EditorUI`

### Requirement: Reactive Editor State Management

The editor SHALL use Solid.js signals for all UI state, coordinated through the EditorUI component.

#### Scenario: Selection state flows through signals

- **GIVEN** a user selects an element in 3D
- **WHEN** `InteractiveEditorCore` emits `selectionChange` event
- **THEN** `EditorUI` SHALL update its selection signal
- **AND** the PropertiesPanel SHALL reactively update to show selected entity
- **AND** no imperative DOM manipulation SHALL be required

#### Scenario: Parse error state flows through signals

- **GIVEN** the DSL has a parse error
- **WHEN** `InteractiveEditorCore` emits `parseError` event
- **THEN** `EditorUI` SHALL update its error signal
- **AND** an error banner SHALL appear reactively
- **AND** the banner SHALL disappear when the error is fixed

#### Scenario: Dialog state coordinated via signals

- **GIVEN** multiple dialogs exist (AddRoom, DeleteConfirm, Export)
- **WHEN** any dialog is opened
- **THEN** other dialogs SHALL close via signal coordination
- **AND** only one dialog SHALL be visible at a time
