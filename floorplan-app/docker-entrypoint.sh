#!/bin/sh
set -e

echo "Waiting for Convex backend..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if wget -q --spider "http://convex:3210/version" 2>/dev/null; then
    echo "Convex backend is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "Waiting for Convex... attempt $attempt/$max_attempts"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Warning: Could not reach Convex backend, proceeding anyway..."
fi

echo "Setting Convex environment variables..."
cd /app/floorplan-app
npx convex env set DEV_AUTH_ENABLED true --url "$CONVEX_SELF_HOSTED_URL" --admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY" 2>&1 || true

echo "Deploying Convex functions..."
npx convex deploy --url "$CONVEX_SELF_HOSTED_URL" --admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY" --yes 2>&1 || {
  echo "Warning: Convex deploy failed, trying dev push..."
  npx convex dev --once --url "$CONVEX_SELF_HOSTED_URL" --admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY" 2>&1 || true
}
echo "Convex functions deployed"

cd /app
exec "$@"
