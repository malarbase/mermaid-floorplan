## ADDED Requirements

### Requirement: Schema Synchronization with Grammar

The MCP server's Zod validation schemas MUST remain synchronized with the DSL grammar type definitions. When the grammar (`floorplans.langium`) is modified to add, remove, or change type unions, the corresponding MCP server schemas MUST be updated in the same change.

#### Scenario: New wall type added to grammar

- **GIVEN** the grammar `WallType` rule is extended with a new type (e.g., `'glass'`)
- **WHEN** the change is implemented
- **THEN** `mcp-server/src/tools/modify.ts` `WallsSchema` MUST include the new type
- **AND** the `modify_floorplan` tool MUST accept rooms with the new wall type
- **AND** tests MUST verify the new type is accepted

#### Scenario: New relative direction added to grammar

- **GIVEN** the grammar `RelativeDirection` rule is extended (e.g., `'diagonal-of'`)
- **WHEN** the change is implemented
- **THEN** `RelativePositionSchema` in `modify.ts` MUST include the new direction
- **AND** the `add_room` operation MUST accept the new direction in `relativePosition`

#### Scenario: Grammar type removed

- **GIVEN** a type is removed from a grammar union (e.g., deprecating `'open'` wall type)
- **WHEN** the change is implemented
- **THEN** the MCP server schema MUST also remove the type
- **AND** the change MUST be marked as **BREAKING** in the proposal

---

### Requirement: Grammar Type Mapping Documentation

The following grammar type unions have corresponding Zod schemas in the MCP server that MUST be kept in sync:

| Grammar Rule | Generated Type | MCP Server Schema Location |
|--------------|----------------|---------------------------|
| `WallType` | `WallType` | `modify.ts`: `WallsSchema` |
| `RelativeDirection` | `RelativeDirection` | `modify.ts`: `RelativePositionSchema.direction` |
| `AlignmentDirection` | `AlignmentDirection` | `modify.ts`: `RelativePositionSchema.alignment` |
| `WallDirection` | `WallDirection` | `modify.ts`: `WallsSchema` keys |

#### Scenario: Audit reveals schema mismatch

- **GIVEN** a grammar change was made without updating MCP schemas
- **WHEN** the `modify_floorplan` tool receives DSL with the new syntax
- **THEN** validation SHOULD fail with a clear error (Zod validation error)
- **AND** the fix MUST update the MCP schema to match grammar

#### Scenario: OpenSpec change includes both grammar and MCP updates

- **GIVEN** an OpenSpec change proposal modifies any of the grammar types listed above
- **WHEN** the change affects types used by MCP tools
- **THEN** the proposal MUST include a delta spec for `mcp-server`
- **AND** the `tasks.md` MUST include updating MCP server schemas

---

### Requirement: MCP Schema Source of Truth

The DSL grammar (`floorplans.langium`) is the source of truth for type definitions. MCP server schemas are derived consumers that MUST mirror the grammar.

#### Scenario: Discrepancy resolution

- **GIVEN** a discrepancy is found between grammar types and MCP schemas
- **WHEN** determining which is correct
- **THEN** the grammar definition SHALL be considered authoritative
- **AND** the MCP schema MUST be updated to match

