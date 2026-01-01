## 1. Material Factory Updates

- [x] 1.1 Add `ViewerTheme` import to `materials.ts`
- [x] 1.2 Add theme parameter to `createFloorMaterial(style?, theme?)`
- [x] 1.3 Add theme parameter to `createWallMaterial(style?, theme?)`
- [x] 1.4 Add theme parameter to `createDoorMaterial(style?, theme?)`
- [x] 1.5 Add theme parameter to `createWindowMaterial(style?, theme?)`
- [x] 1.6 Use `getThemeColors(theme)` as default when no style provided

## 2. Wall Generator Updates

- [x] 2.1 Pass current theme to MaterialFactory calls
- [x] 2.2 Store theme reference for material regeneration
- [x] 2.3 Add `setTheme(theme)` method to update theme

## 3. Main Viewer Integration

- [x] 3.1 Call material regeneration in `applyTheme()`
- [x] 3.2 Track which rooms have explicit styles vs theme defaults
- [x] 3.3 Only regenerate materials for non-styled rooms

## 4. Testing

- [x] 4.1 Verify dark theme applies dark floor/wall colors
- [x] 4.2 Verify blueprint theme applies blue palette
- [x] 4.3 Verify rooms with explicit styles are unchanged
- [x] 4.4 Verify theme toggle updates materials dynamically

