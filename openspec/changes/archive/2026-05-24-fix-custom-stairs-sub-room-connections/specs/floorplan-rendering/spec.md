## ADDED Requirements

### Requirement: Custom Segmented Stair 3D Coordinate Tracking
The 3D stair generator SHALL use scalar X/Y coordinate accumulation that exactly matches the 2D SVG renderer's trace logic, so custom segmented stairs (composed of `flight` and `landing` segments with turn directions) render identically in 2D and 3D views.

#### Scenario: Custom segmented stair coordinates align between 2D and 3D
- **GIVEN** a floorplan defines a custom stair with `shape: custom` and a `segments` array containing `flight` and `landing` entries
- **WHEN** the 3D renderer processes the stair
- **THEN** each segment's position is computed using scalar `currentX` / `currentY` tracking
- **AND** the final stair geometry matches the 2D renderer's traced footprint

#### Scenario: Direction turns in custom stair segments
- **GIVEN** a custom stair segment specifies `turn: left` or `turn: right`
- **WHEN** the 3D renderer advances past that segment
- **THEN** the travel direction rotates counter-clockwise (left) or clockwise (right)
- **AND** subsequent segments extend in the updated direction

### Requirement: Sub-Room Connection Rendering
The connection renderer SHALL support connections between parent rooms and their nested child sub-rooms by resolving absolute positions recursively through the parent-child hierarchy.

#### Scenario: Connecting a parent room to its sub-room
- **GIVEN** a parent room `LivingArea` contains a sub-room `Study` via `composed of [...]`
- **WHEN** a connection is defined as `connect LivingArea.right to Study.left door at 50%`
- **THEN** the renderer locates both rooms and `Study`'s parent `LivingArea`
- **AND** computes `Study`'s absolute position by adding `LivingArea`'s position to `Study`'s relative position
- **AND** renders the door connection at the correct absolute wall segment

#### Scenario: Connecting two sibling sub-rooms within the same parent
- **GIVEN** a parent room `OpenOffice` contains sub-rooms `PhoneBooth1` and `PhoneBooth2`
- **WHEN** a connection is defined between the two sub-rooms
- **THEN** both sub-rooms' absolute positions are resolved through their shared parent
- **AND** the connection renders correctly between their respective walls

### Requirement: Validator Parent-Child Connection Acceptance
The floorplan validator SHALL accept connections between parent rooms and their child sub-rooms without requiring an explicit shared wall segment, since the sub-room's position is contained within the parent's bounds.

#### Scenario: Validating a parent-to-sub-room connection
- **GIVEN** a connection links `MasterBed` to its child sub-room `MasterCloset`
- **WHEN** the validator checks the connection
- **THEN** it identifies the parent-child relationship from the `composed of` declaration
- **AND** marks the connection as valid even if no shared wall segment is found
- **AND** does not emit a "no shared wall segment" error

#### Scenario: Non-parent-child connections still require shared segments
- **GIVEN** a connection links two unrelated rooms `Bedroom1` and `Bedroom2`
- **WHEN** the validator checks the connection
- **THEN** it verifies that the rooms share a wall segment
- **AND** emits an error if no shared segment exists

### Requirement: Critic Custom Segmented Stair Footprint
The static analysis critic SHALL compute the exact bounding box for custom segmented stairs by tracing each segment's coordinates, rather than using a simple width/height approximation.

#### Scenario: Custom stair footprint traces segment coordinates
- **GIVEN** a floorplan defines a custom stair with multiple flight and landing segments
- **WHEN** the critic computes the stair's footprint for overlap detection
- **THEN** it traces each segment starting from the entry direction
- **AND** accumulates coordinates for each flight length and landing offset
- **AND** produces a bounding box that exactly matches the traced path

#### Scenario: Re-adjusted bounding box for U-shaped stairs
- **GIVEN** a custom stair makes a 180-degree turn (e.g., U-shaped with two flights and a landing)
- **WHEN** the critic computes the footprint
- **THEN** the bounding box spans from the minimum traced X to the maximum traced X
- **AND** from the minimum traced Y to the maximum traced Y
- **AND** does not rely on the stair's declared width/height
