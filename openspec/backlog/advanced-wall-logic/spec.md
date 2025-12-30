## ADDED Requirements
### Requirement: Curved Walls
The DSL SHALL support defining curved wall segments.

#### Scenario: Curved wall
- **WHEN** `wall bottom: curve (radius: 5, convex: true)` is defined
- **THEN** a curved wall geometry is generated

### Requirement: Variable Wall Thickness
The DSL SHALL support overriding thickness per wall.

#### Scenario: Thick wall
- **WHEN** `wall left: solid thickness 0.5` is defined
- **THEN** that specific wall is rendered 0.5 units thick

