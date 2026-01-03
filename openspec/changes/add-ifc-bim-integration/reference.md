# IFC/BIM Integration - Developer Reference

Quick reference guide for implementing the IFC/BIM integration.

## DSL → IFC Entity Mapping

### Spatial Structure

```
floorplan
├── IfcProject
│   └── IfcBuilding
│       ├── IfcBuildingStorey (floor Ground)
│       │   ├── IfcSpace (room Kitchen)
│       │   │   ├── IfcWallStandardCase (solid walls)
│       │   │   ├── IfcDoor (door walls + connections)
│       │   │   └── IfcWindow (window walls)
│       │   └── IfcSpace (room Office)
│       └── IfcBuildingStorey (floor First)
```

### Entity Attribute Mapping

#### IfcProject

| DSL | IFC Attribute |
|-----|---------------|
| (implicit) | GlobalId: generated |
| `ifc { project_name: "X" }` | Name: "X" |
| (implicit) | OwnerHistory: generated |

#### IfcBuildingStorey

| DSL | IFC Attribute |
|-----|---------------|
| `floor Ground` | Name: "Ground" |
| `floor height 3.5` | Elevation: 0, Height: 3.5 |
| (computed) | Elevation: sum of previous floors |

#### IfcSpace

| DSL | IFC Attribute |
|-----|---------------|
| `room Kitchen` | Name: "Kitchen" |
| `label "Main Kitchen"` | LongName: "Main Kitchen" |
| `at (5, 10)` | ObjectPlacement: (5, 10, floor_elevation) |
| `size (10 x 12)` | Representation: Box(10, 12, height) |
| `height 3.0` | Representation: ExtrusionDepth=3.0 |
| `elevation 0.5` | ObjectPlacement.Z += 0.5 |
| `ifc-type parking` | PredefinedType: PARKING |
| `guid "22chars"` | GlobalId: "22chars" |

#### IfcWallStandardCase

| DSL | IFC Attribute |
|-----|---------------|
| Wall direction | ObjectPlacement: computed from room |
| Wall type `solid` | Full wall geometry |
| (from config) | Width: wall_thickness |
| (from room) | Height: room height |

#### IfcDoor

| DSL | IFC Attribute |
|-----|---------------|
| `connect ... door` | PredefinedType: DOOR |
| `connect ... double-door` | PredefinedType: DOUBLE_SWING |
| `at 50%` | Position: 50% along wall |
| `size (3ft x 7ft)` | Width: 0.914m, Height: 2.134m |
| `swing: left` | OperationType: SINGLE_SWING_LEFT |

#### IfcWindow

| DSL | IFC Attribute |
|-----|---------------|
| `walls [right: window]` | PredefinedType: WINDOW |
| `window_size: (4 x 3)` | Width: 4, Height: 3 |
| `window_sill: 0.9` | Sill height: 0.9 |

## Unit Conversion Table

```typescript
const UNIT_TO_METERS: Record<string, number> = {
  'm':  1.0,
  'ft': 0.3048,
  'cm': 0.01,
  'in': 0.0254,
  'mm': 0.001,
};

// IFC always uses meters
function toMeters(value: number, unit: string): number {
  return value * UNIT_TO_METERS[unit];
}
```

## GUID Generation

### IFC GUID Format

IFC uses 22-character Base64-like GUIDs:

```typescript
const IFC_GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

function uuidToIfcGuid(uuid: string): string {
  // Convert UUID bytes to IFC GUID format
  const hex = uuid.replace(/-/g, '');
  let result = '';
  for (let i = 0; i < 22; i++) {
    const val = parseInt(hex.substr(i * 6 / 4, 2), 16) % 64;
    result += IFC_GUID_CHARS[val];
  }
  return result;
}
```

### Deterministic GUIDs

```typescript
function generateDeterministicGuid(seed: string, path: string): string {
  const hash = createHash('sha256').update(seed + '/' + path).digest('hex');
  return uuidToIfcGuid(hash.substring(0, 32));
}

// Usage:
generateDeterministicGuid("project-v1", "floor.Ground.room.Kitchen")
// → Always returns same GUID for same inputs
```

## That Open API Quick Reference

### Initialize FragmentsModels

