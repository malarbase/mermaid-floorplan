# Design: SolidStart Application with Better Auth and Convex

## Context

The mermaid-floorplan project needs authentication and cloud storage capabilities. This design document covers the architecture for a SolidStart full-stack application using Better Auth for authentication and Convex as the backend database.

### Key Constraints

1. **Solid.js Consistency**: Must align with `add-solidjs-ui-framework` patterns
2. **TypeScript-First**: No additional languages (stay in TypeScript ecosystem)
3. **Three.js Integration**: Viewer-core must render without interference
4. **Real-time Ready**: Architecture should support future collaboration
5. **Minimal Ops**: Prefer managed services over self-hosted

### Stakeholders

- **Users**: Need secure login and cloud floorplan storage
- **Developers**: Need cohesive TypeScript codebase
- **Embedders**: Existing viewer-core integrations must continue working

## Goals / Non-Goals

### Goals

- Create SolidStart application structure
- Integrate Better Auth for Google OAuth
- Set up Convex database with floorplan schema
- Embed floorplan-viewer-core in SolidStart pages
- Enable authenticated cloud storage of floorplans
- Deploy to Vercel with automatic CI/CD and preview deployments

### Non-Goals

- Real-time collaboration features (future proposal)
- Multiple OAuth providers (add after Google works)
- Mobile-specific optimizations
- Offline support
- Migrating existing GitHub Pages demo

## Decisions

### Decision 1: SolidStart over Next.js/Remix

**Choice:** SolidStart as the meta-framework

**Rationale:**
- Official framework for Solid.js (already chosen in add-solidjs-ui-framework)
- Same fine-grained reactivity model as viewer-core UI
- No virtual DOM (critical for Three.js performance)
- TypeScript-first design
- File-based routing with SSR support

**Alternatives Considered:**

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| SolidStart | Native Solid.js, fine-grained | Newer ecosystem | ✅ Chosen |
| Next.js | Mature, large ecosystem | React (virtual DOM) | ❌ |
| Remix | Good DX, loaders | React-based | ❌ |
| Astro | Great for content | Not full-stack | ❌ |

### Decision 2: Better Auth over Auth.js/Lucia

**Choice:** Better Auth for authentication

**Rationale:**
- First-class SolidStart integration via `toSolidStartHandler`
- Convex integration available (`@convex-dev/better-auth`)
- TypeScript-first with full type safety
- Supports OAuth, email/password, and advanced features (2FA, passkeys)
- Active development and good documentation

**Alternatives Considered:**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| Better Auth | SolidStart + Convex integration | Newer | ✅ Chosen |
| Auth.js | Popular, many providers | React-focused, complex | ❌ |
| Lucia | Lightweight | Manual integration | ❌ |
| Clerk | Managed service | Vendor lock-in, cost | ❌ |

**Integration Pattern:**
```typescript
// routes/api/auth/[...all].ts
import { auth } from "~/lib/auth";
import { toSolidStartHandler } from "better-auth/solid-start";

export const { GET, POST } = toSolidStartHandler(auth);
```

### Decision 3: Convex over Supabase/Firebase

**Choice:** Convex as the backend database

**Rationale:**
- Built-in real-time sync (no additional setup)
- Better Auth integration via `@convex-dev/better-auth`
- Type-safe serverless functions
- Automatic caching and optimistic updates
- Generous free tier
- Data export available (no lock-in)

**Alternatives Considered:**

| Service | Pros | Cons | Verdict |
|---------|------|------|---------|
| Convex | Real-time, type-safe, Better Auth | Newer | ✅ Chosen |
| Supabase | Postgres, open-source | No Better Auth integration | ❌ |
| Firebase | Google ecosystem | Vendor lock-in | ❌ |
| PlanetScale | Edge MySQL | No real-time | ❌ |

### Decision 4: convex-solidjs Community Package

**Choice:** Use `convex-solidjs` for Solid.js integration

**Rationale:**
- Provides Solid.js-specific hooks (`useQuery`, `useMutation`)
- Integrates with Solid's fine-grained reactivity
- Maintained and updated for Convex changes
- Can fork if maintenance lapses

