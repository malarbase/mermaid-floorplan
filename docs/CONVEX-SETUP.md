# Self-Hosted Convex Setup

**Status**: ✅ Self-hosted Convex is now configured in Docker!

## What Changed

### 1. Added Convex Backend Service

```yaml
services:
  convex:
    image: ghcr.io/get-convex/convex-local-backend:latest
    ports:
      - "3210:3210"  # Backend API
      - "3211:3211"  # Dashboard UI
    volumes:
      - convex-data   # Persistent storage
```

### 2. Updated App Configuration

- Default `VITE_CONVEX_URL` → `http://localhost:3210` (self-hosted)
- Added `depends_on: convex` with healthcheck
- App waits for Convex to be ready before starting

### 3. Environment Variables

```bash
VITE_CONVEX_URL=http://localhost:3210  # Self-hosted backend
CONVEX_DEPLOYMENT=dev:local             # Local deployment mode
```

## Quick Start

```bash
# Pull latest images and start everything
docker compose pull
docker compose up -d

# Check logs
docker compose logs -f convex
docker compose logs -f app

# Access services
open http://localhost:3000        # SolidStart app
open http://localhost:3210/admin  # Convex dashboard
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Docker Compose                         │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ SolidStart   │───▶│ Convex       │  │
│  │ App          │    │ Backend      │  │
│  │ :3000        │    │ :3210        │  │
│  └──────────────┘    └──────────────┘  │
│                           │             │
│                           ▼             │
│                     ┌──────────────┐    │
│                     │ Convex Data  │    │
│                     │ (Volume)     │    │
│                     └──────────────┘    │
└─────────────────────────────────────────┘
```

## Benefits

✅ **Fully Local** - No cloud dependencies
✅ **Persistent Data** - Survives container restarts
✅ **Fast Development** - No network latency
✅ **Privacy** - Data stays on your machine
✅ **Free** - No usage costs or limits

## Convex Dashboard

Access the Convex dashboard at http://localhost:3210/admin to:
- View your database tables
- Run queries
- Monitor function logs
- Test mutations
- Inspect data

## Data Persistence

Convex data is stored in a Docker volume:
```bash
# View volumes
docker volume ls | grep convex

# Backup data
docker run --rm -v mermaid-floorplan_convex-data:/data -v $(pwd):/backup alpine tar czf /backup/convex-backup.tar.gz -C /data .

# Restore data
docker run --rm -v mermaid-floorplan_convex-data:/data -v $(pwd):/backup alpine tar xzf /backup/convex-backup.tar.gz -C /data
```

## Switching to Cloud Convex

If you want to use cloud Convex later:

```bash
# Get cloud URL
cd floorplan-app
npx convex dev  # Creates cloud project

# Update .env
VITE_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=prod:your-project

# Restart
docker compose restart app
```

## Troubleshooting

### Convex not starting
```bash
# Check logs
docker compose logs convex

# Pull latest image
docker compose pull convex
docker compose up -d convex
```

### App can't connect to Convex
```bash
# Verify Convex is healthy
docker compose ps convex

# Check healthcheck
docker inspect mermaid-floorplan-convex-1 | grep -A 10 Health

# Test connection
curl http://localhost:3210/api/status
```

### Reset Convex data
```bash
docker compose down
docker volume rm mermaid-floorplan_convex-data
docker compose up -d
```

## Commands

```bash
# Start all services
make docker-up

# Stop all services
make docker-down

# View Convex logs
docker compose logs -f convex

# Restart Convex only
docker compose restart convex

# Clean everything (including data!)
make docker-clean
```

## Next Steps

1. ✅ Self-hosted Convex is running
2. Start Docker: `make docker-up`
3. Visit app: http://localhost:3000
4. Test dashboard: http://localhost:3210/admin
5. No cloud setup needed!

## References

- [Convex Self-Hosting Guide](https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md)
- [Convex Documentation](https://docs.convex.dev/self-hosting)
- [Discord #self-hosted](https://discord.gg/convex)
