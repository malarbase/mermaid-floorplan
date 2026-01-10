## ADDED Requirements

### Requirement: Stair 3D Rendering
The 3D viewer SHALL render stair elements as 3D geometry with individual treads and landings.

#### Scenario: Stair with multiple flights
- **GIVEN** a stair element defined with flights in the DSL
- **WHEN** the floorplan is rendered in 3D
- **THEN** each flight SHALL be rendered with the correct number of treads
- **AND** landings SHALL connect flights at appropriate heights

### Requirement: Lift 3D Rendering
The 3D viewer SHALL render lift (elevator) shafts as vertical rectangular prisms.

#### Scenario: Lift shaft spanning floors
- **GIVEN** a lift element defined in the DSL
- **WHEN** the floorplan is rendered in 3D
- **THEN** the lift SHALL appear as a vertical shaft
- **AND** the shaft SHALL penetrate through floor slabs

### Requirement: Floor Penetration
The 3D viewer SHALL cut holes in floor slabs where stairs and lifts pass through.

#### Scenario: Stair penetrates floor
- **GIVEN** a stair connecting two floors
- **WHEN** the 3D scene is rendered
- **THEN** the upper floor slab SHALL have a hole matching the stair footprint

### Requirement: Keyboard Navigation
The 3D viewer SHALL support keyboard controls for camera movement.

#### Scenario: WASD movement
- **WHEN** the user presses W/A/S/D keys
- **THEN** the camera SHALL move forward/left/backward/right relative to its current orientation

#### Scenario: Arrow key rotation
- **WHEN** the user presses arrow keys
- **THEN** the camera SHALL rotate to look in the corresponding direction

### Requirement: Pivot Point Indicator
The 3D viewer SHALL display a visual indicator showing the camera's orbit pivot point.

#### Scenario: Pivot visibility
- **WHEN** the user orbits the camera
- **THEN** a crosshair or sphere SHALL appear at the pivot point
- **AND** the indicator SHALL fade after orbit ends
