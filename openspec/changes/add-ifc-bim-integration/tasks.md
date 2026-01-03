# IFC/BIM Integration - Implementation Tasks

## Phase 1: Fragments Export (Foundation)

### 1.1 Dependencies & Setup
- [ ] 1.1.1 Add `@thatopen/fragments` to `language/package.json`
- [ ] 1.1.2 Add `@thatopen/components` to `viewer/package.json` (optional viewer)
- [ ] 1.1.3 Configure TypeScript for Fragments types
- [ ] 1.1.4 Update workspace build scripts for new dependencies
- [ ] 1.1.5 Document Node.js version requirements (>=20.10.0)

### 1.2 Entity Mapper Module
- [ ] 1.2.1 Create `language/src/diagrams/floorplans/ifc-entity-mapper.ts`
- [ ] 1.2.2 Define DSL → IFC entity mapping types
- [ ] 1.2.3 Implement room → IfcSpace mapping
- [ ] 1.2.4 Implement wall → IfcWall mapping
- [ ] 1.2.5 Implement door/window → IfcDoor/IfcWindow mapping
- [ ] 1.2.6 Implement floor → IfcBuildingStorey mapping
- [ ] 1.2.7 Implement connection → IfcRelSpaceBoundary mapping
- [ ] 1.2.8 Implement style → IfcSurfaceStyle mapping
- [ ] 1.2.9 Add GUID generation utility
- [ ] 1.2.10 Write unit tests for all mappings

### 1.3 Fragments Exporter
- [ ] 1.3.1 Create `language/src/diagrams/floorplans/fragments-exporter.ts`
- [ ] 1.3.2 Define export options interface
- [ ] 1.3.3 Implement JSON → Fragments geometry conversion
- [ ] 1.3.4 Implement property set generation
- [ ] 1.3.5 Implement spatial structure (Project → Building → Storey → Space)
- [ ] 1.3.6 Handle unit conversion (DSL units → meters)
- [ ] 1.3.7 Generate valid Fragments binary output
- [ ] 1.3.8 Write integration tests with That Open viewer

### 1.4 Export CLI Script
- [ ] 1.4.1 Create `scripts/export-fragments.ts`
- [ ] 1.4.2 Add CLI argument parsing (input, output, options)
- [ ] 1.4.3 Integrate with existing parse/convert pipeline
- [ ] 1.4.4 Add progress reporting for large files
- [ ] 1.4.5 Add `npm run export:fragments` script
- [ ] 1.4.6 Document CLI usage in README

### 1.5 Export Types & Index
- [ ] 1.5.1 Export new types from `language/src/index.ts`
- [ ] 1.5.2 Add `exportToFragments` to public API
- [ ] 1.5.3 Update package.json exports field

### 1.6 MCP Server Integration
- [ ] 1.6.1 Add `export_fragments` tool to MCP server
- [ ] 1.6.2 Return base64-encoded Fragments data
- [ ] 1.6.3 Add tool documentation and schema
- [ ] 1.6.4 Test with Claude Desktop

---

## Phase 2: IFC Import

### 2.1 WASM Setup
- [ ] 2.1.1 Add `web-ifc` dependency with lazy loading
- [ ] 2.1.2 Configure WASM file serving for development
- [ ] 2.1.3 Configure WASM file serving for production
- [ ] 2.1.4 Document WASM configuration

### 2.2 IFC Parser Integration
- [ ] 2.2.1 Create `language/src/diagrams/floorplans/ifc-importer.ts`
- [ ] 2.2.2 Implement lazy loading of web-ifc
- [ ] 2.2.3 Parse IFC file to in-memory model
- [ ] 2.2.4 Extract IfcBuildingStorey hierarchy
- [ ] 2.2.5 Extract IfcSpace elements with geometry
- [ ] 2.2.6 Extract IfcWall/IfcDoor/IfcWindow elements
- [ ] 2.2.7 Extract IfcRelSpaceBoundary relationships

### 2.3 IFC → AST Converter
- [ ] 2.3.1 Create AST nodes from IFC entities
- [ ] 2.3.2 Convert IFC geometry to DSL coordinates
- [ ] 2.3.3 Infer wall types from geometry/openings
- [ ] 2.3.4 Generate connection statements from boundaries
- [ ] 2.3.5 Handle unsupported elements (warning + skip)
- [ ] 2.3.6 Preserve GUIDs in comments for roundtrip

### 2.4 DSL Text Generator
- [ ] 2.4.1 Create `language/src/diagrams/floorplans/dsl-generator.ts`
- [ ] 2.4.2 Generate formatted DSL text from AST
- [ ] 2.4.3 Include helpful comments for imported data
- [ ] 2.4.4 Handle style inference from IFC materials

