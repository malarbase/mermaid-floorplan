# Docker Development Guide

This guide covers running the mermaid-floorplan project using Docker for local development.

## Quick Start

```bash
# 1. Set up environment variables
cp floorplan-app/.env.example floorplan-app/.env
# Edit floorplan-app/.env with your Convex URL and OAuth credentials

# 2. Build and start services
mise run docker:up

# 3. View logs
mise run docker:logs

# 4. Open the app
open http://localhost:3000/viewer-test
```

## Available Commands

| Command | Description |
|---------|-------------|
| `mise run docker:build` | Build Docker images |
| `mise run docker:up` | Start services in background |
| `mise run docker:down` | Stop all services |
| `mise run docker:logs` | View logs (follow mode) |
| `mise run docker:dev` | Start with interactive logs |
| `mise run docker:shell` | Open shell in app container |
| `mise run docker:restart` | Restart services |
| `mise run docker:clean` | Remove containers, volumes, images |

## Services

### App (SolidStart)
- **Port**: 3000
- **URL**: http://localhost:3000
- **Hot-reload**: Enabled via volume mounts
- **Environment**: Configured via `.env` file

### PostgreSQL (Optional)
- **Port**: 5432
- **Database**: `floorplan_dev`
- **User**: `floorplan`
- **Password**: `floorplan_dev_password`
- **Status**: Not started by default (requires profile)

To start with PostgreSQL:
```bash
docker compose --profile postgres up
```

## Development Workflow

### 1. Initial Setup

```bash
# Clone and navigate to project
cd mermaid-floorplan

# Set up environment
cp floorplan-app/.env.example floorplan-app/.env

# Edit .env with your credentials
# Required: VITE_CONVEX_URL (from npx convex dev)
# Optional: Google OAuth credentials
vim floorplan-app/.env

# Build images
mise run docker:build
```

### 2. Start Development

```bash
# Start in background
mise run docker:up

# Or start with logs visible
mise run docker:dev
```

### 3. Access the App

- **Home**: http://localhost:3000
- **Viewer Test**: http://localhost:3000/viewer-test (no auth required)
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard (requires auth)

### 4. Hot Reload

Changes to these files trigger automatic reload:
- `floorplan-app/src/**/*` - All source files
- `floorplan-app/convex/**/*` - Convex functions
- `floorplan-app/app.config.ts` - App configuration
- `floorplan-viewer-core/src/**/*` - Viewer core changes

### 5. Debugging

```bash
# View logs
mise run docker:logs

# Open shell in container
mise run docker:shell

# Inside container:
npm run build --workspace floorplan-viewer-core
npm run test --workspace floorplan-app
```

### 6. Stop Services

```bash
# Stop (preserves data)
mise run docker:down

# Stop and remove volumes
mise run docker:clean
```

## Convex Setup

Convex is cloud-based and cannot be fully mocked locally. You need to:

1. **Create a Convex account**: https://dashboard.convex.dev
2. **Initialize Convex**:
   ```bash
   cd floorplan-app
   npx convex login
   npx convex dev
   ```
3. **Copy CONVEX_URL** to your `.env` file
4. **Restart Docker**:
   ```bash
   mise run docker:restart
   ```

## Google OAuth Setup

For authentication testing:

1. **Create OAuth credentials**: https://console.cloud.google.com/apis/credentials
2. **Configure redirect URI**: `http://localhost:3000/api/auth/callback/google`
3. **Add credentials** to `floorplan-app/.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   ```
4. **Restart services**: `mise run docker:restart`

## Troubleshooting

### Port 3000 already in use

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change the port in docker-compose.yml
ports:
  - "3001:3000"  # Maps host 3001 to container 3000
```

### Changes not hot-reloading

```bash
# Restart services
mise run docker:restart

# Or rebuild from scratch
mise run docker:clean
mise run docker:build
mise run docker:up
```

### Cannot connect to Convex

Check:
1. `VITE_CONVEX_URL` is set in `.env`
2. URL is correct (from `npx convex dev` or dashboard)
3. Convex project is running (`npx convex dev` in another terminal)

### Three.js not loading

```bash
# Rebuild viewer-core inside container
mise run docker:shell
npm run build --workspace floorplan-viewer-core
exit

# Or rebuild entire image
mise run docker:clean
mise run docker:build
```

## Production Build

To test production build locally:

```bash
# Build production image
docker build -f floorplan-app/Dockerfile -t floorplan-app:prod .

# Run production container
docker run -p 3000:3000 \
  -e VITE_CONVEX_URL=https://your-project.convex.cloud \
  -e BETTER_AUTH_SECRET=your-secret \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  floorplan-app:prod
```

## Volume Management

Docker Compose uses volumes for:
- `app-node-modules` - Persists node_modules across builds
- `app-floorplan-app-node-modules` - Persists floorplan-app node_modules
- `postgres-data` - Persists PostgreSQL data (if using postgres profile)

To reset volumes:
```bash
mise run docker:clean  # Removes all volumes
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Host Machine                           │
│  ├── floorplan-app/src     ────────┐   │
│  ├── floorplan-app/convex  ────┐   │   │
│  └── .env                       │   │   │
└─────────────────────────────────┼───┼───┘
                                  │   │
                        Volume    │   │   Volume
                        Mount     │   │   Mount
                                  ▼   ▼
┌──────────────────────────────────────────┐
│  Docker Container (app)                  │
│  ├── /app/floorplan-app/src    ◄────────┤ Hot reload
│  ├── /app/floorplan-app/convex ◄────────┤ Hot reload
│  ├── Node.js 24                          │
│  ├── npm run dev (Port 3000)             │
│  └── Connected to Convex Cloud ──────────┤───► Convex
└──────────────────────────────────────────┘

External Services (Cloud):
- Convex: Real-time database
- Google OAuth: Authentication
```

## Next Steps

After Docker setup works:
1. Test viewer-core integration at `/viewer-test`
2. Set up Google OAuth and test login flow
3. Create a project and test CRUD operations
4. Test versioning and sharing features
5. Deploy to Vercel (see `floorplan-app/README.md`)

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [SolidStart Deployment](https://start.solidjs.com/core-concepts/deployment)
- [Convex Documentation](https://docs.convex.dev/)
- [Better Auth with Convex](https://www.better-auth.com/docs/integrations/convex)
