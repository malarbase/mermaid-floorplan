# Project Forking Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Fork Button Visibility
- **WHEN** user views public project (not owned by them)
- **THEN** "Fork" button is visible

### 2. Fork Creation
- **WHEN** user clicks "Fork"
- **THEN** copy is created in user's account
- **AND** user is redirected to their fork

### 3. Fork Attribution
- **WHEN** user views forked project
- **THEN** "Forked from @owner/project" attribution is visible

### 4. Fork Denial
- **WHEN** user attempts to fork inaccessible project
- **THEN** action is denied with appropriate error

## Expected Selectors
- `role=button[name=/fork/i]` - Fork button
- `text=/forked from/i` - Attribution text

## Notes
- Requires public project from another user
- Fork creates independent copy
