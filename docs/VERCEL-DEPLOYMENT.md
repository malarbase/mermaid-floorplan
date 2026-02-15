# Vercel Deployment Guide

Full deployment guide for `floorplan-app` to Vercel with SSR, Google OAuth, and Convex backend.

## Overview

There are **4 services to set up**, in this order (each depends on the previous):

```
1. Google Cloud (OAuth)     ← standalone, no dependencies
2. Convex Cloud (database)  ← standalone, no dependencies
3. Vercel (hosting)         ← needs Google + Convex credentials
4. Google Cloud (update redirect URIs) ← needs Vercel URL
```

## Why Vercel (Not GitHub Pages)?

GitHub Pages serves **static files only** — no server-side code. The `floorplan-app` has three things that conflict with this:

| Dependency | Why It's a Problem for GitHub Pages |
|---|---|
| **SSR (`ssr: true`)** | GitHub Pages can't run server-side rendering |
| **Better Auth (Google OAuth)** | Needs server-side callback routes (`/api/auth/callback/google`) |
| **Vercel preset** | Generates serverless functions, not static files |

Convex itself is fine — it's a separate hosted service the client talks to via `VITE_CONVEX_URL`.

The app is **already configured for Vercel** (`preset: 'vercel'` in `app.config.ts`), so zero code changes are needed.

---

## Step 1: Google OAuth Credentials

You may already have these from development. If not:

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. **OAuth consent screen** > External > fill in:
   - App name
   - User support email
   - Developer contact email
   - Scopes: `email`, `profile`, `openid`
4. **Create OAuth 2.0 Client ID** > Web application
   - Leave the redirect URIs **blank for now** — you'll add them after Vercel gives you a domain
5. Save your **Client ID** and **Client Secret**

---

## Step 2: Convex Cloud Setup

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev) and create an account/project
2. From `floorplan-app/`, run:

```bash
npx convex login
npx convex dev
```

3. Select "Create a new project" when prompted
4. Note two URLs from the Convex Dashboard:
   - **Deployment URL** (e.g., `https://happy-animal-123.convex.cloud`) — for the WebSocket API
   - **Site URL** (e.g., `https://happy-animal-123.convex.site`) — for HTTP actions (auth proxy)
5. **Generate a Production Deploy Key**:
   - Convex Dashboard > Your Project > Settings > Deploy Keys
   - Click "Generate Production Deploy Key"
   - Save it (format: `prod:your-project|eyJ...`)

Your Convex functions won't be deployed to production yet — that happens as part of the Vercel build.

---

## Step 3: Deploy to Vercel

### 3a. Create the Vercel Project

