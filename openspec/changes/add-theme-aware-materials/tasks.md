## 1. Material Factory Updates

- [ ] 1.1 Add `ViewerTheme` import to `materials.ts`
- [ ] 1.2 Add theme parameter to `createFloorMaterial(style?, theme?)`
- [ ] 1.3 Add theme parameter to `createWallMaterial(style?, theme?)`
- [ ] 1.4 Add theme parameter to `createDoorMaterial(style?, theme?)`
- [ ] 1.5 Add theme parameter to `createWindowMaterial(style?, theme?)`
- [ ] 1.6 Use `getThemeColors(theme)` as default when no style provided

## 2. Wall Generator Updates

- [ ] 2.1 Pass current theme to MaterialFactory calls
- [ ] 2.2 Store theme reference for material regeneration
- [ ] 2.3 Add `updateTheme(theme)` method to regenerate materials

## 3. Main Viewer Integration

- [ ] 3.1 Call material regeneration in `applyTheme()`
- [ ] 3.2 Track which rooms have explicit styles vs theme defaults
- [ ] 3.3 Only regenerate materials for non-styled rooms

## 4. Testing

- [ ] 4.1 Verify dark theme applies dark floor/wall colors
- [ ] 4.2 Verify blueprint theme applies blue palette
- [ ] 4.3 Verify rooms with explicit styles are unchanged
- [ ] 4.4 Verify theme toggle updates materials dynamically

