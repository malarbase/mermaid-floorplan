# Add SolidStart Application with Better Auth and Convex

## Why

The mermaid-floorplan project needs a full-stack application layer for user authentication, cloud storage, and collaboration features. The `add-solidjs-ui-framework` proposal establishes Solid.js for UI components - this proposal extends that foundation to a complete SolidStart application.

**Why SolidStart + Better Auth + Convex over FastAPI?**

1. **TypeScript Consistency**: Single language for frontend and backend (no Python)
2. **Natural Solid.js Integration**: SolidStart is the official meta-framework for Solid.js
3. **Managed Authentication**: Better Auth handles OAuth complexity (Google, GitHub, etc.)
4. **Real-time Database**: Convex provides automatic real-time sync for collaborative features
5. **Single Deployment**: One codebase, one deployment pipeline
6. **SSR Benefits**: Server-side rendering for SEO and faster initial loads

This approach aligns with the existing `add-solidjs-ui-framework` proposal and creates a cohesive full-stack TypeScript architecture.

## What Changes

### New Package: `floorplan-app/`

- Create new `floorplan-app/` SolidStart application
- File-based routing with SSR support
- Better Auth integration for Google OAuth (and future providers)
- Convex backend for user data and floorplan storage
- Embeds `floorplan-viewer-core` for 3D rendering

### Authentication (Better Auth)

- Google OAuth provider (initial)
- Session management with secure cookies
- Protected routes for authenticated features
- Auth state available to embedded viewer-core

### Backend (Convex) - GitHub-Inspired Versioning

- **Projects**: Container for floorplan designs (like GitHub repos)
- **Versions**: Named mutable references (like branches): "main", "client-review"
- **Snapshots**: Immutable content-addressable history (like commits)
- Public/private project sharing

### URL Structure

```
/u/{username}/{project}                    # Default version (usually "main")
/u/{username}/{project}/v/{version}        # Named version (mutable)
/u/{username}/{project}/s/{hash}           # Permalink (immutable)
/u/{username}/{project}/history            # Version history
```

**Examples:**
- `/u/alice/beach-house` → Latest on "main"
- `/u/alice/beach-house/v/client-review` → Mutable (updates when Alice saves)
- `/u/alice/beach-house/s/a1b2c3d4` → Permanent link (never changes)

### Deployment

- Vercel deployment (recommended for SolidStart SSR)
- Full server-side rendering support
- Preview deployments for pull requests
- Environment variables via Vercel dashboard

## Impact

### Affected Specs
- `interactive-editor`: Auth-Gated Edit Mode will use Better Auth sessions
- Future: New `cloud-storage` capability spec

### Affected Code
- No changes to existing packages in this proposal
- Future: `floorplan-viewer-core` may get auth context helpers

### Dependencies on Other Proposals
- **`add-solidjs-ui-framework`**: Must be implemented first (Solid.js foundation)
- This proposal builds on the Solid.js patterns established there

### New Files
```
floorplan-app/
├── src/
│   ├── app.tsx                   # Root component
│   ├── entry-client.tsx          # Client entry
│   ├── entry-server.tsx          # Server entry
│   ├── routes/
│   │   ├── index.tsx             # Home page
│   │   ├── editor.tsx            # Interactive editor
│   │   ├── viewer/[id].tsx       # View shared floorplan
│   │   ├── api/auth/[...all].ts  # Better Auth handler
│   │   └── (auth)/
│   │       ├── login.tsx         # Login page
│   │       └── callback.tsx      # OAuth callback
│   ├── components/
│   │   ├── FloorplanEmbed.tsx    # Wraps viewer-core
│   │   └── AuthProvider.tsx      # Auth context
│   └── lib/
│       ├── auth.ts               # Better Auth config
│       └── auth-client.ts        # Client auth instance
├── convex/
│   ├── schema.ts                 # Database schema
│   ├── convex.config.ts          # Convex + Better Auth
│   ├── auth.ts                   # Auth functions
│   └── floorplans.ts             # Floorplan CRUD
├── app.config.ts                 # SolidStart config
├── package.json
└── tsconfig.json

.github/workflows/deploy-app.yml  # Vercel deployment (optional, Vercel auto-deploys)
```

### Dependencies
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

