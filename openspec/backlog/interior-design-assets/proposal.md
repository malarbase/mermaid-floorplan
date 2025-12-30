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

