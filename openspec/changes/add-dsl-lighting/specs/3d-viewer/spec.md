## ADDED Requirements

### Requirement: Light Rendering from DSL
The 3D viewer SHALL create Three.js lights based on light definitions in the JSON export.

#### Scenario: Render directional light
- **GIVEN** the JSON export contains a directional light definition
- **WHEN** the floorplan is loaded
- **THEN** a THREE.DirectionalLight SHALL be created
- **AND** the light position SHALL match the DSL definition
- **AND** shadow casting SHALL be enabled for directional lights

#### Scenario: Render point light
- **GIVEN** the JSON export contains a point light with distance specified
- **WHEN** the floorplan is loaded
- **THEN** a THREE.PointLight SHALL be created with the specified distance
- **AND** the light SHALL cast shadows if shadows are enabled

#### Scenario: Render spot light with target
- **GIVEN** the JSON export contains a spot light with angle and target
- **WHEN** the floorplan is loaded
- **THEN** a THREE.SpotLight SHALL be created
- **AND** the light SHALL point toward the specified target
- **AND** the cone angle SHALL match the DSL definition

#### Scenario: Render ambient light
- **GIVEN** the JSON export contains an ambient light definition
- **WHEN** the floorplan is loaded
- **THEN** a THREE.AmbientLight SHALL be created with the specified color and intensity

### Requirement: Room-Relative Light Position Resolution
The viewer SHALL resolve room-relative light positions to world coordinates.

#### Scenario: Percentage position calculation
- **GIVEN** a light defined as `in Kitchen at (50%, 50%) height 2.5`
- **AND** Kitchen is at world position (10, 0, 5) with size (8 x 6)
- **WHEN** the light is created
- **THEN** the light position SHALL be (10 + 4, 2.5, 5 + 3) = (14, 2.5, 8)

#### Scenario: Height relative to floor
- **GIVEN** a light in a room on floor 2 with floor elevation 3.35
- **WHEN** the light is created with height 2.5
- **THEN** the light's Y position SHALL be 3.35 + 2.5 = 5.85

### Requirement: Default Scene Lighting Fallback
The viewer SHALL provide default lighting when no lights are defined in the DSL.

#### Scenario: No lights defined
- **GIVEN** a floorplan with no light statements
- **WHEN** the floorplan is loaded
- **THEN** the viewer SHALL create default lighting (ambient + directional)
- **AND** the scene SHALL be adequately illuminated

#### Scenario: Only ambient defined
- **GIVEN** a floorplan with only an ambient light defined
- **WHEN** the floorplan is loaded
- **THEN** the viewer SHALL NOT add additional default directional light
- **AND** the user's lighting choices SHALL be respected

### Requirement: Light Visualization Helpers
The viewer SHALL provide optional visualization of light positions and directions when enabled.

#### Scenario: Show light helpers
- **WHEN** the user enables "Show Lights" in viewer options
- **THEN** light sources SHALL be visualized with helper geometries
- **AND** directional lights SHALL show direction arrows
- **AND** spot lights SHALL show cone outlines
- **AND** point lights SHALL show small spheres

