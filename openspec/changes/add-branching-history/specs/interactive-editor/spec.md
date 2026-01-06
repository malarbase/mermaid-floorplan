# Interactive Editor - Branching History

## MODIFIED Requirements

### Requirement: Branching History (Time-Travel Undo/Redo)

The editor SHALL support undo/redo for all edit operations using a branching history tree with state snapshots, similar to git's model. The history system SHALL replace Monaco's built-in linear undo stack.

#### Scenario: Undo after property edit

- **GIVEN** a room width was changed from 10 to 12
- **WHEN** the user presses Ctrl/Cmd+Z
- **THEN** the width SHALL revert to 10 in both DSL and 3D

#### Scenario: Undo stack captures all edit operations

- **GIVEN** the user performs multiple edits (create room, change style, delete connection)
- **WHEN** the user repeatedly presses Ctrl/Cmd+Z
- **THEN** each edit SHALL be undone in reverse order
- **AND** both DSL and 3D SHALL reflect each historical state

#### Scenario: Redo restores undone operations

- **GIVEN** the user has undone 3 operations
- **WHEN** the user presses Ctrl/Cmd+Shift+Z (or Ctrl+Y)
- **THEN** the operations SHALL be redone in order
- **AND** both DSL and 3D SHALL update accordingly

#### Scenario: Undo after bulk edit

- **GIVEN** 5 rooms were bulk-edited to change style
- **WHEN** the user presses Ctrl/Cmd+Z once
- **THEN** all 5 rooms SHALL revert to their previous styles
- **AND** the bulk edit SHALL be treated as a single undo step

#### Scenario: Edit after undo preserves history branch

- **GIVEN** the user has undone 2 operations (navigated from state S3 → S2 → S1)
- **WHEN** the user makes a new edit
- **THEN** a new branch SHALL be created from S1 (S1 → S4)
- **AND** the previous branch (S1 → S2 → S3) SHALL be archived, not deleted
- **AND** archived states SHALL display timestamps showing staleness
- **AND** the user MAY navigate to any archived state via history browser

#### Scenario: History browser shows all branches

- **GIVEN** the user has created multiple history branches through edits and undos
- **WHEN** the user opens the history browser
- **THEN** all branches SHALL be visible as a tree/graph structure
- **AND** the current state SHALL be highlighted
- **AND** each node SHALL show its timestamp
- **AND** clicking any node SHALL restore that state

#### Scenario: Undo preserves selection state

- **GIVEN** the user edits a room and then selects a different room
- **WHEN** the user presses Ctrl/Cmd+Z
- **THEN** the edit SHALL be undone
- **AND** the current selection MAY be preserved (not reverted)

#### Scenario: History bounded by configurable limit

- **GIVEN** history is configured with a maximum of 50 nodes
- **WHEN** the user creates the 51st snapshot
- **THEN** the oldest leaf node (not on current path) SHALL be pruned
- **AND** branch point nodes SHALL NOT be pruned

#### Scenario: History survives setValue operations

- **GIVEN** a 3D-triggered edit calls setValue() on the Monaco model
- **WHEN** the user presses Ctrl/Cmd+Z
- **THEN** undo SHALL work correctly
- **AND** the history tree SHALL remain intact

