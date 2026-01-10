## ADDED Requirements

### Requirement: Cursor Sync
The interactive editor SHALL synchronize cursor position between the DSL editor and the 3D scene.

#### Scenario: Editor cursor highlights room
- **GIVEN** a floorplan with multiple rooms
- **WHEN** the user places the cursor on a room definition in the DSL editor
- **THEN** the corresponding room SHALL be highlighted in the 3D scene

#### Scenario: 3D selection updates editor
- **GIVEN** a floorplan displayed in both editor and 3D view
- **WHEN** the user selects a room in the 3D scene
- **THEN** the editor cursor SHALL move to that room's definition

### Requirement: Live DSL Sync
The interactive editor SHALL provide real-time synchronization between DSL text changes and 3D visualization.

#### Scenario: Text edit updates 3D
- **GIVEN** a valid floorplan displayed in the 3D viewer
- **WHEN** the user modifies room dimensions in the DSL editor
- **THEN** the 3D view SHALL update within 100ms to reflect the change

### Requirement: Validation Warnings Display
The interactive editor SHALL display validation warnings in a dedicated panel.

#### Scenario: Warning panel visibility
- **GIVEN** a floorplan with validation warnings
- **WHEN** the floorplan is parsed
- **THEN** warnings SHALL be displayed in a collapsible panel
- **AND** clicking a warning SHALL navigate to the relevant line in the editor
