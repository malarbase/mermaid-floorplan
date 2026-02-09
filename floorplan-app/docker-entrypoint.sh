#!/bin/sh
set -e

echo "=== Convex Function Deployment ==="

# Resolve admin key: prefer auto-generated key from shared volume,
# fall back to env var (from .env.development / .env.local)
if [ -f /shared/admin_key.txt ]; then
  CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /shared/admin_key.txt)
  export CONVEX_SELF_HOSTED_ADMIN_KEY
  echo "Using auto-generated admin key from convex-keygen"
elif [ -n "$CONVEX_SELF_HOSTED_ADMIN_KEY" ]; then
  echo "Using admin key from environment"
else
  echo "Warning: No admin key available. Convex functions will not be deployed."
  echo "  - Run: docker compose exec convex ./generate_admin_key.sh"
  echo "  - Or set CONVEX_SELF_HOSTED_ADMIN_KEY in .env.local"
  exec "$@"
fi

# Wait for Convex backend (should already be healthy via depends_on, but belt-and-suspenders)
echo "Waiting for Convex backend..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if wget -q --spider "http://convex:3210/version" 2>/dev/null; then
    echo "Convex backend is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "  attempt $attempt/$max_attempts..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Warning: Could not reach Convex backend, proceeding anyway..."
  exec "$@"
fi

# Deploy Convex functions
cd /app/floorplan-app

echo "Setting Convex environment variables..."
npx convex env set DEV_AUTH_ENABLED true \
  --url "$CONVEX_SELF_HOSTED_URL" \
  --admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY" 2>&1 || true

echo "Deploying Convex functions..."
if npx convex deploy \
  --url "$CONVEX_SELF_HOSTED_URL" \
  --admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY" \
  --yes 2>&1; then
  echo "Convex functions deployed successfully"
else
  echo "Warning: 'convex deploy' failed, trying 'convex dev --once'..."
  if npx convex dev --once \
    --url "$CONVEX_SELF_HOSTED_URL" \
    --admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY" 2>&1; then
    echo "Convex functions deployed via dev push"
  else
    echo "ERROR: Failed to deploy Convex functions."
    echo "  You can manually deploy with:"
    echo "    docker compose exec app npx convex dev --once \\"
    echo "      --url http://convex:3210 \\"
    echo "      --admin-key \$(cat /shared/admin_key.txt)"
  fi
fi

echo "=== Starting application ==="
cd /app
exec "$@"
