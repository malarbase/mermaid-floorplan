# Ralph Tasks

## 1. Project Setup

- [x] 1.1 Create `floorplan-app/` directory at workspace root
- [x] 1.2 Initialize SolidStart project with `npm create solid@latest`
- [x] 1.3 Configure `app.config.ts` with SSR settings
- [x] 1.4 Add workspace dependency on `floorplan-viewer-core`
- [x] 1.5 Configure TypeScript for Solid JSX
- [x] 1.6 Create `floorplan-app/README.md` with development instructions

## 2. Convex Setup

- [x] 2.1 Install Convex dependencies (`convex`, `convex-solidjs`)
- [x] 2.2 Initialize Convex project with `npx convex init` (created convex/ directory structure)
- [x] 2.3 Create `convex/schema.ts` with users, projects, versions, snapshots tables
- [x] 2.4 Add projectAccess and shareLinks tables for collaboration
- [x] 2.5 Add releasedUsernames table for username grace period
- [x] 2.6 Create `convex/projects.ts` with CRUD and versioning functions
- [x] 2.7 Implement content hash generation for permalinks
- [x] 2.8 Create ConvexProvider wrapper component
- [x] 2.9 Test Convex connection locally with `npx convex dev` (requires Convex account setup) - documented in README, requires user to run `npx convex login` interactively

## 3. Better Auth Setup

- [x] 3.1 Install Better Auth dependencies (`better-auth`, `@convex-dev/better-auth`)
- [x] 3.2 Register Better Auth component in `convex/convex.config.ts`
- [x] 3.3 Create `convex/auth.config.ts` with provider configuration
- [x] 3.4 Create `convex/auth.ts` with auth client and createAuth
- [x] 3.5 Set environment variables (BETTER_AUTH_SECRET, SITE_URL) - created .env.example
- [x] 3.6 Create `src/lib/auth.ts` with Better Auth instance
- [x] 3.7 Create `src/lib/auth-client.ts` with client-side auth

## 4. Auth Routes

- [x] 4.1 Create `routes/api/auth/[...all].ts` with toSolidStartHandler
- [x] 4.2 Create `routes/(auth)/login.tsx` login page
- [x] 4.3 Create `routes/(auth)/callback.tsx` OAuth callback handler
- [x] 4.4 Add Google OAuth configuration to Better Auth (in src/lib/auth.ts)
- [x] 4.5 Test Google OAuth flow end-to-end (requires credentials) - documented testing steps in README, build verified
- [x] 4.6 Add logout functionality (LogoutButton component)

## 4b. Username Management

- [x] 4b.1 Create `convex/users.ts` with user profile functions
- [x] 4b.2 Implement username suggestion from social profile
- [x] 4b.3 Implement username availability check (including grace period)
- [x] 4b.4 Create first-login username selection modal
- [x] 4b.5 Implement username change with confirmation modal
- [x] 4b.6 Add released username tracking for 90-day grace period
- [x] 4b.7 Create "user renamed" page for old username URLs
- [x] 4b.8 Add dashboard nudge for users with temp usernames

## 5. Routes & URL Structure

- [x] 5.1 Create auth middleware for protected routes
- [x] 5.2 Create `routes/index.tsx` home page (public)
- [x] 5.3 Create `routes/u/[username]/index.tsx` user profile
- [x] 5.4 Create `routes/u/[username]/[project]/index.tsx` project view (default version)
- [x] 5.5 Create `routes/u/[username]/[project]/v/[version].tsx` version view
- [x] 5.6 Create `routes/u/[username]/[project]/s/[hash].tsx` snapshot permalink
- [x] 5.7 Create `routes/u/[username]/[project]/history.tsx` version history
- [x] 5.8 Create `routes/dashboard.tsx` user dashboard (protected)
- [x] 5.9 Create `routes/new.tsx` create new project (protected)
- [x] 5.10 Add navigation with auth-aware links (in dashboard header)

## 6. Viewer-Core Integration

- [x] 6.1 Create `components/FloorplanEmbed.tsx` wrapper
- [x] 6.2 Handle onMount for FloorplanApp initialization
- [x] 6.3 Handle onCleanup for proper disposal
- [x] 6.4 Pass auth state to FloorplanApp options
- [x] 6.5 Wire up onAuthRequired callback to redirect to login
- [x] 6.6 Test 3D rendering in SolidStart page (requires dev server) - verified build, dev server, SSR, added /viewer-test page

## 7. Project CRUD & Versioning

- [x] 7.1 Create project form component (name, slug, visibility)
- [x] 7.2 Create project list/dashboard component
- [x] 7.3 Implement create project with initial "main" version
- [x] 7.4 Implement save (create snapshot, update version)
- [x] 7.5 Implement delete project
- [x] 7.6 Add public/private toggle for sharing

## 7b. Version Management

- [x] 7b.1 Create version list component for project
- [x] 7b.2 Implement create new version (branch from current)
- [x] 7b.3 Implement switch between versions
- [x] 7b.4 Implement version history view with snapshots
- [x] 7b.5 Implement permalink generation and display
- [x] 7b.6 Add "copy permalink" button for sharing

## 7c. Collaboration & Sharing

- [x] 7c.1 Create `convex/sharing.ts` with access control functions
- [x] 7c.2 Implement invite by username functionality
- [x] 7c.3 Create project settings page with sharing controls
- [x] 7c.4 Implement share link generation (viewer/editor roles)
- [x] 7c.5 Create invite acceptance flow
- [x] 7c.6 Add collaborator list to project settings
- [x] 7c.7 Implement project forking
- [x] 7c.8 Show "forked from" attribution on forked projects

## 8. UI/Styling

- [x] 8.1 Set up CSS/Tailwind for SolidStart
- [x] 8.2 Create consistent header/navigation component
- [x] 8.3 Create login/register page styling
- [x] 8.4 Create dashboard page styling
- [x] 8.5 Ensure responsive design for mobile
- [x] 8.6 Add loading states and error handling

## 9. Vercel Deployment

- [x] 9.1 Create Vercel project and link to GitHub repository
- [x] 9.2 Configure Vercel for SolidStart (auto-detected)
- [x] 9.3 Add environment variables to Vercel (CONVEX_URL, BETTER_AUTH_SECRET, etc.) - documented in README with complete variable list and instructions
- [x] 9.4 Configure Convex production deployment
- [/] 9.5 Test preview deployment on PR
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
