## MODIFIED Requirements

### Requirement: Room Attribute Specification Order
The DSL SHALL accept room attributes in flexible order between the required `size` and `walls` attributes, allowing users to specify `height`, `elevation`, `label`, and relative positioning in any sequence.

#### Scenario: Elevation before height is accepted
- **GIVEN** a user defines a room with `size (10 x 8) elevation -1.0 height 2.0 walls [...]`
- **WHEN** the parser processes this room definition
- **THEN** the room SHALL be created successfully with elevation=-1.0 and height=2.0

#### Scenario: Label before relative positioning is accepted
- **GIVEN** a user defines a room with `size (10 x 8) label "Pool" below Deck walls [...]`
- **WHEN** the parser processes this room definition
- **THEN** the room SHALL be created successfully with label and relative positioning

#### Scenario: All combinations of attribute order are valid
- **GIVEN** any valid permutation of optional attributes between `size` and `walls`
- **WHEN** the parser processes the room definition
- **THEN** the room SHALL be created with all attributes correctly assigned

#### Scenario: Parse errors remain clear for missing required attributes
- **GIVEN** a room definition missing `size` or `walls`
- **WHEN** the parser processes the definition
- **THEN** a clear error message SHALL indicate which required attribute is missing

