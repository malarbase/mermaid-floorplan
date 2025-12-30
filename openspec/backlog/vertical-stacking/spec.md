## ADDED Requirements
### Requirement: Vertical Stacking
The DSL SHALL support defining vertical relationships between rooms on different floors.

#### Scenario: Stacked rooms
- **WHEN** `room MasterBed stacks-above Ground.Living` is defined
- **THEN** the MasterBed's position is automatically aligned with Living's position (x, z)
- **AND** the elevation is set to be directly above the reference room

