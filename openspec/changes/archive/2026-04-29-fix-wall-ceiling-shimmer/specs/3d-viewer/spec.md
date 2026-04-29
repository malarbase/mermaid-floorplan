## MODIFIED Requirements

### Requirement: Wall Rendering

The 3D viewer SHALL render walls using an asymmetric vertical span that eliminates depth-precision artifacts at both the floor–wall boundary and the wall–ceiling boundary.

#### Scenario: Wall extends into floor slab to eliminate floor z-fighting
- **GIVEN** a wall sits at floor elevation
- **WHEN** the wall mesh is positioned
- **THEN** the wall bottom SHALL be at `elevation − EMBED` (embedded into the slab below)
- **AND** the floor↔wall coplanar face SHALL be buried inside the slab volume (never visible)

#### Scenario: Wall clears ceiling slab to eliminate orbit shimmer
- **GIVEN** a wall approaches the ceiling slab above it
- **WHEN** the wall mesh is positioned
- **THEN** the wall top SHALL be at `elevation + wallHeight − CEILING_GAP`
- **AND** the wall and the ceiling slab SHALL NOT overlap volumetrically
- **AND** no shimmer SHALL appear when the camera orbits past the slab edge at any angle

#### Scenario: Wall height reflects asymmetric span
- **GIVEN** the standard wall height and asymmetric embedding constants
- **WHEN** wall segment geometry is created
- **THEN** the total mesh height SHALL equal `wallHeight + EMBED − CEILING_GAP`
- **AND** the center Y SHALL be `elevation + wallHeight/2 − EMBED/2 − CEILING_GAP/2`

#### Scenario: Clean Intersections
- **GIVEN** walls meet at a corner
- **WHEN** the scene is rendered
- **THEN** no coplanar surfaces SHALL exist between wall meshes at room corners
- **AND** horizontal walls SHALL only extend past room edges when no perpendicular neighbour fills the corner

#### Scenario: Logarithmic depth buffer active
- **GIVEN** the WebGLRenderer is initialised
- **WHEN** the viewer renders any frame
- **THEN** `logarithmicDepthBuffer` SHALL be enabled
- **AND** camera near plane SHALL be 0.5 and far plane SHALL be 500

#### Scenario: Floor penetration cutters are over-sized
- **GIVEN** stairs or lifts penetrate a floor slab via CSG subtraction
- **WHEN** the cutter box is computed
- **THEN** the cutter SHALL be inflated by `CUTTER_INFLATE` on all horizontal axes
- **AND** no coplanar strips SHALL remain at the edge of the penetration hole
