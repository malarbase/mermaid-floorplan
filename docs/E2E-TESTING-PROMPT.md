# End-to-End Testing Prompt: Mermaid Floorplan with Self-Hosted Convex

**Context:** This prompt guides you through testing the complete mermaid-floorplan application running locally with Docker + self-hosted Convex backend. Use this in a fresh session to verify the entire stack works end-to-end.

**Prerequisites:**
- Docker and Docker Compose installed
- Node.js 18+ and npm installed
- Git repository cloned at `/Users/malar/Personal/Code/mermaid-floorplan`
- Port 3000, 3210, 3211 available

---

## 🎯 Testing Objective

Verify the complete user journey:
1. Start the Docker stack (Convex backend + SolidStart app)
2. Access the landing page
3. Login via mock authentication
4. View dashboard (with mock data OR deployed Convex functions)
5. Test the 3D floorplan viewer
6. Confirm data persistence

---

## 📋 Test Script

### Step 1: Clean Start

```bash
cd /Users/malar/Personal/Code/mermaid-floorplan

# Stop any running containers
docker compose down

# Optional: Clean everything for fresh start
# docker compose down -v  # WARNING: Deletes all data
```

**Expected:** Clean slate, no errors.

---

### Step 2: Choose Testing Mode

You have **3 options** for testing. Pick one:

**Note:** Environment configuration has been restructured. See [ENV-GUIDE.md](./ENV-GUIDE.md) for details.

#### Option A: Mock Mode (Quickest - No Convex Deployment Needed) ⭐ RECOMMENDED FOR TESTING

```bash
# Enable mock mode by creating/editing .env.local
echo "VITE_MOCK_MODE=true" > floorplan-app/.env.local

# Start services
docker compose up -d

# Wait for services to be healthy (~15 seconds)
sleep 15

# Check status
docker compose ps
```

**Expected Output:**
```
NAME                          STATUS
mermaid-floorplan-app-1       Up (healthy)
mermaid-floorplan-convex-1    Up (healthy)
```

#### Option B: Deploy to Self-Hosted Convex (Full Local Stack)

```bash
# Start services (default .env.development uses real Convex)
docker compose up -d

# Wait for Convex to be ready
sleep 15

# In a SEPARATE terminal, deploy functions
cd /Users/malar/Personal/Code/mermaid-floorplan/floorplan-app
npx convex dev --url http://localhost:3210

# Leave this terminal running (it watches for changes)
```

**Expected:** Convex dev connects, pushes schema and functions.

#### Option C: Use Cloud Convex (Easiest Full-Featured)

```bash
# Get cloud deployment URL
cd /Users/malar/Personal/Code/mermaid-floorplan/floorplan-app
npx convex dev
# This creates a cloud project and outputs URL

# Update .env.local with the cloud URL
echo "VITE_CONVEX_URL=https://your-project.convex.cloud" > .env.local
echo "CONVEX_DEPLOYMENT=prod:your-project" >> .env.local

# Start only the app (no local Convex needed)
docker compose up -d app
```

**Expected:** App connects to cloud Convex, all features work.

---

### Step 3: Verify Services

```bash
# Check Docker logs for errors
docker compose logs --tail 50

# Test Convex backend (skip if using cloud)
curl http://localhost:3210/version

# Test app
curl http://localhost:3000
```

**Expected:**
- Convex: JSON response with version info
- App: HTML response (landing page)
- No error messages in logs

---

### Step 4: Browser Testing - Landing Page

**Action:** Open browser to http://localhost:3000

**Verify:**
- [ ] Landing page loads without errors
- [ ] See "Design Beautiful Floorplans" heading
- [ ] "Get Started" and "See Demo" buttons visible
- [ ] "Log in" and "Sign up" buttons in header
- [ ] Page styled correctly (DaisyUI theme)

**Browser Console Check:**
```javascript
// Open DevTools (F12), check Console tab
// Should see:
// - "[vite] connecting..." (dev mode indicator)
// - "Connecting to Convex at: http://localhost:3210" (or cloud URL)
// - No red errors
```

---

### Step 5: Browser Testing - Mock Login

**Action:** Navigate to http://localhost:3000/dev-login

**Verify:**
- [ ] "Development Login" card appears
- [ ] Warning alert: "Only works in development mode"
- [ ] "Login as Dev User" button visible

**Action:** Click "Login as Dev User" button

**Browser Console Check:**
```javascript
// Should see:
// - "Mock session created: {...}"
// - "Mock user created: {...}"
```

**Verify:**
- [ ] Page navigates to /dashboard (URL changes)
- [ ] No JavaScript errors in console

---

### Step 6: Browser Testing - Dashboard

#### If Using Mock Mode (Option A):

**Current Behavior:**
- Dashboard may show "Loading..." indefinitely OR error about ConvexProvider
- This is expected - mock mode needs dashboard integration (work in progress)

**Workaround to Verify Mock Data:**
```javascript
// In browser console:
import { mockConvexQueries } from '/src/lib/mock-convex.ts';
console.log(mockConvexQueries['projects:list']());
// Should show array of 2 mock projects
```

#### If Using Self-Hosted Convex (Option B) or Cloud (Option C):

**Verify:**
- [ ] Dashboard loads successfully
- [ ] Shows "My Projects" heading
- [ ] Displays list of projects (or "No projects" message)
- [ ] "Create New Project" button visible
- [ ] User info appears in header (if authenticated)

**Browser Console Check:**
```javascript
// Should see:
// - No Convex errors
// - Query logs like "[CONVEX Q(projects:list)]" (if logging enabled)
```

---

### Step 7: Browser Testing - 3D Viewer

**Action:** Navigate to http://localhost:3000/viewer-test

