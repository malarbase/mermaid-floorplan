## MODIFIED Requirements

### Requirement: 3D Visualization
The system SHALL provide a web-based interface to visualize the floorplan in 3D, including floors, walls, stairs, lifts, **doors, and windows**.

#### Scenario: View Floorplan
- **WHEN** the viewer is opened with a valid floorplan data file
- **THEN** the user can see a 3D representation of the floors, rooms, **doors, and windows**.
- **AND** the user can rotate and zoom the camera.

_(Added "doors, and windows" to reflect expanded rendering capabilities)_

## ADDED Requirements

### Requirement: Door Rendering in 3D
The 3D viewer SHALL render door connections as 3D mesh geometry with proper positioning, swing direction, and materials.

#### Scenario: Single door rendered at connection
- **GIVEN** a connection `connect Office.right to Kitchen.left door at 50%`
- **WHEN** the 3D viewer renders the floorplan
- **THEN** a door mesh appears at the center of the shared wall
- **AND** the door has a swing arc indicating opening direction

#### Scenario: Door positioned by percentage
- **GIVEN** a connection with `at 75%` position
- **WHEN** the 3D scene is rendered
- **THEN** the door is positioned at 75% along the shared wall segment between the two rooms

#### Scenario: Double door with mirrored panels
- **GIVEN** a connection specifying `double-door`
- **WHEN** the 3D viewer renders
- **THEN** two door panels are rendered opening in opposite directions

#### Scenario: Door swing direction from specification
- **GIVEN** a connection with `swing: left`
- **WHEN** the 3D scene is rendered
- **THEN** the door panel rotates to swing toward the left side

#### Scenario: Door opens into specified room
- **GIVEN** a connection with `opens into Kitchen`
- **WHEN** the 3D viewer renders
- **THEN** the door panel swings into the Kitchen room space

### Requirement: Window Rendering in 3D
The 3D viewer SHALL render window connections as transparent 3D meshes positioned at the configured sill height.

#### Scenario: Window rendered with transparency
- **GIVEN** a connection of type `window`
- **WHEN** the 3D viewer renders the floorplan
- **THEN** a semi-transparent mesh appears at the wall location
- **AND** the mesh uses a glass-like material (opacity ~0.6)

#### Scenario: Window positioned at sill height
- **GIVEN** a window connection on a wall
- **AND** config `window_sill: 0.9`
- **WHEN** the 3D scene is rendered
- **THEN** the window bottom edge is positioned 0.9 units above the floor

#### Scenario: Window dimensions from connection
- **GIVEN** a connection with `size (1.5 x 1.2)`
- **WHEN** the window is rendered in 3D
- **THEN** the window mesh has width 1.5 and height 1.2

### Requirement: Connection Deduplication in 3D Rendering
The 3D renderer SHALL avoid rendering duplicate door meshes when a single connection references two walls.

#### Scenario: Single door mesh per connection
- **GIVEN** a connection `connect RoomA.right to RoomB.left door`
- **WHEN** the 3D viewer renders
- **THEN** exactly one door mesh is created
- **AND** the door appears at the shared wall between RoomA and RoomB

#### Scenario: Door rendered on solid wall when one wall is open
- **GIVEN** RoomA with solid right wall and RoomB with open left wall
- **AND** a connection between them
- **WHEN** the 3D scene is rendered
- **THEN** the door mesh is rendered on RoomA's side (solid wall)

#### Scenario: Door rendered on fromRoom when both walls solid
- **GIVEN** both connected rooms have solid walls
- **WHEN** the 3D viewer renders
- **THEN** the door is rendered on the `fromRoom` wall

