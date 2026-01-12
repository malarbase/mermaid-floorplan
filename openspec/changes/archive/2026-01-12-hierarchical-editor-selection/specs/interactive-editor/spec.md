## ADDED Requirements

### Requirement: Hierarchical Selection from Editor

The editor SHALL select related elements hierarchically based on cursor position in the DSL.

#### Scenario: Floor cursor selects all floor contents

- **GIVEN** the cursor is on a `floor` keyword or floor ID
- **WHEN** editor-to-3D sync occurs
- **THEN** all rooms on that floor SHALL be selected
- **AND** all walls of those rooms SHALL be selected

#### Scenario: Room cursor selects room and walls

- **GIVEN** the cursor is on a `room` keyword or room name
- **WHEN** editor-to-3D sync occurs
- **THEN** the room floor mesh SHALL be selected
- **AND** all 4 walls of that room SHALL be selected

#### Scenario: Wall cursor selects single wall

- **GIVEN** the cursor is in the `walls:` section or on a specific wall directive
- **WHEN** editor-to-3D sync occurs
- **THEN** only that specific wall SHALL be selected

#### Scenario: Connection cursor selects single connection

- **GIVEN** the cursor is on a door or window definition
- **WHEN** editor-to-3D sync occurs
- **THEN** only that door/window SHALL be selected

### Requirement: Multi-Cursor Hierarchical Selection

The editor SHALL support hierarchical selection with multiple cursors.

#### Scenario: Multiple cursors create union selection

- **GIVEN** multiple cursors are active in the Monaco editor
- **WHEN** editor-to-3D sync occurs
- **THEN** the selection SHALL be the union of all hierarchical selections
- **AND** each cursor position SHALL expand to its hierarchy level

### Requirement: Hierarchical Selection Visual Feedback

The editor SHALL provide distinct visual feedback for hierarchical selection levels.

#### Scenario: Primary and secondary highlights

- **GIVEN** a room is selected via cursor on room name
- **WHEN** the selection is displayed
- **THEN** the room floor mesh SHALL have primary highlight
- **AND** child walls SHALL have secondary/dimmed highlight
- **AND** the visual distinction SHALL clearly show the parent-child relationship

#### Scenario: Editor breadcrumb for wall selection

- **GIVEN** a specific wall is selected
- **WHEN** viewing the editor
- **THEN** a breadcrumb MAY be displayed showing hierarchy (e.g., "Kitchen > top wall")
