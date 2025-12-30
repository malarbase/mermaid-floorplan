## ADDED Requirements

### Requirement: Furniture Placement DSL
The DSL SHALL support placing furniture and assets within rooms using the `place` keyword.

#### Scenario: Placing furniture with absolute position
- **WHEN** `place Bed at (7, 2) size (2 x 2.2)` is used inside a room block
- **THEN** the parser SHALL accept the syntax
- **AND** the asset SHALL be positioned at coordinates (7, 2) relative to the room origin

#### Scenario: Placing furniture with wall alignment
- **WHEN** `place Wardrobe along left` is used inside a room block
- **THEN** the wardrobe SHALL be snapped to the room's left wall
- **AND** centered vertically along that wall

#### Scenario: Furniture rotation
- **WHEN** `place Desk at (3, 4) size (1.5 x 0.8) rotate 90` is used
- **THEN** the asset SHALL be rotated 90 degrees clockwise from default orientation

### Requirement: Placeholder Rendering (Phase 1)
The 3D viewer SHALL render furniture as simple geometric placeholders when no model is specified.

#### Scenario: Default placeholder geometry
- **GIVEN** a furniture placement without a model URL
- **WHEN** the 3D viewer renders the room
- **THEN** a box geometry matching the specified size SHALL be displayed
- **AND** the box SHALL use a distinct material to differentiate from walls/floors

#### Scenario: Asset type affects placeholder shape
- **GIVEN** `place Lamp at (2, 3) size (0.3 x 0.3)`
- **WHEN** the 3D viewer renders
- **THEN** the placeholder MAY use asset-type-specific geometry (e.g., cylinder for Lamp)

### Requirement: GLB Asset Loading (Phase 2)
The 3D viewer SHALL support loading external GLB/GLTF models for furniture.

#### Scenario: Loading custom GLB model
- **WHEN** `place Bed at (7, 2) model "assets/bed.glb"` is used
- **THEN** the viewer SHALL load the GLB file using Three.js GLTFLoader
- **AND** position the model at the specified coordinates

#### Scenario: Model load failure fallback
- **GIVEN** a furniture placement with an invalid or missing model URL
- **WHEN** the 3D viewer attempts to render
- **THEN** the viewer SHALL fall back to placeholder geometry
- **AND** log a warning about the failed model load

### Requirement: Furniture in SVG Rendering
The SVG renderer SHALL display furniture markers in 2D floorplan views.

#### Scenario: 2D furniture representation
- **GIVEN** a room with furniture placements
- **WHEN** the SVG floorplan is rendered
- **THEN** furniture SHALL appear as labeled rectangles at their specified positions
- **AND** the label SHALL display the asset type (e.g., "Bed")
