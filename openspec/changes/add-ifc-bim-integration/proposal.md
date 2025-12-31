# Add IFC/BIM Integration (v2 Evolution)

## Why

Mermaid Floorplan currently exists as an isolated DSL for architectural sketches. To become a mature, maintainable tool with industry relevance, it needs interoperability with the broader BIM (Building Information Modeling) ecosystem. The [That Open](https://docs.thatopen.com/intro) project provides open-source libraries for working with IFC (Industry Foundation Classes) files—the international standard for BIM data exchange.

This change marks the **v2 evolution** of the project: from a standalone DSL renderer to a BIM-interoperable platform that can:
1. **Export** floorplans to industry-standard formats (IFC/Fragments)
2. **Import** existing IFC files for text-based editing
3. **Interoperate** with professional CAD tools (Revit, ArchiCAD, SketchUp)

## What Changes

### Phase 1: Fragments Export (Foundation)
- Add `@thatopen/fragments` as a dependency
- Create Fragments exporter from JSON intermediate format
- Map DSL concepts to IFC entities (Room→IfcSpace, Wall→IfcWall, etc.)
- Add `.frag` file export capability to CLI

### Phase 2: IFC Import
- Add `web-ifc` for IFC parsing (WASM-based)
- Create IFC→DSL converter for importing existing floorplans
- Support roundtrip editing: IFC → DSL → IFC

### Phase 3: That Open Viewer Integration
- Optional That Open 3D viewer as alternative to current Three.js viewer
- 2D floor plan generation using That Open's Views component
- Professional BIM navigation controls

### Phase 4: Grammar Extensions (Optional)
- Add optional IFC metadata block for enhanced export fidelity
- Support IFC-specific room types (IfcSpace subtypes)
- GUID preservation for roundtrip editing

## Impact

### Affected Specs
- `dsl-grammar` - Optional IFC metadata extensions
- `rendering` - Export format additions (Fragments, IFC)
- `3d-viewer` - Optional That Open viewer integration
- **NEW**: `bim-export` - IFC/Fragments export specification

### Affected Code
- `language/src/diagrams/floorplans/` - New exporters
- `viewer/` - Optional That Open integration
- `scripts/` - New export scripts
- `package.json` - New dependencies (~12MB bundle increase with WASM)

### Breaking Changes
- **None in Phase 1** - Purely additive
- **Phase 2+** - May introduce optional dependencies that increase bundle size

## Success Criteria

1. Users can export any valid floorplan to `.frag` (Fragments) format
2. Fragments files can be opened in That Open viewer and other BIM tools
3. Basic IFC files can be imported and converted to DSL
4. Existing functionality remains unaffected (backward compatible)
5. Bundle size increase is opt-in (lazy loading for WASM)

## Non-Goals (v2 Scope)

- Full IFC schema support (800+ entity types) - Only support relevant architectural elements
- Real-time collaboration features
- Cloud-based BIM server integration
- Parametric design tools
- MEP (Mechanical, Electrical, Plumbing) support

## References

- [That Open Documentation](https://docs.thatopen.com/intro)
- [Fragments Engine Repository](https://github.com/ThatOpen/engine_fragment)
- [IFC 4.3 Specification](https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/)
- [FlatBuffers Schema](https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/flatbuffers/index.fbs)

