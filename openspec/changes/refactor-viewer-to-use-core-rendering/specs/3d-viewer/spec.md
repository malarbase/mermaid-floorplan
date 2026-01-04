## MODIFIED Requirements

### Requirement: Door Rendering in 3D

The 3D viewer SHALL render door connections as rectangular door panels with:
- Correct hinge positioning based on wall direction and swing side
- Door rotation showing partially open state (30° default swing angle)
- Support for `swing` direction (`left` or `right`, default `right`)
- Support for `opensInto` room specification for swing direction
- Consistent rendering between browser viewer and MCP server

#### Scenario: Single door with right swing
- **GIVEN** a connection with `doorType: "door"` and default swing
- **WHEN** the door is rendered
- **THEN** the hinge is positioned on the right side (facing from inside room)
- **AND** the door panel swings inward at 30°

#### Scenario: Single door with left swing
- **GIVEN** a connection with `doorType: "door"` and `swing: "left"`
- **WHEN** the door is rendered
- **THEN** the hinge is positioned on the left side (facing from inside room)
- **AND** the door panel swings inward at 30°

#### Scenario: Door opens into specific room
- **GIVEN** a connection with `opensInto: "RoomB"`
- **WHEN** the door is rendered from RoomA's perspective
- **THEN** the door swings toward RoomB (outward from RoomA)

#### Scenario: Consistent rendering across contexts
- **GIVEN** any door connection
- **WHEN** rendered via MCP server (headless) or browser viewer
- **THEN** the door position, rotation, and appearance are identical

### Requirement: Double Door Rendering

The 3D viewer SHALL render double-door connections as two separate door panels with:
- Each panel at half the total door width
- Mirrored swing positions (left panel hinged left, right panel hinged right)
- Both panels showing partially open state
- Consistent rendering between browser viewer and MCP server

#### Scenario: Double door panels
- **GIVEN** a connection with `doorType: "double-door"`
- **WHEN** the door is rendered
- **THEN** two door panels are created
- **AND** left panel is hinged on the left, swings left
- **AND** right panel is hinged on the right, swings right

#### Scenario: Double door consistent rendering
- **GIVEN** a double-door connection
- **WHEN** rendered via MCP server or browser viewer
- **THEN** both panels have identical positioning and rotation

