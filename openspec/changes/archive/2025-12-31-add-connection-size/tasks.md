## 1. Grammar Changes

- [x] 1.1 Add `size` attribute to `Connection` rule using `ConnectionSize` type
- [x] 1.2 Add `full` keyword support for height via `fullHeight` boolean
- [x] 1.3 Add `door_size` and `window_size` to `CONFIG_KEY`
- [x] 1.4 Extend `ConfigProperty` to accept `Dimension` values
- [x] 1.5 Run `langium generate` and verify generated AST types

## 2. Variable Resolution

- [x] 2.1 Update `variable-resolver.ts` to parse `door_size` and `window_size` from config
- [x] 2.2 Add fallback logic: `door_size` → `door_width`/`door_height` → defaults
- [x] 2.3 Resolve `full` height keyword in 3D viewer (uses room height)

## 3. JSON Export

- [x] 3.1 Add `width` and `height` fields to `JsonConnection` interface
- [x] 3.2 Add `fullHeight` boolean to `JsonConnection` for `full` keyword
- [x] 3.3 Update `json-converter.ts` to export connection size
- [x] 3.4 Update viewer `types.ts` to match

## 4. SVG Rendering

- [x] 4.1 Update `connection.ts` to respect connection-level size
- [x] 4.2 Handle `fullHeight` - SVG is 2D, no height representation needed
- [x] 4.3 Door arc rendering uses connection width if specified

## 5. 3D Viewer

- [x] 5.1 Update `wall-generator.ts` to use connection size for hole dimensions
- [x] 5.2 Handle `fullHeight` by using room height instead of door height
- [x] 5.3 Door mesh sizing inherited from hole dimensions

## 6. Validation

- [x] 6.1 Add validation: size width should be less than wall length
- [x] 6.2 Add validation: size height should be less than room height
- [x] 6.3 Warn if both `door_size` and `door_width`/`door_height` specified

## 7. Testing

- [x] 7.1 Add parser tests for new `size` syntax (6 tests)
- [x] 7.2 Add json-converter tests for size export (4 tests)
- [x] 7.3 Add rendering tests - existing tests pass
- [x] 7.4 Add validation tests for size constraints (10 tests)

## 8. Documentation

- [x] 8.1 Update `openspec/project.md` with connection size syntax
- [x] 8.2 Add examples to trial floorplans demonstrating size feature

