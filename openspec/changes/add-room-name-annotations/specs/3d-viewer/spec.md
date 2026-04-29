## ADDED Requirements

### Requirement: Room Name Annotations

The 3D viewer SHALL display room name labels as CSS2D overlays positioned above each room, with a user-controlled toggle in the Annotations panel.

#### Scenario: Room name label shown by default
- **GIVEN** a floorplan is loaded with named rooms
- **WHEN** the viewer initialises
- **THEN** each room SHALL have a CSS2D label showing its name (or DSL `label` override if present)
- **AND** the label SHALL be visible without any user interaction

#### Scenario: Room name label uses DSL label override
- **GIVEN** a room defines a `label "custom name"` clause
- **WHEN** the viewer renders room name annotations
- **THEN** the CSS2D label SHALL show the custom label text, not the room's identifier

#### Scenario: Room name label positioned above area label
- **GIVEN** both room name and area labels are visible
- **WHEN** the scene is rendered
- **THEN** the room name label SHALL be positioned at Y = `elevation + 0.7`
- **AND** the area label at Y = `elevation + 0.5` SHALL remain visible without overlap

#### Scenario: Room name toggle hides all labels
- **GIVEN** the "Show Room Names" checkbox is unchecked
- **WHEN** annotations are updated
- **THEN** all room name CSS2D labels SHALL be removed from the scene
- **AND** no DOM elements for room names SHALL remain

#### Scenario: Room name toggle shows labels
- **GIVEN** the "Show Room Names" checkbox is checked
- **WHEN** annotations are updated
- **THEN** each room SHALL have a CSS2D label re-created and attached to its floor group

#### Scenario: Room name labels cleaned up on annotation clear
- **GIVEN** annotations are cleared (e.g. on floorplan reload)
- **WHEN** clearAllAnnotations() is called
- **THEN** all room name CSS2D label DOM elements SHALL be removed
- **AND** the internal tracking array SHALL be empty (no memory leak)
