## Why

The `feat/add-bsl-1.1-license` branch introduces dynamic origin handling, BetterAuth database hooks, and Vercel preview environment support. A security review identified several vulnerabilities — the most critical being an open-redirect / token-theft vector via permissive origin suffix matching and unvalidated `x-forwarded-host` headers. These must be resolved before merging to main.

## What Changes

### Security fixes (blocking)

- **Restrict origin allowlist**: Replace broad domain-suffix matching (`.vercel.app`, `.convex.site`) with an explicit allowlist of project-specific hostnames, preventing attacker-controlled Vercel deployments from being trusted as auth origins.
- **Validate forwarded-host headers at the proxy boundary**: Strip or validate `x-forwarded-host` / `x-custom-forwarded-host` in the SolidStart proxy handler before forwarding to Convex, so client-supplied headers cannot influence `baseURL` or `trustedOrigins`.
- **Add error handling around `(ctx as any)` database hook calls**: Wrap `runMutation` / `runQuery` calls in BetterAuth database hooks with try/catch so that sync failures don't break user creation or login.

### Code quality fixes

- **Remove production debug logging**: Delete `console.log` statements in `[...all].ts` that leak internal infrastructure URLs (`CONVEX_SITE_URL`, `CONVEX_URL`, `CWD`) at module load time.
- **Remove dead imports**: Clean up unused `readFileSync`, `existsSync`, `join` imports from `[...all].ts`.
- **Extract shared origin resolution**: Deduplicate the origin/host extraction logic between `convex/auth.ts` and `convex/http.ts` into a single utility function.
- **Guard `useSession()` Convex query**: Only enable the `useQuery(api.users.getCurrentUser)` subscription when the user is authenticated, avoiding unnecessary Convex query load for unauthenticated visitors.
- **Add `returns` validators**: Add explicit `returns` validators to `syncUser`, `getExistingByAuthId`, and other Convex functions missing them, per Convex best practices.

## Capabilities

### New Capabilities

_(none — this is a hardening change, no new user-facing capabilities)_

### Modified Capabilities

- `solidstart-app`: Auth origin validation, proxy header handling, and database hook error resilience are behavioral changes to the existing auth subsystem.

## Impact

- **Files**: `convex/auth.ts`, `convex/http.ts`, `convex/users.ts`, `convex-better-auth-solid-start/src/handler.ts`, `floorplan-app/src/routes/api/auth/[...all].ts`, `floorplan-app/src/lib/auth-client.ts`
- **APIs**: No external API changes. Internal auth origin resolution becomes stricter, which could reject requests from previously-accepted (but unsafe) origins.
- **Dependencies**: None added or removed.
- **Risk**: Low — all changes are defensive. The origin restriction is the only behavior change that could impact legitimate users (Vercel preview URLs). Mitigation: use a project-specific Vercel prefix pattern.
