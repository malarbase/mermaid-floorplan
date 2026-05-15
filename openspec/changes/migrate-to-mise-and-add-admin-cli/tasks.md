## 1. mise Tool Unification

- [x] 1.1 Create `mise.toml` with `[tools] node = "22.17.0"`, `npm = "10.8.2"`
- [x] 1.2 Add all core, export, 3D, workspace, Docker, admin, and utility tasks to `mise.toml`
- [x] 1.3 Add default `[env]` variables (FLOORPLAN_FILE, OUTPUT_DIR, SCALE, etc.)
- [x] 1.4 Delete `.nvmrc`
- [x] 1.5 Delete `.tool-versions`
- [x] 1.6 Remove `volta` section from root `package.json`

## 2. Makefile Compatibility Shim

- [x] 2.1 Rewrite `Makefile` header with deprecation warning and `$(warning ...)`
- [x] 2.2 Replace all target bodies with `mise run <task>` delegation
- [x] 2.3 Add new targets for editor, app, and docker tasks that map to mise

## 3. Documentation Updates

- [x] 3.1 Update `README.md` to reference `mise` instead of `make`
- [x] 3.2 Update `AGENTS.md` build/test commands to use `mise run`
- [x] 3.3 Update `docs/DOCKER.md` commands (`make docker-up` → `mise run docker:up`)
- [x] 3.4 Update `docs/CONVEX-SETUP.md` commands
- [x] 3.5 Update `docs/CONVEX-INTEGRATION-COMPLETE.md` commands
- [x] 3.6 Update `docs/ENV-GUIDE.md`, `docs/ENV-MIGRATION-SUMMARY.md`, `docs/QUICKSTART.md`, `docs/TESTING-RESULTS.md`

## 4. Admin CLI Implementation

- [x] 4.1 Create `scripts/admin-cli.ts` entry point with Commander.js
- [x] 4.2 Create `scripts/admin-cli/types.ts`
- [x] 4.3 Create `scripts/admin-cli/lib/colors.ts`, `prompts.ts`, `validators.ts`
- [x] 4.4 Create `scripts/admin-cli/lib/env-file.ts` for read/write with comments preserved
- [x] 4.5 Create `scripts/admin-cli/lib/convex-cli.ts` wrapper for `npx convex env set`
- [x] 4.6 Create `scripts/admin-cli/lib/credentials.ts`, `dns-api.ts`, `google-cloud-api.ts`, `vercel-api.ts`
- [x] 4.7 Create `scripts/admin-cli/commands/config.ts`
- [x] 4.8 Create `scripts/admin-cli/commands/env.ts`
- [x] 4.9 Create `scripts/admin-cli/commands/dns.ts`
- [x] 4.10 Create `scripts/admin-cli/commands/admin.ts`
- [x] 4.11 Create `scripts/admin-cli/commands/deploy.ts`
- [x] 4.12 Create `plans/admin-cli-plan.md`

## 5. Auth Debug Log Cleanup

- [x] 5.1 Remove `[MOCK MODE]` and `[ConvexProvider]` debug logs from `ConvexProvider.tsx`
- [x] 5.2 Remove `[dev-login]` step-by-step logs from `dev-login.tsx`
- [x] 5.3 Remove unused `signUpRes` / `signInRes` variables from `dev-login.tsx`
- [x] 5.4 Preserve `console.error` for failure paths

## 6. Speclife Upgrade

- [x] 6.1 Bump `@speclife/cli` from `^0.14.0` to `^0.15.0` in `package.json`
- [x] 6.2 Bump `@speclife/core` from `^0.14.0` to `^0.15.0` in `package.json`
- [x] 6.3 Add `@speclife/core` as explicit dependency
- [x] 6.4 Update `package-lock.json` to resolve 0.15.0 tarballs
- [x] 6.5 Install globally to update `~/.local/share/mise/installs/node/22.17.0/bin/speclife`

## 7. Verify

- [x] 7.1 `npm run build` from repo root succeeds
- [x] 7.2 `speclife --version` reports `0.15.0`
- [x] 7.3 `mise tasks` lists all expected tasks
- [x] 7.4 No remaining `[dev-login]` or `[ConvexProvider]` debug logs
