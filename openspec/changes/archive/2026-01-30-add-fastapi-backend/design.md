# Design: FastAPI Backend Service Architecture

## Context

The mermaid-floorplan project needs a backend service to support authentication and future cloud features. The service must:

1. Deploy to edge infrastructure for low latency globally
2. Support Python for rapid development
3. Integrate with OAuth2/OIDC providers (Google first)
4. Work with the existing `onAuthRequired` callback pattern in the frontend

### Key Constraints

1. **Edge Deployment**: Must work on Wasmer Edge (WASI-based Python runtime)
2. **Minimal Infrastructure**: No self-managed servers, prefer serverless
3. **Cost Effective**: Free tier suitable for initial development
4. **CORS Compatible**: Must work with browser-based frontend
5. **Gradual Rollout**: Backend optional until fully integrated

### Stakeholders

- **Users**: Need seamless authentication experience
- **Developers**: Need simple deployment and testing workflow
- **Embedders**: Backend should be optional (existing deployments continue working)

## Goals / Non-Goals

### Goals

- Create minimal FastAPI application structure
- Configure Wasmer Edge deployment with `wasmer.toml`
- Set up GitHub Actions for automated deployment
- Establish CORS and session patterns
- Provide foundation for OAuth integration

### Non-Goals

- Implementing real OAuth/OIDC (separate proposal)
- Database integration (separate proposal)
- User data storage (separate proposal)
- Changing frontend code (separate integration proposal)
- Custom domain setup (manual configuration later)

## Decisions

### Decision 1: Wasmer Edge over Alternatives

**Choice:** Wasmer Edge

**Rationale:**
- Free tier suitable for development
- Python/FastAPI support via WASI
- Global edge deployment (low latency)
- Simple deployment workflow (`wasmer deploy`)
- No server management required

**Alternatives Considered:**

| Platform | Pros | Cons | Verdict |
|----------|------|------|---------|
| Wasmer Edge | Free tier, WASI Python, simple | Newer platform, fewer docs | ✅ Chosen |
| Cloudflare Workers | Mature, great DX | Python not native (requires workarounds) | ❌ |
| AWS Lambda | Battle-tested | Complex setup, cold starts | ❌ |
| Railway | Easy deployment | No free tier anymore | ❌ |
| Fly.io | Docker-based, flexible | More complex than needed | ❌ |

### Decision 2: FastAPI over Flask/Django

**Choice:** FastAPI

**Rationale:**
- ASGI-native (works with Wasmer Edge)
- Async-first design for edge functions
- Auto-generated OpenAPI docs
- Excellent Python type hints support
- Strong OAuth library ecosystem (Authlib)

**Alternatives Considered:**

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| FastAPI | Async, OpenAPI, ASGI | Slightly newer | ✅ Chosen |
| Flask | Well-known, simple | WSGI (needs adapter for edge) | ❌ |
| Django | Full-featured | Too heavy for API service | ❌ |
| Starlette | Minimal, ASGI | Less batteries included | ❌ |

### Decision 3: Cookie-Based Sessions

**Choice:** HTTP-only secure cookies for session management

**Rationale:**
- Works automatically with browser CORS requests
- No token management needed on frontend
- Secure when properly configured (SameSite, Secure, HttpOnly)
- Simpler than JWT refresh token flows

**Configuration:**
```python
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    same_site="lax",
    https_only=True  # Wasmer Edge provides HTTPS
)
```

**Alternatives Considered:**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Cookies | Browser-native, simple | CORS config required | ✅ Chosen |
| JWT Bearer | Stateless, mobile-friendly | Refresh complexity | For mobile API later |
| Session DB | Revocable, auditable | Adds latency | For high-security later |

### Decision 4: Authlib for OAuth (Future)

**Choice:** Authlib library for OAuth2/OIDC implementation

**Rationale:**
- Comprehensive OAuth2 and OpenID Connect support
- Well-documented FastAPI integration
- Actively maintained
- Handles token exchange, refresh, validation

**Planned Pattern:**
```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
```

### Decision 5: Separate Package (Not Monorepo Workspace)

**Choice:** Create `floorplan-api/` as standalone directory, not npm workspace member

**Rationale:**
- Python project doesn't fit npm workspace model
- Follows `floorplan-*` naming convention for consistency
- Separate deployment lifecycle from frontend
- Independent versioning
- Clear boundary between frontend and backend

