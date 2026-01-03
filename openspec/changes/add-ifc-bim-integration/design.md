# IFC/BIM Integration - Technical Design

## Context

The mermaid-floorplan project has established a mature DSL and rendering pipeline:

```
DSL Text → Langium Parser → AST → JSON Export → SVG/3D Renderers
```

This design extends the pipeline to support BIM interoperability:

```
DSL Text → Langium Parser → AST → JSON Export → [SVG/3D/Fragments/IFC]
                                       ↑
                             IFC Import ←
```

### Stakeholders
- **Architects/Designers**: Want to export sketches to professional BIM tools
- **BIM Managers**: Want to edit IFC files with text-based DSL
- **Developers**: Want clean, modular architecture for BIM features

### Constraints
- Node.js >= 20.10.0 (Langium 4.x requirement)
- Browser support: WebGL 2.0, WASM
- Bundle size concerns (web-ifc WASM is ~11MB)

## Goals / Non-Goals

### Goals
- Lossless export of DSL floorplans to Fragments format
- Import of simple IFC files (walls, doors, windows, spaces)
- Maintain DSL simplicity for users who don't need BIM features
- Modular architecture: BIM features are opt-in

### Non-Goals
- Full IFC schema support (focus on architectural elements)
- Real-time IFC editing (export is batch operation)
- IFC validation/compliance checking
- Structural/MEP element support

## Decisions

### Decision 1: Use Fragments as Primary Export Format

**What**: Export to That Open's Fragments binary format, not raw IFC text.

**Why**:
- Fragments are optimized for web rendering (10x+ faster than IFC)
- Built on FlatBuffers (efficient serialization)
- That Open viewer requires Fragments, not raw IFC
- IFC export can be derived from Fragments later

**Alternatives Considered**:
- Direct IFC text export: More standard but slower, requires full IFC schema knowledge
- Custom binary format: Would require custom viewer, no ecosystem compatibility

### Decision 2: Phased Integration Approach

**What**: Implement in 4 phases over multiple releases.

**Why**:
- Reduces risk and allows incremental testing
- Phase 1 provides immediate value (export)
- Later phases are optional based on user demand
- Each phase can be independently validated

**Phases**:
1. **Fragments Export** (MVP) - 4-6 weeks
2. **IFC Import** - 4-6 weeks
3. **That Open Viewer** - 2-4 weeks
4. **Grammar Extensions** - 2-4 weeks

### Decision 3: Lazy-Load WASM Dependencies

**What**: Load `web-ifc` WASM only when IFC features are used.

**Why**:
- web-ifc WASM is ~11MB
- Most users may only need export, not import
- Keeps base bundle small
- Improves initial load time

**Implementation**:
```typescript
// Lazy load pattern
let ifcImporter: typeof import('@thatopen/fragments').IfcImporter | null = null;

async function getIfcImporter() {
  if (!ifcImporter) {
    const FRAGS = await import('@thatopen/fragments');
    ifcImporter = FRAGS.IfcImporter;
  }
  return ifcImporter;
}
```

### Decision 4: DSL Concept → IFC Entity Mapping

**What**: Establish clear mapping between DSL constructs and IFC entities.

| DSL Concept | IFC Entity | Notes |
|-------------|------------|-------|
| `floorplan` | `IfcProject` + `IfcBuilding` | Root container |
| `floor` | `IfcBuildingStorey` | Contains spatial elements |
| `room` | `IfcSpace` | Bounded spatial element |
| Wall (solid) | `IfcWallStandardCase` | Extruded geometry |
| Wall (door) | `IfcDoor` + `IfcOpeningElement` | Door in void |
| Wall (window) | `IfcWindow` + `IfcOpeningElement` | Window in void |
| `connect` | `IfcRelSpaceBoundary` | Adjacency relationship |
| `style` | `IfcSurfaceStyle` + `IfcMaterial` | Appearance |
| `config` | `IfcPropertySet` | Custom properties |

### Decision 5: Preserve DSL Simplicity

**What**: Keep IFC-specific features optional and non-invasive.

**Why**:
- Core value proposition is simple text-based floorplans
- Not all users need BIM interoperability
- Avoid feature creep in grammar

**Approach**:
- IFC metadata is in optional `ifc { }` block
- Export always works, even without metadata
- Import generates minimal DSL (can be enhanced manually)

## Risks / Trade-offs

### Risk 1: Bundle Size Increase
- **Risk**: Adding BIM dependencies significantly increases bundle
- **Mitigation**: Lazy loading, code splitting, optional viewer package
- **Worst Case**: Users can use CLI for export without loading WASM in browser

### Risk 2: IFC Schema Complexity
- **Risk**: IFC has 800+ entity types, supporting all is impossible
- **Mitigation**: Focus on architectural elements only (15-20 types)
- **Acceptance**: Import may lose unsupported elements with warning

### Risk 3: Roundtrip Data Loss
- **Risk**: DSL is simpler than IFC, roundtrip editing may lose data
- **Mitigation**: 
  - Preserve unrecognized IFC elements in comments
  - Store original GUIDs for re-export
  - Warn users about unsupported elements

