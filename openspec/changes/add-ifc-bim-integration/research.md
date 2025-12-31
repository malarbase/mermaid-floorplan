# IFC/BIM Integration - Research Findings

This document captures the research conducted to inform the IFC/BIM integration design.

## Table of Contents

1. [That Open Ecosystem Overview](#that-open-ecosystem-overview)
2. [Fragments Format Deep Dive](#fragments-format-deep-dive)
3. [IFC Schema Analysis](#ifc-schema-analysis)
4. [DSL to IFC Mapping](#dsl-to-ifc-mapping)
5. [Integration Architecture Options](#integration-architecture-options)
6. [Performance Considerations](#performance-considerations)
7. [Competitive Landscape](#competitive-landscape)

---

## That Open Ecosystem Overview

### What is That Open?

[That Open](https://docs.thatopen.com/intro) (formerly IFC.js) is an open-source ecosystem for Building Information Modeling (BIM) applications. It provides:

> "Free and open-source JavaScript/TypeScript libraries for developers to create 3D BIM software, supporting various platforms and features like IFC handling, 3D modeling, and data integration."

### Core Libraries

| Package | Purpose | Bundle Size | Required For |
|---------|---------|-------------|--------------|
| `@thatopen/components` | BIM tools (navigation, measurement, etc.) | ~100KB | 3D viewer |
| `@thatopen/fragments` | Binary BIM format + rendering | ~200KB | All BIM features |
| `web-ifc` | IFC parsing (WASM) | ~11MB | IFC import |
| `@thatopen/ui` | Pre-built UI components | ~50KB | Optional UI |

### Key Features Relevant to This Project

1. **IFC Import**: Convert `.ifc` files to Fragments format
2. **Fragments Export**: Generate binary Fragments from geometric data
3. **3D Visualization**: High-performance Three.js-based rendering
4. **2D Views**: Generate floor plans from 3D models
5. **Property Access**: Query IFC properties and relationships

### API Examples

#### Loading Fragments

```typescript
import * as FRAGS from "@thatopen/fragments";

const fragments = new FRAGS.FragmentsModels(workerUrl);
const model = await fragments.core.load(buffer, { modelId: "my-model" });
scene.add(model.mesh);
```

#### Converting IFC to Fragments

```typescript
import * as FRAGS from "@thatopen/fragments";

const serializer = new FRAGS.IfcImporter();
serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.72/" };

const ifcBuffer = await fetch(url).then(r => r.arrayBuffer());
const fragmentBytes = await serializer.process({
  bytes: new Uint8Array(ifcBuffer),
  progressCallback: (progress) => console.log(progress)
});
```

#### Creating 2D Floor Plans

```typescript
import * as OBC from "@thatopen/components";

const views = components.get(OBC.Views);
await views.createFromIfcStoreys({ modelIds: [/arq/] });
```

### Licensing

All That Open packages are **MIT licensed**, compatible with our project.

---

## Fragments Format Deep Dive

### What is Fragments?

Fragments is a proprietary binary format developed by That Open for efficient BIM data storage and rendering:

> "Fragments defines an open BIM format optimized for handling large datasets efficiently. It is binary and compact for performance, free and open source, and supports geometries, properties, and relationships."

### Technical Foundation

- **Serialization**: [Google FlatBuffers](https://flatbuffers.dev/)
- **Schema Location**: https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/flatbuffers/index.fbs
- **Cross-Platform**: Same format works in browser, Node.js, any language with FlatBuffers support

### Schema Structure (Simplified)

```flatbuffers
// Core model structure
table Model {
  ifcSchema: string;
  project: Project;
  storeys: [Storey];
  elements: [Element];
  properties: [PropertySet];
  relationships: [Relationship];
}

// Geometric element
table Element {
  expressID: uint;
  ifcClass: ushort;
  geometry: Geometry;
  transform: Matrix4;
  properties: [PropertyRef];
}

// Geometry types
union Geometry {
  BoxGeometry,
  ExtrudedGeometry,
  MeshGeometry
}
```

### Why Fragments Instead of Raw IFC?

| Aspect | IFC (STEP Format) | Fragments |
|--------|-------------------|-----------|
| Format | Text-based | Binary |
| Parse Time | Slow (requires full parse) | Fast (memory-mapped) |
| File Size | Large | Compact (3-5x smaller) |
| Streaming | Not supported | Supported |
| Web Rendering | Requires conversion | Direct rendering |
| Editability | Human-readable | Requires tools |

### Creating Fragments Programmatically

While typically created from IFC files, Fragments can be created programmatically:

```typescript
// Conceptual API (not actual That Open code)
const model = {
  ifcSchema: "IFC4",
  project: {
    name: "My Floorplan",
    guid: generateGuid(),
  },
  storeys: [
    {
      name: "Ground Floor",
      elevation: 0,
      spaces: [
        {
          name: "Kitchen",
          geometry: createBoxGeometry(0, 0, 10, 8, 3),
          properties: { area: 80 }
        }
      ]
    }
  ]
};
```

---

## IFC Schema Analysis

### What is IFC?

IFC (Industry Foundation Classes) is the international standard for BIM data exchange:

- **Standard Body**: buildingSMART International
- **Current Version**: IFC 4.3 (IFC4X3)
- **Total Entity Types**: 800+
- **File Format**: STEP Physical File (text-based)

### Relevant Entity Types for Floorplans

#### Spatial Structure

| IFC Entity | Purpose | DSL Equivalent |
|------------|---------|----------------|
| `IfcProject` | Root container | `floorplan` |
| `IfcSite` | Building site | Not used |
| `IfcBuilding` | Building container | `floorplan` |
| `IfcBuildingStorey` | Floor level | `floor` |
| `IfcSpace` | Bounded room/space | `room` |

#### Building Elements

| IFC Entity | Purpose | DSL Equivalent |
|------------|---------|----------------|
| `IfcWall` | Generic wall | Wall (solid) |
| `IfcWallStandardCase` | Rectangular wall | Wall (solid) |
| `IfcDoor` | Door element | Wall (door) + connection |
| `IfcWindow` | Window element | Wall (window) |
| `IfcSlab` | Floor/ceiling plate | Floor rendering |
| `IfcOpeningElement` | Void for door/window | Implicit in connections |

#### Relationships

| IFC Entity | Purpose | DSL Equivalent |
|------------|---------|----------------|
| `IfcRelContainedInSpatialStructure` | Element containment | Room contains walls |
| `IfcRelSpaceBoundary` | Space boundary | `connect` statement |
| `IfcRelDefinesByProperties` | Property assignment | `style` assignment |
| `IfcRelAssociatesMaterial` | Material assignment | Style properties |

### IfcSpace Predefined Types

These could map to optional room types in extended grammar:

| Predefined Type | Description |
|-----------------|-------------|
| `SPACE` | General purpose space |
| `PARKING` | Parking space |
| `GFA` | Gross Floor Area |
| `EXTERNAL` | External space |
| `INTERNAL` | Internal space |

### Geometry Representation

IFC supports multiple geometry types. For floorplans, we need:

1. **IfcBoundingBox**: Simple box geometry (fastest)
2. **IfcExtrudedAreaSolid**: 2D profile extruded to height (walls, rooms)
3. **IfcFacetedBrep**: Mesh geometry (complex shapes)

Our approach: Use `IfcExtrudedAreaSolid` for walls and spaces (matches our current Three.js box geometry).

---

## DSL to IFC Mapping

### Complete Mapping Table

| DSL Construct | IFC Entity | Attributes | Notes |
|---------------|------------|------------|-------|
| `floorplan` | `IfcProject` | Name, GlobalId | Root container |
| | `IfcBuilding` | Name, GlobalId | Child of Project |
| `floor ID` | `IfcBuildingStorey` | Name=ID, Elevation | Child of Building |
| `floor height N` | `IfcBuildingStorey` | Height | StoreyHeight attribute |
| `room Name` | `IfcSpace` | Name, LongName=label | Child of Storey |
| `at (x,y)` | `IfcLocalPlacement` | Origin point | Space placement |
| `size (w x h)` | Geometry | BoundingBox | Space geometry |
| `height N` | Geometry | ExtrusionDepth | Space height |
| `elevation N` | `IfcLocalPlacement` | Z offset | Floor level offset |
| `walls [...]` | `IfcWall` | Per wall spec | Child elements |
| Wall `solid` | `IfcWallStandardCase` | Full height | Standard wall |
| Wall `door` | `IfcDoor` | In opening | With IfcOpeningElement |
| Wall `window` | `IfcWindow` | In opening | With IfcOpeningElement |
| Wall `open` | No geometry | | Skip wall generation |
| `connect ... door` | `IfcDoor` + `IfcRelSpaceBoundary` | Position, size | Door with relationships |
| `connect ... opening` | `IfcOpeningElement` | Position, size | Opening without door |
| `style Name` | `IfcMaterial` + `IfcSurfaceStyle` | Colors, textures | Material assignment |
| `config {...}` | `IfcPropertySet` | Key-value pairs | Custom properties |
| `define var` | N/A | | Resolved before export |

### GUID Generation Strategy

IFC requires globally unique identifiers (GUIDs) for all elements:

```typescript
// Option 1: Random GUIDs (default)
function generateGuid(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

// Option 2: Deterministic GUIDs (for reproducible exports)
function generateDeterministicGuid(seed: string, path: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(seed + path);
  return hash.digest('hex').substring(0, 22);
}

// Path example: "floorplan.floor[GroundFloor].room[Kitchen]"
```

### Unit Handling

IFC uses SI units (meters) by default. Our DSL supports multiple units:

```typescript
const UNIT_TO_METERS: Record<string, number> = {
  'm': 1.0,
  'ft': 0.3048,
  'cm': 0.01,
  'in': 0.0254,
  'mm': 0.001,
};

function normalizeToMeters(value: number, unit: string): number {
  return value * (UNIT_TO_METERS[unit] || 1.0);
}
```

---

## Integration Architecture Options

### Option A: DSL → Fragments Export (Recommended)

```
DSL → Langium → AST → JSON → Fragments Exporter → .frag file
```

**Pros**:
- Preserves simple DSL syntax
- Enables BIM tool interoperability
- Incremental adoption
- Export is fast (no WASM needed)

**Cons**:
- One-way data flow initially
- Need separate import path later

### Option B: Full IFC Grammar

```
Extended DSL → Langium → IFC-like AST → Fragments/IFC Export
```

**Pros**:
- Full BIM expressiveness
- Professional-grade output

**Cons**:
- Loses DSL simplicity
- Massive grammar expansion (800+ entity types)
- Long development cycle

### Option C: Bidirectional IFC

```
DSL ↔ IFC AST ↔ Fragments/IFC Files
```

**Pros**:
- Full roundtrip editing
- Maximum interoperability

**Cons**:
- Most complex
- Data loss risks on roundtrip
- Requires extensive testing

### Recommendation

**Start with Option A**, then add import capability (moving toward Option C) in later phases. Keep Option B as out of scope.

---

## Performance Considerations

### Export Performance

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| AST → JSON | <10ms | Existing, fast |
| JSON → Fragments | 50-100ms | Geometry generation |
| File write | <10ms | Binary output |
| **Total** | **<150ms** | For typical floorplan |

### Import Performance

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| WASM cold start | 500-1000ms | First import only |
| IFC parse (small) | 50-200ms | <1MB file |
| IFC parse (large) | 1-5s | 10-100MB file |
| AST generation | 10-50ms | Entity extraction |
| DSL generation | <10ms | Text output |

### Viewer Performance

That Open is designed for massive BIM models (millions of elements). Our floorplans are tiny by comparison:

| Model Size | That Open | Our Viewer |
|------------|-----------|------------|
| 50 rooms | Instant | Instant |
| 500 rooms | Instant | ~100ms |
| 5000 rooms | <1s | Untested |

No performance concerns expected.

### Bundle Size Impact

| Component | Size | Loading |
|-----------|------|---------|
| `@thatopen/fragments` | ~200KB | Always |
| `@thatopen/components` | ~100KB | Viewer only |
| `web-ifc` WASM | ~11MB | Import only (lazy) |

**Mitigation**: Lazy load WASM only when import features are used.

---

## Competitive Landscape

### Similar Projects

| Project | Approach | DSL? | IFC Support | License |
|---------|----------|------|-------------|---------|
| **Mermaid Floorplan** | Text DSL | ✅ | Planned | MIT |
| **That Open** | IFC viewer/editor | ❌ | Full | MIT |
| **BlenderBIM** | Blender plugin | ❌ | Full | GPL |
| **xBIM** | .NET libraries | ❌ | Full | CDDL |
| **IFC.js** (legacy) | Web viewer | ❌ | Full | MIT |

### Unique Value Proposition

No other project offers:
1. **Text-based DSL** for quick floorplan sketching
2. **AI integration** via MCP server
3. **IFC export** from simple syntax

This combination makes mermaid-floorplan unique in the BIM ecosystem:
- Architects can quickly sketch with text
- AI assistants can modify floorplans programmatically
- Results export to professional BIM tools

---

## References

### That Open
- [Documentation](https://docs.thatopen.com/intro)
- [GitHub: engine_fragment](https://github.com/ThatOpen/engine_fragment)
- [GitHub: engine_components](https://github.com/ThatOpen/engine_components)
- [Fragments Schema](https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/flatbuffers/index.fbs)

### IFC Standard
- [IFC 4.3 Documentation](https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/)
- [buildingSMART International](https://www.buildingsmart.org/)
- [IFC Entity Reference](https://ifc43-docs.standards.buildingsmart.org/)

### Technical References
- [FlatBuffers](https://flatbuffers.dev/)
- [web-ifc](https://github.com/ThatOpen/engine_web-ifc)
- [Three.js](https://threejs.org/)

---

*Research conducted: January 2026*

