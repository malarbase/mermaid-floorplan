## 1. Setup & Project Directory Structure

- [x] 1.1 Create the `tools/image-annotator/` directory in the project workspace
- [x] 1.2 Implement the base HTML structure in `tools/image-annotator/index.html` with containers for the workspace canvas, status bar, and controls sidebar
- [x] 1.3 Implement premium CSS styling in `tools/image-annotator/style.css` using vanilla CSS, featuring glassmorphism, dynamic animations, dark-theme styling, and responsive layout

## 2. Interactive Drawing Constraints & Controls

- [x] 2.1 Implement drawing constraint state (Horizontal, Vertical, Slanted) with Horizontal as the default mode
- [x] 2.2 Create UI buttons in the toolbar to toggle constraints, and implement keyboard listeners (`H` key for horizontal, `V` key for vertical, `S` key for slanted) for instant mode switching
- [x] 2.3 Implement the projection coordinate mathematics to constrain active mouse coordinates based on the selected mode relative to the starting point

## 3. Canvas Layer, Pan & Zoom, and Drawing Interaction

- [x] 3.1 Implement canvas rendering engine with support for translation and scaling transformation matrices to enable mouse pan (middle-click or space+drag) and mouse-wheel zoom
- [x] 3.2 Implement a coordinate conversion utility to map viewport screen pixels to actual image pixels and vice-versa
- [x] 3.3 Add live preview trackers for the crosshair cursor and constraint axis indicators (e.g., helper guide lines) in the workspace

## 4. Scale Calibration, Annotation, and Export

- [x] 4.1 Implement the Scale Calibration mode to allow selection of two points, display a modal to input reference dimension and unit, and compute the pixels-per-unit ratio
- [x] 4.2 Implement the Dimension Annotation mode to allow drawing lines between two points and render dimension arrows, extension lines, and labels displaying real-world values
- [x] 4.3 Implement JSON serialization to export and import the calibration details and annotations list as a `.json` text file
- [x] 4.4 Implement high-resolution static image merge on an offscreen canvas to export a static PNG/JPEG embedding all annotations over the original image

## 5. Mise Task and Local Static Server

- [x] 5.1 Implement a lightweight, zero-dependency Node.js HTTP server in `tools/image-annotator/server.js` that serves the tool static files and automatically launches the user's browser
- [x] 5.2 Integrate a new `tool:annotate` task inside `mise.toml` to invoke the Node server script easily

## 6. Verification and Polishing

- [x] 6.1 Conduct full manual verification of the annotation tool using the provided sample image `examples/ngo_first_frames/page-1.png`
- [x] 6.2 Refine and polish the UI/UX with smooth transitions, visual constraint indicators, and a clean user help walkthrough panel
