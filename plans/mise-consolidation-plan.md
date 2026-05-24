# Mise Task Consolidation Plan — Env Parity

## Current Problems

### 1. Fragmented Namespaces (7 top-level groups)
```
core:*      — 7 tasks (install, build, clean, dev, test, langium, langium-watch)
export:*    — 6 tasks (images, svg, png, annotated, json, dxf)
3d:*        — 2 tasks (export, perspective)
ws:*        — 10 tasks (viewer-dev/build, editor-dev/build, app-dev/build/start/test, mcp-build/server)
docker:*    — 12 tasks (build, up, down, logs, shell, clean, dev, restart, reset-deps, convex-deploy, convex-backfill, convex-admin-key)
admin:*     — 11 tasks (setup, dev, dev-all, status, test, reset, cli, config, setup-domain, sync-env, deploy-check, help)
util:*      — 3 tasks (rebuild, watch, setup-mock-auth)
```
**Total: 51 tasks across 7 namespaces.**

### 2. Redundancy
- `core:dev` and `ws:app-dev` both start the app dev server
- `admin:dev` and `admin:dev-all` overlap in purpose
- `admin:config` and `admin:cli config show` do similar things
- `docker:up` and `admin:dev-all` both start services

### 3. No Environment Parity
Tasks don't indicate which environment they target:
- `admin:dev` → local dev only
- `admin:setup` → local dev only
- `docker:convex-deploy` → Docker/local only
- No prod equivalents for many tasks

### 4. Inconsistent Naming
- Some use verbs (`core:build`), some use nouns (`export:images`)
- `3d:export` vs `export:images` (3D is also an export)
- `ws:app-dev` vs `admin:dev` (both start the app)

---

## Proposed Consolidated Hierarchy

Reduce from **7 namespaces → 6 namespaces** with env-aware tasks.

```
dev:*       — Local development workflow
build:*     — Build & compilation
export:*    — Rendering & export (consolidated 3D into here)
test:*      — Testing (all test types)
docker:*    — Docker operations (kept separate — 12 tasks, clear scope)
ops:*       — Operations: deployment, admin, config
```

### dev:* — Development Workflow

| Current Task(s) | New Task | Description | Env |
|-----------------|----------|-------------|-----|
| `core:dev`, `ws:app-dev` | `dev:start` | Start app dev server (auto-detects backend) | local |
| `admin:dev-all` | *(merged into dev:start)* | | |
| `ws:viewer-dev` | `dev:viewer` | Start 3D viewer dev server | local |
| `ws:editor-dev` | `dev:editor` | Start interactive editor dev server | local |
| `core:langium-watch`, `util:watch` | `dev:watch` | Watch Langium + dev server | local |
| `admin:status` | `dev:status` | Show local env health | local |
| `admin:setup` | `dev:configure` | Configure local dev env | local |

**`dev:start` auto-detects backend:**
- Checks if Convex is running at configured URL
- If not, starts it (Docker for self-hosted, `npx convex dev` for cloud)
- Then starts frontend

### build:* — Build & Compilation

| Current Task(s) | New Task | Description | Env |
|-----------------|----------|-------------|-----|
| `core:install` | `build:install` | Install dependencies | all |
| `core:langium` | `build:langium` | Generate Langium artifacts | all |
| `core:build` | `build:all` | Build all packages | all |
| `ws:viewer-build` | `build:viewer` | Build 3D viewer | all |
| `ws:editor-build` | `build:editor` | Build interactive editor | all |
| `ws:app-build` | `build:app` | Build floorplan-app | all |
| `ws:mcp-build` | `build:mcp` | Build MCP server | all |
| `core:clean` | `build:clean` | Clean build artifacts | all |
| `util:rebuild` | `build:rebuild` | Full clean + build + images | all |

### export:* — Rendering & Export

| Current Task(s) | New Task | Description | Env |
|-----------------|----------|-------------|-----|
| `export:images` | `export:all` | SVG + PNG + 3D all floors | all |
| `export:svg` | `export:svg` | SVG only | all |
| `export:png` | `export:png` | PNG only | all |
| `export:annotated` | `export:annotated` | With all annotations | all |
| `export:json` | `export:json` | Export to JSON | all |
| `export:dxf` | `export:dxf` | Export to DXF | all |
| `3d:export` | `export:3d` | 3D PNG isometric | all |
| `3d:perspective` | `export:3d --projection=perspective` | 3D PNG perspective | all |

### test:* — Testing

| Current Task(s) | New Task | Description | Env |
|-----------------|----------|-------------|-----|
| `core:test` | `test:unit` | Run unit tests | all |
| `ws:app-test` | `test:app` | Run app tests | all |
| `admin:test` | `test:e2e` | Run Playwright E2E tests | all |

