# bim-export Specification (Delta)

## ADDED Requirements

### Requirement: Fragments Export

The system SHALL export floorplan data to That Open's Fragments binary format for BIM interoperability.

#### Scenario: Export floorplan to Fragments file

- **GIVEN** a valid floorplan DSL file
- **WHEN** the `exportToFragments` function is called
- **THEN** a binary Fragments file SHALL be generated
- **AND** the file SHALL be loadable in That Open viewer

#### Scenario: Export includes spatial structure

- **GIVEN** a floorplan with 2 floors and 5 rooms
- **WHEN** exported to Fragments
- **THEN** the export SHALL contain an IfcProject container
- **AND** the export SHALL contain 2 IfcBuildingStorey elements
- **AND** the export SHALL contain 5 IfcSpace elements

#### Scenario: Export preserves room geometry

- **GIVEN** a room with `at (5, 10) size (10ft x 12ft) height 9ft`
- **WHEN** exported to Fragments
- **THEN** the IfcSpace geometry SHALL be positioned at (1.524m, 3.048m) in meters
- **AND** the bounding box SHALL be 3.048m × 3.657m × 2.743m

### Requirement: Wall Export

The system SHALL export wall elements as IfcWall entities in the Fragments format.

#### Scenario: Solid wall exported

- **GIVEN** a room with `walls [top: solid, right: solid, bottom: solid, left: solid]`
- **WHEN** exported to Fragments
- **THEN** 4 IfcWallStandardCase entities SHALL be generated
- **AND** each wall SHALL have appropriate position and dimensions

#### Scenario: Door wall creates opening

- **GIVEN** a room with `walls [bottom: door]`
- **WHEN** exported to Fragments
- **THEN** an IfcOpeningElement SHALL be created in the bottom wall
- **AND** an IfcDoor SHALL be placed in the opening

#### Scenario: Window wall creates opening

- **GIVEN** a room with `walls [right: window]`
- **WHEN** exported to Fragments
- **THEN** an IfcOpeningElement SHALL be created in the right wall
- **AND** an IfcWindow SHALL be placed in the opening

#### Scenario: Open wall generates no geometry

- **GIVEN** a room with `walls [left: open]`
- **WHEN** exported to Fragments
- **THEN** no IfcWall SHALL be generated for the left side

### Requirement: Connection Export

The system SHALL export connection statements as IfcDoor elements with IfcRelSpaceBoundary relationships.

#### Scenario: Door connection exported

- **GIVEN** `connect Office.right to Kitchen.left door at 50%`
- **WHEN** exported to Fragments
- **THEN** an IfcDoor SHALL be created at the boundary
- **AND** IfcRelSpaceBoundary relationships SHALL link the door to both spaces

#### Scenario: Double-door connection exported

- **GIVEN** `connect Hall.bottom to Entry.top double-door at 50%`
- **WHEN** exported to Fragments
- **THEN** an IfcDoor with PredefinedType=DOUBLE_SWING SHALL be created

#### Scenario: Opening connection creates void only

- **GIVEN** `connect Living.right to Dining.left opening at 50%`
- **WHEN** exported to Fragments
- **THEN** an IfcOpeningElement SHALL be created
- **AND** no IfcDoor element SHALL be created

### Requirement: Style to Material Export

The system SHALL export DSL style definitions as IFC material and surface style entities.

#### Scenario: Floor color exported as material

- **GIVEN** a style with `floor_color: "#8B4513"`
- **AND** a room using that style
- **WHEN** exported to Fragments
- **THEN** an IfcSurfaceStyleRendering SHALL be created with the color
- **AND** the room's floor slab SHALL reference the material

#### Scenario: Wall color exported as material

- **GIVEN** a style with `wall_color: "#D3D3D3"`
- **WHEN** exported to Fragments
- **THEN** wall elements SHALL reference an IfcMaterial with the color

### Requirement: GUID Generation

The system SHALL generate valid IFC GlobalIds for all exported elements.

#### Scenario: Elements have unique GUIDs

- **WHEN** a floorplan is exported
- **THEN** every exported element SHALL have a unique GlobalId
- **AND** the GlobalId SHALL be a valid 22-character IFC GUID format

#### Scenario: Deterministic GUIDs with seed

