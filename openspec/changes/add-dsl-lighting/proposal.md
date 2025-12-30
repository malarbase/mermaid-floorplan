## Why
Currently, lighting in the 3D viewer is hardcoded (ambient light at 0.5 intensity, directional light at position (50, 100, 50)). Users cannot customize lighting from the floorplan DSL to:

1. **Illuminate specific rooms better** - Dark rooms like home theatres need different lighting
2. **Define room-specific light sources** - Simulate natural light from windows or artificial lighting
3. **Create mood and ambiance** - Different light colors/intensities for different room types
4. **Visualize lighting design** - Architects need to preview how natural/artificial light affects spaces

Adding configurable light sources in the DSL enables lighting to be part of the floorplan definition, making exports and visualizations consistent.

## What Changes

### DSL Grammar Extensions
- Add `light` statement for defining light sources
- Support light types: `point`, `spot`, `directional`, `ambient`
- Allow lights to be placed at absolute coordinates or relative to rooms
- Support light properties: color, intensity, distance (for point/spot), angle (for spot)

### Viewer Updates  
- Parse light definitions from JSON export
- Create corresponding Three.js lights
- Apply room-scoped ambient lighting

### Example Syntax
```
# Global scene lighting
light Sun type directional at (50, 100, 50) color "#FFFAF0" intensity 0.8

# Room-specific point light
light CeilingLight type point in Kitchen at (50%, 50%) height 2.8 color "#FFF5E6" intensity 0.6 distance 10

# Spot light for accent
light ReadingLamp type spot in LivingRoom at (80%, 20%) height 1.5 color "#FFE4B5" intensity 0.5 angle 45 target (0, 0, 0)
```

## Impact
- Affected specs: `dsl-grammar`, `3d-viewer`
- Affected code: `language/src/diagrams/floorplans/*.langium`, `language/src/diagrams/floorplans/*.ts`, `viewer/src/main.ts`, `viewer/src/types.ts`
- JSON export schema changes: Add `lights` array to export format

