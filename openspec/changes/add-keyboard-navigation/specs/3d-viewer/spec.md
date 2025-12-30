## ADDED Requirements

### Requirement: Pivot Point Visualization
The viewer SHALL display a visible indicator at the camera's orbit pivot point to aid spatial orientation during navigation.

#### Scenario: Pivot indicator shown during rotation
- **WHEN** the user rotates the camera using mouse or keyboard
- **THEN** a 3D axis gizmo (RGB colored X/Y/Z axes) SHALL appear at the pivot point
- **AND** the indicator SHALL fade out after 1-2 seconds of inactivity

#### Scenario: Toggle pivot visibility
- **WHEN** the user presses the `P` key
- **THEN** the pivot indicator visibility SHALL toggle between always-visible and auto-fade modes

### Requirement: Keyboard Camera Navigation
The viewer SHALL support keyboard-based camera navigation following standard 3D software conventions.

#### Scenario: WASD pan navigation
- **WHEN** the user presses W/A/S/D keys
- **THEN** the camera SHALL pan forward/left/backward/right relative to the current view direction
- **AND** the pivot point SHALL move with the camera

#### Scenario: Vertical movement
- **WHEN** the user presses Q/E keys
- **THEN** the camera SHALL move down/up along the world Y-axis

#### Scenario: Zoom with keyboard
- **WHEN** the user presses +/- or Page Up/Page Down keys
- **THEN** the camera SHALL zoom in/out toward the pivot point

#### Scenario: Precision modifier
- **WHEN** the user holds Shift while pressing movement keys
- **THEN** the movement speed SHALL be reduced for fine-grained control

### Requirement: Preset Camera Views
The viewer SHALL support keyboard shortcuts for common orthographic views.

#### Scenario: Front view
- **WHEN** the user presses Numpad 1 (or `1` on keyboards without numpad)
- **THEN** the camera SHALL snap to a front orthographic view looking at -Z

#### Scenario: Right side view
- **WHEN** the user presses Numpad 3 (or `3`)
- **THEN** the camera SHALL snap to a right-side view looking at -X

#### Scenario: Top-down view
- **WHEN** the user presses Numpad 7 (or `7`)
- **THEN** the camera SHALL snap to a top-down view looking at -Y

#### Scenario: Reset camera
- **WHEN** the user presses Home
- **THEN** the camera SHALL reset to the default initial position and orientation

### Requirement: Focus on Geometry
The viewer SHALL support centering the pivot point on the loaded geometry.

#### Scenario: Center on floorplan
- **WHEN** the user presses `F` or Numpad `.`
- **THEN** the pivot point SHALL move to the center of the loaded floorplan geometry
- **AND** the camera SHALL frame the entire model in view

#### Scenario: Center pivot manually
- **WHEN** the user presses `C`
- **THEN** the pivot point SHALL move to the geometric center of all visible floors

### Requirement: Keyboard Shortcuts Help Overlay
The viewer SHALL display available keyboard shortcuts to users.

#### Scenario: Show shortcuts overlay
- **WHEN** the user presses `?` or `H`
- **THEN** a help overlay SHALL appear listing all keyboard shortcuts
- **AND** pressing the key again SHALL hide the overlay