**Verify:**
- [ ] 3D canvas appears (takes ~2-3 seconds to load)
- [ ] Scene renders with 3D content (floorplan or sample geometry)
- [ ] Canvas is NOT just black/dark (lighting works)
- [ ] No WebGL errors in console

**Browser Console Check:**
```javascript
// Should see:
// - "[SelectionManager] Setting up event listeners..."
// - "[SelectionManager] Event listeners attached"
// - No Three.js errors
```

**Interaction Test:**
- [ ] Mouse drag rotates the camera/view
- [ ] Mouse wheel zooms in/out
- [ ] Scene is interactive and responsive

---

### Step 8: Data Persistence Test

**Action:** Stop and restart services

```bash
# Stop
docker compose down

# Start again (data should persist)
docker compose up -d

# Wait for healthy status
sleep 15
docker compose ps
```

**Verify:**
- [ ] Services start successfully
- [ ] Convex data volume still exists: `docker volume ls | grep convex`
- [ ] No data loss (if you created projects, they should still be there)

---

### Step 9: Performance Check

```bash
# Check resource usage
docker stats --no-stream

# Check response times
time curl -s http://localhost:3000 > /dev/null
time curl -s http://localhost:3210/version > /dev/null
```

**Expected:**
- App CPU: < 50% under normal load
- Convex CPU: < 30% under normal load
- App response: < 1 second
- Convex response: < 100ms

---

### Step 10: Log Review

```bash
# Check for any warnings or errors
docker compose logs app | grep -i error
docker compose logs convex | grep -i error

# View recent activity
docker compose logs --tail 100
```

**Expected:**
- Only warnings about Better Auth secret (expected in dev)
- No critical errors
- No crashes or restarts

---

## ✅ Success Criteria

**Core Functionality:**
- [ ] All Docker services start and stay healthy
- [ ] Landing page loads without errors
- [ ] Mock login creates session and navigates
- [ ] 3D viewer renders and is interactive
- [ ] No JavaScript errors in browser console
- [ ] Data persists across restarts

**Optional (Depending on Mode):**
- [ ] Dashboard loads with Convex data (if not using mock mode)
- [ ] Can create/view projects (if Convex functions deployed)
- [ ] Real-time updates work (if using cloud Convex)

---

## 🐛 Troubleshooting

### Issue: Services Won't Start

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :3210

# Kill conflicting processes
kill -9 <PID>

# Clean Docker state
docker compose down -v
docker system prune -f
```

### Issue: Dashboard Shows "Could not find public function"

**This is expected if:**
- Using self-hosted Convex WITHOUT running `npx convex dev`
- Functions haven't been deployed yet

**Fix:**
- Switch to Mock Mode (Option A), OR
- Run `npx convex dev` in separate terminal (Option B), OR
- Use Cloud Convex (Option C)

### Issue: 3D Viewer is Black/Dark

```bash
# Build viewer dependencies inside Docker
docker compose exec app npm run build --workspace floorplan-viewer-core

# Restart
docker compose restart app
```

### Issue: "VITE_MOCK_MODE not working"

```bash
# Set in .env.local (not as shell variable)
echo "VITE_MOCK_MODE=true" > floorplan-app/.env.local

# Restart services
docker compose restart app
```

---

## 📊 Expected Results Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Convex Backend | ✅ Running | `curl http://localhost:3210/version` returns JSON |
| SolidStart App | ✅ Running | Landing page loads at http://localhost:3000 |
| Mock Auth | ✅ Working | Login button navigates to dashboard |
| 3D Viewer | ✅ Working | Canvas renders, scene interactive |
| Data Persistence | ✅ Working | Volume exists after restart |
| Hot Reload | ✅ Working | Changes reflect in browser |

---

## 🎬 Quick Copy-Paste Test (Mock Mode)

```bash
# Complete test in one go
cd /Users/malar/Personal/Code/mermaid-floorplan && \
docker compose down && \
export VITE_MOCK_MODE=true && \
docker compose up -d && \
sleep 20 && \
echo "=== Service Status ===" && \
docker compose ps && \
echo "" && \
echo "=== Convex Health ===" && \
curl -s http://localhost:3210/version | jq . && \
echo "" && \
echo "=== App Health ===" && \
curl -s http://localhost:3000 | head -n 5 && \
echo "" && \
echo "✅ Stack is up! Open http://localhost:3000 in your browser"
```

---

## 📝 Test Report Template

After completing the tests, document your results:

```markdown
# Test Report: Mermaid Floorplan E2E

**Date:** [DATE]
**Mode:** [ ] Mock | [ ] Self-Hosted | [ ] Cloud
**Tester:** [NAME/SESSION ID]

## Results

### Services
- Docker Compose: [ ] Pass [ ] Fail
- Convex Backend: [ ] Pass [ ] Fail
- SolidStart App: [ ] Pass [ ] Fail

### User Journey
- Landing Page: [ ] Pass [ ] Fail
- Mock Login: [ ] Pass [ ] Fail
- Dashboard: [ ] Pass [ ] Fail [ ] N/A
- 3D Viewer: [ ] Pass [ ] Fail

### Issues Found
1. [Description]
2. [Description]

### Notes
[Any additional observations]
```

---

## 🚀 Next Steps After Testing

If all tests pass:
1. Commit your testing report
2. Proceed with production deployment planning
3. Set up proper OAuth (replace mock auth)
4. Configure cloud Convex or production self-hosted instance

If tests fail:
1. Document exact error messages
2. Check troubleshooting section
3. Review logs: `docker compose logs`
4. Ask for help with specific error details

---

**Remember:** This is a development/testing setup. For production:
- Replace mock auth with real OAuth
- Use proper secrets (not `local-dev-secret`)
- Set up SSL/TLS certificates
- Configure proper database backups
- Use production-grade Convex deployment
