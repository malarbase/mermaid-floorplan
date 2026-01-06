# Tasks: Add DXF Export

## 1. Research & Setup
- [ ] 1.1 Evaluate `dxf-writer` npm package capabilities
- [ ] 1.2 Test DXF output in AutoCAD, LibreCAD, and Illustrator
- [ ] 1.3 Document DXF entity types needed (LINE, ARC, TEXT, POLYLINE, DIMENSION)
- [ ] 1.4 Add `dxf-writer` dependency to root package.json

## 2. Core Exporter Implementation
- [ ] 2.1 Create `language/src/diagrams/floorplans/dxf-exporter.ts`
- [ ] 2.2 Implement layer creation (WALLS, DOORS, WINDOWS, ROOMS, LABELS, DIMENSIONS)
- [ ] 2.3 Implement wall geometry export (solid walls as LINE/POLYLINE)
- [ ] 2.4 Implement door export (arc + frame lines)
- [ ] 2.5 Implement window export (dashed line pattern or block)
- [ ] 2.6 Implement room boundary export (closed POLYLINE)
- [ ] 2.7 Implement room label export (TEXT/MTEXT with name and area)
- [ ] 2.8 Implement dimension annotation export (DIMENSION entity)
- [ ] 2.9 Handle coordinate system conversion (Y-axis flip if needed)

## 3. Multi-Floor Support
- [ ] 3.1 Export each floor to separate DXF file (default)
- [ ] 3.2 Optional: Export all floors to single DXF with floor-prefixed layers
- [ ] 3.3 Include floor name in output filename (`MyPlan-GroundFloor.dxf`)

## 4. CLI Script
- [ ] 4.1 Create `scripts/export-dxf.ts`
- [ ] 4.2 Accept input floorplan file and output directory
- [ ] 4.3 Add `--floor` option to export specific floor
- [ ] 4.4 Add `--all-in-one` option for single-file multi-floor export
- [ ] 4.5 Add Makefile target: `make export-dxf FILE=<path>`

## 5. MCP Server Integration
- [ ] 5.1 Add `"dxf"` to allowed format values in `render_floorplan` tool
- [ ] 5.2 Return base64-encoded DXF content
- [ ] 5.3 Update MCP server documentation

## 6. Unit Normalization
- [ ] 6.1 Respect `default_unit` config (meters, feet, etc.)
- [ ] 6.2 Set DXF INSUNITS variable appropriately
- [ ] 6.3 Ensure dimensions display correctly in AutoCAD

## 7. Testing
- [ ] 7.1 Unit test: Wall geometry conversion
- [ ] 7.2 Unit test: Door arc generation
- [ ] 7.3 Unit test: Multi-floor file naming
- [ ] 7.4 Integration test: Export example floorplans
- [ ] 7.5 Manual test: Open in AutoCAD, LibreCAD, Illustrator
- [ ] 7.6 Manual test: Verify layer structure

## 8. Documentation
- [ ] 8.1 Update README with DXF export instructions
- [ ] 8.2 Add example DXF output to examples/ directory
- [ ] 8.3 Document layer naming conventions
- [ ] 8.4 Update MCP server README

## Validation Checklist
- [ ] All floors from StairsAndLifts.floorplan export correctly
- [ ] DXF opens without errors in LibreCAD
- [ ] Layer toggle works (can show/hide WALLS, DOORS, etc.)
- [ ] Room labels are readable
- [ ] Dimensions are accurate
- [ ] `npm test` passes
- [ ] No TypeScript errors