**Pattern:**
```typescript
import { useQuery, useMutation } from "convex-solidjs";
import { api } from "~/convex/_generated/api";

function FloorplanList() {
  const floorplans = useQuery(api.floorplans.list);
  const saveFloorplan = useMutation(api.floorplans.save);
  // ...
}
```

### Decision 5: Vercel for Deployment

**Choice:** Vercel as the hosting platform

**Rationale:**
- First-class SolidStart support (official adapter)
- Full SSR capabilities (not just static)
- Automatic preview deployments for PRs
- Edge functions for API routes
- Generous free tier
- Better Auth works fully with server-side sessions

**Alternatives Considered:**

| Platform | Pros | Cons | Verdict |
|----------|------|------|---------|
| Vercel | Full SSR, preview deploys, Better Auth support | Different from API platform | ✅ Chosen |
| Wasmer Edge | Consistency with FastAPI | Static only, no SSR | ❌ |
| Cloudflare | Edge runtime | Limited Node APIs | ❌ |
| Netlify | Easy setup | Less SolidStart focus | ❌ |

### Decision 6: Embedding viewer-core

**Choice:** Create wrapper component that mounts viewer-core

**Pattern:**
```typescript
// components/FloorplanEmbed.tsx
import { onMount, onCleanup } from "solid-js";
import { FloorplanApp } from "floorplan-viewer-core";

export function FloorplanEmbed(props: { dsl: string; editable: boolean }) {
  let container: HTMLDivElement;
  let app: FloorplanApp;

  onMount(() => {
    app = new FloorplanApp({
      container,
      enableEditing: props.editable,
      isAuthenticated: true, // From auth context
    });
    app.loadFromDSL(props.dsl);
  });

  onCleanup(() => app?.destroy());

  return <div ref={container!} class="w-full h-full" />;
}
```

**Rationale:**
- Keeps Three.js rendering in vanilla (per add-solidjs-ui-framework isolation rule)
- SolidStart handles routing, auth, and data fetching
- Clean separation of concerns

## Risks / Trade-offs

### Risk 1: convex-solidjs Maintenance

**Impact:** Medium
**Likelihood:** Low

**Mitigation:**
- Package is actively maintained
- Can fork and maintain internally if needed
- Core Convex functionality works without it (just manual subscriptions)

### Risk 2: Convex Service Dependency

**Impact:** Medium
**Likelihood:** Low

**Mitigation:**
- Convex provides data export functionality
- Schema is standard relational-like structure
- Can migrate to self-hosted alternative if needed

### Risk 3: SolidStart Breaking Changes

**Impact:** Medium
**Likelihood:** Medium

**Mitigation:**
- Pin to stable versions
- SolidStart reached 1.0 (stable API)
- Follow migration guides when upgrading

### Risk 4: Better Auth + Convex Integration Complexity

**Impact:** Medium
**Likelihood:** Medium

**Mitigation:**
- Follow official integration guide closely
- Start with simple email/password, then add OAuth
- Test auth flows thoroughly

## Database Schema (GitHub-Inspired Versioning)

