# Consolidate Shared UI Components

## Why

The `interactive-editor` app has ~900 lines of inline CSS in `index.html` that duplicates styles from `viewer-core/src/ui/styles.ts`. This causes:
- Bug fixes needing to be applied twice (viewer and interactive-editor)
- Style drift between the two apps over time
- Inconsistent class naming (`floor-item` vs `fp-floor-item`)
- Maintenance burden when adding new UI features

## What Changes

- **BREAKING**: Interactive-editor will require `viewer-core` for all shared UI components
- Migrate inline CSS from `interactive-editor/index.html` to `viewer-core/src/ui/styles.ts`
- Update `interactive-editor/src/main.ts` to use `fp-*` prefixed class names
- Create shared UI builder functions in `viewer-core` for common components
- Remove duplicated CSS from `interactive-editor/index.html`

## Impact

- Affected specs: `interactive-editor`, `3d-viewer`
- Affected code:
  - `interactive-editor/index.html` - Remove ~900 lines of duplicated CSS
  - `interactive-editor/src/main.ts` - Use shared class names and components
  - `viewer-core/src/ui/styles.ts` - Consolidate all shared styles
  - `viewer-core/src/ui/` - Add new shared UI builder functions

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| CSS duplication | ~900 lines | 0 lines |
| Bug fix locations | 2 places | 1 place |
| Theme consistency | Inconsistent | Guaranteed |
| New feature effort | Double work | Single implementation |

## Migration Strategy

1. **Phase 1**: Quick wins - Update class names in `main.ts` to use existing shared styles
2. **Phase 2**: Progressive migration - Move CSS sections one component at a time
3. **Phase 3**: Shared components - Create reusable UI builder functions
4. **Phase 4**: Cleanup - Remove remaining inline CSS from `index.html`
