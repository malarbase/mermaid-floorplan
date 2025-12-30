## Why
A floorplan isn't just walls. Adding furniture markers helps visualize scale and utility.

## What Changes
- Add `place` keyword inside room blocks
- Support assets (Bed, Wardrobe, Sofa, etc.)
- Add properties for rotation and relative positioning of assets
- Update viewer to render placeholder models (cubes) or GLB assets

## Impact
- Affected specs: `dsl-grammar`, `rendering`, `3d-viewer`
- Affected code: `language/src`, `viewer/src`

---

## Research: 3D Asset Integration Options

### LL3M (Large Language 3D Modelers)

**Source:** [threedle.github.io/ll3m](https://threedle.github.io/ll3m/) | [arXiv:2508.08228](https://arxiv.org/abs/2508.08228)

LL3M is a multi-agent LLM system that generates 3D assets by writing Python code for Blender:
- Generates interpretable, editable Blender Python scripts from text prompts
- Iterative refinement with automatic self-critique and user feedback
- Creates diverse geometry, materials, and full scenes
- Uses BlenderRAG for Blender API knowledge

**Fit for this proposal: ⚠️ Indirect/Limited**

| Aspect | Assessment |
|--------|------------|
| Output format | Blender Python scripts, not GLB. Requires pipeline: `prompt → LL3M → script → Blender → GLB export` |
| Runtime | Requires Blender + Python + LLM API. Not suitable for real-time browser execution |
| Best use case | Pre-generating asset libraries or offline workflows, not live web rendering |

**Potential Integration Pattern:**
```
Offline Pipeline: Text Prompt → LL3M → Blender → GLB Export → Asset Library
                                                                    ↓
Web Viewer: DSL "place Bed at (7,2)" → Load GLB → Position in Three.js scene
```

**When LL3M makes sense:**
1. MCP tool `generate-furniture-asset` that runs LL3M server-side → returns GLB
2. Pre-generate custom furniture library matching floorplan aesthetics
3. AI-powered customization ("sofa matching this room's style")

### BlenderKit

**Source:** [blenderkit.com](https://www.blenderkit.com/)

**Fit for this proposal: ❌ Poor for direct integration**

| Aspect | Assessment |
|--------|------------|
| API access | Blender plugin only; no public REST API for web download |
| Asset format | `.blend` files, not web-ready GLB/GLTF |
| Licensing | Mix of free/paid; commercial restrictions vary |
| Integration | Would require: Blender server → addon → GLB export → web delivery |

**Alternatives in Blender ecosystem:**
- [interniq](https://polygoniq.com/software/interniq/): 800+ interior assets, architectural viz optimized
- [FurniKit](https://superhivemarket.com/products/furnikit): 300+ furniture assets with Blender addon

Same limitation: require offline Blender → GLB conversion pipeline.

### Recommended: Web-Native Asset Libraries

Since the 3D viewer uses **Three.js in the browser**, these integrate directly:

| Library | API | Format | Cost | Notes |
|---------|-----|--------|------|-------|
| [Poly Haven](https://polyhaven.com/) | REST API | GLB/GLTF | Free (CC0) | High-quality furniture/textures |
| [Sketchfab API](https://sketchfab.com/developers) | REST API | GLB | Free tier | Largest 3D library; license filtering |
| [Poly Pizza](https://poly.pizza) | Direct links | GLB | Free | Low-poly stylized models |
| [market.pmnd.rs](https://market.pmnd.rs/) | Direct links | GLB | Free | Curated R3F-ready models |
| Built-in primitives | Three.js native | Procedural | Free | Zero dependencies |

---

## Recommended Implementation Phases

### Phase 1: Procedural Placeholders (MVP)
- Generate simple Three.js geometry (boxes, cylinders) sized to furniture dimensions
- DSL `size (2 x 2.2)` maps directly to box dimensions
- Zero external dependencies, fast rendering

### Phase 2: GLB Asset Loading
- Support user-provided GLB URLs or bundled assets
- Use Three.js GLTFLoader
- Syntax: `place Bed at (7,2) model "assets/bed.glb"`

### Phase 3: Asset Library Integration (Optional)
- Integrate Poly Haven or Sketchfab API for searchable catalog
- Or bundle curated CC0 GLB assets

### Phase 4: AI-Powered Generation (Future)
- MCP tool using LL3M for custom asset generation
- Server-side Blender pipeline → GLB → serve to viewer

---

## Summary

| Technology | Direct Integration? | Recommendation |
|------------|---------------------|----------------|
| LL3M | No (Blender backend) | Future: MCP tool for custom models |
| BlenderKit | No (no web API) | Skip; use web-native alternatives |
| Poly Haven / Sketchfab | ✅ Yes | Best for web-based Three.js |
| Procedural primitives | ✅ Yes | Start here for MVP |

**Pragmatic path:** Implement as proposed (placeholders → GLB), consider LL3M as advanced feature via MCP server for generative 3D furniture if user demand exists.
