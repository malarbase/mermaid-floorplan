# Research: SolidStart Application with Better Auth and Convex

## Overview

This research explores building a full-stack SolidStart application for the mermaid-floorplan project, using Better Auth for authentication and Convex as the serverless backend/database.

## Technology Stack Analysis

### SolidStart

SolidStart is the official meta-framework for Solid.js, similar to Next.js for React:

**Key Features:**
- Server-Side Rendering (SSR) and Static Site Generation (SSG)
- File-based routing with nested layouts
- API routes for backend endpoints
- Edge deployment support (Vercel, Cloudflare, Netlify)
- Built on Solid.js fine-grained reactivity

**Why SolidStart for This Project:**
- Natural extension of `add-solidjs-ui-framework` proposal
- Same reactive model as viewer-core UI components
- TypeScript-first (consistent with project)
- Excellent Three.js integration (no virtual DOM interference)
- SSR for better SEO and initial load performance

**Reference:** [SolidStart Documentation](https://docs.solidjs.com/solid-start)

### Better Auth

Better Auth is a modern authentication library for JavaScript frameworks:

**Key Features:**
- Framework-agnostic with first-class SolidStart support
- OAuth providers (Google, GitHub, Discord, etc.)
- Email/password authentication
- Session management (cookie or JWT)
- TypeScript-first with full type safety
- Plugins for additional features (2FA, passkeys, etc.)

**SolidStart Integration:**
```typescript
// routes/api/auth/[...all].ts
import { auth } from "~/lib/auth";
import { toSolidStartHandler } from "better-auth/solid-start";

export const { GET, POST } = toSolidStartHandler(auth);
```

**Client-Side Usage:**
```typescript
import { createAuthClient } from "better-auth/solid";

const authClient = createAuthClient();

// In component
const session = authClient.useSession();
```

**Reference:** [Better Auth SolidStart Integration](https://www.better-auth.com/docs/integrations/solid-start)

### Convex

Convex is a serverless backend platform with real-time capabilities:

**Key Features:**
- Real-time data synchronization out of the box
- Serverless functions (queries, mutations, actions)
- Type-safe database with schema validation
- Built-in file storage
- Automatic caching and optimistic updates
- Better Auth integration via `@convex-dev/better-auth`

**Why Convex Over Traditional Backend:**
- No server management (truly serverless)
- Real-time sync perfect for collaborative features
- TypeScript throughout (functions + client)
- Generous free tier (suitable for development)
- Better Auth integration handles auth complexity

**SolidJS/SolidStart Integration:**
```typescript
// Using convex-solidjs (community package)
import { createConvexSolid, useQuery, useMutation } from "convex-solidjs";
import { api } from "~/convex/_generated/api";

// In component
const floorplans = useQuery(api.floorplans.list);
const saveFloorplan = useMutation(api.floorplans.save);
```

**Reference:** 
- [Convex Quickstart](https://docs.convex.dev/quickstart/nodejs)
- [convex-solidjs Package](https://github.com/Frank-III/convex-solidjs)

### Better Auth + Convex Integration

Better Auth can use Convex as its authentication database:

**Setup:**
```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

```typescript
// convex/auth.ts
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

export const authComponent = createClient(components.betterAuth);

export const createAuth = (ctx) => {
  return betterAuth({
    baseURL: process.env.SITE_URL,
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [convex({ authConfig })],
  });
};
```

**Reference:** [Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)

## Username Strategy

### First Login Flow

```
┌─────────────────────────────────────────────────────────┐
│  Welcome to Floorplan!                                  │
│                                                         │
│  Based on your GitHub account, we suggest:              │
│                                                         │
│  Username: [octocat________] ✓ Available                │
│                                                         │
│  Or choose your own:                                    │
│  • octocat-designs (available)                          │
│  • theoctocat (available)                               │
│                                                         │
│  [Skip for now]  [Claim @octocat]                       │
│                                                         │
│  ℹ️ You can always change this later                    │
└─────────────────────────────────────────────────────────┘
```

### Username Suggestion Sources

| Provider | Primary Suggestion | Fallback |
|----------|-------------------|----------|
| GitHub | GitHub username | `gh_` + username |
| Google | Email prefix (before @) | First name |
| Twitter/X | Twitter handle | `x_` + handle |
| Discord | Discord username | `dc_` + username |
| Generic | First name from profile | User ID |

### Suggestion Algorithm

```typescript
async function suggestUsername(profile: SocialProfile): Promise<string[]> {
  const candidates: string[] = [];
  
  // Primary: provider-specific username
  if (profile.provider === "github" && profile.username) {
    candidates.push(profile.username);
    candidates.push(`${profile.username}-designs`);
  }
  
  // Secondary: email prefix
  if (profile.email) {
    const prefix = profile.email.split("@")[0]
      .replace(/[^a-z0-9-]/gi, "")
      .toLowerCase();
    if (prefix.length >= 3) {
      candidates.push(prefix);
    }
  }
  
  // Tertiary: first name
  if (profile.name) {
    const firstName = profile.name.split(" ")[0].toLowerCase();
    if (firstName.length >= 3) {
      candidates.push(firstName);
    }
  }
  
  // Filter to available usernames
  const available: string[] = [];
  for (const candidate of candidates) {
    if (await isUsernameAvailable(candidate)) {
      available.push(candidate);
      if (available.length >= 3) break;
    }
  }
  
  return available;
}
```

### If User Skips

- Assigned temporary ID: `u_a1b2c3d4`
- Dashboard shows nudge: "Claim your username before someone else does!"
- URLs work but look impersonal: `/u/u_a1b2c3d4/beach-house`

### Username Change Policy (GitHub-style)

| Action | Behavior |
|--------|----------|
| First time setting | No restrictions (replacing temp ID) |
| Subsequent changes | Warning modal required |
| Old username | Reserved for 90 days, then released |
| Old URLs | Show "user renamed" page (no redirect) |

**Why no redirect?** Prevents username squatting - there's no incentive to claim someone's old username since you won't get their traffic.

### Validation Rules

```typescript
const USERNAME_RULES = {
  minLength: 3,
  maxLength: 39,  // GitHub's limit
  pattern: /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,38}$/i,
  reserved: ["admin", "api", "www", "help", "support", "settings", "new", "edit"],
};
```

---

## Collaboration & Sharing

### Access Levels

| Level | View | Edit | Share | Delete |
|-------|------|------|-------|--------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | - | - |
| Viewer | ✓ | - | - | - |
| Public (anyone) | ✓ | - | - | - |

### Sharing Methods

1. **Private (default)**: Only owner can access
2. **Invite by username**: Owner invites specific users
3. **Share link**: Anyone with link can view/edit (configurable)
4. **Public**: Listed publicly, anyone can view

### Forking

- Any viewable project can be forked
- Fork creates independent copy under your account
- Tracks `forkedFrom` for attribution
- No sync with original (unlike Git branches)

### Real-Time Collaboration (Convex Built-in)

Convex provides real-time sync automatically:
- Multiple viewers see same content
- Changes propagate instantly via reactive queries
- **Not included initially**: Cursor presence, conflict resolution

**Phase 1 (MVP):** Last-write-wins (simple, may lose edits)
**Phase 2 (Future):** CRDT-based merging for true collaboration

---

## Versioning Strategy (GitHub-Inspired)

### Why GitHub's Model?

GitHub's versioning model is well-understood by developers and provides:
- **Mutable references** (branches): Human-readable, can be updated
- **Immutable references** (commits): Permanent permalinks for sharing

### URL Structure

```
/u/{username}/{project}                    # Default version
/u/{username}/{project}/v/{version}        # Named version (mutable)
/u/{username}/{project}/s/{hash}           # Snapshot permalink (immutable)
/u/{username}/{project}/history            # Version history
```

### Two Types of Shareable URLs

| Type | URL Example | Behavior | Use Case |
|------|-------------|----------|----------|
| **Version** | `/u/alice/house/v/client-review` | Mutable - always shows latest | Bookmarks, ongoing collaboration |
| **Permalink** | `/u/alice/house/s/a1b2c3d4` | Immutable - never changes | Contracts, approvals, documentation |

### Data Model

```
Project (like repo)
├── Versions (like branches)
│   ├── "main" → Snapshot a1b2c3d4
│   ├── "client-review" → Snapshot e5f6g7h8
│   └── "v1.0" → Snapshot a1b2c3d4
└── Snapshots (like commits)
    ├── a1b2c3d4: "Initial design" (2024-01-15)
    ├── b2c3d4e5: "Added kitchen island" (2024-01-16)
    └── e5f6g7h8: "Client revisions" (2024-01-20)
```

### Multi-File Consideration (Future)

**Current design:** Single `.floorplan` file per project
**Future option:** Multiple files per snapshot

The schema is designed to support multi-file in the future:
```typescript
// Add when needed
files: defineTable({
  snapshotId: v.id("snapshots"),
  path: v.string(),   // "main.floorplan", "styles/modern.floorplan"
  content: v.string(),
})
```

**When to add multi-file:**
- When users need to share style libraries
- When single files become too large (1000+ rooms)
- When collaboration requires file-level locking

**Recommendation:** Start single-file, design schema to support multi-file later.

---

## Architecture Comparison

### Option A: FastAPI + Wasmer Edge (add-fastapi-backend)

```
┌─────────────────────────────────────────────────────┐
│ Frontend (existing viewer-core + Solid.js UI)       │
│ - Static hosting (GitHub Pages)                     │
│ - Calls API for auth                                │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP/REST
┌───────────────────────┴─────────────────────────────┐
│ FastAPI Backend (Wasmer Edge)                       │
│ - Python ASGI                                       │
│ - OAuth with Authlib                                │
│ - Separate deployment                               │
└─────────────────────────────────────────────────────┘
```

**Pros:**
- Separate concerns (frontend/backend)
- Python ecosystem for backend logic
- Edge deployment with Wasmer

**Cons:**
- Two deployment pipelines
- Two languages (TypeScript + Python)
- No real-time sync
- Manual CORS configuration

### Option B: SolidStart + Better Auth + Convex (this proposal)

```
┌─────────────────────────────────────────────────────┐
│ SolidStart App (unified full-stack)                 │
│ - Embeds floorplan-viewer-core                      │
│ - SSR for initial load                              │
│ - API routes handle auth                            │
│ - Deploy as single unit                             │
├───────────────────────┬─────────────────────────────┤
│ Better Auth           │ Convex Backend              │
│ - Google OAuth        │ - User data                 │
│ - Session management  │ - Floorplan storage         │
│ - TypeScript          │ - Real-time sync            │
└───────────────────────┴─────────────────────────────┘
```

**Pros:**
- Single TypeScript codebase
- Real-time collaboration ready
- Natural fit with add-solidjs-ui-framework
- SSR for SEO and performance
- One deployment pipeline

**Cons:**
- Depends on Convex service
- New framework to learn (SolidStart)
- Community packages (convex-solidjs) vs official

## Project Structure

```
floorplan-app/                    # New SolidStart package
├── src/
│   ├── app.tsx                   # Root component
│   ├── entry-client.tsx          # Client entry
│   ├── entry-server.tsx          # Server entry
│   ├── routes/
│   │   ├── index.tsx             # Home page
│   │   ├── editor.tsx            # Interactive editor
│   │   ├── viewer/[id].tsx       # View shared floorplan
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all].ts   # Better Auth handler
│   │   └── (auth)/
│   │       ├── login.tsx         # Login page
│   │       └── register.tsx      # Register page
│   ├── components/
│   │   ├── FloorplanEmbed.tsx    # Wraps viewer-core
│   │   └── AuthProvider.tsx      # Auth context
│   └── lib/
│       ├── auth.ts               # Better Auth config
│       └── auth-client.ts        # Client auth instance
├── convex/
│   ├── schema.ts                 # Database schema
│   ├── convex.config.ts          # Convex + Better Auth
│   ├── auth.config.ts            # Auth provider config
│   ├── auth.ts                   # Auth functions
│   └── floorplans.ts             # Floorplan CRUD
├── app.config.ts                 # SolidStart config
├── package.json
└── tsconfig.json
```

## Database Schema (Convex)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Better Auth manages these tables automatically
  // Users, sessions, accounts, etc.

  // Custom tables
  floorplans: defineTable({
    userId: v.string(),
    name: v.string(),
    content: v.string(),       // DSL content
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  floorplanVersions: defineTable({
    floorplanId: v.id("floorplans"),
    content: v.string(),
    createdAt: v.number(),
    message: v.optional(v.string()),
  }).index("by_floorplan", ["floorplanId"]),
});
```

## Authentication Flow

1. **User clicks "Sign in with Google"**
   - SolidStart route redirects to Better Auth
   - Better Auth redirects to Google OAuth consent

2. **Google callback**
   - Better Auth receives code, exchanges for tokens
   - Creates/updates user in Convex database
   - Sets session cookie

3. **Authenticated requests**
   - Session cookie sent automatically
   - Convex functions verify session via Better Auth
   - User data available in queries/mutations

## Deployment Options

| Platform | Pros | Cons |
|----------|------|------|
| **Vercel** | First-class SolidStart support, SSR, preview deploys | Different platform than FastAPI |
| **Wasmer Edge** | Consistent with API | Static only, no SSR |
| **Cloudflare Pages** | Edge runtime, generous free tier | Limited Node.js APIs |
| **Netlify** | Easy setup, good free tier | Less SolidStart focus |

**Recommendation:** Use Vercel for SolidStart because:
1. Full SSR support (Better Auth needs server-side sessions)
2. Official SolidStart adapter
3. Preview deployments for PR reviews
4. Zero-config deployment

### Vercel Deployment

Vercel auto-detects SolidStart and configures appropriately.

**Setup:**
1. Link GitHub repository to Vercel
2. Vercel detects SolidStart, configures build
3. Add environment variables (CONVEX_URL, BETTER_AUTH_SECRET)
4. Deploy automatically on push

**Environment Variables:**
```
CONVEX_URL=https://your-project.convex.cloud
BETTER_AUTH_SECRET=<generated-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
```

**Local Development:**
```bash
cd floorplan-app
npm install
npm run dev
# Access at http://localhost:3000
```

## Integration with Existing Codebase

### Embedding viewer-core

```typescript
// src/components/FloorplanEmbed.tsx
import { onMount, onCleanup, createSignal } from "solid-js";
import { FloorplanApp } from "floorplan-viewer-core";

export function FloorplanEmbed(props: { dsl: string; editable: boolean }) {
  let container: HTMLDivElement;
  let app: FloorplanApp;

  onMount(() => {
    app = new FloorplanApp({
      container,
      enableEditing: props.editable,
      isAuthenticated: true, // From auth context
      onAuthRequired: async () => {
        // Redirect to login page
        window.location.href = "/login";
        return false;
      },
    });
    app.loadFromDSL(props.dsl);
  });

  onCleanup(() => {
    app?.destroy();
  });

  return <div ref={container!} class="w-full h-full" />;
}
```

### Auth-aware routes

```typescript
// src/routes/editor.tsx
import { createAsync, redirect } from "@solidjs/router";
import { getAuthSession } from "~/lib/auth-server";

export const route = {
  preload: async () => {
    const session = await getAuthSession();
    if (!session) throw redirect("/login");
  },
};

export default function EditorPage() {
  // ... authenticated editor UI
}
```

## Dependencies

```json
{
  "dependencies": {
    "solid-js": "^1.9.0",
    "@solidjs/start": "^1.0.0",
    "@solidjs/router": "^0.14.0",
    "better-auth": "^1.0.0",
    "convex": "^1.25.0",
    "@convex-dev/better-auth": "^0.1.0",
    "convex-solidjs": "^0.1.0",
    "floorplan-viewer-core": "workspace:*"
  }
}
```

## Comparison Summary

| Aspect | FastAPI + Wasmer | SolidStart + Convex |
|--------|------------------|---------------------|
| **Language** | Python + TypeScript | TypeScript only |
| **Auth** | Custom (Authlib) | Better Auth (managed) |
| **Database** | External (TBD) | Convex (built-in) |
| **Real-time** | Manual websockets | Automatic |
| **Deployment** | Wasmer Edge | Vercel (SSR) |
| **Learning Curve** | Wasmer, FastAPI | SolidStart, Convex |
| **Cost** | Wasmer free tier | Vercel + Convex free tier |
| **Solid.js Fit** | Separate frontend | Native integration |

## Integration with Tauri Desktop App (Hybrid Mode)

The `add-tauri-desktop-app` proposal is updated to support a **hybrid architecture** (like Slack/Discord desktop apps):

### Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Mode Selection                           │  │
│  │   ┌─────────────────┐      ┌─────────────────────┐       │  │
│  │   │ ☁️  Sign In      │      │ 💾 Work Offline     │       │  │
│  │   │   (Cloud Mode)  │      │   (Local Mode)      │       │  │
│  │   └────────┬────────┘      └──────────┬──────────┘       │  │
│  └────────────┼───────────────────────────┼──────────────────┘  │
│               │                           │                      │
│  ┌────────────▼────────────┐  ┌──────────▼──────────────┐      │
│  │   CLOUD MODE            │  │   OFFLINE MODE          │      │
│  │   ────────────          │  │   ────────────          │      │
│  │   Loads SolidStart      │  │   Loads bundled         │      │
│  │   from Vercel           │  │   interactive-editor    │      │
│  │                         │  │                         │      │
│  │   • Better Auth login   │  │   • Native file dialogs │      │
│  │   • Convex cloud sync   │  │   • Recent files list   │      │
│  │   • Real-time collab    │  │   • Full offline        │      │
│  │   • Cross-device sync   │  │   • No account needed   │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                  │
│  Native Features (both modes):                                   │
│  • Native menu bar    • File associations (.floorplan)          │
│  • Auto-updates       • System notifications                    │
│  • Keyboard shortcuts • Window management                       │
└─────────────────────────────────────────────────────────────────┘
```

### User Experience

| Scenario | Mode | Behavior |
|----------|------|----------|
| First launch | Choice | Modal: "Sign In" or "Work Offline" |
| Signed in, online | Cloud | SolidStart app with full cloud features |
| Not signed in | Offline | Local editor with native file system |
| Network disconnected | Auto-fallback | Prompts to switch to Offline Mode |
| Settings → Switch Mode | Either | Can change modes anytime |

### Implementation Notes

**Cloud Mode:**
- Tauri WebView loads `https://floorplan-app.vercel.app`
- Better Auth handles authentication
- Convex client works in Tauri WebView (same as browser)
- Native menu sends IPC to SolidStart

**Offline Mode:**
- Tauri serves bundled `interactive-editor/dist`
- Native file dialogs for open/save
- Local recent files stored in app data
- No account or network required

**Shared:**
- Same Tauri shell, menus, and window management
- Same auto-updater for the desktop app itself
- Same file associations for `.floorplan` files

### Benefits of Hybrid Approach

1. **Best of both worlds**: Cloud sync when online, full offline when needed
2. **User choice**: Power users can skip cloud, casual users get sync
3. **Graceful degradation**: Network issues don't break the app
4. **Single installer**: One download, two modes
5. **Familiar pattern**: Users expect this from Slack, Discord, Notion

## Recommendation

For the mermaid-floorplan project, **SolidStart + Better Auth + Convex** is recommended because:

1. **TypeScript-only**: Consistent with project's TypeScript-first approach
2. **Solid.js Native**: Natural extension of `add-solidjs-ui-framework`
3. **Real-time Ready**: Convex enables future collaboration features
4. **Simpler Auth**: Better Auth handles OAuth complexity
5. **Single Codebase**: Easier maintenance and deployment

However, **both proposals are valid** and serve different use cases:
- **FastAPI**: Better if Python backend skills are available, or if more backend flexibility is needed
- **SolidStart + Convex**: Better for TypeScript-focused teams wanting rapid full-stack development

## References

- [SolidStart Documentation](https://docs.solidjs.com/solid-start)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth SolidStart Integration](https://www.better-auth.com/docs/integrations/solid-start)
- [Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)
- [Convex Documentation](https://docs.convex.dev/)
- [convex-solidjs GitHub](https://github.com/Frank-III/convex-solidjs)
- [add-solidjs-ui-framework](../add-solidjs-ui-framework/proposal.md)
