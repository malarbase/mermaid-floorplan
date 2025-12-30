## ADDED Requirements

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

