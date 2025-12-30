## ADDED Requirements
### Requirement: Furniture Placement
The DSL SHALL support placing furniture and assets within rooms.

#### Scenario: Placing a bed
- **WHEN** `place Bed at (7, 2) size (2 x 2.2)` is used inside a room
- **THEN** a Bed asset is rendered at that relative position within the room

#### Scenario: Aligning furniture
- **WHEN** `place Wardrobe along left` is used
- **THEN** the wardrobe is snapped to the left wall

