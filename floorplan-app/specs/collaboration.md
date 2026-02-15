# Collaboration Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Required (uses `loginAsDevUser`)

## Test Cases

### 1. Invite UI Access
- **WHEN** owner views project
- **THEN** invite/share button is accessible

### 2. Shared Projects Section
- **WHEN** user views dashboard
- **THEN** "Shared with me" section is visible (if applicable)

### 3. Collaborator Management
- **WHEN** owner invites collaborator by username
- **THEN** collaborator can access project
- **AND** project appears in collaborator's shared list

### 4. Access Revocation
- **WHEN** owner removes collaborator
- **THEN** access is revoked immediately

## Expected Selectors
- `role=button[name=/invite|share|collaborat/i]` - Invite button
- `text=/shared with me|shared projects/i` - Shared section

## Notes
- Requires multiple user accounts for full testing
- May need separate authenticated sessions
