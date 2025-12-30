## ADDED Requirements

### Requirement: Style-Based SVG Rendering
The SVG renderer SHALL apply style colors to room elements.

#### Scenario: Room floor color applied
- **GIVEN** style "Warm" with `floor_color: "#F5DEB3"` is defined
- **AND** room "Bedroom" uses `style Warm`
- **WHEN** the floorplan is rendered to SVG
- **THEN** the Bedroom floor polygon SHALL have fill="#F5DEB3"

#### Scenario: Room wall color applied
- **GIVEN** style "Dark" with `wall_color: "#2F2F2F"` is defined
- **AND** room "Studio" uses `style Dark`
- **WHEN** the floorplan is rendered to SVG
- **THEN** the Studio wall strokes SHALL use color #2F2F2F

#### Scenario: Texture property graceful degradation in SVG
- **GIVEN** a style defines `floor_texture: "textures/oak.jpg"` but no `floor_color`
- **WHEN** rendering to SVG
- **THEN** a default neutral color (#E0E0E0) SHALL be used
- **AND** the texture property SHALL be ignored

### Requirement: Style Export in JSON
The JSON export SHALL include style definitions and room style assignments.

#### Scenario: Styles exported in JSON
- **GIVEN** a floorplan with two styles "A" and "B" defined
- **WHEN** the floorplan is exported to JSON
- **THEN** the JSON SHALL contain a `styles` array with both style definitions

#### Scenario: Room style reference in JSON
- **GIVEN** room "Kitchen" uses `style Rustic`
- **WHEN** the floorplan is exported to JSON
- **THEN** the Kitchen room object SHALL contain `"style": "Rustic"`

