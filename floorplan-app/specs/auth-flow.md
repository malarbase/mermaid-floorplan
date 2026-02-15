# Authentication Flow Test Plan

## Seed Reference
- **Seed file:** `tests/seed.spec.ts`
- **Authentication:** Uses dev-login bypass

## Test Cases

### 1. Dev Login Warning
- **WHEN** user navigates to `/dev-login`
- **THEN** a warning about "development mode" is displayed

### 2. Dev Login Flow
- **WHEN** user clicks "Login as Dev User"
- **THEN** user is redirected to `/dashboard`
- **AND** session is stored in localStorage

### 3. Protected Route Redirect
- **WHEN** unauthenticated user navigates to `/dashboard`
- **THEN** user is redirected to login OR sees unauthenticated state

### 4. Session Persistence
- **WHEN** authenticated user navigates away and returns
- **THEN** session remains active
- **AND** dashboard is accessible

## Expected Selectors
- `role=heading[name=/development login/i]` - Dev login title
- `role=button[name=/login as dev user/i]` - Login button
- `text=/development mode/i` - Warning text
