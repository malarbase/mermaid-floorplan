# Snapshot Permalinks Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Snapshot URL Structure
- **WHEN** user visits a snapshot URL
- **THEN** URL follows pattern `/u/{username}/{project}/s/{hash}`
- **AND** immutable content loads

### 2. Permalink Copy
- **WHEN** user clicks copy permalink button
- **THEN** URL is copied to clipboard

### 3. Snapshot Immutability
- **WHEN** project is edited after snapshot
- **AND** user visits snapshot URL
- **THEN** original content is displayed (not edited content)

## Expected URL Patterns
- `/u/[\w-]+/[\w-]+/s/[\w]+` - Snapshot URL pattern

## Expected Selectors
- `role=button[name=/copy|share|permalink/i]` - Copy button

## Notes
- Snapshots are immutable point-in-time captures
- Testing immutability requires real project data
