# Manual Testing Requirements

This document outlines manual testing that requires human interaction and cannot be fully automated.

## Performance Testing (Interactive)

### Selection Performance
**Target**: < 50ms response time

**Test Procedure**:
1. Open the interactive editor with a floorplan containing 30-50 rooms
2. Enable performance monitoring: `localStorage.setItem('perf-enabled', 'true')`
3. Reload the page
4. Test click selection on various rooms
5. Test marquee selection over 10+ rooms
6. Test Shift+click multi-selection
7. Check browser console for performance timing logs
8. Verify all operations complete within 50ms

**Tools**: Browser DevTools Performance tab, console logs

### Editor Sync Performance
**Target**: < 200ms debounced response

**Test Procedure**:
1. Open the interactive editor with the editor panel visible
2. Enable performance monitoring
3. Move cursor through the DSL code
4. Observe 3D highlighting response time
5. Verify debouncing behavior (highlights shouldn't flicker)
6. Check console for timing logs

**Tools**: Browser DevTools Performance tab

### Memory Profiling

**Test Procedure**:
1. Open the interactive editor
2. Open Browser DevTools → Memory tab
3. Take heap snapshot (baseline)
4. Perform 50+ edit operations (add rooms, modify properties, delete rooms)
5. Take another heap snapshot
6. Check for memory leaks (detached DOM nodes, retained objects)
7. Force garbage collection and verify memory returns to baseline

**Tools**: Chrome DevTools Memory Profiler

## Accessibility Testing (Screen Readers)

### VoiceOver Testing (macOS)

**Test Procedure**:
1. Enable VoiceOver: `Cmd+F5`
2. Navigate to the interactive editor
3. Test keyboard navigation through all controls
4. Verify ARIA labels are announced correctly
5. Test focus management (Tab navigation)
6. Verify state changes are announced (aria-live regions)
7. Test modal dialogs (Add Room, Delete Confirm)
8. Ensure focus returns correctly after modal close

**Expected Results**:
- All buttons announce their purpose
- Form controls announce their labels and values
- State changes are announced (e.g., "Room selected")
- Modal dialogs trap focus correctly
- Close buttons are accessible

### NVDA Testing (Windows)

**Test Procedure** (if Windows available):
1. Enable NVDA
2. Navigate to the interactive editor
3. Perform same tests as VoiceOver above
4. Document any NVDA-specific issues

### High Contrast Mode

**Test Procedure**:
1. **macOS**: System Settings → Accessibility → Display → Increase Contrast
2. **Windows**: Settings → Accessibility → High Contrast
3. Open the interactive editor
4. Verify all UI elements remain visible
5. Check focus indicators are clearly visible
6. Verify button states are distinguishable

**Expected Results**:
- All text remains readable
- Focus indicators have high contrast borders
- Button hover states are visible
- Modal dialogs have clear borders

## DXF Export Validation

### LibreCAD Testing

**Test Procedure**:
1. Export a floorplan to DXF using `make export-dxf`
2. Open the DXF file in LibreCAD
3. Verify file opens without errors
4. Check layer structure (WALLS, DOORS, WINDOWS, ROOMS, LABELS)
5. Test layer toggle (show/hide each layer)
6. Verify room labels are readable
7. Check wall geometry is correct
8. Verify door and window positions

**Test Files**:
- `examples/StairsAndLifts-GroundFloor.dxf`
- `examples/RelativePositioning.dxf`

### AutoCAD Testing (if available)

**Test Procedure**:
Same as LibreCAD above, but in AutoCAD.

### Illustrator Testing (if available)

**Test Procedure**:
1. Open DXF file in Adobe Illustrator
2. Verify layers import correctly
3. Check that geometry is editable
4. Verify text labels are editable

## Test Results Checklist

- [ ] Selection performance < 50ms (logged in console)
- [ ] Editor sync < 200ms (logged in console)
- [ ] No memory leaks detected
- [ ] VoiceOver announces all controls correctly
- [ ] NVDA testing complete (or N/A if no Windows)
- [ ] High contrast mode passes
- [ ] DXF files open in LibreCAD without errors
- [ ] DXF layers toggle correctly
- [ ] AutoCAD testing complete (or N/A if not available)

## Automated Testing

The following performance tests are automated in `performance.test.ts`:

- ✅ Parse performance for 10-100 room floorplans (< 500ms target)
- ✅ Unit tests for DXF export
- ✅ TypeScript compilation
- ✅ All existing unit/integration tests

## Notes

- **Selection/Sync Performance**: Requires interactive browser testing with user actions
- **Screen Reader Testing**: Requires actual screen reader software (VoiceOver/NVDA)
- **Memory Profiling**: Requires manual heap snapshot analysis
- **DXF Validation**: Requires CAD software (LibreCAD is free and open source)
