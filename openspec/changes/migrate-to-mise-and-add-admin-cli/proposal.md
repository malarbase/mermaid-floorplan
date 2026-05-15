## Why

The project had fragmented tool-version management (`.nvmrc` = 20, `.tool-versions` = 22.17.0, `package.json#volta` = 20.19.2) and a large Makefile with 50+ targets that was hard to maintain. At the same time, there was no unified CLI for administrators to manage deployment configuration, DNS, environment variables, and platform operations. This change unifies tool management under mise, migrates tasks from Make to mise, introduces an admin CLI, and cleans up auth debug logging left over from earlier development.

## What Changes

### 1. mise Migration

- **Added `mise.toml`** with Node 22.17.0 + npm 10.8.2 as the single source of truth for tool versions.
- **Deleted `.nvmrc` and `.tool-versions`** to eliminate conflicting version sources.
- **Removed `package.json#volta`** section.
- **Converted `Makefile` to a compatibility shim** that delegates to `mise run <task>` and prints a deprecation warning.
- **Updated all documentation** (`README.md`, `AGENTS.md`, `docs/*.md`) to reference `mise run <task>` instead of `make <target>`.

### 2. Admin CLI

- **Added `scripts/admin-cli.ts`** — entry point using Commander.js.
- **Added `scripts/admin-cli/` module**:
  - `commands/config.ts` — set-domain, set-super-admin, show, validate
  - `commands/env.ts` — update-production, sync-to-convex
  - `commands/dns.ts` — setup, verify
  - `commands/admin.ts` — promote, ban, list-users, stats
  - `commands/deploy.ts` — check, verify
  - `lib/env-file.ts`, `convex-cli.ts`, `validators.ts`, `prompts.ts`, `colors.ts` — shared utilities
- **Added `plans/admin-cli-plan.md`** — implementation plan and command reference.

### 3. Auth Debug Log Cleanup

- **Removed verbose `console.log` statements** from `floorplan-app/src/components/ConvexProvider.tsx` (mock mode, token presence, auth state, safety timeout, storage change logs).
- **Removed step-by-step `[dev-login]` logs** from `floorplan-app/src/routes/dev-login.tsx` and cleaned up unused `signUpRes` / `signInRes` variables.
- **Preserved `console.error`** for actual failure paths.

### 4. Speclife Upgrade

- **Bumped `@speclife/cli` and `@speclife/core`** from `^0.14.0` to `^0.15.0` in `package.json` and `package-lock.json`.
- **Added `@speclife/core`** as an explicit dependency (was previously transitive only).

## Capabilities

### New Capabilities
- `admin-cli` — Local CLI for deployment config, DNS, env sync, and admin operations.
- `mise-task-runner` — Unified task runner replacing Makefile targets.

### Modified Capabilities
- `tooling`: Tool version management now uses mise instead of nvm/asdf/volta.
- `solidstart-app`: Auth initialization no longer emits verbose debug logs.

## Impact

- **Files**: `mise.toml` (new), `.nvmrc` (deleted), `.tool-versions` (deleted), `Makefile`, `package.json`, `package-lock.json`, `README.md`, `AGENTS.md`, `docs/*.md`, `floorplan-app/src/components/ConvexProvider.tsx`, `floorplan-app/src/routes/dev-login.tsx`, `scripts/admin-cli.ts` (new), `scripts/admin-cli/**` (new), `plans/admin-cli-plan.md` (new).
- **APIs**: No external API changes.
- **Dependencies**: Added `@speclife/core`, `@inquirer/prompts`, `chalk`, `commander` to root devDependencies. Removed `volta` config.
- **Risk**: Low — Makefile shim preserves backward compatibility; admin CLI is additive; debug log removal is non-breaking.
