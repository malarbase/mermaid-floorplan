## Why
Current floorplan definitions mix structural logic with hardcoded visuals. Separating aesthetics into reusable style blocks enables:
- Rich 3D visualization without cluttering spatial DSL
- Multiple visual themes for the same floorplan
- Per-room material customization (e.g., oak floors in bedrooms, tile in bathrooms)

## What Changes
- Add `style <name> { ... }` block syntax to define reusable material configurations
- Add `style <name>` clause to rooms for style assignment
- Add `default_style: <name>` to config block for global defaults
- Support properties: `floor_color`, `wall_color`, `floor_texture`, `wall_texture`, `roughness`, `metalness`
- Update 3D viewer MaterialFactory to consume style definitions from JSON export
- SVG rendering: Apply colors only (textures gracefully degrade to solid colors)

## Example Syntax
```
floorplan
  style Modern {
    floor_color: "#E0E0E0",
    wall_color: "#909090",
    roughness: 0.5
  }
  
  style Rustic {
    floor_color: "#8B4513",
    floor_texture: "textures/oak.jpg",
    wall_color: "#D2B48C",
    wall_texture: "textures/plaster.png"
  }
  
  config { default_style: Modern }
  
  floor Ground {
    room Kitchen at (0,0) size (10 x 10) walls [...] style Rustic
    room Office at (10,0) size (8 x 10) walls [...]  # uses Modern (default)
  }
```

## Impact
- Affected specs: `dsl-grammar` (new syntax), `rendering` (style application), `3d-viewer` (material loading)
- Affected code: 
  - `language/src/diagrams/floorplans/floorplans.langium` - grammar additions
  - `language/src/diagrams/floorplans/floorplans-validator.ts` - style validation
  - `scripts/export-json.ts` - style export
  - `viewer/src/materials.ts` - dynamic material creation
  - `src/renderer.ts` - SVG color application

## Dependencies
- Builds on existing `config` block infrastructure
- Extends current MaterialFactory pattern in 3D viewer
