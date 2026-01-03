## MODIFIED Requirements

### Requirement: Stair Direction Specification
The DSL SHALL support specifying the climb direction for stairs using view-relative terminology consistent with wall directions.

#### Scenario: View-relative direction for straight stair
- **WHEN** a user defines `shape straight toward top`
- **THEN** the stair SHALL climb toward the top of the view (equivalent to wall direction "top")

#### Scenario: View-relative direction alternatives
- **WHEN** a user defines `shape straight toward bottom`
- **THEN** the stair SHALL climb toward the bottom of the view
- **AND** `toward left` SHALL climb toward the left
- **AND** `toward right` SHALL climb toward the right

#### Scenario: Entry direction for turned stairs
- **WHEN** a user defines `shape L-shaped from bottom turn left`
- **THEN** the stair entry SHALL face the bottom of the view and turn left (climbing toward the right)

#### Scenario: Rotation direction for spiral
- **WHEN** a user defines `shape spiral rotation clockwise`
- **THEN** the spiral SHALL rotate clockwise when viewed from above

### Requirement: Lift Element Definition
The DSL SHALL support a `lift` element type for elevator shafts.

#### Scenario: Basic lift
- **WHEN** a user defines `lift MainLift at (20, 25) size (5ft x 5ft)`
- **THEN** the parser SHALL accept this as a valid lift definition
- **AND** the lift SHALL have a 5ft × 5ft footprint

#### Scenario: Lift with door specification
- **WHEN** a user defines `lift MainLift at (20, 25) size (5ft x 5ft) doors (top, bottom)`
- **THEN** the lift SHALL have door openings on the top and bottom sides of the lift shaft

#### Scenario: Lift with relative position
- **WHEN** a user defines `lift ServiceLift size (4ft x 4ft) right-of StairLanding`
- **THEN** the lift SHALL be positioned relative to StairLanding

#### Scenario: Lift with label and style
- **WHEN** a user defines `lift Elevator size (5ft x 5ft) label "Main Elevator" style Circulation`
- **THEN** the lift SHALL have the specified label and style for rendering

## ADDED Requirements

### Requirement: View Direction Terminal
The DSL grammar SHALL define a `ViewDirection` terminal with values `top`, `bottom`, `left`, `right` for stair and lift orientation.

#### Scenario: ViewDirection in grammar
- **WHEN** the grammar is parsed
- **THEN** `ViewDirection` SHALL be defined as `'top' | 'bottom' | 'left' | 'right'`
- **AND** this SHALL be distinct from `WallDirection` (used for wall specifications)
- **AND** `ViewDirection` SHALL be used with prepositions `toward` and `from` for semantic clarity

### Requirement: Stair Direction Prepositions
The DSL SHALL use the preposition `toward` for climb direction and `from` for entry direction to semantically distinguish movement from position.

#### Scenario: Toward preposition for climb direction
- **WHEN** a user defines a straight stair
- **THEN** the syntax SHALL be `shape straight toward <ViewDirection>`
- **AND** "toward" indicates the direction of ascent

#### Scenario: From preposition for entry direction
- **WHEN** a user defines a turned stair (L-shaped, U-shaped, etc.)
- **THEN** the syntax SHALL be `shape <type> from <ViewDirection> turn <left|right>`
- **AND** "from" indicates where the user enters the stair
