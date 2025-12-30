## Why
Walls are currently zero-thickness lines converted to volume. Explicit control offers precision for curved walls and variable thickness (e.g., bearing walls).

## What Changes
- Add `curve` property to wall specification
- Add `thickness` property to wall specification
- Update wall generation logic to support curved geometries (TubeGeometry or ExtrudeGeometry)

## Impact
- Affected specs: `dsl-grammar`, `rendering`
- Affected code: `language/src`, `viewer/src`

