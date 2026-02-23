# Floorplan App

SolidStart full-stack application for floorplan design with authentication and cloud storage.

## Overview

This is a SolidStart application that provides:
- Google OAuth authentication via Better Auth
- Cloud storage for floorplan projects via Convex
- 3D floorplan visualization via `floorplan-viewer-core`
- GitHub-inspired versioning (projects, versions, snapshots)

## Tech Stack

- **Framework**: [SolidStart](https://start.solidjs.com) with SSR
- **UI**: Solid.js + DaisyUI + Tailwind CSS v4
- **Auth**: Better Auth with Google OAuth
- **Database**: Convex (real-time, serverless)
- **3D Rendering**: Three.js via `floorplan-viewer-core`
- **Deployment**: Vercel

## Development

### Prerequisites

1. Node.js 20+
2. npm 10+
3. A Convex account and project (for database)
4. Google OAuth credentials (for authentication)

### Environment Configuration

The app uses a structured environment configuration system:

- **`.env.development`** - Development defaults (self-hosted Convex in Docker)
- **`.env.production`** - Production template (cloud Convex)
- **`.env.local`** - Your personal overrides (gitignored, for secrets)
- **`.env.example`** - Comprehensive reference

**Quick start:** The defaults in `.env.development` work out of the box with Docker Compose.

**For production:** Copy `.env.production` to `.env.local` and fill in your secrets.

**For detailed configuration:** See [ENV-GUIDE.md](../docs/ENV-GUIDE.md) for complete documentation.

### Getting Started

```bash
# From workspace root
npm install

# Generate dev auth keys (first time only — auto-runs on `npm run dev` if missing)
npm run --workspace floorplan-app generate-dev-keys

# Start development server
npm run --workspace floorplan-app dev

# Or from this directory
npm run dev
```

The dev server runs at http://localhost:3000.

> **Note:** Dev auth keys (`dev-keys/`) are gitignored. They're auto-generated on
> first `npm run dev`, or you can run `npm run generate-dev-keys` manually. The
> script also patches `convex/auth.config.ts` with the matching JWKS public key.

### Testing 3D Viewer

A test page is available to verify 3D rendering works correctly:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000/viewer-test
3. You should see:
   - A loading spinner briefly while Three.js initializes
   - A 3D rendered floorplan with rooms (LivingRoom, Kitchen, DiningRoom, Hallway)
   - Interactive camera controls (drag to rotate, scroll to zoom)
   - WASD keys for camera movement

If you see an error instead of the 3D view:
- Check browser console for error details
- Ensure `floorplan-viewer-core` is built (`npm run build` from root)
- Try a hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Google OAuth Setup (First Time)

To enable Google sign-in, you need to create OAuth 2.0 credentials:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials
2. **Create a new project** (or select an existing one)
3. **Configure OAuth consent screen**:
   - Go to "OAuth consent screen" in the sidebar
   - Choose "External" for user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue (no test users needed for development)
4. **Create OAuth 2.0 Client ID**:
   - Go to "Credentials" > "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Floorplan App (Development)"
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click "Create"
5. **Copy credentials to your `.env` file**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### Testing the OAuth Flow

After setting up credentials:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000/login
3. Click "Continue with Google"
4. Complete the Google sign-in flow
5. You should be redirected to `/dashboard`

If you see errors:
- Check that redirect URI exactly matches (including trailing slashes)
- Verify credentials are in `.env` (not `.env.example`)
- Restart the dev server after changing `.env`

### Convex Setup (First Time)

Before running the app, you need to set up Convex:

1. **Create a Convex account** at https://dashboard.convex.dev
2. **Login and initialize** from the floorplan-app directory:
   ```bash
   cd floorplan-app
   npx convex login
   npx convex dev
   ```
3. When prompted, select "Create a new project" and name it (e.g., "floorplan-app")
4. Convex will generate:
   - `convex/_generated/` directory with TypeScript bindings
   - `.env.local` file with your `CONVEX_DEPLOYMENT` URL
5. Copy the `CONVEX_URL` from `.env.local` to your `.env` file as `VITE_CONVEX_URL`

### Convex Development

After initial setup, run Convex dev mode in a separate terminal:

```bash
cd floorplan-app
npx convex dev
```

This connects to Convex and watches for schema/function changes.

## Building

```bash
# Build for production (Vercel preset)
npm run build

# Run production server locally
npm start
```

## Project Structure

```
floorplan-app/
├── src/
│   ├── app.tsx              # Root app component
│   ├── entry-client.tsx     # Client entry point
│   ├── entry-server.tsx     # Server entry point
│   ├── routes/              # File-based routing
│   │   ├── index.tsx        # Home page
│   │   ├── dashboard.tsx    # User dashboard
│   │   ├── api/auth/        # Auth API routes
│   │   └── u/[username]/    # User/project routes
│   ├── components/          # Shared components
│   └── lib/                 # Utilities
├── convex/                  # Convex backend
│   ├── schema.ts            # Database schema
│   ├── projects.ts          # Project functions
│   └── auth.ts              # Auth functions
├── app.config.ts            # SolidStart config
└── package.json
```

## URL Structure

- `/` - Home page
- `/dashboard` - User dashboard (authenticated)
- `/u/{username}` - User profile
- `/u/{username}/{project}` - Project view (default version)
- `/u/{username}/{project}/v/{version}` - Named version (mutable)
- `/u/{username}/{project}/s/{hash}` - Snapshot permalink (immutable)
- `/u/{username}/{project}/history` - Version history

## Deployment

This app is configured for Vercel deployment. The SolidStart app uses the `vercel` preset for SSR.

### Vercel Project Setup

#### Option 1: Via Vercel Dashboard (Recommended)

1. **Create Vercel Account**: Go to https://vercel.com and sign up/login
2. **Import Repository**:
   - Click "Add New..." > "Project"
   - Connect your GitHub account if not already connected
   - Import the `mermaid-floorplan` repository
3. **Configure Project**:
   - **Framework Preset**: Other (auto-detected from config)
   - **Root Directory**: `floorplan-app` (click "Edit" to change)
   - **Build Command**: `cd .. && npm install && npm run build --workspace floorplan-app` (or leave default)
   - **Output Directory**: `.output`
   - **Install Command**: `cd .. && npm install`
4. **Add Environment Variables** (see next section)
5. **Deploy**: Click "Deploy"

#### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# From the floorplan-app directory
cd floorplan-app

# Link to a new Vercel project
vercel link

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables

Set these in Vercel Dashboard under Project Settings > Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CONVEX_URL` | Convex deployment URL | `https://xxx.convex.cloud` |
| `CONVEX_DEPLOY_KEY` | Convex deploy key (for CI) | `prod:xxx` |
| `BETTER_AUTH_SECRET` | Auth session secret (32+ chars) | `your-random-secret-key` |
| `BETTER_AUTH_URL` | Production URL | `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-xxx` |

**Important**: For production Google OAuth, add your Vercel domain to:
- Authorized JavaScript origins: `https://your-app.vercel.app`
- Authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`

### Convex Production Deployment

Convex requires separate production deployment from Vercel. You have two options:

#### Option A: Vercel Marketplace Integration (Easiest)

1. Install Convex from [Vercel Marketplace](https://vercel.com/marketplace/convex)
2. Deployment is **automatically configured** - no manual setup needed
3. Your Convex functions deploy automatically with your Vercel builds

#### Option B: Manual Configuration

1. **Generate a Production Deploy Key**:
   - Go to [Convex Dashboard](https://dashboard.convex.dev) → Your Project → Settings
   - Click "Generate Production Deploy Key"
   - Copy the key (format: `prod:your-project|eyJ...`)

2. **Add Deploy Key to Vercel**:
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add `CONVEX_DEPLOY_KEY` with your production deploy key
   - Set to **Production environment only**

3. **Override the Build Command** (Project Settings → Build & Development Settings):
   ```bash
   npx convex deploy --cmd 'npm run build'
   ```
   
   This command:
   - Deploys your Convex functions to production
   - Sets `CONVEX_URL` for your frontend build
   - Builds your SolidStart app

#### Manual Deployment (from local machine)

```bash
# Set your deploy key
export CONVEX_DEPLOY_KEY='prod:your-project|your-key'

# Deploy to production
npm run convex:deploy

# Or deploy both Convex and build in one command
npm run convex:deploy:prod
```

#### Preview Deployments (Optional)

For preview deployments (one Convex backend per PR):

1. Generate a **Preview Deploy Key** from Convex Dashboard
2. Add `CONVEX_DEPLOY_KEY` for **Preview environment** in Vercel
3. Each PR will get an isolated Convex backend
4. Preview backends auto-delete after 5 days (14 days on Pro plan)

### Automatic Deployments

Once connected to GitHub:
- **Preview deployments**: Created for every PR
- **Production deployments**: Triggered on merge to `main`/`master`

### Monorepo Configuration

This project is a monorepo. The `vercel.json` in `floorplan-app/` includes:
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Ignore command to skip rebuilds when only unrelated packages change

### Local Production Testing

```bash
# Build for production
npm run build

# Run production server locally
npm start
```

The production build will be in `.output/`.

## Troubleshooting

### Build Errors

**"Cannot find module './_generated/server'"**
- Run `npx convex dev` to generate TypeScript types from your schema
- Alternatively, run `npx convex codegen` for a one-time generation

**TypeScript errors in convex/ directory**
- The Convex types are generated at runtime by `npx convex dev`
- The build will succeed even with IDE errors before running Convex

### 3D Viewer Issues

**Viewer shows loading spinner indefinitely**
- Check browser console for JavaScript errors
- Ensure `floorplan-viewer-core` is built: `npm run build` from workspace root
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

**Three.js errors or blank canvas**
- WebGL might not be supported or disabled in your browser
- Check if hardware acceleration is enabled
- Try a different browser (Chrome recommended)

### Authentication Issues

**Google OAuth returns error**
- Verify redirect URIs match exactly in Google Cloud Console
- Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- For local dev, use `http://localhost:3000/api/auth/callback/google`

**Session not persisting**
- Ensure BETTER_AUTH_SECRET is set and consistent
- Check that cookies are enabled in your browser

### Convex Connection Issues

**"Unable to connect to Convex"**
- Verify CONVEX_URL is correct in your .env file
- Run `npx convex dev` to start local development server
- Check Convex dashboard for deployment status

**Functions not updating**
- Hot reload may need a manual refresh
- Run `npx convex dev --clear` to reset local state

### Development Server Issues

**Port 3000 already in use**
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
npm run dev -- --port 3001
```

**SSR hydration mismatch**
- Clear browser cache and local storage
- Ensure client and server render the same content
- Check for browser-only APIs used during SSR (wrap in `isServer` check)

## Related Packages

- `floorplan-viewer-core` - 3D viewer and UI components
- `floorplan-language` - DSL grammar and 2D rendering
- `floorplan-3d-core` - Three.js 3D rendering

## License

Licensed under BSL 1.1, converting to AGPL-3.0-or-later on 2030-02-23. See LICENSE.
