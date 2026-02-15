# E2E Test Infrastructure - Issues

## [2026-02-03] Failing E2E Tests (3/25)

### Test 1: Advanced Mode › lighting controls work
**Status**: ❌ Failing  
**Severity**: Low (visual issue only)

**Error**:
```
Element found but has visibility: hidden
Locator: input[type="range"]#light-azimuth
```

**Root Cause**: Lighting control input exists in DOM but CSS visibility set to hidden

**Fix Needed**: 
- Check `.fp-control-section` CSS for Lighting section
- Verify input rendering logic in ControlPanels component
- May be intentionally hidden until feature enabled

**Workaround**: Skip test or change assertion to check element exists (not visible)

---

### Test 2: Advanced Mode › export functionality accessible
**Status**: ❌ Failing  
**Severity**: Medium (feature gap)

**Error**:
```
Element not found
Locator: .fp-control-section with text "Export"
```

**Root Cause**: Export section not implemented in control panel

**Fix Needed**:
- Add Export section to ControlPanels component
- Include PNG, SVG, 3D export buttons
- Or update test to match actual implementation (command palette?)

**Alternative**: Export may be in command palette, not control panel

---

### Test 3: Editor Mode › EditorBundle includes all editor components
**Status**: ❌ Failing  
**Severity**: Medium (feature gap)

**Error**:
```
Expected selection controls count > 0
Received: 0
```

**Root Cause**: Selection controls (add/delete/copy/focus buttons) not rendered

**Fix Needed**:
- Verify EditorBundle component structure
- Check if selection controls require room selection first
- Add `[data-component="selection-controls"]` attributes if missing

**Possible Issue**: Controls may only appear when rooms selected, test needs setup step

---

## General Issues

### Three.js Load Time
- **Impact**: All tests need 15s timeout minimum
- **Cause**: Three.js bundle + WebGL initialization
- **Status**: Expected behavior, not a bug
- **Recommendation**: Consider lazy-loading Three.js or showing progress indicator

### Dev Server Stability
- **Symptom**: Occasional HMR disconnect
- **Workaround**: Restart dev server if tests hang
- **Frequency**: Rare (1 in 10 test runs)
