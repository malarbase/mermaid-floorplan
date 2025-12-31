## 1. Light Controls
- [ ] 1.1 Refactor directional light to be a class property accessible for updates
- [ ] 1.2 Add light azimuth slider (0-360°) with real-time light position update
- [ ] 1.3 Add light elevation slider (0-90°) 
- [ ] 1.4 Add light intensity slider (0-2, default 1.0)
- [ ] 1.5 Calculate light position from spherical coordinates (azimuth, elevation, fixed radius)

## 2. GLTF/GLB Export
- [ ] 2.1 Import GLTFExporter from `three/examples/jsm/exporters/GLTFExporter.js`
- [ ] 2.2 Create export function that handles scene serialization
- [ ] 2.3 Add "Export GLB" button with binary export option
- [ ] 2.4 Add "Export GLTF" button with JSON export option
- [ ] 2.5 Implement file download trigger using Blob and URL.createObjectURL
- [ ] 2.6 Ensure floor groups are named properly for hierarchy preservation

## 3. Camera Modes
- [ ] 3.1 Add OrthographicCamera as alternative to PerspectiveCamera
- [ ] 3.2 Implement camera mode toggle maintaining position/target
- [ ] 3.3 Add "Perspective" / "Orthographic" toggle button or dropdown
- [ ] 3.4 Bind Numpad 5 key to toggle camera mode
- [ ] 3.5 Update OrbitControls when camera changes

## 4. FOV Control
- [ ] 4.1 Add FOV slider (30-120°, default 75°)
- [ ] 4.2 Wire slider to camera.fov and call updateProjectionMatrix()
- [ ] 4.3 Disable/hide FOV slider when in orthographic mode

## 5. Isometric Preset
- [ ] 5.1 Add "Isometric" button
- [ ] 5.2 Implement isometric positioning (45° azimuth, 35.264° elevation)
- [ ] 5.3 Auto-switch to orthographic camera when isometric activated
- [ ] 5.4 Calculate camera zoom to fit model bounds

## 6. Annotation System Foundation
- [ ] 6.1 Import CSS2DRenderer from `three/examples/jsm/renderers/CSS2DRenderer.js`
- [ ] 6.2 Create CSS2DRenderer instance and add to DOM
- [ ] 6.3 Update render loop to include CSS2DRenderer
- [ ] 6.4 Create annotation options state (showArea, showDimensions, showFloorSummary)
- [ ] 6.5 Create unit state (areaUnit: sqft|sqm, lengthUnit: ft|m|cm|in|mm)
- [ ] 6.6 Initialize defaults from loaded floorplan config (area_unit, default_unit)

## 7. Room Area Annotations
- [ ] 7.1 Create CSS2DObject factory for room area labels
- [ ] 7.2 Calculate room area and position label at room center
- [ ] 7.3 Format area with unit suffix (e.g., "120 sqft", "11.15 sqm")
- [ ] 7.4 Add/remove labels when showArea toggle changes
- [ ] 7.5 Update labels when areaUnit changes

## 8. Dimension Line Annotations
- [ ] 8.1 Create dimension line mesh helper (line + ticks + label)
- [ ] 8.2 Generate width dimension line above each room (X-axis)
- [ ] 8.3 Generate depth dimension line beside each room (Z-axis)
- [ ] 8.4 Format dimension with unit suffix (e.g., "10ft", "3.5m")
- [ ] 8.5 Add height labels for rooms with non-default height
- [ ] 8.6 Add/remove annotations when showDimensions toggle changes
- [ ] 8.7 Update labels when lengthUnit changes

## 9. Floor Summary Display
- [ ] 9.1 Create HTML overlay panel for floor summary
- [ ] 9.2 Compute floor metrics (room count, net area, bounding box, efficiency)
- [ ] 9.3 Position summary panel for each floor (or use fixed overlay)
- [ ] 9.4 Update summary when floor visibility or exploded view changes
- [ ] 9.5 Add/remove panel when showFloorSummary toggle changes

## 10. UI Reorganization
- [ ] 10.1 Redesign controls panel with collapsible sections
- [ ] 10.2 Group controls: Camera, Lighting, View, Annotations, Export
- [ ] 10.3 Add annotation toggles: Show Areas, Show Dimensions, Show Floor Summary
- [ ] 10.4 Add unit dropdowns: Area Unit (sqft/sqm), Length Unit (ft/m)
- [ ] 10.5 Add section headers with collapse/expand toggle
- [ ] 10.6 Style improvements for better visual hierarchy

