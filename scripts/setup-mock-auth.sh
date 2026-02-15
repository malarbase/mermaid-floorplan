#!/bin/bash
# Quick setup script for mock auth

set -e

echo "🔧 Setting up mock authentication for development..."
echo ""

# Check if .env exists
if [ ! -f "floorplan-app/.env" ]; then
    echo "📝 Creating .env from .env.example..."
    cp floorplan-app/.env.example floorplan-app/.env
    echo "✅ Created floorplan-app/.env"
else
    echo "✅ floorplan-app/.env already exists"
fi

# Update .env to enable mock auth
echo ""
echo "🔑 Enabling dev auth bypass..."
if grep -q "DEV_AUTH_BYPASS" floorplan-app/.env; then
    # Update existing value
    sed -i '' 's/DEV_AUTH_BYPASS=.*/DEV_AUTH_BYPASS=true/' floorplan-app/.env 2>/dev/null || \
    sed -i 's/DEV_AUTH_BYPASS=.*/DEV_AUTH_BYPASS=true/' floorplan-app/.env
    echo "✅ Updated DEV_AUTH_BYPASS=true in .env"
else
    # Add if missing
    echo "" >> floorplan-app/.env
    echo "# Development Auth Bypass" >> floorplan-app/.env
    echo "DEV_AUTH_BYPASS=true" >> floorplan-app/.env
    echo "DEV_USER_EMAIL=dev@example.com" >> floorplan-app/.env
    echo "DEV_USER_NAME=Dev User" >> floorplan-app/.env
    echo "DEV_USER_USERNAME=devuser" >> floorplan-app/.env
    echo "✅ Added dev auth bypass config to .env"
fi

echo ""
echo "✨ Mock auth setup complete!"
echo ""
echo "📚 Quick Start:"
echo "  1. make docker-up              # Start services"
echo "  2. open http://localhost:3000/dev-login"
echo "  3. Click 'Login as Dev User'"
echo ""
echo "📖 See floorplan-app/MOCK-AUTH.md for full documentation"
echo ""
