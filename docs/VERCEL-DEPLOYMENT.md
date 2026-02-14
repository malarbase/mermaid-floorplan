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
4. Note the **deployment URL** (e.g., `https://happy-animal-123.convex.cloud`)
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

In Vercel Dashboard > Project Settings > Environment Variables, add these **6 secrets**:

| Variable | Value | Environments |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | `prod:your-project\|eyJ...` (from Step 2) | Production |
| `VITE_CONVEX_URL` | `https://happy-animal-123.convex.cloud` (from Step 2) | All |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` | All |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` (your Vercel domain) | Production |
| `GOOGLE_CLIENT_ID` | From Step 1 | All |
| `GOOGLE_CLIENT_SECRET` | From Step 1 | All |

> **Note:** On the first deploy you won't know the exact domain yet. Deploy once, note the domain Vercel assigns (e.g., `https://floorplan-app-xyz.vercel.app`), then update `BETTER_AUTH_URL` and redeploy.

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

## Step 5: Configure Convex Auth for Production

The current `convex/auth.config.ts` uses a dev-only custom JWT provider. For production with Better Auth, you'll need to add a production provider alongside the dev one.

The `@convex-dev/better-auth` package in your dependencies handles this bridge — see its docs for the exact provider config to add.

---

## Step 6 (Optional): Set Convex Server Env Variables

Some features need server-side env vars in Convex itself (not Vercel):

```bash
# Set super admin email in Convex
npx convex env set SUPER_ADMIN_EMAIL "your@email.com"
```

---

## Quick Reference: What Goes Where

| Service | What to configure | How |
|---|---|---|
| **GitHub** | Nothing needed | Vercel connects to your repo directly |
| **Vercel** | 6 env vars + build settings | Dashboard > Project Settings |
| **Convex** | Deploy key + env vars | Dashboard > Settings |
| **Google Cloud** | OAuth client + redirect URIs | Cloud Console > Credentials |

> **Note:** GitHub Secrets are not needed. Vercel manages its own secrets. The only reason to add GitHub secrets is if you run `convex deploy` from a GitHub Actions CI job independently of Vercel.

---

## After Deploy Checklist

- [ ] Visit `https://your-app.vercel.app` — should load the home page with SSR
- [ ] Click "Sign in with Google" — should redirect through OAuth flow
- [ ] After sign-in, confirm you land on `/dashboard`
- [ ] Check Convex Dashboard > Data — confirm user was created
- [ ] (Optional) Set up a custom domain in Vercel > Domains, then update `BETTER_AUTH_URL` and Google OAuth URIs

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

- Ensure `BETTER_AUTH_SECRET` is set and consistent across deploys
- Ensure `BETTER_AUTH_URL` matches your actual Vercel domain

### Convex Connection Issues

- Verify `VITE_CONVEX_URL` is correct (visible in browser console as it's a `VITE_` variable)
- Check Convex Dashboard for deployment status and logs
