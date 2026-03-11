## 1. Shared Origin Resolution Utility

- [x] 1.1 Create `floorplan-app/convex/lib/auth-origin.ts` with `resolveAuthOrigin(request, siteUrl, allowedOrigins)` that returns `{ baseURL, trustedOrigins, validOrigin }`
- [x] 1.2 Implement explicit hostname matching: parse `ALLOWED_ORIGINS` env var as comma-separated list of hostnames/patterns (e.g. `floorplan-*.vercel.app`), match with glob-style prefix check, always allow `localhost` and `127.0.0.1`
- [x] 1.3 Default to `SITE_URL` only (no dynamic origins) when `ALLOWED_ORIGINS` is unset — removes the unsafe `.vercel.app` / `.convex.site` suffix defaults

## 2. Harden `createAuth()` in `convex/auth.ts`

- [x] 2.1 Replace inline origin extraction with call to `resolveAuthOrigin()`
- [x] 2.2 Wrap `user.create.after` hook's `(ctx as any).runMutation(internal.users.syncUser, ...)` in try/catch
- [x] 2.3 Wrap `user.update.after` hook's `(ctx as any).runMutation(internal.users.syncUser, ...)` in try/catch
- [x] 2.4 Wrap `session.create.after` hook's `runQuery` + `runMutation` calls in try/catch

## 3. Harden `authHandler` in `convex/http.ts`

- [x] 3.1 Replace inline origin extraction with call to `resolveAuthOrigin()`
- [x] 3.2 Remove duplicated origin/host derivation logic — use `baseURL` from the shared utility directly

## 4. Fix SolidStart Proxy Handler

- [x] 4.1 In `convex-better-auth-solid-start/src/handler.ts`, stop forwarding client-supplied `x-forwarded-host` — derive from the server's known hostname instead
- [x] 4.2 Set `x-custom-forwarded-host` to the server-derived hostname (from `SITE_URL`, `VERCEL_URL`, or `requestUrl.host` as last resort)

## 5. Clean Up Auth Proxy Route

- [x] 5.1 Remove `console.log` debug statements from `floorplan-app/src/routes/api/auth/[...all].ts`
- [x] 5.2 Remove unused `readFileSync`, `existsSync`, `join` imports from `[...all].ts`

## 6. Conditional Convex Query in `useSession()`

- [x] 6.1 In `floorplan-app/src/lib/auth-client.ts`, add `enabled` option to `useQuery(api.users.getCurrentUser)` — only enable when BetterAuth session exists or dev mode is logged in
- [x] 6.2 Verify that `isPending` logic still works correctly when the query is disabled (should report `isPending: false` for unauthenticated visitors)

## 7. Add `returns` Validators

- [x] 7.1 Add `returns` validator to `syncUser` internalMutation in `convex/users.ts`
- [x] 7.2 Add `returns` validator to `getExistingByAuthId` internalQuery in `convex/users.ts`

## 8. Verify

- [x] 8.1 Build succeeds: `npm run build` from repo root
- [ ] 8.2 Manual test: dev login via mock auth still works
- [ ] 8.3 Manual test: request with spoofed `x-forwarded-host` header falls back to `SITE_URL`
