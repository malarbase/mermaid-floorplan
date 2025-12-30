## Context
The current system renders 2D SVG floorplans. Users requested 3D visualization. Flet (used in other parts of the user's stack) lacks native 3D support.

## Goals / Non-Goals
- **Goals**:
    - Render walls, floors, and openings (doors/windows) in 3D.
    - Interactive camera (orbit/zoom).
    - Separation of concerns: DSL parser exports data, independent viewer consumes it.
    - **Visual Clarity**: Clean wall intersections (no z-fighting) and ability to see inside multi-floor structures.
- **Non-Goals**:
    - Realistic lighting or textures (initial version uses simple materials).
    - Editing in 3D (viewer is read-only).
    - Flet integration (viewer will be a standalone web app for now).

## Decisions
- **Decision**: Use Three.js for rendering.
    - **Rationale**: Industry standard for WebGL, extensive documentation, good performance.
- **Decision**: Intermediate JSON format.
    - **Rationale**: Decouples the parser (Langium/Node) from the viewer (Client-side JS). Allows the viewer to be hosted anywhere.
- **Decision**: Use `three-bvh-csg` (or similar library).
    - **Rationale**: Essential for cutting holes for windows/doors and merging wall segments cleanly. Simple box overlapping looks amateur and causes graphical artifacts.
- **Decision**: Implement Exploded View logic in Viewer (not Exporter).
    - **Rationale**: The viewer should control the dynamic separation of floors; the data should just provide the base elevations.

## Risks / Trade-offs
- **Risk**: Performance cost of CSG operations at runtime.
    - **Mitigation**: Perform CSG once on load, not every frame. Floorplans are generally small enough for client-side CSG.

## Migration Plan
- N/A (New capability)
