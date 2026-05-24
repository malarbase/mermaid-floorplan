## Why

Currently, annotating physical dimensions of floor plans or scanned images and calibrating their scales requires heavy manual calculations or external CAD/image-editing software. This is disconnected from our floorplan ecosystem and slow. A lightweight browser tool with manual scale calibration and free-form line constraints (horizontal, vertical, slanted) will enable fast, accurate dimension annotation directly from local images.

## What Changes

- **Image Dimension Annotator Tool**: A client-side web application that runs in the browser, allowing users to load an image, calibrate its scale, annotate distances, and export the annotated image.
- **Scale Calibration**: A calibration mode where the user selects two points visually (reference coordinates in the image) and enters the real-world dimension to calculate the pixels-per-unit scale.
- **Flexible Drawing Constraints (Phase 1)**: Allows drawing annotations along defined angle constraints:
  - **Horizontal** (default): Constrains drawing to a purely horizontal line from the start point.
  - **Vertical**: Constrains drawing to a purely vertical line from the start point.
  - **Slanted**: Allows free-form slanting lines at any angle.
  - Interactive UI buttons and hotkeys (e.g., Tab key or Shift key) will make toggling between horizontal, vertical, and slanted modes seamless.
- **Dimension Annotation Mode**: A drawing tool to measure distances between two clicked points and render dimension lines (arrows/leaders and value labels) dynamically over the image.
- **Persistence & Export**: Support for persisting annotations (in JSON format) and exporting the final annotated image as a static PNG/JPEG with embedded annotations.
- **Mise Task Integration**: A `tool:annotate` task in `mise.toml` to launch and serve the tool locally in a browser environment.

## Capabilities

### New Capabilities

- `image-annotator`: Standalone browser tool for image scale calibration and dimension annotation with manual clicking, angle constraints (horizontal, vertical, slanted), and static image export.

### Modified Capabilities

*None*

## Impact

- **New Package / Component**: A standalone lightweight web app package `image-annotator/` or directory in the workspace.
- **Configuration**: Modifies `mise.toml` to add a new `tool:annotate` task for launching the annotator tool.
- **Dependencies**: Uses basic web technologies (HTML5 canvas, modern JS/TS, CSS) with zero client-side dependencies. Extremely fast load times and no external network queries.
