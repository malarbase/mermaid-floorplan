## 1. Light Controls
- [x] 1.1 Refactor directional light to be a class property accessible for updates
- [x] 1.2 Add light azimuth slider (0-360°) with real-time light position update
- [x] 1.3 Add light elevation slider (0-90°) 
- [x] 1.4 Add light intensity slider (0-2, default 1.0)
- [x] 1.5 Calculate light position from spherical coordinates (azimuth, elevation, fixed radius)

## 2. GLTF/GLB Export
- [x] 2.1 Import GLTFExporter from `three/examples/jsm/exporters/GLTFExporter.js`
- [x] 2.2 Create export function that handles scene serialization
- [x] 2.3 Add "Export GLB" button with binary export option
- [x] 2.4 Add "Export GLTF" button with JSON export option
- [x] 2.5 Implement file download trigger using Blob and URL.createObjectURL
- [x] 2.6 Ensure floor groups are named properly for hierarchy preservation

## 3. Camera Modes
- [x] 3.1 Add OrthographicCamera as alternative to PerspectiveCamera
- [x] 3.2 Implement camera mode toggle maintaining position/target
- [x] 3.3 Add "Perspective" / "Orthographic" toggle button or dropdown
- [x] 3.4 Bind Numpad 5 key to toggle camera mode
- [x] 3.5 Update OrbitControls when camera changes

## 4. FOV Control
- [x] 4.1 Add FOV slider (30-120°, default 75°)
- [x] 4.2 Wire slider to camera.fov and call updateProjectionMatrix()
- [x] 4.3 Disable/hide FOV slider when in orthographic mode

## 5. Isometric Preset
- [x] 5.1 Add "Isometric" button
- [x] 5.2 Implement isometric positioning (45° azimuth, 35.264° elevation)
- [x] 5.3 Auto-switch to orthographic camera when isometric activated
- [x] 5.4 Calculate camera zoom to fit model bounds

## 6. Annotation System Foundation
- [x] 6.1 Import CSS2DRenderer from `three/examples/jsm/renderers/CSS2DRenderer.js`
- [x] 6.2 Create CSS2DRenderer instance and add to DOM
- [x] 6.3 Update render loop to include CSS2DRenderer
- [x] 6.4 Create annotation options state (showArea, showDimensions, showFloorSummary)
- [x] 6.5 Create unit state (areaUnit: sqft|sqm, lengthUnit: ft|m|cm|in|mm)
- [x] 6.6 Initialize defaults from loaded floorplan config (area_unit, default_unit)

## 7. Room Area Annotations
- [x] 7.1 Create CSS2DObject factory for room area labels
- [x] 7.2 Calculate room area and position label at room center
- [x] 7.3 Format area with unit suffix (e.g., "120 sqft", "11.15 sqm")
- [x] 7.4 Add/remove labels when showArea toggle changes
- [x] 7.5 Update labels when areaUnit changes

## 8. Dimension Line Annotations
- [x] 8.1 Create dimension line mesh helper (line + ticks + label)
- [x] 8.2 Generate width dimension line above each room (X-axis)
- [x] 8.3 Generate depth dimension line beside each room (Z-axis)
- [x] 8.4 Format dimension with unit suffix (e.g., "10ft", "3.5m")
- [x] 8.5 Add height labels for rooms with non-default height
- [x] 8.6 Add/remove annotations when showDimensions toggle changes
- [x] 8.7 Update labels when lengthUnit changes

## 9. Floor Summary Display
- [x] 9.1 Create HTML overlay panel for floor summary
- [x] 9.2 Compute floor metrics (room count, net area, bounding box, efficiency)
- [x] 9.3 Position summary panel for each floor (or use fixed overlay)
- [x] 9.4 Update summary when floor visibility or exploded view changes
- [x] 9.5 Add/remove panel when showFloorSummary toggle changes

## 10. Validation Warnings Overlay
- [x] 10.1 Store validation warnings in component state when floorplan loads
- [x] 10.2 Create HTML panel for warnings display (fixed position, collapsible)
- [x] 10.3 Add warning count badge (e.g., "⚠️ 5 warnings") always visible
- [x] 10.4 Implement collapsible warning list showing each warning message
- [x] 10.5 Include line numbers with each warning (e.g., "line 301: Door misalignment...")
- [x] 10.6 Add toggle button to show/hide warnings panel
- [x] 10.7 Style warnings panel: warning colors (#FFD700), scrollable list, max height
- [x] 10.8 Add "Clear" or "Dismiss" action (warnings reappear on file reload)
- [x] 10.9 Position panel to not obstruct 3D view (e.g., top-right, collapsible)

## 11. UI Reorganization
- [x] 11.1 Redesign controls panel with collapsible sections
- [x] 11.2 Group controls: Camera, Lighting, View, Annotations, Validation, Export
- [x] 11.3 Add annotation toggles: Show Areas, Show Dimensions, Show Floor Summary
- [x] 11.4 Add unit dropdowns: Area Unit (sqft/sqm), Length Unit (ft/m)
- [x] 11.5 Add validation toggle: Show Warnings Panel
- [x] 11.6 Add section headers with collapse/expand toggle
- [x] 11.7 Style improvements for better visual hierarchy
