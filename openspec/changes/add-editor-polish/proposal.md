# Proposal: Add Editor Polish (Performance & Documentation)

## Why

The interactive editor's core features are complete, but several polish items remain:
- No formal performance benchmarks to ensure responsiveness targets are met
- Accessibility hasn't been audited with screen readers
- README doesn't document the new editor features
- Properties panel lacks tooltips for complex controls

These items are important for production readiness but were deferred during core implementation.

## What Changes

### Performance Validation

1. **Benchmark Suite**
   - Selection response time (target: < 50ms)
   - Editor-to-3D sync (target: < 200ms debounced)
   - Full reparse time (target: < 500ms for < 50 rooms)
   - Memory usage under load

2. **Performance Monitoring**
   - Add optional performance timing logs
   - Identify and optimize any bottlenecks found

### Accessibility Audit

1. **Screen Reader Testing**
   - Test with VoiceOver (macOS)
   - Test with NVDA (Windows, if available)
   - Verify ARIA labels are announced correctly

2. **Accessibility Fixes**
   - Address any issues found during testing
   - Ensure focus management works correctly
   - Verify high contrast mode support

### Documentation

1. **README Updates**
   - Document interactive editor features
   - Add usage examples
   - Document keyboard shortcuts

2. **UI Tooltips**
   - Add tooltips to properties panel controls
   - Add tooltips to toolbar buttons
   - Ensure tooltips are accessible

## Impact

### Affected Specs

| Spec | Impact |
|------|--------|
| `interactive-editor` | Non-functional requirements validation |

### Affected Code

| Package | Changes |
|---------|---------|
| `interactive-editor/` | Minor UI enhancements, performance logging |
| `README.md` | Documentation updates |

### Dependencies

No new dependencies.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance issues found | Medium | Medium | Budget time for optimization |
| Accessibility issues found | Medium | Medium | Budget time for fixes |
| Documentation scope creep | Low | Low | Keep docs minimal and focused |

## Timeline Estimate

- **Performance Benchmarks**: 0.5 weeks
- **Accessibility Audit**: 0.5 weeks
- **Documentation**: 0.5 weeks
- **Total**: 1.5 weeks

## Related Work

- Performance targets in `add-interactive-editor/specs/interactive-editor/spec.md`
- Existing ARIA labels in `interactive-editor/index.html`
- Main README.md

