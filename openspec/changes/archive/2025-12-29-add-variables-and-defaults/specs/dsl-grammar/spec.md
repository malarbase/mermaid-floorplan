## ADDED Requirements
### Requirement: Variables and Defaults
The DSL SHALL support defining variables and global configuration defaults.

#### Scenario: Defining and using a dimension variable
- **WHEN** a user defines `define standard_bed (12 x 12)`
- **AND** uses `room Bed1 size standard_bed`
- **THEN** the room size is resolved to 12x12

#### Scenario: Global configuration
- **WHEN** `config { wall_thickness: 0.3 }` is defined
- **THEN** all walls without explicit thickness use 0.3

#### Scenario: Variable not defined error
- **WHEN** a room uses `room Bed1 size undefined_var`
- **AND** `undefined_var` is not defined
- **THEN** the system SHALL report an error indicating the undefined variable

#### Scenario: Multiple variables in same floorplan
- **WHEN** multiple variables are defined (`define small (5 x 5)`, `define medium (10 x 10)`)
- **AND** rooms use different variables
- **THEN** each room SHALL resolve to its respective variable value

### Requirement: Define Statement Syntax
The DSL SHALL support a `define` statement to create named dimension values.

#### Scenario: Define dimension variable
- **WHEN** user writes `define master_bed (15 x 12)`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** `master_bed` SHALL be available as a variable reference

#### Scenario: Define statement position
- **WHEN** `define` statements appear before `floor` definitions
- **THEN** the parser SHALL accept this ordering
- **AND** variables SHALL be accessible in all floors

### Requirement: Config Block Syntax
The DSL SHALL support a `config` block for global rendering defaults.

#### Scenario: Config block with wall thickness
- **WHEN** user writes `config { wall_thickness: 0.5 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the wall thickness value SHALL be available for rendering

#### Scenario: Config block with multiple properties
- **WHEN** user writes `config { wall_thickness: 0.3, door_width: 1.0 }`
- **THEN** the parser SHALL accept multiple property definitions
- **AND** all properties SHALL be available for rendering

