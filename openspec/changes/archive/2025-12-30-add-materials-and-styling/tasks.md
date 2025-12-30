## 1. Grammar Extension
- [x] 1.1 Add `StyleBlock` rule to `floorplans.langium` (after DefineStatement, before ConfigBlock)
- [x] 1.2 Add `StyleProperty` rule with union of property keys (floor_color, wall_color, etc.)
- [x] 1.3 Add `STYLE_KEY` terminal for property names
- [x] 1.4 Add optional `('style' styleRef=ID)?` clause to `Room` rule
- [x] 1.5 Add `'default_style'` to `CONFIG_KEY` enum
- [x] 1.6 Run `npm run langium:generate` and verify AST types generated correctly

## 2. Validation
- [x] 2.1 Add style reference validation in `floorplans-validator.ts` (check styleRef exists)
- [x] 2.2 Add hex color format validation (pattern: `^#[0-9A-Fa-f]{6}$`)
- [x] 2.3 Add numeric range validation for roughness/metalness (0.0 - 1.0)
- [x] 2.4 Add duplicate style name detection
- [x] 2.5 Add default_style reference validation
- [x] 2.6 Add tests in `language/test/` for all validation errors

## 3. JSON Export
- [x] 3.1 Update `JsonFloorplan` type in `viewer/src/types.ts` to include `styles` array
- [x] 3.2 Update `JsonRoom` type to include optional `style?: string` field
- [x] 3.3 Update `scripts/export-json.ts` to serialize style definitions
- [x] 3.4 Update export to include resolved style reference per room
- [x] 3.5 Test export with styled floorplan, verify JSON structure

## 4. SVG Renderer Updates
- [x] 4.1 Add style lookup function in `src/renderer.ts`
- [x] 4.2 Apply `floor_color` to room polygon fill attribute
- [x] 4.3 Apply `wall_color` to wall stroke attribute
- [x] 4.4 Add fallback chain: room style → default_style → hardcoded defaults
- [x] 4.5 Test SVG output with styled rooms

## 5. 3D Viewer Updates
- [x] 5.1 Update `MaterialFactory` in `viewer/src/materials.ts` to accept style config parameter
- [x] 5.2 Implement color-based material creation from hex strings
- [x] 5.3 Implement texture loading with `THREE.TextureLoader`
- [x] 5.4 Apply PBR properties (roughness, metalness) to materials
- [x] 5.5 Add texture load error handling with color fallback
- [x] 5.6 Update `main.ts` to pass resolved style to MaterialFactory per room
- [x] 5.7 Cache loaded textures to avoid duplicate loads

## 6. Documentation & Testing
- [x] 6.1 Add parser tests for style syntax in `language/test/`
- [x] 6.2 Add rendering tests for style color application
- [x] 6.3 Update DSL Reference section in `openspec/project.md`
- [x] 6.4 Create example styled floorplan in `trial/` directory
- [x] 6.5 Update README with style feature documentation

## Dependencies
- Tasks 2.x depend on 1.x (need grammar before validation)
- Tasks 3.x depend on 1.x (need grammar for export)
- Tasks 4.x depend on 1.x and 3.x (need grammar and JSON format)
- Tasks 5.x depend on 3.x (need JSON export format)
- Tasks 6.x can partially run in parallel with implementation
