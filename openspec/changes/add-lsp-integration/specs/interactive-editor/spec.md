# Interactive Editor - LSP Integration

## MODIFIED Requirements

### Requirement: Language Server Protocol Support

The Monaco editor SHALL provide full LSP features via monaco-languageclient, running the Langium language server in a Web Worker for browser compatibility.

#### Scenario: Language server runs in Web Worker

- **GIVEN** the interactive editor is loaded
- **WHEN** the user starts editing a floorplan
- **THEN** a Web Worker SHALL be spawned with the Langium language server
- **AND** LSP communication SHALL use BrowserMessageReader/Writer
- **AND** the main thread SHALL remain responsive during parsing

#### Scenario: Code completion for keywords

- **WHEN** the user types in the editor
- **THEN** keyword completions SHALL appear (room, floor, connect, style, config)
- **AND** completions SHALL be context-aware

#### Scenario: Code completion for room names

- **GIVEN** rooms "Kitchen" and "LivingRoom" are defined
- **WHEN** the user types `connect ` and triggers completion
- **THEN** "Kitchen" and "LivingRoom" SHALL appear as options

#### Scenario: Code completion for style names

- **GIVEN** styles "Modern" and "Rustic" are defined
- **WHEN** the user types `style ` after a room definition
- **THEN** "Modern" and "Rustic" SHALL appear as completion options

#### Scenario: Go-to-definition for style reference

- **GIVEN** a room uses `style Modern`
- **WHEN** the user Ctrl/Cmd-clicks on "Modern"
- **THEN** the cursor SHALL jump to the `style Modern { ... }` definition

#### Scenario: Go-to-definition for room reference

- **GIVEN** a connect statement references room "Kitchen"
- **WHEN** the user Ctrl/Cmd-clicks on "Kitchen" in the connect statement
- **THEN** the cursor SHALL jump to the room "Kitchen" definition

#### Scenario: Hover information for room

- **GIVEN** a room "Kitchen at (0,0) size (10 x 8)"
- **WHEN** the user hovers over "Kitchen" in the editor
- **THEN** a tooltip SHALL display: "Room: Kitchen, Position: (0, 0), Size: 10 × 8, Area: 80 sq units"

#### Scenario: Hover information for connection

- **GIVEN** a connection between Kitchen and LivingRoom
- **WHEN** the user hovers over the connect statement
- **THEN** a tooltip SHALL display connection type and connected room names

#### Scenario: Inline error diagnostics

- **GIVEN** a DSL with a missing room reference in a connect statement
- **WHEN** the file is edited
- **THEN** the error SHALL be underlined in red
- **AND** hovering SHALL show the error message

#### Scenario: Semantic highlighting

- **WHEN** the DSL is displayed in the editor
- **THEN** room names SHALL have distinct coloring from keywords
- **AND** style names SHALL have distinct coloring
- **AND** numbers SHALL have distinct coloring

#### Scenario: LSP graceful degradation

- **GIVEN** the LSP worker fails to initialize
- **WHEN** the editor is used
- **THEN** basic editing SHALL still work without LSP features
- **AND** a notice SHALL inform the user that advanced features are unavailable

