# Environment Configuration Guide

This guide explains the environment file structure for the floorplan-app.

## File Overview

| File | Purpose | Tracked in Git? | When to Use |
|------|---------|-----------------|-------------|
| `.env.example` | Comprehensive template with all options | ✅ Yes | Reference for all available variables |
| `.env.development` | Development defaults (self-hosted Convex) | ✅ Yes | Automatic - used by Docker Compose |
| `.env.production` | Production template (cloud Convex) | ✅ Yes | Reference when deploying to production |
| `.env.local` | Personal overrides (secrets) | ❌ No | Override defaults with your secrets |
| `.env.local.admin-example` | Admin testing template | ✅ Yes | Copy to `.env.local` for admin testing |

## Priority Order

Environment files are loaded in this order (later files override earlier ones):

1. `.env.development` or `.env.production` (environment-specific)
2. `.env.local` (personal overrides - **contains secrets, never commit!**)

## Quick Start Scenarios

### Scenario 1: Regular Development (Default)

**Goal:** Run the app with self-hosted Convex in Docker

```bash
# That's it! .env.development is already configured
docker compose up -d
```

The `.env.development` file contains all necessary defaults:
- Self-hosted Convex at `http://localhost:3210`
- Dev auth bypass enabled
- Mock mode disabled (uses real Convex)

### Scenario 2: Admin Feature Testing

**Goal:** Test admin panel features with a super admin account

```bash
# Option A: Using Makefile (recommended)
make admin-setup ADMIN_EMAIL=admin@test.local
make admin-dev

# Option B: Manual setup
cp .env.local.admin-example .env.local
# Edit .env.local with your admin email
npm run dev
```

Then open http://localhost:3000/admin

### Scenario 3: Mock Mode Testing

**Goal:** Test UI without Convex backend

Create `.env.local`:

```bash
# Override to use mock data
VITE_MOCK_MODE=true
```

Then start the app:

```bash
docker compose restart app
```

### Scenario 4: Production Deployment

**Goal:** Deploy to production with cloud Convex

1. Copy the production template:

```bash
cp .env.production .env.local
```

2. Edit `.env.local` with your production values:

```bash
# Cloud Convex from https://dashboard.convex.dev
VITE_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=prod:your-project-name

# Strong random secret (CRITICAL!)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=https://your-domain.com

# Real Google OAuth credentials
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-production-secret

# Disable dev features
DEV_AUTH_BYPASS=false
VITE_MOCK_MODE=false

NODE_ENV=production
```

3. Deploy:

```bash
npm run build
npm run start
```

## Environment Variables Reference

### Convex Configuration

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `VITE_CONVEX_URL` | Convex backend URL | `http://localhost:3210` | `https://yourproject.convex.cloud` |
| `CONVEX_SELF_HOSTED_URL` | Internal Docker URL | `http://convex:3210` | N/A (cloud only) |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Admin key for self-hosted | Auto-generated | N/A (cloud only) |
| `CONVEX_DEPLOYMENT` | Deployment identifier | `dev:local` | `prod:yourproject` |

### Authentication

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `BETTER_AUTH_SECRET` | Encryption secret | Dev placeholder | **Strong random secret** |
| `BETTER_AUTH_URL` | App base URL | `http://localhost:3000` | `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional | **Required** |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Optional | **Required** |

### Development Features

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `DEV_AUTH_BYPASS` | Skip OAuth, use mock auth | `true` | **Must be `false`** |
| `DEV_USER_EMAIL` | Mock user email | `dev@example.com` | N/A |
| `DEV_USER_NAME` | Mock user name | `Dev User` | N/A |
| `DEV_USER_USERNAME` | Mock username | `devuser` | N/A |
| `VITE_MOCK_MODE` | Use mock data | `false` (use real Convex) | **Must be `false`** |

### Admin Configuration

| Variable | Description | How to Set |
|----------|-------------|------------|
| `SUPER_ADMIN_EMAIL` | Initial super admin | `npx convex env set SUPER_ADMIN_EMAIL "your@email.com"` |

## Troubleshooting

### Problem: "Could not find public function"

**Cause:** Convex functions not deployed

**Solution:**
```bash
cd floorplan-app
npx convex dev --url http://localhost:3210
```

### Problem: Admin features not visible

**Cause:** User email doesn't match super admin

**Solution:**
1. Check `.env.local` has `DEV_USER_EMAIL=admin@test.local`
2. Run: `npx convex env set SUPER_ADMIN_EMAIL "admin@test.local"`
3. Restart: `docker compose restart app`

### Problem: OAuth not working

**Cause:** Missing Google credentials

**Solution:**
1. Get credentials from https://console.cloud.google.com/apis/credentials
2. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   ```
3. Set `DEV_AUTH_BYPASS=false` in `.env.local`

### Problem: Changes not reflected

**Cause:** Docker not picking up `.env.local` changes

**Solution:**
```bash
docker compose restart app
```

## Security Best Practices

### ✅ DO

- Use `.env.local` for secrets and personal overrides
- Generate strong random secrets for production: `openssl rand -base64 32`
- Keep `.env.local` gitignored (it's already configured)
- Use real OAuth in production (disable `DEV_AUTH_BYPASS`)
- Review `.env.example` to understand all available options

### ❌ DON'T

- Never commit `.env.local` or any file with real secrets
- Never use development secrets in production
- Never enable `DEV_AUTH_BYPASS` in production
- Never share your `BETTER_AUTH_SECRET` or OAuth credentials
- Never use the example admin key in production

## Migration from Old Structure

If you have old `.env` files, they've been replaced:

| Old File | New Equivalent | Action |
|----------|----------------|--------|
| `.env` | `.env.development` | Already migrated |
| `.env.bak` | `.env.example` | Deleted (was redundant) |
| `.env.local.admin` | `.env.local.admin-example` | Copy and edit |

No manual migration needed - the new structure is active!

## Getting Help

- For development questions: Check `floorplan-app/.env.development`
- For all variables: Check `floorplan-app/.env.example`
- For admin setup: Run `make admin-help`
- For E2E testing: See [E2E-TESTING-PROMPT.md](./E2E-TESTING-PROMPT.md)
