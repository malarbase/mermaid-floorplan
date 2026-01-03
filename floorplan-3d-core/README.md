# floorplan-3d-core

Shared 3D rendering primitives for floorplan visualization using Three.js.

## Overview

This package provides platform-agnostic 3D rendering utilities that can be used in both browser and Node.js environments. It's the foundation for:

- **Browser Viewer** (`floorplans-viewer`): Interactive 3D floorplan visualization
- **MCP Server** (`floorplans-mcp-server`): Headless 3D PNG rendering for AI assistants

## Installation

```bash
npm install floorplan-3d-core three
```

Note: `three` is a peer dependency and must be installed separately.

## Modules

### Types (`types.ts`)

JSON interfaces for floorplan data exchange:

```typescript
import type { 
  JsonExport, 
  JsonFloor, 
  JsonRoom, 
  JsonWall,
  JsonStair,
  JsonLift,
  Render3DOptions,
  SceneBounds 
} from 'floorplan-3d-core';
```

### Constants (`constants.ts`)

Shared architectural dimensions and color themes:

```typescript
import { 
  DIMENSIONS,           // Wall, floor, door, window dimensions
  COLORS,               // Light theme colors
  COLORS_DARK,          // Dark theme colors  
  COLORS_BLUEPRINT,     // Blueprint theme colors
  getThemeColors,       // Get colors for a theme
  toMeters,             // Unit conversion to meters
  fromMeters,           // Unit conversion from meters
  type LengthUnit,
  type ViewerTheme 
} from 'floorplan-3d-core';
```

### Materials (`materials.ts`)

Material factory for consistent PBR materials:

```typescript
import { MaterialFactory, type MaterialSet, type MaterialStyle } from 'floorplan-3d-core';

// Create a complete material set
const materials = MaterialFactory.createMaterialSet(style, 'dark');

// Create individual materials
const floorMat = MaterialFactory.createFloorMaterial(style, 'light');
const wallMat = MaterialFactory.createWallMaterial(style, 'dark');
```

### Scene Builder (`scene-builder.ts`)

Build Three.js scenes from JSON floorplan data:

```typescript
import { buildFloorplanScene, buildCompleteScene } from 'floorplan-3d-core';

// Build just the scene geometry
const { scene, bounds, floorsRendered, styleMap } = buildFloorplanScene(jsonData, {
  theme: 'dark',
  floorIndices: [0, 1],  // Which floors to render
  showFloors: true,
  showWalls: true,
  showStairs: true,
  showLifts: true,
});

// Build complete scene with camera and lighting
const { scene, camera, cameraResult, bounds, floorsRendered } = buildCompleteScene(
  jsonData,
  { 
    width: 800, 
    height: 600, 
    projection: 'isometric' 
  }
);
```

### Camera Utils (`camera-utils.ts`)

Camera configuration for isometric and perspective views:

```typescript
import { setupCamera, computeSceneBounds } from 'floorplan-3d-core';

// Compute scene bounding box
const bounds = computeSceneBounds(scene);

// Set up camera
const { camera, position, target, fov } = setupCamera(
  { projection: 'perspective', fov: 60 },
  bounds,
  16 / 9  // aspect ratio
);
```

### Geometry Generators

- **`floor-geometry.ts`**: Floor slab generation
- **`wall-geometry.ts`**: Simplified wall geometry (no CSG)
- **`stair-geometry.ts`**: Stair and lift geometry generation

## Camera Modes

### Isometric (default)

Orthographic camera at 30° from horizontal, classic architectural view:

```typescript
const result = buildCompleteScene(data, {
  projection: 'isometric',
  width: 800,
  height: 600,
});
```

### Perspective

Perspective camera with configurable position, target, and FOV:

```typescript
const result = buildCompleteScene(data, {
  projection: 'perspective',
  cameraPosition: [30, 20, 30],
  cameraTarget: [5, 0, 5],
  fov: 60,
  width: 1920,
  height: 1080,
});
```

## Themes

Three built-in themes are available:

| Theme | Background | Use Case |
|-------|-----------|----------|
| `light` | Light gray | Default viewing |
| `dark` | Dark blue | Dark mode UIs |
| `blueprint` | Deep blue | Architectural style |

Set theme in config:

```typescript
const data: JsonExport = {
  config: { theme: 'dark' },
  // or
  config: { darkMode: true },
  ...
};
```

Or pass directly:

```typescript
buildFloorplanScene(data, { theme: 'blueprint' });
```

## Rendering Options

```typescript
interface Render3DOptions {
  width?: number;               // Output width (default: 800)
  height?: number;              // Output height (default: 600)
  projection?: 'isometric' | 'perspective';  // Camera type
  cameraPosition?: [number, number, number]; // For perspective
  cameraTarget?: [number, number, number];   // For perspective
  fov?: number;                 // Field of view (default: 50)
  renderAllFloors?: boolean;    // Render all floors
  floorIndex?: number;          // Specific floor to render
}
```

## Platform Compatibility

This package is designed to work in:

- **Browser**: Use with WebGL renderer
- **Node.js**: Use with headless-gl for server-side rendering

The `RenderContext` interface (`render-context.ts`) abstracts platform-specific rendering:

```typescript
import type { RenderContext } from 'floorplan-3d-core';

class BrowserRenderContext implements RenderContext {
  // Browser-specific WebGL setup
}

class HeadlessRenderContext implements RenderContext {
  // Node.js headless-gl setup
}
```

## Testing

```bash
npm test           # Run tests once
npm run test:watch # Watch mode
```

## Dependencies

- **Peer**: `three` >= 0.150.0
- **Dev**: `@types/three`, `vitest`, `typescript`

## License

MIT