### 2.5 Import CLI Script
- [ ] 2.5.1 Create `scripts/import-ifc.ts`
- [ ] 2.5.2 Add CLI argument parsing
- [ ] 2.5.3 Output DSL file with warnings
- [ ] 2.5.4 Add `npm run import:ifc` script
- [ ] 2.5.5 Document CLI usage

### 2.6 Import Testing
- [ ] 2.6.1 Collect sample IFC files from various tools
- [ ] 2.6.2 Test import from Revit export
- [ ] 2.6.3 Test import from ArchiCAD export
- [ ] 2.6.4 Test import from That Open samples
- [ ] 2.6.5 Test roundtrip: IFC → DSL → Fragments

---

## Phase 3: That Open Viewer Integration

### 3.1 Viewer Package Updates
- [ ] 3.1.1 Add `@thatopen/components` to viewer dependencies
- [ ] 3.1.2 Add `@thatopen/fragments` to viewer dependencies
- [ ] 3.1.3 Configure worker file copying

### 3.2 Alternative Viewer Implementation
- [ ] 3.2.1 Create `viewer/src/thatopen-viewer.ts`
- [ ] 3.2.2 Set up FragmentsModels with worker
- [ ] 3.2.3 Implement camera controls (orbit, pan, zoom)
- [ ] 3.2.4 Implement floor selection/filtering
- [ ] 3.2.5 Implement element highlighting
- [ ] 3.2.6 Add element property display

### 3.3 2D Floor Plan Views
- [ ] 3.3.1 Integrate Views component
- [ ] 3.3.2 Generate 2D views from IfcBuildingStorey
- [ ] 3.3.3 Add view switching UI
- [ ] 3.3.4 Style floor plan lines and fills

### 3.4 Viewer Toggle
- [ ] 3.4.1 Add viewer selection config/toggle
- [ ] 3.4.2 Lazy load appropriate viewer
- [ ] 3.4.3 Maintain both viewers as options

---

## Phase 4: Grammar Extensions (Optional)

### 4.1 IFC Metadata Block
- [ ] 4.1.1 Add `IfcMetadata` rule to grammar
- [ ] 4.1.2 Support `project_name`, `author`, `organization`
- [ ] 4.1.3 Support `guid_seed` for deterministic GUIDs
- [ ] 4.1.4 Support `schema_version` (IFC4, IFC4X3)
- [ ] 4.1.5 Regenerate parser
- [ ] 4.1.6 Update exporter to use metadata

### 4.2 Room IFC Type
- [ ] 4.2.1 Add optional `ifc-type` clause to Room rule
- [ ] 4.2.2 Support IfcSpace predefined types
- [ ] 4.2.3 Export to correct IfcSpace subtype
- [ ] 4.2.4 Import IfcSpace types correctly

### 4.3 GUID Preservation
- [ ] 4.3.1 Add optional `guid` clause to Room rule
- [ ] 4.3.2 Preserve GUIDs on roundtrip import/export
- [ ] 4.3.3 Generate new GUIDs for new elements
- [ ] 4.3.4 Test GUID stability across edits

---

## Phase 5: Documentation & Polish

### 5.1 User Documentation
- [ ] 5.1.1 Add BIM export section to README
- [ ] 5.1.2 Document CLI commands
- [ ] 5.1.3 Create IFC compatibility guide
- [ ] 5.1.4 Add troubleshooting section
- [ ] 5.1.5 Create example workflows

### 5.2 API Documentation
- [ ] 5.2.1 Document `exportToFragments` function
- [ ] 5.2.2 Document `importFromIfc` function
- [ ] 5.2.3 Document MCP tools
- [ ] 5.2.4 Add JSDoc comments to all new code

### 5.3 OpenSpec Updates
- [ ] 5.3.1 Create `bim-export` spec
- [ ] 5.3.2 Update `dsl-grammar` spec with extensions
- [ ] 5.3.3 Update `3d-viewer` spec with That Open option
- [ ] 5.3.4 Archive this change after completion

---

## Milestone Summary

| Phase | Deliverable | Effort | Dependencies |
|-------|-------------|--------|--------------|
| 1 | Fragments Export | 4-6 weeks | None |
| 2 | IFC Import | 4-6 weeks | Phase 1 |
| 3 | That Open Viewer | 2-4 weeks | Phase 1 |
| 4 | Grammar Extensions | 2-4 weeks | Phase 1-2 |
| 5 | Documentation | 1-2 weeks | All phases |

**Total Estimated Effort**: 13-22 weeks for full implementation

**MVP (Phase 1 only)**: 4-6 weeks

