## Why
The 3D viewer uses OrbitControls for mouse-based navigation (rotate, pan, zoom), but the pivot point is invisible. This makes keyboard-based navigation difficult for accessibility and precision control. Users cannot see where the camera is rotating around, leading to disorientation when navigating complex multi-floor buildings.

**Research: Keyboard Navigation Conventions for 3D Viewers**

Common conventions from CAD software, Blender, and web-based 3D viewers:

| Key | Action | Reference |
|-----|--------|-----------|
| `W/A/S/D` or Arrow Keys | Pan camera (forward/left/back/right) | FPS-style, Unity, Unreal |
| `Q/E` | Move camera up/down | Standard 3D editors |
| `Numpad 1/3/7` | Front/Right/Top orthographic views | Blender convention |
| `Numpad 5` | Toggle perspective/orthographic | Blender convention |
| `Numpad .` or `F` | Focus/frame selection or center pivot | Blender, Maya |
| `Home` | Reset camera to default view | Universal |
| `+/-` or `Page Up/Down` | Zoom in/out | Universal |
| `Shift` + movement | Slower/precise movement | Universal modifier |
| `C` | Center pivot on visible geometry | CAD software |

**Pivot Point Visualization:**
- Small axis gizmo (RGB for X/Y/Z) at the orbit target
- Semi-transparent sphere or crosshair
- Option to show/hide via `P` key toggle
- Auto-fade when not actively rotating

## What Changes
- Add visible pivot point indicator (3D gizmo or 2D overlay) at OrbitControls target
- Implement keyboard shortcuts for camera navigation
- Add keyboard shortcut panel/overlay showing available controls
- Add "focus on geometry" functionality to recenter pivot

## Impact
- Affected specs: `3d-viewer`
- Affected code: `viewer/src/main.ts`, `viewer/index.html`
- New files: Possibly `viewer/src/keyboard-controls.ts`, `viewer/src/pivot-indicator.ts`

