## ADDED Requirements

### Requirement: Auth Origin Validation

The auth subsystem SHALL validate request origins against an explicit allowlist before using them as BetterAuth `baseURL` or `trustedOrigins`.

#### Scenario: Request from allowed Vercel preview origin

- **GIVEN** `ALLOWED_ORIGINS` is set to `floorplan-*.vercel.app,floorplan.example.com`
- **WHEN** an auth request arrives with origin `https://floorplan-abc123.vercel.app`
- **THEN** the system SHALL accept the origin and set `baseURL` to `https://floorplan-abc123.vercel.app`
- **AND** the origin SHALL be added to `trustedOrigins`

#### Scenario: Request from disallowed origin

- **GIVEN** `ALLOWED_ORIGINS` is set to `floorplan-*.vercel.app`
- **WHEN** an auth request arrives with origin `https://evil-attacker.vercel.app`
- **THEN** the system SHALL reject the origin
- **AND** `baseURL` SHALL fall back to `SITE_URL`
- **AND** the disallowed origin SHALL NOT be added to `trustedOrigins`

#### Scenario: Request from localhost in development

- **GIVEN** any `ALLOWED_ORIGINS` configuration
- **WHEN** an auth request arrives with origin `http://localhost:3000`
- **THEN** the system SHALL accept the origin regardless of the allowlist

#### Scenario: No ALLOWED_ORIGINS configured

- **GIVEN** `ALLOWED_ORIGINS` env var is not set
- **WHEN** an auth request arrives with any origin
- **THEN** the system SHALL fall back to `SITE_URL` as `baseURL`
- **AND** no dynamic origins SHALL be added to `trustedOrigins`

### Requirement: Forwarded Host Header Validation

The SolidStart proxy SHALL NOT forward client-supplied `x-forwarded-host` headers to Convex. It SHALL derive the forwarded host from server-known configuration.

#### Scenario: Client sends spoofed x-forwarded-host

- **GIVEN** a client sends a request with `x-forwarded-host: evil.example.com`
- **WHEN** the SolidStart proxy forwards the request to Convex
- **THEN** the `x-forwarded-host` header SHALL be set to the server's own hostname (from `SITE_URL` or `VERCEL_URL`)
- **AND** the client-supplied value SHALL be discarded

#### Scenario: Normal request without forwarded host

- **GIVEN** a client sends a request without `x-forwarded-host`
- **WHEN** the SolidStart proxy forwards the request to Convex
- **THEN** the `x-custom-forwarded-host` header SHALL be set to the server's own hostname

### Requirement: Auth Database Hook Resilience

BetterAuth database hooks that sync users to the app's internal users table SHALL NOT cause auth operations to fail if the sync encounters an error.

#### Scenario: User sync fails during signup

- **WHEN** a new user signs up via BetterAuth
- **AND** the `internal.users.syncUser` mutation throws an error
- **THEN** the user creation in BetterAuth SHALL still succeed
- **AND** the error SHALL be silently caught

#### Scenario: User sync fails during login

- **WHEN** a user logs in and the `session.create.after` hook fires
- **AND** the user lookup or sync mutation throws an error
- **THEN** the session creation SHALL still succeed

#### Scenario: User sync succeeds normally

- **WHEN** a new user signs up via BetterAuth
- **AND** the `internal.users.syncUser` mutation succeeds
- **THEN** a record SHALL be created in the `users` table with the BetterAuth user's `id`, `name`, and `image`

### Requirement: Auth Origin Resolution Utility

A single shared utility function SHALL resolve the auth origin from a request, eliminating duplicated logic between `auth.ts` and `http.ts`.

#### Scenario: Both auth.ts and http.ts use the same resolution

- **GIVEN** the origin resolution logic exists in one shared function
- **WHEN** `createAuth()` in `auth.ts` resolves the origin
- **AND** `authHandler` in `http.ts` resolves the origin
- **THEN** both SHALL produce identical results for the same request

### Requirement: No Debug Logging in Production Auth Routes

The auth proxy route SHALL NOT emit debug log statements that leak infrastructure URLs.

#### Scenario: Module loads in production

- **WHEN** the `[...all].ts` auth route module loads in production
- **THEN** no `console.log` statements SHALL execute that output `CONVEX_SITE_URL`, `CONVEX_URL`, or `CWD`

### Requirement: Conditional Convex User Query

The `useSession()` hook SHALL only subscribe to `api.users.getCurrentUser` when there is evidence of an authenticated session.

#### Scenario: Unauthenticated visitor

- **GIVEN** a visitor with no BetterAuth session and no dev mock token
- **WHEN** the `useSession()` hook evaluates
- **THEN** the `useQuery(api.users.getCurrentUser)` subscription SHALL NOT be active

#### Scenario: Authenticated user

- **GIVEN** a user with a valid BetterAuth session
- **WHEN** the `useSession()` hook evaluates
- **THEN** the `useQuery(api.users.getCurrentUser)` subscription SHALL be active
- **AND** the session data SHALL include `username` and `isAdmin` from the Convex user record

### Requirement: Convex Function Return Validators

All Convex functions introduced or modified in this change SHALL have explicit `returns` validators.

#### Scenario: syncUser has returns validator

- **GIVEN** the `syncUser` internal mutation in `users.ts`
- **WHEN** the function definition is inspected
- **THEN** it SHALL include a `returns` field with a valid Convex validator

#### Scenario: getExistingByAuthId has returns validator

- **GIVEN** the `getExistingByAuthId` internal query in `users.ts`
- **WHEN** the function definition is inspected
- **THEN** it SHALL include a `returns` field with a valid Convex validator
