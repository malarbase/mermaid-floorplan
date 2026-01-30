# Research: FastAPI Backend Service with Wasmer Edge Deployment

## Overview

This research explores setting up a FastAPI backend service to support the mermaid-floorplan project's authentication needs, deployed on Wasmer Edge with automatic CI/CD via GitHub Actions.

## Technology Stack Analysis

### FastAPI

FastAPI is a modern, high-performance Python web framework for building APIs:

- **ASGI-based**: Works with async Python, making it suitable for Wasmer Edge's WASI runtime
- **OpenAPI/Swagger**: Auto-generates API documentation
- **Type Hints**: First-class Python type annotations for validation
- **Performance**: One of the fastest Python frameworks
- **OAuth/OIDC Support**: Works with Authlib for comprehensive OAuth2 and OpenID Connect

### Wasmer Edge

Wasmer Edge is a global edge deployment platform:

**Key Features:**
- Deploys WebAssembly applications globally with minimal latency
- Supports Python via WASI (WebAssembly System Interface)
- Provides ASGI support for FastAPI applications
- Free tier available for small projects
- Custom domains supported

**Deployment Model:**
```
wasmer.toml → defines package and dependencies
main.py → exposes ASGI app as `main:app`
wasmer deploy → packages and deploys to edge
```

**Configuration (wasmer.toml):**
```toml
[package]
name = "mermaid-floorplan-api"
version = "0.1.0"
description = "Backend API for mermaid-floorplan"

[[module]]
name = "app"
source = "main.py"

[[command]]
name = "server"
module = "app"
runner = "https://webc.org/runner/asgi"

[fs]
"/app" = "."
```

### Authentication Strategy

#### Phase 1: Stub Authentication (Bootstrap)
- Basic health check endpoints
- Cookie-based session management (stub)
- Simulated auth flow for frontend integration testing

#### Phase 2: Google OIDC Integration (Future)
Using **Authlib** library for OAuth2/OIDC:

```python
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware

oauth = OAuth()
oauth.register(
    name='google',
    client_id='YOUR_GOOGLE_CLIENT_ID',
    client_secret='YOUR_GOOGLE_CLIENT_SECRET',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
```

**Flow:**
1. Frontend calls `/auth/login/google`
2. Backend redirects to Google consent screen
3. Google redirects back to `/auth/callback/google`
4. Backend exchanges code for tokens, creates session
5. Frontend receives session cookie

### GitHub Actions Deployment

Using `wasmerio/setup-wasmer` action for CI/CD:

```yaml
name: Deploy to Wasmer Edge

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Wasmer
        uses: wasmerio/setup-wasmer@v3

      - name: Deploy to Wasmer Edge
        run: wasmer deploy
        env:
          WASMER_TOKEN: ${{ secrets.WASMER_TOKEN }}
```

**Required Secrets:**
- `WASMER_TOKEN`: API token from Wasmer dashboard

## Integration with SolidJS Frontend

The `add-solidjs-ui-framework` proposal establishes:
- Hybrid vanilla + Solid.js architecture
- Auth callback pattern in `FloorplanApp.onAuthRequired`
- UI components that respond to authentication state

**Integration Pattern:**

```typescript
// FloorplanApp initialization (current pattern)
const app = new FloorplanApp({
  container,
  onAuthRequired: async () => {
    // Will redirect to backend /auth/login/google
    window.location.href = `${API_URL}/auth/login/google?redirect=${encodeURIComponent(window.location.href)}`;
    return false; // Prevent immediate edit mode
  },
  isAuthenticated: await checkAuthStatus()
});

// After OAuth callback, backend sets cookie, frontend checks:
async function checkAuthStatus(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  return res.ok;
}
```

## Library Comparison

### OAuth/OIDC Libraries

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Authlib** | Full OAuth2/OIDC, well-documented, maintained | Slightly larger | ✅ Recommended |
| **fastapi-oidc** | FastAPI-specific, simpler | Less flexible, smaller community | For simple cases |
| **python-jose** | JWT handling only | Not a full OAuth solution | For token validation only |

### Session Management

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Cookie Sessions** | Simple, works with browser | Requires HTTPS, CORS config | ✅ For browser apps |
| **JWT Bearer Tokens** | Stateless, mobile-friendly | Token refresh complexity | For mobile/API clients |
| **Database Sessions** | Revocable, server-controlled | Adds latency | For high-security apps |

## Wasmer Edge Constraints

**Supported:**
- Python 3.11+ via WASI
- ASGI applications (FastAPI, Starlette)
- Environment variables for secrets
- Custom domains
- HTTPS by default

**Not Supported / Limited:**
- Long-running background tasks (use edge functions)
- Large file storage (use external storage)
- WebSockets (use polling or external service)
- Database connections (use managed DB or external API)

**Recommendation:** For this project, use:
- External database (Supabase, Planetscale, or similar)
- Edge-compatible session storage (Redis via Upstash, or encrypted cookies)

## Project Structure Recommendation

```
floorplan-api/
├── src/
│   ├── __init__.py
│   ├── main.py           # FastAPI app entry point
│   ├── config.py         # Environment configuration
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py     # Health check endpoints
│   │   └── auth.py       # Authentication routes
│   └── models/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   └── test_health.py
├── wasmer.toml           # Wasmer Edge configuration
├── pyproject.toml        # Python dependencies
├── requirements.txt      # Pip requirements
└── README.md
```

## Security Considerations

1. **CORS Configuration**: Allow only frontend origins
2. **Cookie Security**: `SameSite=Lax`, `Secure=True`, `HttpOnly=True`
3. **Secret Management**: Use Wasmer secrets, never commit credentials
4. **Rate Limiting**: Implement for auth endpoints to prevent brute force
5. **HTTPS**: Wasmer Edge provides this by default

## Implementation Phases

### Phase 1: Bootstrap (This Proposal)
- FastAPI project structure
- Health check endpoint (`GET /health`)
- CORS middleware
- Wasmer Edge configuration
- GitHub Actions deployment
- Basic session stub (no real auth)

### Phase 2: Google OAuth (Future Proposal)
- Authlib integration
- Google OAuth routes (`/auth/login/google`, `/auth/callback/google`)
- Session management with encrypted cookies
- User info endpoint (`/auth/me`)
- Logout endpoint (`/auth/logout`)

### Phase 3: Full Integration (Future)
- Frontend integration with FloorplanApp
- Protected API endpoints
- User preferences storage
- Floorplan save/load from cloud

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Wasmer Edge Get Started](https://documentation.wasmer.io/edge/get-started)
- [Wasmer Edge CLI](https://documentation.wasmer.io/edge/cli)
- [wasmerio/setup-wasmer GitHub Action](https://github.com/wasmerio/setup-wasmer)
- [Authlib FastAPI Integration](https://docs.authlib.org/en/v0.14.3/client/fastapi.html)
- [Authlib Google Login Blog](https://blog.authlib.org/2020/fastapi-google-login)
- [Auth.js for Solid Start](https://authjs.dev/reference/solid-start)
- [SolidJS Authentication Guide](https://docs.solidjs.com/solid-start/advanced/auth)