**Structure:**
```
mermaid-floorplan/
├── floorplan-api/         # Python FastAPI (this proposal)
│   ├── src/
│   ├── wasmer.toml
│   └── pyproject.toml
├── floorplan-viewer-core/ # TypeScript (existing)
├── floorplan-editor/      # TypeScript (existing)
└── package.json           # npm workspaces (unchanged)
```

## Risks / Trade-offs

### Risk 1: Wasmer Edge Platform Maturity

**Impact:** Medium
**Likelihood:** Low

**Mitigation:**
- FastAPI starter template is officially supported
- Fallback: Can migrate to other ASGI hosts (Vercel, Railway)
- Core logic is platform-agnostic

### Risk 2: CORS Complexity

**Impact:** Medium
**Likelihood:** Medium

**Mitigation:**
- Explicit allowlist in code, not wildcards
- Test CORS in CI with actual frontend origin
- Document CORS troubleshooting in README

### Risk 3: Session Security

**Impact:** High
**Likelihood:** Low (if configured correctly)

**Mitigation:**
- Use strong session secret (32+ bytes)
- Rotate secrets periodically
- HttpOnly + Secure + SameSite flags
- Short session expiry for sensitive operations

### Risk 4: Cold Start Latency

**Impact:** Low
**Likelihood:** Medium

**Mitigation:**
- Wasmer Edge is designed for low latency
- Auth endpoint called infrequently (only on login)
- Health endpoint can warm up instances

## Migration Plan

### Phase 1: Bootstrap (This Proposal)

1. Create `floorplan-api/` directory structure
2. Implement FastAPI app with health endpoint
3. Configure Wasmer Edge deployment
4. Set up GitHub Actions workflow
5. Deploy to `mermaid-floorplan-api.wasmer.app`
6. Verify health endpoint responds

**Rollback:** Delete `floorplan-api/` directory, remove workflow file

### Phase 2: OAuth Integration (Future Proposal)

1. Add Authlib dependency
2. Implement Google OAuth routes
3. Integrate session management
4. Update frontend `onAuthRequired` callback
5. Test full OAuth flow

**Rollback:** Revert auth routes, frontend continues with stub

### Phase 3: Cloud Features (Future Proposals)

1. Database integration (user preferences)
2. Floorplan cloud storage
3. Protected API endpoints
4. Collaboration features

## Open Questions

### Q1: Which Wasmer plan to use?

**Options:**
1. Free tier (suitable for development)
2. Pro tier ($20/mo for production)

**Decision:** Start with free tier, upgrade when needed.

### Q2: Custom domain?

**Options:**
1. Use `*.wasmer.app` subdomain (free)
2. Configure custom domain (e.g., `api.mermaid-floorplan.com`)

**Decision:** Defer. Use `*.wasmer.app` initially.

### Q3: Database for user data?

**Options:**
1. Supabase (Postgres, generous free tier)
2. Planetscale (MySQL, edge-optimized)
3. Upstash Redis (for sessions only)
4. None (sessions only, no persistence)

**Decision:** Defer to future proposal. Start with cookie-only sessions.

### Q4: Rate limiting?

**Options:**
1. Wasmer Edge built-in (if available)
2. Application-level with slowapi/limiter
3. External service (Cloudflare)

**Decision:** Defer. Implement when auth is live to prevent abuse.

## API Contract

### Health Check

```
GET /health
Response 200:
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "production"
}
```

### Auth Status (Stub)

```
GET /auth/status
Response 200 (not authenticated):
{
  "authenticated": false
}

Response 200 (authenticated):
{
  "authenticated": true,
  "user": {
    "email": "stub@example.com",
    "name": "Stub User"
  }
}
```

### Login (Stub)

```
GET /auth/login?redirect=<url>
Response 302: Redirects to <url> with session cookie set
```

### Logout (Stub)

```
POST /auth/logout
Response 200: Clears session cookie
{
  "success": true
}
```

## References

- [Research document](./research.md)
- [Wasmer Edge Documentation](https://documentation.wasmer.io/edge/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Authlib FastAPI Guide](https://docs.authlib.org/en/v0.14.3/client/fastapi.html)
- [add-solidjs-ui-framework](../add-solidjs-ui-framework/design.md) - Frontend auth patterns
