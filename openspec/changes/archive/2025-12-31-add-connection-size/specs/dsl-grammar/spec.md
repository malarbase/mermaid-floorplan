## ADDED Requirements

### Requirement: Connection Size Specification

The DSL SHALL support an optional `size` attribute on connections to specify door/opening dimensions, overriding global config defaults.

#### Scenario: Connection with explicit size

- **GIVEN** a connection between two rooms
- **WHEN** the user specifies `connect Room1.bottom to Room2.top door at 50% size (3ft x 7ft)`
- **THEN** the door SHALL be rendered with width 3ft and height 7ft
- **AND** the size SHALL override any `door_size` or `door_width`/`door_height` config values

#### Scenario: Connection with full height

- **GIVEN** a connection between two rooms where Room1 has height 10ft
- **WHEN** the user specifies `connect Room1.bottom to Room2.top opening at 50% size (4ft x full)`
- **THEN** the opening SHALL be rendered with width 4ft and height equal to the room height
- **AND** the opening SHALL extend from floor to ceiling

#### Scenario: Connection size with only width specified

- **GIVEN** a connection between two rooms
- **WHEN** the user specifies `connect Room1.left to Room2.right door at 50% size (2.5ft x 7ft)`
- **THEN** the door SHALL use the specified width 2.5ft
- **AND** the door SHALL use the specified height 7ft

### Requirement: Config Size Properties

The DSL SHALL support `door_size` and `window_size` config properties using the `Dimension` type `(width x height)`.

#### Scenario: door_size in config

- **GIVEN** a floor with config `door_size: (3 x 7)`
- **WHEN** a connection is defined without explicit size
- **THEN** the connection SHALL use width=3 and height=7 from config
- **AND** the values SHALL use the floor's `default_unit`

#### Scenario: window_size in config

- **GIVEN** a floor with config `window_size: (4 x 3)` and a room with `walls [left: window]`
- **WHEN** the window is rendered without explicit size
- **THEN** the window SHALL use width=4 and height=3 from config

#### Scenario: Backward compatibility with width/height

- **GIVEN** a floor with config `door_width: 3, door_height: 7`
- **WHEN** no `door_size` is specified
- **THEN** the system SHALL use door_width and door_height values
- **AND** no deprecation warning SHALL be emitted (backward compatible)

#### Scenario: door_size takes precedence

- **GIVEN** a floor with config `door_size: (3 x 7), door_width: 4`
- **WHEN** a connection is rendered
- **THEN** the system SHALL use door_size values (width=3, height=7)
- **AND** the system MAY emit a warning about conflicting properties

### Requirement: Full Height Keyword

The DSL SHALL support the keyword `full` as a height value in connection size specification, indicating the opening extends to the ceiling.

#### Scenario: Full height opening in 3D viewer

- **GIVEN** a room with height 3.35m
- **WHEN** a connection specifies `size (4ft x full)`
- **THEN** the 3D viewer SHALL cut a hole from floor to ceiling (height=3.35m)
- **AND** no lintel or header SHALL be rendered above the opening

#### Scenario: Full height with door type

- **GIVEN** a connection with `door at 50% size (3ft x full)`
- **WHEN** the door is rendered
- **THEN** the door frame SHALL extend to ceiling height
- **AND** a door leaf of standard height MAY be rendered with transom above

### Requirement: Size Validation

The system SHALL validate connection size dimensions against physical constraints.

#### Scenario: Size exceeds wall length

- **GIVEN** a shared wall segment of 5ft width
- **WHEN** a connection specifies `size (6ft x 7ft)`
- **THEN** the system SHALL emit a warning that size exceeds shared wall length
- **AND** rendering SHALL proceed with the specified size (may overlap)

#### Scenario: Height exceeds room height

- **GIVEN** a room with height 8ft
- **WHEN** a connection specifies `size (3ft x 10ft)`
- **THEN** the system SHALL emit a warning that height exceeds room height
- **AND** the system MAY clamp height to room height

