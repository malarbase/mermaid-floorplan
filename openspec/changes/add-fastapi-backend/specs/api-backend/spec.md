# API Backend Capability

The api-backend capability provides a server-side API service for the mermaid-floorplan project, supporting health monitoring and authentication flows.

## ADDED Requirements

### Requirement: Health Check Endpoint

The backend SHALL provide a health check endpoint for monitoring service availability.

#### Scenario: Health check returns OK status

- **GIVEN** the API service is running
- **WHEN** a client sends GET /health
- **THEN** the response status SHALL be 200
- **AND** the response body SHALL contain `{"status": "ok"}`
- **AND** the response body SHALL include a version field

#### Scenario: Health check includes environment info

- **GIVEN** the API service is running
- **WHEN** a client sends GET /health
- **THEN** the response body SHALL include an environment field (e.g., "production", "development")

### Requirement: CORS Configuration

The backend SHALL implement CORS to allow browser-based frontend access.

#### Scenario: Allowed origin receives CORS headers

- **GIVEN** a request from an allowed origin (e.g., https://langalex.github.io)
- **WHEN** the browser sends a preflight OPTIONS request
- **THEN** the response SHALL include Access-Control-Allow-Origin header matching the origin
- **AND** the response SHALL include Access-Control-Allow-Credentials: true

#### Scenario: Disallowed origin blocked

- **GIVEN** a request from an unknown origin
- **WHEN** the browser sends a request
- **THEN** the CORS headers SHALL NOT permit the request
- **AND** the browser SHALL block the response

#### Scenario: Localhost allowed for development

- **GIVEN** a request from http://localhost:5173
- **WHEN** the browser sends a request
- **THEN** the response SHALL include appropriate CORS headers

### Requirement: Auth Status Endpoint

The backend SHALL provide an endpoint to check current authentication status.

#### Scenario: Unauthenticated request returns false

- **GIVEN** a client without a valid session cookie
- **WHEN** the client sends GET /auth/status
- **THEN** the response SHALL contain `{"authenticated": false}`

#### Scenario: Authenticated request returns user info

- **GIVEN** a client with a valid session cookie
- **WHEN** the client sends GET /auth/status
- **THEN** the response SHALL contain `{"authenticated": true, "user": {...}}`
- **AND** the user object SHALL include email and name fields

### Requirement: Login Endpoint (Stub)

The backend SHALL provide a login endpoint that simulates authentication flow for development.

#### Scenario: Login with redirect

- **GIVEN** a client sends GET /auth/login?redirect=https://example.com/callback
- **WHEN** the request is processed
- **THEN** the response SHALL be a 302 redirect to the provided redirect URL
- **AND** a session cookie SHALL be set with mock user data

#### Scenario: Login without redirect uses default

- **GIVEN** a client sends GET /auth/login without redirect parameter
- **WHEN** the request is processed
- **THEN** the response SHALL redirect to a default URL (e.g., the root)

### Requirement: Logout Endpoint

The backend SHALL provide a logout endpoint to clear authentication state.

#### Scenario: Logout clears session

- **GIVEN** a client with a valid session cookie
- **WHEN** the client sends POST /auth/logout
- **THEN** the session cookie SHALL be cleared
- **AND** the response SHALL be 200 with `{"success": true}`

#### Scenario: Logout without session succeeds

- **GIVEN** a client without a session cookie
- **WHEN** the client sends POST /auth/logout
- **THEN** the response SHALL be 200 with `{"success": true}`

### Requirement: Secure Session Cookies

The backend SHALL use secure cookie settings to protect session data.

#### Scenario: Cookie has secure attributes

- **GIVEN** the API is deployed to production
- **WHEN** a session cookie is set
- **THEN** the cookie SHALL have HttpOnly=true
- **AND** the cookie SHALL have Secure=true (HTTPS only)
- **AND** the cookie SHALL have SameSite=Lax

### Requirement: Wasmer Edge Deployment

The backend SHALL be deployable to Wasmer Edge via CLI.

#### Scenario: Deployment configuration valid

- **GIVEN** a valid wasmer.toml configuration
- **WHEN** running `wasmer deploy`
- **THEN** the application SHALL be deployed to Wasmer Edge
- **AND** the health endpoint SHALL be accessible at the deployed URL

#### Scenario: ASGI application exposed correctly

- **GIVEN** the main.py file
- **WHEN** Wasmer Edge loads the application
- **THEN** the ASGI app SHALL be accessible as `main:app`

### Requirement: Automated CI/CD Deployment

The backend SHALL automatically deploy when changes are merged to master.

#### Scenario: Push to master triggers deployment

- **GIVEN** a GitHub Actions workflow configured with wasmerio/setup-wasmer
- **WHEN** changes to api-backend/** are pushed to master branch
- **THEN** the workflow SHALL run `wasmer deploy`
- **AND** the deployment SHALL use WASMER_TOKEN secret for authentication

#### Scenario: Non-backend changes skip deployment

- **GIVEN** changes are pushed that don't affect api-backend/**
- **WHEN** the push is to master branch
- **THEN** the API deployment workflow SHALL NOT run