The schema uses a GitHub-inspired model with:
- **Users** - profiles with usernames (extends Better Auth)
- **Projects** (like repos) - container for a floorplan design
- **Versions** (like branches) - mutable named references
- **Snapshots** (like commits) - immutable content-addressable history

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Better Auth manages: sessions, accounts, verificationTokens
  // We extend with our own users table for usernames

  // User profiles (linked to Better Auth)
  users: defineTable({
    authId: v.string(),              // Better Auth user ID
    username: v.string(),            // Unique, URL-safe ("alice" or "u_a1b2c3d4")
    displayName: v.optional(v.string()), // "Alice Smith"
    avatarUrl: v.optional(v.string()),
    usernameSetAt: v.optional(v.number()), // null = still using temp ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_id", ["authId"])
    .index("by_username", ["username"]),

  // Released usernames (for grace period)
  releasedUsernames: defineTable({
    username: v.string(),
    originalUserId: v.id("users"),
    releasedAt: v.number(),
    expiresAt: v.number(),           // 90 days after release
  }).index("by_username", ["username"]),

  // Projects (like GitHub repos)
  projects: defineTable({
    userId: v.id("users"),         // Owner
    slug: v.string(),              // URL-safe name: "beach-house"
    displayName: v.string(),       // "Beach House Design"
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    defaultVersion: v.string(),    // "main" - like default branch
    thumbnail: v.optional(v.string()),
    forkedFrom: v.optional(v.id("projects")), // Source project if forked
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_slug", ["userId", "slug"])
    .index("by_user", ["userId", "updatedAt"])
    .index("by_public", ["isPublic", "updatedAt"]),

  // Versions (like Git branches - mutable pointers)
  versions: defineTable({
    projectId: v.id("projects"),
    name: v.string(),              // "main", "v1.0", "client-review"
    snapshotId: v.id("snapshots"), // Points to current snapshot
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project_name", ["projectId", "name"]),

  // Snapshots (like Git commits - immutable)
  snapshots: defineTable({
    projectId: v.id("projects"),
    contentHash: v.string(),       // SHA256 prefix for permalinks
    content: v.string(),           // DSL content
    message: v.optional(v.string()), // "Added kitchen island"
    parentId: v.optional(v.id("snapshots")), // For history chain
    authorId: v.string(),          // User who created this snapshot
    createdAt: v.number(),
  })
    .index("by_project", ["projectId", "createdAt"])
    .index("by_hash", ["projectId", "contentHash"]),

  // Project access control (invites)
  projectAccess: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
    invitedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  // Share links (for "anyone with link" access)
  shareLinks: defineTable({
    projectId: v.id("projects"),
    token: v.string(),             // Random URL-safe token
    role: v.union(v.literal("viewer"), v.literal("editor")),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_project", ["projectId"]),

  // Future: Multi-file support (design placeholder)
  // files: defineTable({
  //   snapshotId: v.id("snapshots"),
  //   path: v.string(),           // "main.floorplan", "styles/modern.floorplan"
  //   content: v.string(),
  // }).index("by_snapshot", ["snapshotId"]),
});
```

### URL Routing Structure

```
/u/{username}                              # User profile
/u/{username}/{project}                    # Project (default version)
/u/{username}/{project}/v/{version}        # Named version (mutable)
/u/{username}/{project}/s/{hash}           # Snapshot permalink (immutable)
/u/{username}/{project}/history            # Version history
/u/{username}/{project}/settings           # Project settings (owner only)
```

### URL Types Explained

| URL Type | Example | Behavior |
|----------|---------|----------|
| **Default** | `/u/alice/beach-house` | Shows `defaultVersion` (usually "main") |
| **Version** | `/u/alice/beach-house/v/client-review` | Mutable - always shows latest for that version |
| **Snapshot** | `/u/alice/beach-house/s/a1b2c3d4` | Immutable permalink - never changes |

### Versioning Flow

```
1. Create project "beach-house" → auto-creates "main" version
2. Edit & save → creates snapshot (hash: a1b2c3d4), "main" points to it
3. Create "client-review" version → points to same snapshot
4. Edit & save again → new snapshot (hash: e5f6g7h8), "main" updated
5. /v/main shows new, /v/client-review shows old, /s/a1b2c3d4 unchanged
```

## API Design

### Convex Functions

```typescript
// convex/projects.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { createHash } from "crypto";

// Generate content hash (first 8 chars of SHA256)
function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}

// List user's projects
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Get project by user slug and project slug
export const getBySlug = query({
  args: { username: v.string(), projectSlug: v.string() },
  handler: async (ctx, args) => {
    // Look up user by username (would need users table or Better Auth query)
    // For now, simplified - would need user lookup
    const project = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("slug"), args.projectSlug))
      .first();
    
    if (!project) return null;
    if (!project.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity || identity.subject !== project.userId) return null;
    }
    return project;
  },
});

// Create new project
export const create = mutation({
  args: {
    slug: v.string(),
    displayName: v.string(),
    content: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const now = Date.now();
    const hash = contentHash(args.content);

    // Create project
    const projectId = await ctx.db.insert("projects", {
      userId: identity.subject,
      slug: args.slug,
      displayName: args.displayName,
      description: "",
      isPublic: args.isPublic,
      defaultVersion: "main",
      createdAt: now,
      updatedAt: now,
    });

    // Create initial snapshot
    const snapshotId = await ctx.db.insert("snapshots", {
      projectId,
      contentHash: hash,
      content: args.content,
      message: "Initial version",
      authorId: identity.subject,
      createdAt: now,
    });

    // Create "main" version pointing to snapshot
    await ctx.db.insert("versions", {
      projectId,
      name: "main",
      snapshotId,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

// Save changes (create new snapshot, update version)
export const save = mutation({
  args: {
    projectId: v.id("projects"),
    versionName: v.string(),
    content: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    const now = Date.now();
    const hash = contentHash(args.content);

    // Get current version to find parent snapshot
    const version = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) => 
        q.eq("projectId", args.projectId).eq("name", args.versionName)
      )
      .first();

    // Create new snapshot
    const snapshotId = await ctx.db.insert("snapshots", {
      projectId: args.projectId,
      contentHash: hash,
      content: args.content,
      message: args.message,
      parentId: version?.snapshotId,
      authorId: identity.subject,
      createdAt: now,
    });

    // Update version to point to new snapshot
    if (version) {
      await ctx.db.patch(version._id, { snapshotId, updatedAt: now });
    }

    // Update project timestamp
    await ctx.db.patch(args.projectId, { updatedAt: now });

    return { snapshotId, hash };
  },
});

// Get snapshot by hash (for permalinks)
export const getByHash = query({
  args: { projectId: v.id("projects"), hash: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("snapshots")
      .withIndex("by_hash", (q) => 
        q.eq("projectId", args.projectId).eq("contentHash", args.hash)
      )
      .first();
  },
});

// Get version by name
export const getVersion = query({
  args: { projectId: v.id("projects"), versionName: v.string() },
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("versions")
      .withIndex("by_project_name", (q) => 
        q.eq("projectId", args.projectId).eq("name", args.versionName)
      )
      .first();
    
    if (!version) return null;
    
    const snapshot = await ctx.db.get(version.snapshotId);
    return { version, snapshot };
  },
});

// Get snapshot history for a project
export const getHistory = query({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("snapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
```

## Migration Plan

### Phase 1: Bootstrap (This Proposal)

1. Create `floorplan-app/` SolidStart project
2. Configure Convex project with schema
3. Integrate Better Auth with Convex adapter
4. Implement Google OAuth flow
5. Create basic floorplan CRUD
6. Embed viewer-core in editor page
7. Connect to Vercel for deployment

**Success Criteria:**
- User can sign in with Google
- User can save/load floorplans
- Viewer-core renders correctly
- Deployed and accessible on Vercel

### Phase 2: Enhanced Features (Future)

1. Add more OAuth providers (GitHub, Discord)
2. Implement version history
3. Add public floorplan sharing
4. Implement thumbnail generation
5. Add search/filter for floorplans

### Phase 3: Collaboration (Future)

1. Real-time presence indicators
2. Collaborative editing with conflict resolution
3. Comments and annotations
4. Team workspaces

### Rollback Plan

If SolidStart + Convex proves problematic:
1. Keep existing GitHub Pages demo as fallback
2. Data can be exported from Convex
3. Auth can be migrated to alternative service
4. Loss: ~2-3 weeks of development

## Open Questions

### Q1: Should we use SolidStart's server functions or Convex exclusively?

**Options:**
1. Convex only (all backend logic in Convex functions)
2. Hybrid (SolidStart server functions for some things, Convex for data)

**Decision:** Start with Convex only for simplicity. Add SolidStart server functions if needed for specific use cases (e.g., third-party API calls that shouldn't go through Convex).

### Q2: How to handle viewer-core updates?

**Options:**
1. Workspace dependency (`workspace:*`)
2. Published npm package
3. Copy into floorplan-app

**Decision:** Use workspace dependency for development. Consider publishing to npm for production use.

### Q3: What about existing GitHub Pages demo?

**Decision:** Keep both running initially:
- GitHub Pages: Read-only viewer, no auth
- Vercel app: Full-featured with auth and storage

Evaluate migrating or sunsetting after adoption.

## References

- [Research document](./research.md)
- [SolidStart Documentation](https://docs.solidjs.com/solid-start)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Convex Documentation](https://docs.convex.dev/)
- [add-solidjs-ui-framework](../add-solidjs-ui-framework/design.md)
