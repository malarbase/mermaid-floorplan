## 1. Project Setup

- [ ] 1.1 Create `floorplan-api/` directory at workspace root
- [ ] 1.2 Create `floorplan-api/pyproject.toml` with project metadata and dependencies
- [ ] 1.3 Create `floorplan-api/requirements.txt` for pip installation
- [ ] 1.4 Create `floorplan-api/src/__init__.py`
- [ ] 1.5 Create `floorplan-api/src/config.py` with environment variable handling
- [ ] 1.6 Create `floorplan-api/README.md` with development instructions

## 2. FastAPI Application

- [ ] 2.1 Create `floorplan-api/src/main.py` with FastAPI app initialization
- [ ] 2.2 Add CORS middleware with explicit origin allowlist
- [ ] 2.3 Add session middleware with secure cookie configuration
- [ ] 2.4 Create `floorplan-api/src/routes/__init__.py`
- [ ] 2.5 Create `floorplan-api/src/routes/health.py` with GET /health endpoint
- [ ] 2.6 Create `floorplan-api/src/routes/auth.py` with stub auth endpoints
- [ ] 2.7 Wire up routers in main.py

## 3. Auth Stub Endpoints

- [ ] 3.1 Implement GET /auth/status (returns mock auth state from session)
- [ ] 3.2 Implement GET /auth/login with redirect parameter (sets mock session, redirects)
- [ ] 3.3 Implement POST /auth/logout (clears session cookie)
- [ ] 3.4 Add Pydantic models for response schemas

## 4. Wasmer Edge Configuration

- [ ] 4.1 Create `floorplan-api/wasmer.toml` with package metadata
- [ ] 4.2 Configure ASGI runner in wasmer.toml
- [ ] 4.3 Configure filesystem mappings
- [ ] 4.4 Test local run with `wasmer run`
- [ ] 4.5 Document Wasmer account setup in README

## 5. Testing

- [ ] 5.1 Create `floorplan-api/tests/__init__.py`
- [ ] 5.2 Create `floorplan-api/tests/conftest.py` with FastAPI test client fixture
- [ ] 5.3 Create `floorplan-api/tests/test_health.py` with health check tests
- [ ] 5.4 Create `floorplan-api/tests/test_auth.py` with auth stub tests
- [ ] 5.5 Add pytest configuration to pyproject.toml
- [ ] 5.6 Verify tests pass locally with `pytest`

## 6. GitHub Actions Deployment

- [ ] 6.1 Create `.github/workflows/deploy-api.yml`
- [ ] 6.2 Configure workflow to trigger on push to master (paths: floorplan-api/**)
- [ ] 6.3 Add wasmerio/setup-wasmer@v3 step
- [ ] 6.4 Add wasmer deploy step with WASMER_TOKEN secret
- [ ] 6.5 Add path filter to only deploy when floorplan-api changes
- [ ] 6.6 Document required secrets in README

## 7. Documentation

- [ ] 7.1 Write floorplan-api/README.md with setup instructions
- [ ] 7.2 Document environment variables (SESSION_SECRET, ALLOWED_ORIGINS)
- [ ] 7.3 Document local development workflow
- [ ] 7.4 Document deployment process
- [ ] 7.5 Add API endpoint documentation to README
- [ ] 7.6 Add troubleshooting section for common issues

## 8. Verification

- [ ] 8.1 Run local development server with uvicorn
- [ ] 8.2 Test health endpoint returns 200
- [ ] 8.3 Test CORS headers present for allowed origins
- [ ] 8.4 Test auth stub endpoints set/read session cookie
- [ ] 8.5 Verify wasmer.toml validates with wasmer check
- [ ] 8.6 Verify GitHub Action workflow syntax is valid

## 9. Optional: Manual Deployment Test

- [ ] 9.1 Create Wasmer account if not exists
- [ ] 9.2 Login with wasmer login
- [ ] 9.3 Deploy manually with wasmer deploy
- [ ] 9.4 Verify health endpoint at deployed URL
- [ ] 9.5 Record deployed URL in README