- **GIVEN** export options include `guidSeed: "my-project"`
- **WHEN** the same floorplan is exported twice with the same seed
- **THEN** all GUIDs SHALL be identical between exports

#### Scenario: Random GUIDs without seed

- **GIVEN** no guidSeed is specified
- **WHEN** the same floorplan is exported twice
- **THEN** GUIDs SHALL be different between exports

### Requirement: Unit Normalization for Export

The system SHALL normalize all dimensions to meters for IFC/Fragments export.

#### Scenario: Feet converted to meters

- **GIVEN** a room with `size (10ft x 12ft)`
- **WHEN** exported to Fragments
- **THEN** the geometry SHALL use 3.048m × 3.6576m

#### Scenario: Mixed units normalized

- **GIVEN** room A with `size (3m x 4m)` and room B with `size (10ft x 10ft)`
- **WHEN** exported to Fragments
- **THEN** all geometry SHALL be in meters
- **AND** spatial relationships SHALL be correct

### Requirement: CLI Export Command

The system SHALL provide a CLI command to export floorplans to Fragments format.

#### Scenario: Basic export command

- **GIVEN** a floorplan file `house.floorplan`
- **WHEN** `npm run export:fragments -- house.floorplan`
- **THEN** a file `house.frag` SHALL be created in the current directory

#### Scenario: Custom output path

- **GIVEN** a floorplan file `house.floorplan`
- **WHEN** `npm run export:fragments -- house.floorplan -o output/building.frag`
- **THEN** the file SHALL be created at `output/building.frag`

#### Scenario: Export with options

- **GIVEN** a floorplan file
- **WHEN** `npm run export:fragments -- house.floorplan --guid-seed="abc" --schema=IFC4`
- **THEN** the export SHALL use deterministic GUIDs with seed "abc"
- **AND** the IFC schema version SHALL be IFC4

### Requirement: MCP Export Tool

The MCP server SHALL provide an `export_fragments` tool for AI assistant integration.

#### Scenario: MCP export returns base64 data

- **GIVEN** valid floorplan DSL text
- **WHEN** the `export_fragments` tool is called
- **THEN** the response SHALL include base64-encoded Fragments data
- **AND** the response SHALL include the suggested filename

#### Scenario: MCP export error handling

- **GIVEN** invalid floorplan DSL text
- **WHEN** the `export_fragments` tool is called
- **THEN** the response SHALL include error messages
- **AND** no Fragments data SHALL be returned

### Requirement: IFC Import

The system SHALL import IFC files and convert them to DSL text.

#### Scenario: Import simple IFC file

- **GIVEN** an IFC file with 1 floor and 3 rooms
- **WHEN** `importFromIfc` is called
- **THEN** valid DSL text SHALL be generated
- **AND** the DSL SHALL contain 1 floor and 3 rooms

#### Scenario: Import preserves room names

- **GIVEN** an IFC file with IfcSpace elements named "Kitchen", "Living Room"
- **WHEN** imported
- **THEN** the DSL SHALL contain `room Kitchen` and `room LivingRoom`
- **AND** labels SHALL preserve the original names with spaces

#### Scenario: Import infers wall types

- **GIVEN** an IFC file with IfcDoor and IfcWindow elements
- **WHEN** imported
- **THEN** wall specifications SHALL include `door` and `window` types
- **AND** connection statements SHALL be generated for doors

#### Scenario: Import warns about unsupported elements

- **GIVEN** an IFC file with IfcStair and IfcColumn elements
- **WHEN** imported
- **THEN** a warning SHALL be returned listing unsupported elements
- **AND** the import SHALL proceed with supported elements only

### Requirement: Roundtrip Data Preservation

The system SHALL preserve critical data when roundtripping between IFC and DSL.

#### Scenario: GUID preservation on roundtrip

- **GIVEN** an IFC file with known GUIDs
- **WHEN** imported to DSL and re-exported
- **THEN** the original GUIDs SHALL be preserved in the export
- **AND** the system SHALL use GUID comments or metadata to track them

#### Scenario: Geometry consistency on roundtrip

- **GIVEN** an IFC file with specific room dimensions
- **WHEN** imported to DSL and re-exported
- **THEN** room dimensions SHALL match the original within 1mm tolerance

