# Add FastAPI Backend Service with Wasmer Edge Deployment

## Why

The mermaid-floorplan project currently has a frontend-only architecture with authentication stubs (see `FloorplanApp.requestEditMode()` in `floorplan-viewer-core/src/floorplan-app.ts:600-612`). The `onAuthRequired` callback exists but has no real backend to authenticate against.

As the project expands to support:
- Cloud-based floorplan storage
- Real user authentication with social login (Google, GitHub)
- User preferences and settings
- Collaboration features

A backend service is required. This proposal bootstraps a minimal FastAPI backend that:
1. Establishes the API project structure
2. Sets up Wasmer Edge deployment (serverless edge hosting)
3. Creates CI/CD pipeline for automatic deployment on merge to master
4. Provides foundation for OIDC/OAuth integration in a future proposal

The related `add-solidjs-ui-framework` proposal establishes the frontend UI patterns for authentication state management. This backend proposal provides the server-side component to complete the auth flow.

## What Changes

### New Package: `floorplan-api/`

- Create new `floorplan-api/` directory at workspace root (follows `floorplan-*` naming convention)
- FastAPI application with health check endpoint
- Wasmer Edge configuration (`wasmer.toml`)
- Python project configuration (`pyproject.toml`, `requirements.txt`)
- CORS middleware configured for frontend origins
- Session stub (cookie-based, no real auth yet)
- Basic test suite

### GitHub Actions Deployment

- Add `.github/workflows/deploy-api.yml` workflow
- Uses `wasmerio/setup-wasmer@v3` action
- Triggers on push to master (changes to `floorplan-api/`)
- Deploys to Wasmer Edge automatically

### Endpoints (Phase 1 - Bootstrap)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check for uptime monitoring |
| `/auth/status` | GET | Stub: returns mock auth status |
| `/auth/login` | GET | Stub: redirects to mock auth flow |
| `/auth/logout` | POST | Stub: clears session cookie |

### Future Endpoints (Phase 2 - Not This Proposal)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login/google` | GET | Initiates Google OAuth flow |
| `/auth/callback/google` | GET | Handles OAuth callback |
| `/auth/me` | GET | Returns authenticated user info |

## Impact

### Affected Specs
- None directly (new capability)
- Future: `interactive-editor` spec's "Auth-Gated Edit Mode" requirement will use this backend

### Affected Code
- No changes to existing code in this proposal
- Future: `floorplan-viewer-core/src/floorplan-app.ts` will integrate with backend auth

### New Files
```
floorplan-api/
├── src/
│   ├── main.py           # FastAPI entry point
│   ├── config.py         # Environment config
│   └── routes/
│       ├── health.py     # Health check
│       └── auth.py       # Auth stubs
├── tests/
│   └── test_health.py
├── wasmer.toml           # Wasmer Edge config
├── pyproject.toml
├── requirements.txt
└── README.md

.github/workflows/deploy-api.yml
```

### Dependencies (New Package Only)
```
fastapi>=0.109.0
uvicorn>=0.27.0
python-multipart>=0.0.9
starlette>=0.35.0
httpx>=0.26.0  # For testing
pytest>=8.0.0
```

### Breaking Changes
**None.** This is purely additive:
- New package doesn't affect existing workspaces
- Frontend can continue working without backend
- Backend integration is opt-in

## Non-Goals (This Phase)

- Real OAuth/OIDC implementation (future proposal)
- Database integration
- User data persistence
- Frontend integration changes
- Protected API endpoints

## Success Criteria

1. `floorplan-api/` package created with FastAPI app
2. `GET /health` returns 200 OK with status info
3. GitHub Action successfully deploys to Wasmer Edge on merge
4. CORS allows requests from `langalex.github.io` and `localhost`
5. Auth stub endpoints return mock responses

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wasmer Edge Python limitations | Medium | Tested FastAPI starter template works |
| Cold start latency | Low | Wasmer Edge designed for low latency |
| Deployment token exposure | High | Use GitHub secrets, never commit token |
| CORS misconfiguration | Medium | Explicit allowlist, test in CI |

## Dependencies on Other Work

- **None for this proposal** (standalone bootstrap)
- **Future:** Frontend integration depends on `add-solidjs-ui-framework` for reactive auth state

## References

- [Research document](./research.md) with detailed technical analysis
- [Wasmer FastAPI Starter](https://wasmer.io/templates/fastapi-starter)
- [wasmerio/setup-wasmer Action](https://github.com/wasmerio/setup-wasmer)
- [floorplan-app.ts:600-612](../../floorplan-viewer-core/src/floorplan-app.ts) - Auth callback pattern
- [add-solidjs-ui-framework](../add-solidjs-ui-framework/proposal.md) - Related frontend proposal
