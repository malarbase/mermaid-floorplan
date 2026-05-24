## Context

Scanned drawings, floor plans, and sketches often contain pre-marked measurements but lack vector metadata. To integrate these assets into our floorplan DSL workflow or to calibrate scales for custom sketching, we need a lightweight, browser-based tool to load an image, calibrate its scale, draw dimension lines using precise visual constraints (horizontal, vertical, or slanted), and export the result.

## Goals / Non-Goals

**Goals:**
- Implement a client-side browser application with a premium dark-themed interface, featuring full zoom/pan support and real-time interaction.
- Build an interactive canvas layout supporting free-form mouse clicks for reference and dimension plotting.
- Support robust angle constraint alignments:
  - **Horizontal** (default): Forces the active drawing line to be perfectly horizontal.
  - **Vertical**: Forces the active drawing line to be perfectly vertical.
  - **Slanted**: Allows free-form lines at any angle.
- Implement an intuitive, easy-to-use toggle system (both via toolbar buttons and keyboard shortcuts like `H` for horizontal, `V` for vertical, `S` for slanted) to toggle modes seamlessly.
- Support scale calibration (mapping two clicks to a physical dimension and unit) and dimension drawing (creating annotated dimension lines with arrowheads and labels).
- Expose the tool via a simple `tool:annotate` mise task that launches a zero-dependency local static server.
- Support persistence of annotations (JSON format) and high-quality image export merging annotations with the original image at full native resolution.

**Non-Goals:**
- Automated edge snapping or deep learning models for Phase 1. Free-form visual clicking with coordinate constraints is sufficient and provides maximum user control.
- Full CAD editing capabilities. The tool is restricted to dimension annotation and scale calibration.

## Decisions

### 1. Standalone Frontend Stack (Vanilla HTML5 / CSS3 / ES6 Javascript)
- **Decision:** Build the annotator as a standalone frontend application in `tools/image-annotator/` using vanilla web technologies.
- **Rationale:** Minimizes external dependencies, ensures instant load times, avoids heavy build systems, and remains highly maintainable.
- **Alternatives Considered:** Building it inside `floorplan-app` or `floorplan-editor` as a route. However, a standalone tools folder makes it highly modular, incredibly fast to run via `mise`, and decoupled from database/auth/DSL concerns.

### 2. Drawing Constraints Coordinate Mathematics
- **Decision:** Implement purely client-side canvas coordinate projection based on the selected mode:
  - Let the first click point be $P_1 = (x_1, y_1)$ and current mouse cursor be $P_2 = (x_2, y_2)$.
  - **Horizontal Mode** (Default): Constrain the active coordinate to $P_2' = (x_2, y_1)$.
  - **Vertical Mode**: Constrain the active coordinate to $P_2' = (x_1, y_2).$
  - **Slanted Mode**: No constraints, use $P_2' = (x_2, y_2).$
- **Rationale:** Simple mathematical projection is highly predictable, bug-free, runs instantaneously, and offers a perfect drafting experience. Toggling can be done by clicking on the UI buttons or using hotkeys (`H` / `V` / `S` or holding `Shift` to constrain to horizontal/vertical dynamically).

### 3. Canvas Layering and Pan/Zoom Architecture
- **Decision:** Use a single state-driven canvas with coordinate transformation matrix (zoom/pan) handled in JS.
- **Rationale:** Supporting pan and zoom is essential for precise floor plan work. By utilizing Canvas 2D context transforms (`ctx.translate`, `ctx.scale`), we can easily render the source image, the snapped cursor guide, calibration vectors, and existing dimension lines in the same coordinate space.
- **Exporting:** To export at the image's original full resolution, we can render the original image on a hidden canvas, apply the scale-adjusted annotations scaled to the original resolution, and call `canvas.toDataURL("image/png")` to trigger a high-quality download.

### 4. Zero-Dependency Node.js Static Server
- **Decision:** Use a short, robust Node.js script using the built-in `http` and `fs` modules to serve the static files and optionally launch the browser.
- **Rationale:** Ensures that the `mise` task runs out-of-the-box on any machine with Node.js installed, without requiring `npm install` or global package installations.

## Risks / Trade-offs

- **[Risk] User draws slanted lines accidentally when intending a straight horizontal/vertical measurement**
  - *Mitigation:* Set **Horizontal** mode as the default for all new measurements, and make toggling to **Vertical** or **Slanted** extremely simple via both a persistent visual button bar and keyboard shortcuts (`H`, `V`, `S`).
- **[Risk] High-resolution image canvas memory limits**
  - *Mitigation:* Scale down the display canvas for rendering in the viewport while keeping the original image in memory for coordinate calculation and final export.
