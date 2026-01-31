# Task: Implement add-solidstart-app

## Context Files (re-read at the start of each iteration)

- `openspec/changes/add-solidstart-app/proposal.md` - WHY we're building this (SolidStart app with Better Auth + Convex)
- `openspec/changes/add-solidstart-app/design.md` - HOW to implement (architecture decisions, schema, patterns)
- `openspec/changes/add-solidstart-app/tasks.md` - WHAT to do (147 tasks across 12 phases)
- `CLAUDE.md` - Project architecture rules (Solid.js integration, Three.js isolation)

## Workspace Structure

This is a monorepo with npm workspaces:
- `floorplan-language/` - Grammar and rendering (Langium + SVG)
- `floorplan-viewer-core/` - 3D viewer with Solid.js UI components
- `floorplan-mcp-server/` - MCP server for AI tools
- `floorplan-app/` - **NEW** - SolidStart full-stack app (to be created)

## Key Technologies

- **Framework**: SolidStart (file-based routing, SSR)
- **UI**: Solid.js + DaisyUI + Tailwind CSS v4
- **Auth**: Better Auth with Google OAuth + Convex integration
- **Database**: Convex (real-time, serverless)
- **Deployment**: Vercel
- **3D Rendering**: Three.js via `floorplan-viewer-core` (workspace dependency)

## Critical Architectural Rules

1. **Three.js Isolation**: NEVER use Solid.js for 3D rendering. Keep Three.js in vanilla classes, Solid.js only for UI.
2. **Viewer-Core Embedding**: Use wrapper component with `onMount` for FloorplanApp initialization, `onCleanup` for disposal.
3. **GitHub-Inspired Versioning**: Projects → Versions (mutable) → Snapshots (immutable content-addressable history).
4. **URL Structure**: `/u/{username}/{project}/v/{version}` (mutable), `/u/{username}/{project}/s/{hash}` (permalink)

## Task Execution Instructions

1. **Read tasks.md** to find the next incomplete task (marked `- [ ]`)
2. **Implement the task** following the patterns in design.md
3. **Verify your work**:
   - Run `npm run build` from workspace root (must succeed)
   - Run `npm test` if tests exist (must pass)
   - Check TypeScript errors with `npm run typecheck` (if available)
4. **Mark task complete** by changing `- [ ]` to `- [x]` in tasks.md
5. **Commit your changes** with a descriptive message (e.g., "feat: create SolidStart project structure")
6. **Repeat** until all 147 tasks are done

## Phase Execution Strategy

Tasks are organized into 12 phases. Work sequentially through each phase:

1. **Project Setup** (1.1-1.6) - Bootstrap SolidStart app
2. **Convex Setup** (2.1-2.9) - Database schema and connection
3. **Better Auth Setup** (3.1-3.7) - Authentication configuration
4. **Auth Routes** (4.1-4.6) - OAuth flow and login pages
4b. **Username Management** (4b.1-4b.8) - Profile and username handling
5. **Routes & URL Structure** (5.1-5.10) - File-based routing for versioning
6. **Viewer-Core Integration** (6.1-6.6) - Embed 3D renderer
7. **Project CRUD & Versioning** (7.1-7.6) - Core CRUD operations
7b. **Version Management** (7b.1-7b.6) - Branch/version features
7c. **Collaboration & Sharing** (7c.1-7c.8) - Access control and sharing
8. **UI/Styling** (8.1-8.6) - DaisyUI components and theming
9. **Vercel Deployment** (9.1-9.6) - Production deployment
10. **Testing** (10.1-10.6) - Test coverage
11. **Documentation** (11.1-11.6) - README and guides
12. **Verification** (12.1-12.6) - End-to-end testing

## Important Implementation Notes

### Schema Reference (from design.md)

The database uses GitHub-inspired versioning:
- `users` - Extended Better Auth users with usernames
- `releasedUsernames` - 90-day grace period for released usernames
- `projects` - Container for floorplan designs (like repos)
- `versions` - Mutable named references (like branches): "main", "client-review"
- `snapshots` - Immutable content-addressable history (like commits)
- `projectAccess` - Collaboration access control
- `shareLinks` - "Anyone with link" sharing

### Viewer-Core Embedding Pattern

```typescript
// components/FloorplanEmbed.tsx
import { onMount, onCleanup } from "solid-js";
import { FloorplanAppCore } from "floorplan-viewer-core";

export function FloorplanEmbed(props: { dsl: string }) {
  let container: HTMLDivElement;
  let app: FloorplanAppCore;

  onMount(() => {
    app = new FloorplanAppCore({
      containerId: container.id,
      initialTheme: 'dark',
      initialDsl: props.dsl,
    });
  });

  onCleanup(() => app?.destroy?.());

  return <div ref={container!} id="floorplan-container" class="w-full h-full" />;
}
```

### Better Auth + Convex Integration Pattern

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);
export default app;

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { convexAdapter } from "@convex-dev/better-auth";

export const auth = betterAuth({
  database: convexAdapter(/* ... */),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

## Success Criteria (must ALL be true before outputting completion)

- [ ] All 147 tasks in tasks.md are marked `[x]`
- [ ] `npm run build` succeeds from workspace root
- [ ] `npm test` passes (or no test errors)
- [ ] No TypeScript errors
- [ ] Google OAuth login flow works (can be tested locally)
- [ ] User can create, save, and load floorplans from Convex
- [ ] Viewer-core renders 3D floorplans correctly in SolidStart pages
- [ ] Protected routes require authentication
- [ ] Vercel deployment configuration is complete

## Verification Commands

Run these before marking completion:

```bash
# From workspace root
npm run build                    # Must succeed
npm test                         # Must pass (if tests exist)
npm run typecheck                # No TypeScript errors (if script exists)

# From floorplan-app/
npm run dev                      # Should start without errors
npx convex dev                   # Should connect (requires CONVEX_URL)
```

## Completion Signal

When ALL tasks are marked `[x]` and ALL success criteria are met, output:

<promise>COMPLETE</promise>

## Notes

- This is a large change (147 tasks). Take it one phase at a time.
- If stuck, re-read the context files for guidance.
- Prioritize getting basic functionality working before polish.
- Keep commits atomic and descriptive.
- Update tasks.md frequently to track progress.
