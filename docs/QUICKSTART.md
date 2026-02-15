# 🚀 Quick Start - Test with Mock Auth

No OAuth setup needed! The mock auth system is pre-configured.

## 1. Start Docker

```bash
make docker-up
```

## 2. Visit Dev Login

Open http://localhost:3000/dev-login in your browser.

## 3. Click "Login as Dev User"

You'll be logged in with:
- **Email**: dev@example.com
- **Name**: Dev User
- **Username**: devuser

## 4. Test Features

Now you can access all authenticated features:

- **Dashboard**: http://localhost:3000/dashboard
- **Create Project**: http://localhost:3000/new
- **Profile**: http://localhost:3000/u/devuser

## Available Mock Users

Visit `/dev-login` to choose:

1. **Regular User** (default)
   - Has username, goes straight to dashboard
   
2. **New User**
   - No username set, triggers username selection
   
3. **Admin User**
   - Admin permissions (future use)

## Logout

Open browser DevTools console and run:
```javascript
localStorage.removeItem("mock-dev-session");
location.reload();
```

## Need Real OAuth?

If you want to test with real Google OAuth:

1. Edit `floorplan-app/.env`:
   ```bash
   DEV_AUTH_BYPASS=false
   ```

2. Get Google OAuth credentials (see `floorplan-app/README.md`)

3. Restart Docker:
   ```bash
   make docker-restart
   ```

---

**Full documentation**: See `floorplan-app/MOCK-AUTH.md`