### Breaking Changes
**None.** This is purely additive:
- New standalone package
- Existing packages unchanged
- Viewer-core integration is opt-in

## Non-Goals (This Phase)

- Migrating existing GitHub Pages demo (keep as-is)
- Team collaboration features (future proposal)
- Payment/subscription features
- Mobile app considerations

## Success Criteria

1. SolidStart app created with file-based routing
2. Google OAuth login works via Better Auth
3. User can save/load floorplans from Convex database
4. Embedded viewer-core renders 3D floorplans correctly
5. Protected routes require authentication
6. Deploy to Vercel with preview deployments

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| convex-solidjs community package | Medium | Well-maintained, can fork if needed |
| Convex service dependency | Medium | Data export available, standard schema |
| Better Auth learning curve | Low | Good docs, SolidStart integration is simple |
| SolidStart maturity | Low | Official Solid.js framework, actively developed |

## Relationship to Other Proposals

### vs FastAPI Proposal (`add-fastapi-backend`)

These are **alternative approaches** to backend services:

| Aspect | FastAPI + Wasmer | SolidStart + Convex |
|--------|------------------|---------------------|
| Language | Python + TypeScript | TypeScript only |
| Auth | Custom (Authlib) | Better Auth (managed) |
| Database | External (TBD) | Convex (built-in) |
| Real-time | Manual | Automatic |
| Deployment | Wasmer Edge | Vercel (SSR) |

**Recommendation:** Implement this proposal if prioritizing TypeScript consistency and real-time features.

### Integration with Tauri Desktop App (`add-tauri-desktop-app`)

This proposal integrates with the Tauri desktop app to create a **unified hybrid experience** (like Slack/Discord desktop apps):

**Hybrid Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Mode Selection (on startup)             │   │
│  │  ┌─────────────────┐    ┌─────────────────────┐     │   │
│  │  │ Sign In         │    │ Work Offline        │     │   │
│  │  │ (Cloud Mode)    │    │ (Local Mode)        │     │   │
│  │  └────────┬────────┘    └──────────┬──────────┘     │   │
│  └───────────┼─────────────────────────┼────────────────┘   │
│              │                         │                     │
│  ┌───────────▼───────────┐  ┌─────────▼─────────────┐      │
│  │ SolidStart Web App    │  │ Local Editor          │      │
│  │ (floorplan-app/)      │  │ (interactive-editor/) │      │
│  │ ────────────────────  │  │ ─────────────────────│      │
│  │ • Loads from Vercel   │  │ • Loads from bundle   │      │
│  │ • Better Auth login   │  │ • Native file dialogs │      │
│  │ • Convex cloud sync   │  │ • Recent files        │      │
│  │ • Real-time collab    │  │ • Full offline        │      │
│  └───────────────────────┘  └───────────────────────┘      │
│                                                              │
│  Native Features (both modes):                               │
│  • Native menu bar    • Auto-updates                        │
│  • File associations  • System notifications                │
└─────────────────────────────────────────────────────────────┘
```

**User Experience:**
1. **First launch**: User chooses "Sign In" or "Work Offline"
2. **Cloud Mode**: Loads SolidStart app from Vercel, full cloud features
3. **Offline Mode**: Loads bundled local editor, native file system
4. **Mode switch**: Settings menu allows switching modes
5. **Auto-fallback**: If offline, gracefully falls back to local mode

**Shared Capabilities:**
- Native menu bar works in both modes
- File associations (`.floorplan`) work in both modes
- Auto-updates work for the Tauri shell
- Same `viewer-core` rendering engine

**Implementation Notes:**
- Tauri can load external URLs (Cloud Mode) or local files (Offline Mode)
- Better Auth session detected to determine initial mode
- Convex client works in Tauri WebView (same as browser)
- Local mode uses existing `interactive-editor/` build

## References

- [Research document](./research.md)
- [SolidStart Documentation](https://docs.solidjs.com/solid-start)
- [Better Auth SolidStart](https://www.better-auth.com/docs/integrations/solid-start)
- [Better Auth Convex](https://www.better-auth.com/docs/integrations/convex)
- [Convex Documentation](https://docs.convex.dev/)
- [convex-solidjs](https://github.com/Frank-III/convex-solidjs)
- [add-solidjs-ui-framework](../add-solidjs-ui-framework/proposal.md)