### docker:* — Docker Operations (kept separate)

| Current Task(s) | New Task | Description | Env |
|-----------------|----------|-------------|-----|
| `docker:up` | `docker:up` | Start Docker services | local |
| `docker:down` | `docker:down` | Stop Docker services | local |
| `docker:logs` | `docker:logs` | View Docker logs | local |
| `docker:shell` | `docker:shell` | Open shell in app container | local |
| `docker:clean` | `docker:clean` | Remove containers/volumes | local |
| `docker:restart` | `docker:restart` | Restart Docker services | local |
| `docker:reset-deps` | `docker:reset-deps` | Reset node_modules volumes | local |
| `docker:convex-deploy` | `docker:convex-deploy` | Deploy Convex to Docker | local |
| `docker:convex-backfill` | `docker:convex-backfill` | Run Convex backfill | local |
| `docker:convex-admin-key` | `docker:convex-admin-key` | Print Convex admin key | local |

### ops:* — Operations (Deployment, Admin, Config)

| Current Task(s) | New Task | Description | Env |
|-----------------|----------|-------------|-----|
| `admin:reset` | `ops:reset` | Reset admin state | all |
| `admin:cli` | `ops:cli` | Run admin CLI | all |
| `admin:config` | `ops:config show` | Show configuration | all |
| `admin:setup-domain` | `ops:config setup-domain` | Interactive domain setup | prod |
| `admin:sync-env` | `ops:config sync-env` | Sync env vars to Convex | prod |
| `admin:deploy-check` | `ops:deploy check` | Pre-deploy checklist | prod |
| `admin:help` | `ops:help` | Show help | all |
| `util:setup-mock-auth` | `ops:mock-auth` | Setup mock authentication | local |

---

## Env Parity Design

### `.mise-env` Context File

Create a `.mise-env` file (gitignored) that sets the active environment:

```bash
# .mise-env
MISE_ENV=dev
```

Tasks read this file to determine which environment to operate on. This makes the active env transparent and explicit.

### How it works

```bash
# Set your environment
$ echo "MISE_ENV=dev" > .mise-env

# All ops tasks now target dev
$ mise run ops:config show
# Shows dev config with inheritance

$ mise run ops:deploy check
# Validates dev config (warns about localhost, etc.)

# Switch to prod
$ echo "MISE_ENV=prod" > .mise-env

$ mise run ops:config show
# Shows prod config

$ mise run ops:deploy check
# Validates prod config (checks https, no localhost, etc.)
```

### Task implementation

Tasks source `.mise-env` at the start:

```bash
# In each ops task
if [ -f .mise-env ]; then
    source .mise-env
fi
MISE_ENV="${MISE_ENV:-dev}"
```

The `admin-cli` already supports `--env=dev|prod|shared`, so ops tasks can delegate:

```bash
# ops:config show
npx tsx scripts/admin-cli.ts config show --env="$MISE_ENV"

# ops:deploy check
npx tsx scripts/admin-cli.ts config validate --env="$MISE_ENV"
```

---

## Implementation Phases

### Phase 1: Create new tasks alongside old ones (backward compatible)
- Add new consolidated tasks
- Mark old tasks as deprecated in descriptions
- Update `ops:help` to show new task names

### Phase 2: Update documentation
- `README.md` — new task examples
- `AGENTS.md` — update agent rules
- `docs/ADMIN-CLI.md` — new ops:* commands

### Phase 3: Remove deprecated tasks (after 2-week transition)
- Delete old task definitions from `mise.toml`

---

## Task Count Comparison

| Namespace | Before | After |
|-----------|--------|-------|
| core | 7 | 0 (merged) |
| export | 6 | 7 (+3D consolidated) |
| 3d | 2 | 0 (merged) |
| ws | 10 | 0 (merged) |
| docker | 12 | 10 (unchanged) |
| admin | 11 | 0 (merged) |
| util | 3 | 0 (merged) |
| **dev** | — | **6** |
| **build** | — | **9** |
| **export** | — | **7** |
| **test** | — | **3** |
| **docker** | — | **10** |
| **ops** | — | **8** |
| **Total** | **51** | **43** |

**Net reduction: 8 tasks (16% fewer)**
**Namespaces: 7 → 6**

---

## Open Questions (Resolved)

1. **Keep `docker:*` separate?** ✅ Yes — 12 tasks, clear scope, well-understood namespace.
2. **`dev:start` auto-detect backend?** ✅ Yes — checks if Convex running, starts if not.
3. **Env context file?** ✅ `.mise-env` — transparent, explicit, gitignored.
4. **Backward compatibility period?** ✅ 2 weeks with deprecated task warnings.
