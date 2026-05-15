## ADDED Requirements

### Requirement: Unified Tool Version Management via mise
The project SHALL use mise as the single source of truth for runtime and package manager versions, replacing nvm, asdf, and Volta configuration.

#### Scenario: Node version from mise.toml
- **GIVEN** a developer clones the repository
- **WHEN** they run `mise install`
- **THEN** Node 22.17.0 and npm 10.8.2 are installed automatically
- **AND** no `.nvmrc`, `.tool-versions`, or `package.json#volta` configuration exists

#### Scenario: Conflicting version files removed
- **GIVEN** the repository previously contained `.nvmrc` (Node 20) and `.tool-versions` (Node 22.17.0)
- **WHEN** the migration is complete
- **THEN** both files are deleted
- **AND** `mise.toml` is the only tool-version source

### Requirement: Task Runner Migration from Make to mise
The project SHALL define all development, build, export, Docker, and admin tasks in `mise.toml`, with the Makefile retained as a deprecated compatibility shim.

#### Scenario: Running core build via mise
- **GIVEN** a developer wants to build all packages
- **WHEN** they run `mise run core:build`
- **THEN** Langium generation runs first (dependency)
- **AND** `npm run build` executes successfully

#### Scenario: Makefile shim delegates to mise
- **GIVEN** a developer runs `make build`
- **WHEN** the Makefile executes
- **THEN** a deprecation warning is printed
- **AND** the command delegates to `mise run core:build`

#### Scenario: Docker tasks in mise
- **GIVEN** a developer wants to start Docker services
- **WHEN** they run `mise run docker:up`
- **THEN** `docker compose up -d` executes
- **AND** the previous `make docker-up` target is no longer the primary interface

### Requirement: Admin CLI for Deployment Management
The project SHALL provide a local TypeScript CLI for administrators to manage deployment configuration, DNS, environment variables, and platform operations.

#### Scenario: Running admin CLI config command
- **GIVEN** an administrator wants to set the production domain
- **WHEN** they run `npx tsx scripts/admin-cli.ts config set-domain example.com`
- **THEN** the domain is validated
- **AND** all relevant `.env` files are updated

#### Scenario: Admin CLI env sync to Convex
- **GIVEN** an administrator has updated `.env.production`
- **WHEN** they run `npx tsx scripts/admin-cli.ts env sync-to-convex`
- **THEN** environment variables are pushed to the Convex cloud deployment

#### Scenario: Admin CLI DNS setup wizard
- **GIVEN** an administrator wants to configure a custom domain
- **WHEN** they run `npx tsx scripts/admin-cli.ts dns setup`
- **THEN** interactive prompts guide them through provider selection and record creation

## MODIFIED Requirements

### Requirement: Auth Subsystem Debug Output
The SolidStart app auth initialization and dev-login flows SHALL NOT emit verbose debug logs to the browser console.

#### Scenario: ConvexProvider without debug noise
- **GIVEN** the app initializes the Convex client in development mode
- **WHEN** auth state changes or tokens are fetched
- **THEN** no `[ConvexProvider]`, `[MOCK MODE]`, or `Connecting to Convex` logs appear
- **AND** actual errors are still logged via `console.error`

#### Scenario: Dev login without step logs
- **GIVEN** a developer uses the multi-persona dev login page
- **WHEN** they click a persona button
- **THEN** no `[dev-login] Step N:` progress logs appear
- **AND** login failures are still reported via `console.error`
