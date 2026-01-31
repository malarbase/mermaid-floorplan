#!/bin/bash
# Initialize self-hosted Convex with functions and schema

set -e

echo "🔧 Initializing self-hosted Convex..."
echo ""

# Check if Convex backend is running
if ! curl -sf http://localhost:3210/version > /dev/null 2>&1; then
    echo "❌ Convex backend is not running"
    echo "   Run: docker compose up -d convex"
    exit 1
fi

echo "✅ Convex backend is running at http://localhost:3210"
echo ""

# Enter floorplan-app directory
cd floorplan-app

# Set environment for local deployment
export CONVEX_DEPLOYMENT=dev:local
export CONVEX_URL=http://localhost:3210

echo "📦 Deploying schema and functions to self-hosted Convex..."
echo ""

# Try to deploy with npx convex deploy in local mode
# This requires setting up the deployment config first
if [ ! -f "convex/_generated/api.d.ts" ]; then
    echo "🔨 Generating Convex types..."
    npx convex dev --once --url http://localhost:3210 --admin-key "local-dev-secret-change-for-production" || {
        echo "⚠️  Note: Convex dev requires interactive auth or valid admin key"
        echo ""
        echo "Alternative: Use npx convex dev in a separate terminal:"
        echo "  cd floorplan-app"
        echo "  npx convex dev --url http://localhost:3210"
        echo ""
        echo "Or push manually with admin key:"
        echo "  npx convex deploy --admin-key <key> --url http://localhost:3210"
    }
else
    echo "✅ Convex types already generated"
fi

echo ""
echo "📚 Next steps:"
echo "  1. In a separate terminal, run: cd floorplan-app && npx convex dev"
echo "  2. Or configure INSTANCE_SECRET in docker-compose.yml and use deploy command"
echo "  3. Visit http://localhost:3000/dashboard to test"
echo ""
