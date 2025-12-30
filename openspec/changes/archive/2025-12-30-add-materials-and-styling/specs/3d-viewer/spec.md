## ADDED Requirements

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

