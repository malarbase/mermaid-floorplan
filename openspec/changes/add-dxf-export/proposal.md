# Add DXF Export

## Why

mermaid-floorplan is positioned as a rapid ideation tool for floor plans, but currently lacks a bridge to professional 2D CAD workflows. While the `add-ifc-bim-integration` proposal addresses full BIM interoperability (3D, rich metadata), many users need a simpler path to 2D CAD tools:

- **AutoCAD/AutoCAD LT** - Most widely used 2D drafting software
- **Illustrator/Inkscape** - DXF import for vector graphics
- **CNC/Laser cutters** - Physical model fabrication
- **Print shops** - Large format architectural prints

DXF (Drawing Exchange Format) is the universal 2D CAD interchange format, simpler than IFC and universally supported.

**Use Case**: User iterates on floor plan in mermaid-floorplan → exports DXF → architect imports into AutoCAD for detailed construction drawings.

## What Changes

### Core Feature
- Add DXF export capability to the rendering pipeline
- Export 2D floor plan geometry (walls, doors, windows, room boundaries)
- Support DXF layers for organizational clarity
- CLI command: `make export-dxf FILE=<path>`
- MCP tool: `render_floorplan` with `format: "dxf"`

### Technical Approach
- Use `dxf-writer` npm package (MIT license, ~50KB)
- Export from existing JSON intermediate format
- Map DSL elements to DXF entities:
  - Walls → LINE/POLYLINE
  - Doors → ARC + LINE
  - Windows → LINE with pattern
  - Room labels → TEXT/MTEXT
  - Dimensions → DIMENSION entity

### Layer Structure
- `WALLS` - Wall geometry
- `DOORS` - Door arcs and frames
- `WINDOWS` - Window representations
- `ROOMS` - Room boundary polylines
- `LABELS` - Room names and areas
- `DIMENSIONS` - Optional dimension annotations

## Impact

### Affected Specs
- `rendering` - Add DXF export requirement

### Affected Code
- `language/src/diagrams/floorplans/dxf-exporter.ts` (NEW)
- `scripts/export-dxf.ts` (NEW)
- `mcp-server/src/tools/render.ts` - Add DXF format option
- `package.json` - Add `dxf-writer` dependency

### Breaking Changes
- None - Purely additive feature

## Success Criteria

1. Any valid floorplan can be exported to `.dxf` format
2. DXF files open correctly in AutoCAD, LibreCAD, and Illustrator
3. Walls, doors, windows, and room labels are accurately represented
4. Layer organization follows CAD conventions
5. Multi-floor floorplans export each floor as separate file or layers

## Non-Goals

- 3D DXF export (use IFC for 3D interoperability)
- Full DXF editing/import (roundtrip workflow is out of scope)
- Custom line types or hatching patterns (keep simple)
- DWG format (proprietary, requires licensing)

## Relationship to IFC/BIM Integration

This proposal complements `add-ifc-bim-integration`:

| Feature | DXF Export | IFC/BIM |
|---------|-----------|---------|
| Dimensions | 2D only | Full 3D |
| Complexity | Simple (~200 LOC) | Complex (~2000 LOC) |
| File size | ~50KB dependency | ~12MB WASM |
| Target tools | AutoCAD, Illustrator | Revit, ArchiCAD |
| Timeline | 1-2 weeks | 4-6 months |

DXF export provides immediate value while IFC work proceeds.

## References

- [DXF Reference](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3)
- [dxf-writer npm](https://www.npmjs.com/package/dxf-writer)
- [AutoCAD Layer Standards](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/AutoCAD-Layer-standards.html)

