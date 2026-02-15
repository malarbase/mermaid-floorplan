# Version Management Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Version URL Structure
- **WHEN** user visits a version URL
- **THEN** URL follows pattern `/u/{username}/{project}/v/{version}`
- **AND** content loads correctly

### 2. Version Switcher
- **WHEN** user is on project page
- **THEN** version switcher controls are accessible

### 3. Version Creation
- **WHEN** user creates a new version
- **THEN** version is saved with correct name
- **AND** URL updates to new version

## Expected URL Patterns
- `/u/[\w-]+/[\w-]+/v/[\w-]+` - Version URL pattern

## Notes
- Requires existing project for full testing
- Version switcher may be in header or sidebar
