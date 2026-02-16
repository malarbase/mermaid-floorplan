# Floorplan App Context

## Tech Stack

- **SolidStart** (SSR)
- **Better Auth** + Google OAuth
- **Convex** (real-time backend)
- **floorplan-viewer-core** (3D viewer)
- **DaisyUI** + Tailwind CSS v4

## GitHub-Inspired Versioning

| Concept | Model |
|---------|-------|
| Projects | Like repos — container for a floorplan design |
| Versions | Like branches — mutable named references (e.g. "main") |
| Snapshots | Like commits — immutable content-addressable history |

## URL Structure

| Pattern | Purpose |
|--------|---------|
| `/u/{username}/{project}/v/{version}` | Version view (mutable) |
| `/u/{username}/{project}/s/{hash}` | Snapshot view (immutable) |

## FloorplanEmbed

Use `FloorplanEmbed` to embed the viewer-core in routes. Pass `initialData` or load from Convex.

## Dev Commands

```bash
npm run --workspace floorplan-app dev   # SolidStart dev server
npx convex dev                          # Convex backend
```

<!-- freshness
watches_hash: cf9b281
last_verified: 2026-02-17
watches:
  - floorplan-app/src/routes/*
  - floorplan-app/src/components/*
  - floorplan-app/convex/schema.ts
-->
