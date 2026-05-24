# image-annotator Specification

## Purpose
TBD - created by archiving change image-annotator. Update Purpose after archive.
## Requirements
### Requirement: Scale Calibration
The system SHALL allow the user to visually select two reference points on a loaded image, enter the corresponding real-world distance and unit, and compute a pixels-per-unit scale factor to calibrate all subsequent measurements.

#### Scenario: Calibrating scale with reference points
- **WHEN** the user clicks two reference points in the calibration mode, inputs the value "5" and unit "m" in the calibration prompt, and submits
- **THEN** the system SHALL calculate the pixels-per-meter ratio and display the calibrated scale in the status bar

### Requirement: Drawing Constraint Modes (Horizontal, Vertical, Slanted)
The system SHALL support three coordinate drawing constraints to assist the user in drawing straight horizontal, vertical, or free-form slanted lines:
1. **Horizontal (Default)**: Constrains the endpoint coordinate of a line to have the same y-value as its starting point.
2. **Vertical**: Constrains the endpoint coordinate of a line to have the same x-value as its starting point.
3. **Slanted**: Allows the endpoint coordinate to be drawn freely at any angle.
The system SHALL allow toggling between these constraints dynamically during drawing via dedicated toolbar buttons and keyboard shortcuts (e.g., `H` for Horizontal, `V` for Vertical, `S` for Slanted).

#### Scenario: Constraining dimension lines horizontally by default
- **WHEN** the user starts drawing a dimension line from starting point $(100, 150)$ and moves the cursor to $(250, 180)$
- **THEN** the system SHALL render the active line horizontally, locking the endpoint to $(250, 150)$

#### Scenario: Toggling easily to vertical drawing mode
- **WHEN** the user is drawing a line from $(100, 150)$, moves the cursor, and clicks the "Vertical" toggle button or presses the `V` hotkey
- **THEN** the system SHALL switch to vertical drawing constraint, locking the endpoint to $(100, 180)$

#### Scenario: Drawing free-form slanted lines
- **WHEN** the user selects "Slanted" mode and moves the cursor to $(250, 180)$ while drawing from $(100, 150)$
- **THEN** the system SHALL render the active line as a free-form slanting line directly to $(250, 180)$

### Requirement: Dimension Annotation Drawing
The system SHALL allow the user to click two points in "Annotation Mode" to create a dimension line that displays extension lines, dimension lines with arrowheads/ticks, and a text label displaying the calculated real-world distance according to the calibrated scale.

#### Scenario: Adding a dimension measurement
- **WHEN** the user clicks two points on the calibrated image while in Annotation Mode
- **THEN** the system SHALL render a dimension annotation with arrowheads at the ends and a text label showing the calculated distance (e.g., "3.50 m") above the line

### Requirement: Annotations Persistence
The system SHALL support saving and loading the calibration parameters and annotations list in a JSON format so that annotations can be edited, updated, or re-loaded later.

#### Scenario: Persisting annotations to JSON
- **WHEN** the user clicks "Save Annotations" in the browser tool
- **THEN** the system SHALL serialize the calibration scale, unit, and annotations list, and download it as a `.json` file

### Requirement: Static Image Export
The system SHALL support exporting the original image merged with the annotations at full resolution as a new static image file (PNG/JPEG) with the dimension annotations statically embedded.

#### Scenario: Exporting the annotated image
- **WHEN** the user clicks "Export Image" in the browser tool
- **THEN** the system SHALL draw the annotations onto the full-resolution image canvas and trigger a file download for the annotated PNG/JPEG

### Requirement: Mise Task Invocation
The system SHALL support launching the browser tool from a terminal task using the `mise` task runner.

#### Scenario: Launching the annotator tool locally
- **WHEN** the user runs `mise run tool:annotate` in the project root directory
- **THEN** the system SHALL start a local development server or serve the tool locally and open a browser window displaying the annotator tool

