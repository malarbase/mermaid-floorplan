## Context

The `feat/add-bsl-1.1-license` branch added dynamic origin handling to support Vercel preview deployments. Auth requests flow: **Browser → SolidStart proxy (`[...all].ts`) → Convex HTTP action (`http.ts`) → BetterAuth (`auth.ts`)**. At each hop, the request's origin/host is read from headers and used to configure BetterAuth's `baseURL` and `trustedOrigins`. The current implementation trusts any hostname ending in `.vercel.app` or `.convex.site`, and forwards client-supplied `x-forwarded-host` headers without validation.

The branch also added BetterAuth database hooks that call `internal.users.syncUser` via `(ctx as any).runMutation` — an unsafe cast with no error handling.

## Goals / Non-Goals

**Goals:**
- Prevent origin spoofing by restricting which hostnames are trusted for auth redirects
- Prevent header injection by validating forwarded-host headers at the proxy boundary
- Make database hook failures non-fatal so auth operations (login, signup) succeed even if app-level sync fails
- Remove production debug logging and dead code
- Deduplicate the origin resolution logic between `auth.ts` and `http.ts`
- Add missing `returns` validators to new Convex functions
- Avoid unnecessary Convex query subscriptions for unauthenticated visitors

**Non-Goals:**
- Changing the auth architecture (BetterAuth inside Convex stays)
- Adding new auth features (social providers, MFA, etc.)
- Modifying the Docker/entrypoint secret handling (low risk in dev-only context)

## Decisions

### D1: Explicit hostname allowlist instead of suffix matching

Replace `ALLOWED_ORIGIN_SUFFIXES` (`.vercel.app`, `.convex.site`) with `ALLOWED_ORIGINS` — an env var containing a comma-separated list of full hostnames or prefix patterns.

**Pattern**: `floorplan-*.vercel.app` (project-specific wildcard) plus the exact production domain.

**Why not suffix matching**: Any attacker can deploy to `evil.vercel.app` and it would pass `.vercel.app` suffix check. A project-prefix pattern (`floorplan-*`) limits exposure to your Vercel team's deployments only.

**Alternatives considered**:
- *Exact hostname list only*: Too brittle for Vercel previews (new subdomain per commit). Rejected.
- *Keep suffix matching but add blocklist*: Defense-in-depth is worse than offense-elimination. Rejected.

### D2: Strip and re-derive forwarded-host at the proxy boundary

In `handler.ts`, instead of forwarding the client-supplied `x-forwarded-host`, derive the forwarded host from the SolidStart server's own request URL (`event.request.url` or the server-known hostname). Only set `x-custom-forwarded-host` to a validated value.

**Why**: The SolidStart server knows its own hostname (from `SITE_URL` or `VERCEL_URL`). There's no need to trust the client's `x-forwarded-host` — the proxy already knows where it is.

**Alternatives considered**:
- *Validate client header against allowlist before forwarding*: Still trusts client data when the server already knows the answer. Rejected — unnecessary complexity.

### D3: Extract `resolveAuthOrigin()` shared utility

Move the origin/host extraction logic from `auth.ts` into a standalone function (`resolveAuthOrigin(request, siteUrl, allowedOrigins)`) that returns `{ baseURL, trustedOrigins }`. Both `auth.ts` and `http.ts` call this single function.

**Why**: The current duplication means any security fix must be applied in two places. A single function eliminates that risk.

### D4: Try/catch around database hook calls

Wrap each `(ctx as any).runMutation(internal.users.syncUser, ...)` call in a try/catch. On failure, log a warning but allow the auth operation to complete. The user sync will happen on next login via the `session.create.after` hook.

**Why not fail the whole hook**: User creation/login is more important than the app-level sync. The sync is an optimization (pre-populate the users table), not a correctness requirement.

### D5: Conditional `useQuery` in `useSession()`

Only enable the `useQuery(api.users.getCurrentUser)` subscription when there's evidence of authentication — either a BetterAuth session exists (`rs.data?.user`) or dev mode is active (`devLoggedIn()`).

**Why**: Every unauthenticated visitor currently opens a Convex subscription that returns `null`. This is wasted load.

## Risks / Trade-offs

- **D1: Vercel preview URLs need configuration** → The `ALLOWED_ORIGINS` env var must be set in Convex environment for previews to work. Mitigation: default pattern includes `floorplan-*.vercel.app` so no action needed for standard deployments.
- **D4: Silent sync failures** → If the sync consistently fails, users will have stale app-level profiles. Mitigation: the `session.create.after` hook retries sync on every login, and the `useSession()` hook overlays Convex user data on top of BetterAuth session data.
- **D2: Localhost dev still works** → `localhost` and `127.0.0.1` remain hardcoded as allowed in the origin check. No change needed for local development.
