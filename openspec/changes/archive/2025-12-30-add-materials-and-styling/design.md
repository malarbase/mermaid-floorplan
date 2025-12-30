## Context
The project has two rendering targets:
1. **2D SVG** (`src/renderer.ts`) - colors only, no texture support
2. **3D Three.js** (`viewer/src/`) - full material support (colors, textures, PBR properties)

Styles must work for both while allowing progressive enhancement. The current 3D viewer uses hardcoded colors in `viewer/src/constants.ts` and creates materials via `MaterialFactory`.

## Goals / Non-Goals
- **Goals**:
  - Define styles once, apply to multiple rooms
  - Support colors universally (2D + 3D)
  - Support textures in 3D viewer
  - Graceful degradation (missing texture → fallback color)
  - Style reuse across rooms
- **Non-Goals**:
  - Real-time texture loading (initial: preload on viewer init)
  - Style animations or transitions
  - Per-wall segment styling (style applies to entire room)
  - Style inheritance/composition (keep flat for simplicity)

## Decisions

### Decision: Color values use hex notation
- **Format**: `"#RRGGBB"` (e.g., `"#8B4513"`)
- **Rationale**: Familiar, portable between SVG fill attribute and Three.js Color constructor

### Decision: Textures are URL references
- **Format**: `"textures/oak.jpg"` or full URL
- **Rationale**: Viewer loads textures from paths; allows bundling or CDN hosting
- **Loading**: TextureLoader loads on viewer init, not on-demand

### Decision: Styles are NOT inherited (flat, explicit assignment)
- **Rationale**: Simplicity first; inheritance adds complexity without proven need
- **Future**: Can add `extends` keyword if users request

### Decision: SVG renderer ignores texture properties
- **Rationale**: SVG doesn't support image textures easily; colors are sufficient for 2D schematic views
- **Behavior**: If only texture defined (no color), use a neutral gray fallback

### Decision: Style block position in DSL
- **Position**: After `define` statements, before `config` block
- **Rationale**: Follows existing pattern where definitions come first

## Style Property Reference

| Property | Type | Required | Default | Targets |
|----------|------|----------|---------|---------|
| `floor_color` | Hex string | No | `"#E0E0E0"` | SVG, 3D |
| `wall_color` | Hex string | No | `"#909090"` | SVG, 3D |
| `floor_texture` | URL string | No | None | 3D only |
| `wall_texture` | URL string | No | None | 3D only |
| `roughness` | Number 0-1 | No | 0.8 | 3D only |
| `metalness` | Number 0-1 | No | 0.1 | 3D only |

## Risks / Trade-offs

### Risk: Large texture files slow down viewer
- **Mitigation**: Document recommended texture sizes (512x512 max recommended)
- **Future**: Implement lazy loading or LOD system if needed

### Risk: Texture path resolution
- **Mitigation**: Relative paths resolved from viewer's base URL
- **Fallback**: Missing textures fall back to color

### Risk: Color parsing errors
- **Mitigation**: Validate hex format at parse time; provide clear error messages

## Migration Plan
- N/A (New capability, backward compatible)
- Existing floorplans without styles continue to use default colors

## Open Questions
1. Should we support per-element styling (different walls have different colors)?
   - **Current answer**: No, keep room-level for simplicity
2. Should styles be floor-scoped or floorplan-scoped?
   - **Current answer**: Floorplan-scoped (defined once, usable in any floor)
3. Should we support CSS-like color names (e.g., "red", "steelblue")?
   - **Current answer**: No, hex only for consistency

