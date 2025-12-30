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
The viewer SHALL render walls with appropriate dimensions based on the floorplan data.

#### Scenario: Wall Height
- **WHEN** the floorplan is rendered
- **THEN** walls appear with a standard vertical height (e.g., 2.5 meters/units).

#### Scenario: Clean Intersections
- **WHEN** two walls meet at a corner
- **THEN** they SHALL appear as a single continuous mesh without visible overlapping faces (z-fighting).

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