```typescript
import * as FRAGS from "@thatopen/fragments";

const workerUrl = new URL(
  "@thatopen/fragments/dist/Worker/worker.mjs",
  import.meta.url
).href;

const fragments = new FRAGS.FragmentsModels(workerUrl);
```

### Load Fragments File

```typescript
const response = await fetch("building.frag");
const buffer = await response.arrayBuffer();
const model = await fragments.core.load(buffer, { 
  modelId: "my-building",
  camera: world.camera.three 
});
scene.add(model.object);
```

### Convert IFC to Fragments

```typescript
const serializer = new FRAGS.IfcImporter();
serializer.wasm = { 
  absolute: true, 
  path: "https://unpkg.com/web-ifc@0.0.72/" 
};

const ifcBuffer = await fetch(ifcUrl).then(r => r.arrayBuffer());
const fragmentBytes = await serializer.process({
  bytes: new Uint8Array(ifcBuffer),
  progressCallback: (progress) => console.log(`${progress}%`),
});
```

### Generate 2D Floor Plans

```typescript
import * as OBC from "@thatopen/components";

const views = components.get(OBC.Views);
views.world = world;

// Create views from IFC storeys
await views.createFromIfcStoreys({ 
  modelIds: [/building/],
  offset: 1  // Offset from storey elevation
});

// Open a specific view
views.open("Ground Floor");
```

### Query Element Properties

```typescript
// Get properties for selected element
const expressId = 12345;
const properties = model.getItemProperties(expressId);

// Get spatial structure
const storeys = model.getItemsOfType(WEBIFC.IFCBUILDINGSTOREY);
const spaces = model.getItemsOfType(WEBIFC.IFCSPACE);
```

## File Structure After Implementation

```
language/
├── src/diagrams/floorplans/
│   ├── json-converter.ts         # Existing
│   ├── fragments-exporter.ts     # NEW: JSON → Fragments
│   ├── ifc-importer.ts           # NEW: IFC → AST
│   ├── ifc-entity-mapper.ts      # NEW: DSL ↔ IFC mapping
│   ├── dsl-generator.ts          # NEW: AST → DSL text
│   └── guid-utils.ts             # NEW: GUID generation
│
viewer/
├── src/
│   ├── main.ts                   # Existing
│   ├── thatopen-viewer.ts        # NEW: That Open viewer
│   └── viewer-factory.ts         # NEW: Viewer selection
│
scripts/
├── export-json.ts                # Existing
├── export-fragments.ts           # NEW
└── import-ifc.ts                 # NEW
│
mcp-server/
├── src/tools/
│   ├── render.ts                 # Existing
│   └── export-fragments.ts       # NEW
```

## Key Dependencies

```json
{
  "dependencies": {
    "@thatopen/fragments": "^2.x",
    "@thatopen/components": "^2.x"
  },
  "optionalDependencies": {
    "web-ifc": "^0.0.72"
  }
}
```

## Testing Checklist

### Export Tests
- [ ] Simple floorplan → valid Fragments file
- [ ] Multi-floor → correct storey hierarchy
- [ ] All wall types → correct IFC entities
- [ ] Connections → doors with relationships
- [ ] Styles → materials and surface styles
- [ ] Units → all normalized to meters
- [ ] GUIDs → unique and deterministic (with seed)

### Import Tests
- [ ] Simple IFC → valid DSL
- [ ] Revit export → parse successfully
- [ ] ArchiCAD export → parse successfully
- [ ] Unsupported elements → warnings only
- [ ] Roundtrip → geometry preserved

### Viewer Tests
- [ ] Fragments load in That Open viewer
- [ ] Camera controls work
- [ ] Floor plan view generates
- [ ] Element selection works

## Error Handling Patterns

```typescript
// Export errors
interface FragmentsExportResult {
  success: boolean;
  data?: Uint8Array;
  errors: ExportError[];
  warnings: ExportWarning[];
}

// Import errors  
interface IfcImportResult {
  success: boolean;
  dsl?: string;
  errors: ImportError[];
  warnings: ImportWarning[];
  unsupportedElements: string[];
}
```

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Export (50 rooms) | <200ms | Wall clock time |
| Export (500 rooms) | <2s | Wall clock time |
| Import (1MB IFC) | <1s | After WASM warm |
| Import (10MB IFC) | <5s | After WASM warm |
| WASM cold start | <1s | First import only |

