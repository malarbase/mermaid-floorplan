# 3d-viewer Specification

## Purpose
TBD - created by archiving change add-3d-viewer. Update Purpose after archive.
## Requirements
### Requirement: 3D Visualization
The system SHALL provide a web-based interface to visualize the floorplan in 3D.

#### Scenario: View Floorplan
- **WHEN** the viewer is opened with a valid floorplan data file
- **THEN** the user can see a 3D representation of the floors and rooms.
- **AND** the user can rotate and zoom the camera.

### Requirement: Wall Rendering
The viewer SHALL render walls with appropriate dimensions based on the floorplan data, using wall ownership rules to prevent overlapping geometry.

#### Scenario: Wall Height
- **WHEN** the floorplan is rendered
- **THEN** walls appear with a standard vertical height (e.g., 2.5 meters/units).

#### Scenario: Clean Intersections
- **WHEN** two walls meet at a corner
- **THEN** they SHALL appear as a single continuous mesh without visible overlapping faces (z-fighting).

#### Scenario: Shared Wall Ownership
- **GIVEN** two adjacent rooms "A" at position (0, 0) and "B" at position (10, 0) sharing a vertical wall
- **WHEN** the floorplan is rendered
- **THEN** only one room SHALL render the shared wall
- **AND** the room with the lower X position (Room A) SHALL be the wall owner
- **AND** Room B SHALL skip rendering its left wall at that position

#### Scenario: Shared Wall Ownership for Horizontal Walls
- **GIVEN** two adjacent rooms "A" at position (0, 0) and "B" at position (0, 10) sharing a horizontal wall
- **WHEN** the floorplan is rendered
- **THEN** the room with the lower Z position (Room A) SHALL be the wall owner
- **AND** Room A renders its bottom wall; Room B skips its top wall

### Requirement: Multi-Floor Inspection
The viewer SHALL provide tools to inspect individual floors in a multi-story building.

#### Scenario: Exploded View
- **WHEN** the user activates the exploded view control
- **THEN** upper floors SHALL vertically separate from lower floors to reveal the layout underneath.

### Requirement: Style-Based 3D Material Creation
The 3D viewer SHALL create materials based on style definitions.

#### Scenario: Material from style colors
- **WHEN** a room's style defines `floor_color: "#8B4513"`
- **THEN** the MaterialFactory SHALL create a MeshStandardMaterial with color 0x8B4513

#### Scenario: Material from style texture
- **WHEN** a room's style defines `floor_texture: "textures/marble.jpg"`
- **THEN** the MaterialFactory SHALL load the texture
- **AND** apply it as the material's map property

#### Scenario: PBR properties applied to material
- **WHEN** a room's style defines `roughness: 0.3, metalness: 0.1`
- **THEN** the created MeshStandardMaterial SHALL have roughness=0.3 and metalness=0.1

#### Scenario: Texture load failure fallback
- **GIVEN** a style defines `floor_texture: "textures/missing.jpg"`
- **AND** the texture file does not exist or fails to load
- **WHEN** the 3D viewer renders
- **THEN** the material SHALL fall back to `floor_color` if defined
- **OR** to default color if no floor_color defined

### Requirement: Wall Segmentation for Multi-Room Sharing
The viewer SHALL segment shared walls when they are adjacent to multiple rooms on the opposite side, allowing per-segment materials.

#### Scenario: Wall adjacent to two rooms
- **GIVEN** Room A with a bottom wall spanning 20 units
- **AND** Room B (10 units wide) adjacent to the left half of A's bottom wall
- **AND** Room C (10 units wide) adjacent to the right half of A's bottom wall
- **WHEN** the floorplan is rendered
- **THEN** Room A's bottom wall SHALL be split into two segments
- **AND** Segment 1 SHALL span the overlap with Room B
- **AND** Segment 2 SHALL span the overlap with Room C

#### Scenario: Wall with no adjacent rooms
- **GIVEN** Room A with a left wall facing the exterior (no adjacent room)
- **WHEN** the floorplan is rendered
- **THEN** the wall SHALL be rendered as a single unsegmented mesh
- **AND** all faces SHALL use Room A's wall color

#### Scenario: Wall with single adjacent room
- **GIVEN** Room A with a right wall adjacent to Room B
- **AND** Room A owns the wall
- **WHEN** the floorplan is rendered
- **THEN** the wall SHALL be rendered as a single segment
- **AND** the segment SHALL have per-face materials

### Requirement: Per-Face Wall Materials
The viewer SHALL apply different materials to different faces of wall segments based on room ownership and adjacency.