1. Go to [vercel.com](https://vercel.com) > "Add New..." > "Project"
2. Import the `mermaid-floorplan` GitHub repo
3. Configure:
   - **Root Directory**: click Edit, set to `floorplan-app`
   - **Build Command**: `npx convex deploy --cmd 'npm run build'`
   - **Install Command**: `cd .. && npm install`
   - **Output Directory**: `.output`

The build command is key — it deploys Convex functions first, then builds the SolidStart app.

### 3b. Add Environment Variables

In Vercel Dashboard > Project Settings > Environment Variables, add these **7 variables**:

| Variable | Value | Environments | Used by |
|---|---|---|---|
| `CONVEX_DEPLOY_KEY` | `prod:your-project\|eyJ...` (from Step 2) | Production | Convex CLI |
| `VITE_CONVEX_URL` | `https://happy-animal-123.convex.cloud` (from Step 2) | All | Browser Convex client |
| `VITE_CONVEX_SITE_URL` | `https://happy-animal-123.convex.site` (from Step 2) | All | SolidStart auth proxy |
| `VITE_BETTER_AUTH_URL` | `https://your-app.vercel.app` (your Vercel domain) | Production | Browser auth client |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` | All | SolidStart server |
| `GOOGLE_CLIENT_ID` | From Step 1 | All | SolidStart server |
| `GOOGLE_CLIENT_SECRET` | From Step 1 | All | SolidStart server |

> **Note:** On the first deploy you won't know the exact domain yet. Deploy once, note the domain Vercel assigns (e.g., `https://floorplan-app-xyz.vercel.app`), then update `VITE_BETTER_AUTH_URL` and redeploy.

### 3c. Deploy

Click "Deploy". The build will:

1. Run `npm install` (including monorepo workspace deps)
2. Run `npx convex deploy` (pushes your schema + functions to Convex Cloud)
3. Run `npm run build` (builds the SolidStart SSR app)

---

## Step 4: Update Google OAuth Redirect URIs

Now that you have your Vercel URL:

1. Go back to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add:
   - **Authorized JavaScript origins**: `https://your-app.vercel.app`
   - **Authorized redirect URIs**: `https://your-app.vercel.app/api/auth/callback/google`
4. Save

---

## Step 5: Set Convex Server Environment Variables

Convex functions run in the Convex cloud, not on Vercel — they need their own environment variables. These are **required** for auth to work.

```bash
# Required: Auth configuration
npx convex env set SITE_URL "https://your-app.vercel.app"
npx convex env set CONVEX_SITE_URL "https://happy-animal-123.convex.site"
npx convex env set BETTER_AUTH_SECRET "same-secret-as-vercel"
npx convex env set GOOGLE_CLIENT_ID "your-client-id.apps.googleusercontent.com"
npx convex env set GOOGLE_CLIENT_SECRET "GOCSPX-your-client-secret"

# Optional: Admin features
npx convex env set SUPER_ADMIN_EMAIL "your@email.com"
```

| Variable | Purpose | Source file |
|---|---|---|
| `SITE_URL` | Better Auth base URL for cookie/redirect handling | `convex/auth.ts`, `convex/http.ts` |
| `CONVEX_SITE_URL` | OIDC discovery endpoint redirect | `convex/http.ts` |
| `BETTER_AUTH_SECRET` | Session encryption (must match Vercel's value) | `convex/auth.ts` |
| `GOOGLE_CLIENT_ID` | Google OAuth provider | `convex/auth.ts` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth provider | `convex/auth.ts` |
| `SUPER_ADMIN_EMAIL` | (Optional) Grants super admin to this email | `convex/lib/auth.ts` |

> **Important:** `BETTER_AUTH_SECRET` must be the **same value** in both Vercel and Convex.

---

## Quick Reference: What Goes Where

| Service | What to configure | How |
|---|---|---|
| **GitHub** | Nothing needed | Vercel connects to your repo directly |
| **Vercel** | 7 env vars + build settings | Dashboard > Project Settings |
| **Convex** | Deploy key + 5 server env vars | Dashboard > Settings + `npx convex env set` |
| **Google Cloud** | OAuth client + redirect URIs | Cloud Console > Credentials |

> **Note:** GitHub Secrets are not needed. Vercel manages its own secrets. The only reason to add GitHub secrets is if you run `convex deploy` from a GitHub Actions CI job independently of Vercel.

---

## After Deploy Checklist

- [ ] Visit `https://your-app.vercel.app` — should load the home page with SSR
- [ ] Click "Sign in with Google" — should redirect through OAuth flow
- [ ] After sign-in, confirm you land on `/dashboard`
- [ ] Check Convex Dashboard > Data — confirm user was created
- [ ] Go to Settings > Sessions — verify current session shows with "Current" badge
- [ ] (Optional) Set up a custom domain in Vercel > Domains, then update `VITE_BETTER_AUTH_URL`, `SITE_URL`, and Google OAuth URIs

---

## Preview Deployments (Optional)

For preview deployments (one Convex backend per PR):

1. Generate a **Preview Deploy Key** from Convex Dashboard
2. Add `CONVEX_DEPLOY_KEY` for **Preview environment** in Vercel
3. Each PR will get an isolated Convex backend
4. Preview backends auto-delete after 5 days (14 days on Pro plan)

---

## Troubleshooting

### Build Fails with Convex Errors

- Ensure `CONVEX_DEPLOY_KEY` is set in Vercel env vars
- Verify the key format: `prod:your-project|eyJ...`

### OAuth Redirect Mismatch

- Redirect URIs must match **exactly** (including `https://` and no trailing slash)
- Both JavaScript origins and redirect URIs must be set in Google Cloud Console

### Session Not Persisting

- Ensure `BETTER_AUTH_SECRET` is set and **identical** in both Vercel and Convex
- Ensure `SITE_URL` in Convex matches your actual Vercel domain
- Ensure `VITE_BETTER_AUTH_URL` in Vercel matches your actual domain

### Auth Proxy Returning 503

- Verify `VITE_CONVEX_SITE_URL` is set in Vercel (the `.convex.site` URL, not `.convex.cloud`)
- Check that `SITE_URL` and `CONVEX_SITE_URL` are set in Convex server env vars

### Convex Connection Issues

- Verify `VITE_CONVEX_URL` is correct (visible in browser console as it's a `VITE_` variable)
- Check Convex Dashboard for deployment status and logs
