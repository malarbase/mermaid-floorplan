# dsl-grammar Specification (Delta)

## ADDED Requirements

### Requirement: IFC Metadata Block

The DSL SHALL support an optional `ifc` block for specifying IFC-specific metadata that enhances export fidelity.

#### Scenario: IFC block with project metadata

- **WHEN** a floorplan defines:
  ```
  floorplan
    ifc { project_name: "Office Building", author: "Jane Architect" }
    floor Ground { ... }
  ```
- **THEN** the parser SHALL accept the `ifc` block
- **AND** the metadata SHALL be available for export

#### Scenario: IFC block with GUID seed

- **WHEN** a floorplan defines `ifc { guid_seed: "my-building-v1" }`
- **THEN** exports SHALL generate deterministic GUIDs based on the seed
- **AND** repeated exports with the same seed SHALL produce identical GUIDs

#### Scenario: IFC block with schema version

- **WHEN** a floorplan defines `ifc { schema_version: "IFC4X3" }`
- **THEN** the export SHALL use IFC 4.3 schema conventions

#### Scenario: IFC block is optional

- **GIVEN** a floorplan without an `ifc` block
- **WHEN** exported to Fragments
- **THEN** default metadata SHALL be used
- **AND** random GUIDs SHALL be generated

### Requirement: IFC Metadata Properties

The DSL SHALL support the following properties in the IFC metadata block:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `project_name` | String | Project name for IfcProject | `"Office Tower"` |
| `author` | String | Author name for OwnerHistory | `"John Smith"` |
| `organization` | String | Organization for OwnerHistory | `"ACME Architects"` |
| `guid_seed` | String | Seed for deterministic GUIDs | `"project-v1"` |
| `schema_version` | Enum | IFC schema version | `IFC4` or `IFC4X3` |

#### Scenario: All metadata properties accepted

- **WHEN** an `ifc` block contains all supported properties
- **THEN** the parser SHALL accept all as valid
- **AND** all values SHALL be available for export

### Requirement: Room IFC Type

The DSL SHALL support an optional `ifc-type` clause on rooms to specify the IfcSpace predefined type.

#### Scenario: Room with IFC type

- **WHEN** a room is defined as:
  ```
  room Garage at (0,0) size (20 x 20) walls [...] ifc-type parking
  ```
- **THEN** the parser SHALL accept the `ifc-type` clause
- **AND** the export SHALL create an IfcSpace with PredefinedType=PARKING

#### Scenario: Supported IFC space types

- **WHEN** rooms use `ifc-type` with values: `space`, `parking`, `gfa`, `external`, `internal`
- **THEN** the parser SHALL accept all as valid

#### Scenario: IFC type is optional

- **GIVEN** a room without `ifc-type`
- **WHEN** exported
- **THEN** the IfcSpace SHALL use PredefinedType=SPACE (default)

### Requirement: Room GUID Clause

The DSL SHALL support an optional `guid` clause on rooms for GUID preservation on roundtrip editing.

#### Scenario: Room with explicit GUID

- **WHEN** a room is defined as:
  ```
  room Office at (0,0) size (10 x 10) walls [...] guid "2O2Fr$t4X7Zf8NOew3FLN7"
  ```
- **THEN** the parser SHALL accept the `guid` clause
- **AND** the export SHALL use the specified GUID for this room

#### Scenario: GUID format validation

- **GIVEN** a room with `guid "invalid-format"`
- **WHEN** the floorplan is validated
- **THEN** a validation error SHALL be reported
- **AND** the error SHALL indicate expected IFC GUID format (22 characters)

#### Scenario: GUID preservation from import

- **GIVEN** an IFC file is imported to DSL
- **WHEN** the DSL text is generated
- **THEN** `guid` clauses SHALL be included to preserve original GUIDs

### Requirement: IFC Block Position

The IFC metadata block SHALL appear after `floorplan` keyword and before any other blocks.

#### Scenario: IFC block before config

- **WHEN** a floorplan defines:
  ```
  floorplan
    ifc { project_name: "My Building" }
    config { wall_thickness: 0.3 }
    floor Ground { ... }
  ```
- **THEN** the parser SHALL accept this ordering

#### Scenario: IFC block before styles

- **WHEN** a floorplan defines:
  ```
  floorplan
    ifc { author: "Architect" }
    style Modern { floor_color: "#FFF" }
    floor Ground { ... }
  ```
- **THEN** the parser SHALL accept this ordering