#### Scenario: Interior face uses adjacent room's color
- **GIVEN** Room A (owner, wall_color: "#0000FF") shares a wall with Room B (wall_color: "#FF0000")
- **WHEN** the wall segment is rendered
- **THEN** the exterior face (facing Room A) SHALL use blue (#0000FF)
- **AND** the interior face (facing Room B) SHALL use red (#FF0000)

#### Scenario: Side faces use owner's color
- **GIVEN** Room A (owner, wall_color: "#0000FF") shares a wall with Room B (wall_color: "#FF0000")
- **WHEN** the wall segment is rendered
- **THEN** the side faces (edges of the wall) SHALL use blue (#0000FF)
- **AND** this allows visual identification of wall ownership

#### Scenario: Top and bottom faces use owner's color
- **GIVEN** Room A (owner, wall_color: "#0000FF") shares a wall with Room B
- **WHEN** the wall segment is rendered
- **THEN** the top face (ceiling contact) SHALL use owner's color
- **AND** the bottom face (floor contact) SHALL use owner's color

#### Scenario: Multiple segments with different adjacent styles
- **GIVEN** Room A owns a wall adjacent to Room B (red) and Room C (green)
- **WHEN** the wall is rendered as two segments
- **THEN** Segment 1's interior face SHALL be red
- **AND** Segment 2's interior face SHALL be green
- **AND** both segments' exterior and side faces SHALL use Room A's color

### Requirement: Adjacency Detection
The viewer SHALL detect adjacent rooms for wall rendering decisions.

#### Scenario: Detect horizontally adjacent rooms
- **GIVEN** Room A at (0, 0) size (10 x 10)
- **AND** Room B at (10, 0) size (10 x 10)
- **WHEN** adjacency is checked for Room A's right wall
- **THEN** Room B SHALL be detected as adjacent
- **AND** the overlap extent SHALL be the full wall height (10 units)

#### Scenario: Detect partially overlapping adjacency
- **GIVEN** Room A at (0, 0) size (10 x 20)
- **AND** Room B at (10, 5) size (10 x 10)
- **WHEN** adjacency is checked for Room A's right wall
- **THEN** Room B SHALL be detected as adjacent
- **AND** the overlap extent SHALL be from position 5 to 15 along the wall

#### Scenario: Non-adjacent rooms not detected
- **GIVEN** Room A at (0, 0) size (10 x 10)
- **AND** Room B at (20, 0) size (10 x 10) with a gap between them
- **WHEN** adjacency is checked for Room A's right wall
- **THEN** Room B SHALL NOT be detected as adjacent

#### Scenario: Multiple adjacent rooms detected
- **GIVEN** Room A with a wall 30 units long
- **AND** Room B adjacent to the first 10 units
- **AND** Room C adjacent to the middle 10 units
- **AND** Room D adjacent to the last 10 units
- **WHEN** adjacency is checked
- **THEN** all three rooms (B, C, D) SHALL be detected with their respective overlap extents

### Requirement: CSG Material Preservation

The 3D viewer SHALL preserve per-face material assignments when performing CSG operations (door/window holes) on wall segments.

When a wall segment has:
- An owner room style (for interior-facing faces)
- An adjacent room style (for exterior-facing faces toward the adjacent room)
- A CSG operation creating a hole (door or window)

The resulting geometry MUST maintain correct material assignments:
- Faces pointing toward the owner room display the owner's wall color
- Faces pointing toward the adjacent room display the adjacent room's wall color
- Newly created faces around holes use contextually appropriate colors

#### Scenario: Door hole in shared wall segment

- **GIVEN** Room A owns a wall segment shared with Room B
- **AND** Room A has wall_color blue, Room B has wall_color red
- **AND** There is a door connection creating a hole in the segment
- **WHEN** the wall is rendered
- **THEN** the face pointing into Room A displays blue
- **AND** the face pointing into Room B displays red
- **AND** faces around the door hole use appropriate colors based on orientation

#### Scenario: Window hole in shared wall segment

- **GIVEN** Room A owns a wall segment shared with Room B
- **AND** Room A has wall_color green, Room B has wall_color yellow
- **AND** There is a window in the segment
- **WHEN** the wall is rendered
- **THEN** the face pointing into Room A displays green
- **AND** the face pointing into Room B displays yellow
- **AND** the window glass is rendered correctly within the hole

#### Scenario: Multiple holes in shared wall segment

- **GIVEN** Room A owns a wall segment shared with Room B
- **AND** There are multiple door/window connections creating holes
- **WHEN** the wall is rendered
- **THEN** per-face material assignments are preserved for all visible faces
- **AND** each hole is correctly rendered with appropriate surrounding materials

