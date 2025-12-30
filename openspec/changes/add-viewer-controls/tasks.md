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

## 6. UI Reorganization
- [ ] 6.1 Redesign controls panel with collapsible sections
- [ ] 6.2 Group controls: Camera, Lighting, View, Export
- [ ] 6.3 Add section headers with collapse/expand toggle
- [ ] 6.4 Style improvements for better visual hierarchy

