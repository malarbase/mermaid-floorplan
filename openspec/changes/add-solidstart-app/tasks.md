## 1. Project Setup

- [ ] 1.1 Create `floorplan-app/` directory at workspace root
- [ ] 1.2 Initialize SolidStart project with `npm create solid@latest`
- [ ] 1.3 Configure `app.config.ts` with SSR settings
- [ ] 1.4 Add workspace dependency on `floorplan-viewer-core`
- [ ] 1.5 Configure TypeScript for Solid JSX
- [ ] 1.6 Create `floorplan-app/README.md` with development instructions

## 2. Convex Setup

- [ ] 2.1 Install Convex dependencies (`convex`, `convex-solidjs`)
- [ ] 2.2 Initialize Convex project with `npx convex init`
- [ ] 2.3 Create `convex/schema.ts` with users, projects, versions, snapshots tables
- [ ] 2.4 Add projectAccess and shareLinks tables for collaboration
- [ ] 2.5 Add releasedUsernames table for username grace period
- [ ] 2.6 Create `convex/projects.ts` with CRUD and versioning functions
- [ ] 2.7 Implement content hash generation for permalinks
- [ ] 2.8 Create ConvexProvider wrapper component
- [ ] 2.9 Test Convex connection locally with `npx convex dev`

## 3. Better Auth Setup

- [ ] 3.1 Install Better Auth dependencies (`better-auth`, `@convex-dev/better-auth`)
- [ ] 3.2 Register Better Auth component in `convex/convex.config.ts`
- [ ] 3.3 Create `convex/auth.config.ts` with provider configuration
- [ ] 3.4 Create `convex/auth.ts` with auth client and createAuth
- [ ] 3.5 Set environment variables (BETTER_AUTH_SECRET, SITE_URL)
- [ ] 3.6 Create `src/lib/auth.ts` with Better Auth instance
- [ ] 3.7 Create `src/lib/auth-client.ts` with client-side auth

## 4. Auth Routes

- [ ] 4.1 Create `routes/api/auth/[...all].ts` with toSolidStartHandler
- [ ] 4.2 Create `routes/(auth)/login.tsx` login page
- [ ] 4.3 Create `routes/(auth)/callback.tsx` OAuth callback handler
- [ ] 4.4 Add Google OAuth configuration to Better Auth
- [ ] 4.5 Test Google OAuth flow end-to-end
- [ ] 4.6 Add logout functionality

## 4b. Username Management

- [ ] 4b.1 Create `convex/users.ts` with user profile functions
- [ ] 4b.2 Implement username suggestion from social profile
- [ ] 4b.3 Implement username availability check (including grace period)
- [ ] 4b.4 Create first-login username selection modal
- [ ] 4b.5 Implement username change with confirmation modal
- [ ] 4b.6 Add released username tracking for 90-day grace period
- [ ] 4b.7 Create "user renamed" page for old username URLs
- [ ] 4b.8 Add dashboard nudge for users with temp usernames

## 5. Routes & URL Structure

- [ ] 5.1 Create auth middleware for protected routes
- [ ] 5.2 Create `routes/index.tsx` home page (public)
- [ ] 5.3 Create `routes/u/[username]/index.tsx` user profile
- [ ] 5.4 Create `routes/u/[username]/[project]/index.tsx` project view (default version)
- [ ] 5.5 Create `routes/u/[username]/[project]/v/[version].tsx` version view
- [ ] 5.6 Create `routes/u/[username]/[project]/s/[hash].tsx` snapshot permalink
- [ ] 5.7 Create `routes/u/[username]/[project]/history.tsx` version history
- [ ] 5.8 Create `routes/dashboard.tsx` user dashboard (protected)
- [ ] 5.9 Create `routes/new.tsx` create new project (protected)
- [ ] 5.10 Add navigation with auth-aware links

## 6. Viewer-Core Integration

- [ ] 6.1 Create `components/FloorplanEmbed.tsx` wrapper
- [ ] 6.2 Handle onMount for FloorplanApp initialization
- [ ] 6.3 Handle onCleanup for proper disposal
- [ ] 6.4 Pass auth state to FloorplanApp options
- [ ] 6.5 Wire up onAuthRequired callback to redirect to login
- [ ] 6.6 Test 3D rendering in SolidStart page

## 7. Project CRUD & Versioning

- [ ] 7.1 Create project form component (name, slug, visibility)
- [ ] 7.2 Create project list/dashboard component
- [ ] 7.3 Implement create project with initial "main" version
- [ ] 7.4 Implement save (create snapshot, update version)
- [ ] 7.5 Implement delete project
- [ ] 7.6 Add public/private toggle for sharing

## 7b. Version Management

- [ ] 7b.1 Create version list component for project
- [ ] 7b.2 Implement create new version (branch from current)
- [ ] 7b.3 Implement switch between versions
- [ ] 7b.4 Implement version history view with snapshots
- [ ] 7b.5 Implement permalink generation and display
- [ ] 7b.6 Add "copy permalink" button for sharing

## 7c. Collaboration & Sharing

- [ ] 7c.1 Create `convex/sharing.ts` with access control functions
- [ ] 7c.2 Implement invite by username functionality
- [ ] 7c.3 Create project settings page with sharing controls
- [ ] 7c.4 Implement share link generation (viewer/editor roles)
- [ ] 7c.5 Create invite acceptance flow
- [ ] 7c.6 Add collaborator list to project settings
- [ ] 7c.7 Implement project forking
- [ ] 7c.8 Show "forked from" attribution on forked projects

## 8. UI/Styling

- [ ] 8.1 Set up CSS/Tailwind for SolidStart
- [ ] 8.2 Create consistent header/navigation component
- [ ] 8.3 Create login/register page styling
- [ ] 8.4 Create dashboard page styling
- [ ] 8.5 Ensure responsive design for mobile
- [ ] 8.6 Add loading states and error handling

## 9. Vercel Deployment

- [ ] 9.1 Create Vercel project and link to GitHub repository
- [ ] 9.2 Configure Vercel for SolidStart (auto-detected)
- [ ] 9.3 Add environment variables to Vercel (CONVEX_URL, BETTER_AUTH_SECRET, etc.)
- [ ] 9.4 Configure Convex production deployment
- [ ] 9.5 Test preview deployment on PR
- [ ] 9.6 Verify production deployment on merge to master

## 10. Testing

- [ ] 10.1 Create test utilities for SolidStart
- [ ] 10.2 Test auth flow (login, logout, session)
- [ ] 10.3 Test floorplan CRUD operations
- [ ] 10.4 Test protected route access
- [ ] 10.5 Test viewer-core embedding
- [ ] 10.6 Verify Convex functions work in production

## 11. Documentation

- [ ] 11.1 Write floorplan-app/README.md with setup instructions
- [ ] 11.2 Document environment variables required
- [ ] 11.3 Document local development workflow
- [ ] 11.4 Document deployment process (Vercel + Convex)
- [ ] 11.5 Add troubleshooting section
- [ ] 11.6 Update root CLAUDE.md with SolidStart app info

## 12. Verification

- [ ] 12.1 Verify Google OAuth login works in production
- [ ] 12.2 Verify floorplan save/load works in production
- [ ] 12.3 Verify public floorplan sharing works
- [ ] 12.4 Verify viewer-core renders correctly
- [ ] 12.5 Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] 12.6 Performance check (initial load, SSR hydration)
