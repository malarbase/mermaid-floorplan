## ADDED Requirements

### Requirement: Grammar Versioning
The DSL SHALL support declaring the grammar version for compatibility checking.

#### Scenario: Version in YAML frontmatter
- **GIVEN** a floorplan with YAML frontmatter `version: "1.0"`
- **WHEN** the file is parsed
- **THEN** the parser SHALL validate compatibility with the declared version

#### Scenario: Version in inline directive
- **GIVEN** a floorplan with `%%{version: 1.0}%%` directive
- **WHEN** the file is parsed
- **THEN** the version SHALL be extracted and validated

### Requirement: Dimension Units
The DSL SHALL support explicit dimension units for sizes and positions.

#### Scenario: Room size with units
- **GIVEN** a room defined as `size (10ft x 12ft)`
- **WHEN** the floorplan is rendered
- **THEN** the room SHALL be sized according to the specified unit
- **AND** internal calculations SHALL normalize to meters

#### Scenario: Mixed units in floorplan
- **GIVEN** rooms defined with different units (`m`, `ft`, `cm`)
- **WHEN** the floorplan is parsed
- **THEN** all dimensions SHALL be normalized to a consistent internal unit

### Requirement: Opening Connection Type
The DSL SHALL support `opening` as a connection type for doorless passages.

#### Scenario: Archway connection
- **GIVEN** a connection defined as `connect A.bottom to B.top opening at 50%`
- **WHEN** the floorplan is rendered
- **THEN** a hole SHALL be cut in the wall without a door mesh
- **AND** no swing arc SHALL be rendered

### Requirement: Connection Size Override
The DSL SHALL support custom sizes for individual connections.

#### Scenario: Custom door size
- **GIVEN** a connection with `size (3ft x 7ft)`
- **WHEN** the door is rendered
- **THEN** the door dimensions SHALL override global config values

#### Scenario: Full-height opening
- **GIVEN** a connection with `size (4ft x full)`
- **WHEN** the opening is rendered
- **THEN** the height SHALL extend from floor to ceiling
