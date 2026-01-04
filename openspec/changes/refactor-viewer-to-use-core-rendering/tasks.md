## 1. Enhance Core Door Rendering

- [ ] 1.1 Port hinge position calculation from `DoorRenderer` to `connection-geometry.ts`
- [ ] 1.2 Port swing rotation calculation from `DoorRenderer` to `connection-geometry.ts`
- [ ] 1.3 Add support for `swing` direction parameter in `generateConnection()`
- [ ] 1.4 Add support for `opensInto` parameter in `generateConnection()`
- [ ] 1.5 Add tests for hinge positioning and swing rotation

## 2. Update Viewer to Use Core Door Rendering

- [ ] 2.1 Update `wall-generator.ts` to use core's `generateConnection()` for doors
- [ ] 2.2 Remove `DoorRenderer` class usage from `wall-generator.ts`
- [ ] 2.3 Delete `viewer/src/door-renderer.ts`
- [ ] 2.4 Delete `viewer/test/door-renderer.test.ts` (tests move to core)
- [ ] 2.5 Verify door rendering in viewer matches previous behavior

## 3. Simplify Wall Generator

- [ ] 3.1 Refactor `WallBuilder` to expose segment generation API
- [ ] 3.2 Update `WallGenerator` to use `WallBuilder` for segment calculation
- [ ] 3.3 Keep CSG operations local to viewer (browser-specific)
- [ ] 3.4 Verify wall rendering matches previous behavior

## 4. Testing and Validation

- [ ] 4.1 Run full test suite
- [ ] 4.2 Generate 3D images for all examples
- [ ] 4.3 Visual comparison of before/after renders
- [ ] 4.4 Test door swing directions in viewer

