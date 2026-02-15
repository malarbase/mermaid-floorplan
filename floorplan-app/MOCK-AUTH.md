# Mock Auth Setup for Development

This directory contains mock authentication utilities for local development.

## Quick Start

The mock auth system is **pre-configured and ready to use**:

```bash
# 1. Start Docker (mock auth is enabled by default)
make docker-up

# 2. Visit the dev login page
open http://localhost:3000/dev-login

# 3. Click "Login as Dev User"

# 4. You're logged in! Test features:
open http://localhost:3000/dashboard
```

## What's Included

### Files Created:
- **`dev-login.tsx`** - Development login page with user presets
- **`mock-auth.ts`** - Mock session utilities and user presets
- **`dev-auth-bypass.ts`** - Middleware bypass for development

### Default Configuration:
- ✅ **Auth bypass enabled** in `.env` (`DEV_AUTH_BYPASS=true`)
- ✅ **Mock user configured** (dev@example.com)
- ✅ **Docker environment** set up with bypass variables
- ✅ **Automatic session persistence** via localStorage

## Available Mock Users

```typescript
// Regular user (default)
{
  id: "dev-user-1",
  email: "user@example.com", 
  name: "Test User",
  username: "testuser"
}

// New user (no username - triggers username selection)
{
  id: "dev-user-new",
  email: "new@example.com",
  name: "New User", 
  username: undefined
}

// Admin user
{
  id: "dev-user-admin",
  email: "admin@example.com",
  name: "Admin User",
  username: "admin"
}
```

## Usage

### In Routes/Components:

```typescript
import { getMockSession, mockUsers, setMockSession } from "~/lib/mock-auth";

// Check current mock session
const user = getMockSession();
if (user) {
  console.log("Logged in as:", user.email);
}

// Switch users
setMockSession(mockUsers.admin);
location.reload();
```

### In Middleware:

```typescript
import { getAuthUser } from "~/lib/mock-auth";

export const authMiddleware = async () => {
  const realUser = await getRealAuthUser(); // Your actual auth check
  
  // Returns mock user in dev if available, otherwise real user
  return getAuthUser(realUser);
};
```

## Testing Different Scenarios

### Test New User Flow:
```bash
# Visit dev-login and select "New User"
# Should trigger username selection modal
open http://localhost:3000/dev-login
```

### Test Existing User:
```bash
# Visit dev-login and select "Regular User"  
# Should go straight to dashboard
open http://localhost:3000/dev-login
```

### Test Logout:
```javascript
// Browser DevTools console
import { clearMockSession } from "~/lib/mock-auth";
clearMockSession();
location.reload();
```

## Environment Variables

Already configured in `.env`:

```bash
# Skip OAuth completely
DEV_AUTH_BYPASS=true

# Default mock user details
DEV_USER_EMAIL=dev@example.com
DEV_USER_NAME=Dev User
DEV_USER_USERNAME=devuser

# Optional: Use mock data instead of Convex
VITE_MOCK_MODE=false
```

## How It Works

1. **Development only** - All mock functions check `import.meta.env.PROD`
2. **localStorage persistence** - Session survives page reloads
3. **24-hour expiry** - Mock sessions expire automatically
4. **Middleware bypass** - Can intercept real auth checks in dev

### Flow:
```
User visits /dev-login
  ↓
Clicks preset (e.g., "Regular User")
  ↓
setMockSession() stores user in localStorage
  ↓
Redirects to /dashboard
  ↓
Middleware calls getAuthUser()
  ↓
Returns mock user in dev, real user in prod
  ↓
App sees authenticated user
```

## Disabling Mock Auth

To test real OAuth:

```bash
# Edit .env
DEV_AUTH_BYPASS=false

# Restart Docker
make docker-restart

# Now /dev-login won't work, must use real Google OAuth
```

## Security

- ✅ All mock routes check `import.meta.env.PROD`
- ✅ Mock functions return `null` in production
- ✅ Bypass flags ignored in production builds
- ✅ No security risk - only works in development

## Troubleshooting

### "Mock session not persisting"
```javascript
// Check localStorage
console.log(localStorage.getItem("mock-dev-session"));

// Manually set
localStorage.setItem("mock-dev-session", JSON.stringify({
  user: { id: "dev-user-1", email: "dev@example.com", name: "Dev User", username: "devuser" },
  expiresAt: Date.now() + 86400000,
  createdAt: Date.now()
}));
location.reload();
```

### "Dev login page not found"
```bash
# Check route exists
ls floorplan-app/src/routes/dev-login.tsx

# Restart dev server
make docker-restart
```

### "Still redirecting to login"
Check your middleware is using the bypass:
```typescript
// Should be in your middleware.ts
const user = getAuthUser(realAuthUser);
```

## Next Steps

1. ✅ Mock auth is ready - just visit `/dev-login`
2. Test authenticated features without OAuth setup
3. When ready for real auth, set `DEV_AUTH_BYPASS=false`
4. Configure Google OAuth credentials
5. Test real OAuth flow

## Related Files

- `/dev-login` - Login page with user presets
- `~/lib/mock-auth.ts` - Core mock utilities
- `~/lib/dev-auth-bypass.ts` - Middleware integration
- `~/middleware.ts` - Your auth middleware (integrate bypass here)
