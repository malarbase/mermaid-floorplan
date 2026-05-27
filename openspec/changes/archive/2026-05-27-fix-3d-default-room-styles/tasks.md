## 1. Fix floor-geometry style resolution

- [x] 1.1 Add `defaultStyle?: string` to `FloorSlabOptions` interface
- [x] 1.2 Replace `styleMap.get(room.name)` with `styleMap.get(room.style ?? defaultStyle ?? '')` in `generateFloorSlabs`
- [x] 1.3 Update `generateRoomFloorSlab` call sites to pass the resolved `roomStyle`

## 2. Fix wall-geometry style resolution

- [x] 2.1 Add `defaultStyle?: string` to `WallGeneratorOptions` interface
- [x] 2.2 Replace `styleMap.get(room.name)` with `styleMap.get(room.style ?? defaultStyle ?? '')` in `generateFloorWalls`

## 3. Wire config through scene builder

- [x] 3.1 Pass `config.default_style` as `defaultStyle` in `buildFloorplanSceneFromNormalized` floor-slab generation

## 4. Add regression test

- [x] 4.1 Add `should apply floor colors to floor slab meshes` test to `scene-builder.test.ts`

## 5. Update design critic for styles

- [x] 5.1 Thread `styles` parameter through `buildSingleFloorContext` and `buildCriticContext`
- [x] 5.2 Import and merge `aestheticRules` in `_critic_lib.mjs`
- [x] 5.3 Update SKILL.md to document style/theme requirements for aesthetic validation

## 6. Verify

- [x] 6.1 `npm test` in `floorplan-3d-core` passes
