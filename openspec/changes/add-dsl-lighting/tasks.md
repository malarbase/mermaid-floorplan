## 1. DSL Grammar
- [ ] 1.1 Add `light` statement to Langium grammar
- [ ] 1.2 Define light types: `directional`, `point`, `spot`, `ambient`
- [ ] 1.3 Add position syntax (absolute coordinates and room-relative percentages)
- [ ] 1.4 Add property syntax: color, intensity, distance, angle, height, target
- [ ] 1.5 Add room reference for `in RoomName` syntax
- [ ] 1.6 Run Langium generation to create AST types

## 2. DSL Validation
- [ ] 2.1 Validate light type is one of the allowed values
- [ ] 2.2 Validate room references exist for room-relative lights
- [ ] 2.3 Validate property value ranges (intensity 0-10, angle 0-90)
- [ ] 2.4 Add warning for spot lights without explicit target

## 3. JSON Export
- [ ] 3.1 Add `JsonLight` interface to `viewer/src/types.ts`
- [ ] 3.2 Add `lights: JsonLight[]` to `JsonExport` interface
- [ ] 3.3 Update renderer to include lights in JSON output
- [ ] 3.4 Resolve room-relative positions to absolute coordinates in export

## 4. Viewer Light Creation
- [ ] 4.1 Parse `lights` array from JSON export in viewer
- [ ] 4.2 Create factory function for each light type (directional, point, spot, ambient)
- [ ] 4.3 Apply color, intensity, distance, angle properties
- [ ] 4.4 Set up shadow casting for supported light types
- [ ] 4.5 Calculate spot light target direction

## 5. Default Lighting
- [ ] 5.1 Detect when no lights are defined
- [ ] 5.2 Preserve existing default lighting as fallback
- [ ] 5.3 Skip default lights when user defines custom lighting

## 6. Light Helpers (Optional)
- [ ] 6.1 Add DirectionalLightHelper for directional lights
- [ ] 6.2 Add SpotLightHelper for spot lights
- [ ] 6.3 Add PointLightHelper (small sphere mesh) for point lights
- [ ] 6.4 Add toggle in UI to show/hide light helpers

## 7. Config Integration
- [ ] 7.1 Add `ambient_intensity` to config block grammar
- [ ] 7.2 Add `shadows` and `shadow_quality` config options
- [ ] 7.3 Apply config values to viewer shadow settings