### Risk 4: That Open API Stability
- **Risk**: That Open is actively developed, APIs may change
- **Mitigation**: 
  - Pin dependency versions
  - Wrap That Open APIs in abstraction layer
  - Monitor That Open releases

## Architecture

### Package Structure

```
language/
├── src/diagrams/floorplans/
│   ├── json-converter.ts       # Existing: AST → JSON
│   ├── fragments-exporter.ts   # NEW: JSON → Fragments
│   ├── ifc-importer.ts         # NEW: IFC → AST
│   └── ifc-entity-mapper.ts    # NEW: DSL ↔ IFC mapping
│
viewer/
├── src/
│   ├── main.ts                 # Existing viewer
│   └── thatopen-viewer.ts      # NEW: Optional That Open viewer
│
scripts/
├── export-json.ts              # Existing
├── export-fragments.ts         # NEW
└── import-ifc.ts               # NEW
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DSL Processing                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   .floorplan    Langium      AST      JSON        Outputs       │
│   ─────────► ─────────► ─────────► ──────────► ┬─────────       │
│                Parser                Converter  │  SVG          │
│                                                 │  Three.js     │
│                                                 │  Fragments ◄─ NEW
│                                                 │  IFC      ◄─ NEW
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        IFC Import (Phase 2)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   .ifc    web-ifc    IFC       AST      DSL                     │
│   ─────► ────────► ────────► ──────► ─────────                  │
│           Parser    Entities   Mapper   Text                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Interfaces

```typescript
// fragments-exporter.ts
interface FragmentsExportOptions {
  includeMetadata?: boolean;
  guidSeed?: string;
  schemaVersion?: 'IFC4' | 'IFC4X3';
}

export async function exportToFragments(
  json: JsonExport,
  options?: FragmentsExportOptions
): Promise<Uint8Array>;

// ifc-importer.ts
interface IfcImportResult {
  dsl: string;
  warnings: string[];
  unsupportedElements: string[];
}

export async function importFromIfc(
  ifcBytes: Uint8Array
): Promise<IfcImportResult>;

// ifc-entity-mapper.ts
interface IfcEntityMapping {
  dslType: string;
  ifcClass: string;
  attributeMap: Record<string, string>;
}
```

## Migration Plan

### Phase 1: Fragments Export (No Migration Needed)
- Pure addition, no breaking changes
- New dependency: `@thatopen/fragments`
- New CLI command: `npm run export:fragments`

### Phase 2: IFC Import
- New dependency: `web-ifc` (lazy loaded)
- New CLI command: `npm run import:ifc`
- Browser: WASM files need to be served

### Phase 3: That Open Viewer
- Optional alternative viewer
- Separate entry point or config toggle
- Does not replace existing viewer by default

### Phase 4: Grammar Extensions
- Backward compatible: new keywords are optional
- Existing floorplans continue to work unchanged

### Rollback Plan
Each phase is independently revertable:
1. Remove export code, revert package.json
2. Remove import code, remove WASM config
3. Remove viewer integration
4. Remove grammar extensions, regenerate parser

## Open Questions

1. **WASM Serving**: How should WASM files be served in production?
   - Options: CDN, bundled, separate download
   - Decision needed before Phase 2

2. **That Open Licensing**: Confirm MIT license compatibility
   - Current understanding: All That Open packages are MIT
   - Verify before integration

3. **IFC Version Support**: Which IFC versions to prioritize?
   - Recommendation: IFC4 (most common), with IFC4X3 roadmap

4. **Viewer Coexistence**: Should That Open viewer replace or supplement current viewer?
   - Recommendation: Supplement (user choice)

5. **MCP Server BIM Tools**: Should MCP server expose BIM export?
   - Recommendation: Yes, add `export_fragments` tool in Phase 1

## Performance Considerations

### Export Performance
- Fragments serialization is fast (FlatBuffers)
- Expected: <100ms for typical floorplans (<50 rooms)
- Large floorplans (1000+ rooms): Consider streaming

### Import Performance
- web-ifc parsing is WASM-optimized
- WASM cold start: ~500ms (first import)
- Subsequent imports: ~50-200ms depending on file size

### Viewer Performance
- That Open is optimized for millions of elements
- Our floorplans are tiny by comparison
- No performance concerns expected

## Testing Strategy

### Unit Tests
- `fragments-exporter.test.ts`: JSON → Fragments conversion
- `ifc-importer.test.ts`: IFC → AST conversion
- `ifc-entity-mapper.test.ts`: Mapping correctness

### Integration Tests
- Roundtrip: DSL → Fragments → That Open Viewer (visual)
- Roundtrip: IFC → DSL → IFC (content preservation)
- CLI export commands

### Compatibility Tests
- Export files open in That Open viewer
- Export files open in third-party BIM tools
- Import files from Revit, ArchiCAD exports

## References

- [That Open Components API](https://docs.thatopen.com/api/)
- [Fragments Format Schema](https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/flatbuffers/index.fbs)
- [web-ifc Documentation](https://ifcjs.github.io/info/docs/Guide/)
- [IFC Entity Reference](https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/)
- [FlatBuffers Documentation](https://flatbuffers.dev/)

