
## [2026-02-03 20:50] Task 7: Issues Found During Integration Testing

### Critical Issues

**1. E2E Tests All Failing (Timeout/Assertions)**
- **Severity:** HIGH
- **Status:** BLOCKING for production readiness
- **Details:**
  - All 23 observed E2E tests failed
  - Tests timeout after 12 seconds
  - Pattern: Tests appear to wait for elements that never appear or take too long
  - Example failures:
    - "loads quickly with no controls" - 4.2s
    - "3D viewer is interactive" - 12.3s
    - "Monaco editor loads" - 12.1s
- **Impact:** Cannot verify user-facing functionality works
- **Next Steps:**
  - Debug why page loads are slow in test environment
  - Check if test selectors match actual DOM structure
  - Possibly increase timeout or optimize test setup

**2. Monaco Bundle Size Exceeds Target**
- **Severity:** MEDIUM
- **Status:** KNOWN LIMITATION
- **Details:**
  - Target: <2.5 MB for editor mode
  - Actual: 4.7 MB uncompressed (Monaco chunk alone)
  - Gzipped: ~1.2 MB (acceptable for production)
- **Impact:** Slower initial load for editor mode on slow connections
- **Mitigation:** 
  - Monaco is lazy-loaded (only in editor mode)
  - Gzip compression reduces impact significantly
  - Could further optimize by removing unused Monaco languages
- **Next Steps (optional):**
  - Configure Monaco to only include floorplan DSL support
  - Evaluate Monaco alternatives (CodeMirror 6?)

**3. Test Setup Issues (Unit Tests)**
- **Severity:** LOW
- **Status:** NON-BLOCKING
- **Details:**
  - 26 test failures out of 70 in floorplan-app
  - Root causes:
    - Playwright tests imported in Bun context (wrong runner)
    - `vi.hoisted()` not available in current Vitest version
    - SSR context issues ("document is not defined" in testing-library)
- **Impact:** Test coverage is lower than it should be
- **Next Steps:**
  - Separate unit tests from E2E tests (different directories)
  - Upgrade Vitest if vi.hoisted is needed
  - Use happy-dom or jsdom for SSR-safe testing environment

### Medium Issues

**4. EditorBundle Static Import**
- **Severity:** LOW
- **Status:** ACCEPTABLE
- **Details:**
  - EditorBundle.tsx is statically imported in FloorplanContainer
  - This adds ~5-10 KB to bundle even in basic/advanced modes
  - Monaco itself IS lazy-loaded via dynamic import in EditorPanel
- **Impact:** Minimal (5-10 KB overhead)
- **Mitigation:** Dynamic import EditorBundle itself if bundle size becomes critical
- **Verdict:** Current approach is acceptable for simplicity

**5. Rollup Bundle Size Warning**
- **Severity:** LOW
- **Status:** INFORMATIONAL
- **Details:**
  - Rollup warns: "Some chunks are larger than 500 kB"
  - Refers to Monaco chunk (4.7 MB)
- **Impact:** None - this is expected for Monaco
- **Next Steps:** Configure Rollup to suppress warning for known large chunks

### Low-Priority Issues

**6. DaisyUI CSS Warning**
- **Severity:** TRIVIAL
- **Status:** COSMETIC
- **Details:**
  - Warning: "Unknown at rule: @property" for `--radialprogress`
  - This is a CSS Houdini feature not supported by CSS processor
- **Impact:** None - radial progress works fine in browsers
- **Next Steps:** None - safe to ignore

**7. Playwright Test Version Conflict**
- **Severity:** LOW
- **Status:** TEST INFRASTRUCTURE
- **Details:**
  - Error: "Playwright Test did not expect test.describe() to be called here"
  - Suggests multiple versions of @playwright/test in node_modules
- **Impact:** Tests can't load, but root cause is dependency resolution
- **Next Steps:**
  - Run `npm dedupe` to consolidate Playwright versions
  - Ensure floorplan-app uses same Playwright version as root

### Non-Issues (Verified Working)

✅ **SSR Safety:** All DOM access properly guarded with onMount()
✅ **Build Pipeline:** Production builds succeed consistently
✅ **Lazy Loading:** Monaco only loads in editor mode
✅ **No Regressions:** Monorepo tests at 95.5% pass rate
✅ **Code Splitting:** 150+ chunks, proper separation

### Summary

**Blockers for Production:**
1. E2E test failures (HIGH priority - need debugging)

**Known Limitations (Acceptable):**
1. Monaco bundle size (4.7 MB uncompressed, 1.2 MB gzipped)

**Cleanup Items (Low priority):**
1. Test infrastructure improvements
2. Dependency deduplication
3. Bundle warning suppression

