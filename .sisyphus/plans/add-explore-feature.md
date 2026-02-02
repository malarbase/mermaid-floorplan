# Add Explore Feature with Interactive Demo

## TL;DR

> **Quick Summary**: Add a GitHub-inspired Explore page with trending projects, topics, and curated collections. Embed an interactive 3D viewer on the landing page for anonymous users. Allow slug editing with redirect support.
> 
> **Deliverables**:
> - `/explore` page with trending, topics, and collections
> - Interactive 3D viewer on landing page (anonymous-friendly)
> - Auth-gated editor with "Fork to Edit" flow
> - Editable slugs with redirect history
> - View/fork tracking for trending calculations
> 
> **Estimated Effort**: Large (4 phases)
> **Parallel Execution**: YES - Phase 1 backend can parallelize with some Phase 2 UI scaffolding
> **Critical Path**: Schema → Backend APIs → UI Routes → Landing Page

---

## Context

### Original Request
User wants visitors to see a 3D demo on the landing page without signing in. The editor panel should be login-gated. After sign-in, users can fork and edit. Additionally, implement a discovery system inspired by GitHub Explore with trending/topics/collections, and allow editable slugs.

### Interview Summary
**Key Discussions**:
- Trending algorithm: Hybrid (views * 1.0 + forks * 5.0) with time decay
- Collections: Admin-only initially, community-created later
- Slug redirects: Yes, with smart reuse (new project takes precedence)
- Demo content: User choice from gallery of public projects
- Save destination: Auto-create scratch project on fork
- Test strategy: TDD approach

**Research Findings**:
- GitHub Explore uses topics (YAML in git), collections (curated lists), trending (star velocity)
- Current schema has no discovery fields (no viewCount, forkCount, trendingScore)
- FloorplanUI from viewer-core can mount in viewer/editor mode
- Fork functionality already exists in sharing.ts
- Slugs are currently immutable after creation

### Metis Review
**Identified Gaps** (addressed below):
- Time window specifics → Default to 7d and 30d windows
- View tracking deduplication → 1 view per user/project per hour (session-based)
- Admin role → Use simple `isAdmin` boolean on users table
- Pagination → 24 projects per page, infinite scroll
- Topic limits → Max 5 topics per project
- Slug change frequency → Unlimited, but redirect history retained

---

## Work Objectives

### Core Objective
Enable project discovery and interactive demos for anonymous users while maintaining edit capabilities for authenticated users through a clean fork-to-edit flow.

### Concrete Deliverables
- New DB tables: `topics`, `projectTopics`, `collections`, `slugRedirects`
- Modified `projects` table: +viewCount, +forkCount, +isFeatured, +trendingScore
- Modified `users` table: +isAdmin
- New routes: `/explore`, `/explore/topics/[slug]`, `/explore/collections/[slug]`
- Modified landing page with embedded 3D viewer
- Settings UI for slug editing
- Convex cron for trending score calculation

### Definition of Done
- [ ] Anonymous users can browse /explore without signing in
- [ ] Anonymous users see interactive 3D viewer on landing page
- [ ] Clicking "Fork to Edit" prompts sign-in for anonymous users
- [ ] Authenticated users can fork and edit projects
- [ ] Project owners can edit slugs in settings
- [ ] Old slugs redirect to new slugs
- [ ] Trending score updates every 6 hours via cron
- [ ] All tests pass

### Must Have
- Explore page loads with trending projects
- 3D viewer on landing page with full controls (camera, lighting, floors)
- Fork-to-edit flow works for authenticated users
- Slug editing with redirect support
- View tracking increments on page load
- Admin can create/edit collections

### Must NOT Have (Guardrails)
- NO full-text search (out of scope)
- NO ML/recommendation algorithms (simple weighted formula only)
- NO user-created collections (admin-only for Phase 1)
- NO redirect chains (single-hop only)
- NO individual page view tracking table (just increment count)
- NO complex analytics dashboard
- NO carousel of featured projects (single featured project)
- NO drag-drop collection reordering

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Vitest configured)
- **User wants tests**: TDD
- **Framework**: Vitest for unit/integration, Playwright for E2E

### TDD Approach

Each task follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Schema changes (new tables, modified projects)
├── Task 2: Add isAdmin field to users
└── Task 3: Create topics seed data

Wave 2 (After Wave 1):
├── Task 4: View tracking mutation
├── Task 5: Fork count denormalization
├── Task 6: Trending score calculation + cron
└── Task 7: Slug redirect logic

Wave 3 (After Wave 2):
├── Task 8: Explore queries (trending, by-topic, featured)
├── Task 9: Collection CRUD mutations
└── Task 10: Topic assignment mutations

Wave 4 (After Wave 3):
├── Task 11: /explore route UI
├── Task 12: /explore/topics/[slug] route
└── Task 13: /explore/collections/[slug] route

Wave 5 (After Wave 4):
├── Task 14: Landing page 3D viewer embed
├── Task 15: Auth-gated editor panel
└── Task 16: Fork-to-edit flow

Wave 6 (After Wave 5):
├── Task 17: Slug edit UI in settings
└── Task 18: Slug redirect middleware

Wave 7 (Final):
└── Task 19: E2E tests for full user journey
```

### Critical Path
Task 1 → Task 4-7 → Task 8 → Task 11 → Task 14-16

---

## TODOs

### Phase 1: Database & Backend

- [x] 1. Add schema changes for discovery features

  **What to do**:
  - Add `topics` table with slug, displayName, description, color, isFeatured, projectCount
  - Add `projectTopics` junction table
  - Add `collections` table with slug, displayName, projectIds array
  - Add `slugRedirects` table
  - Add to `projects`: viewCount, forkCount, isFeatured, trendingScore, lastTrendingCalc
  - Add to `users`: isAdmin boolean
  - Add indexes: by_trending, by_featured on projects; by_slug on topics/collections

  **Must NOT do**:
  - Don't add complex analytics tables
  - Don't add tag synonyms or hierarchies

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundational)
  - **Blocks**: Tasks 2-10

  **References**:
  - `floorplan-app/convex/schema.ts` - Existing schema patterns
  - `floorplan-app/convex/projects.ts:L40-50` - Existing projects table definition

  **Acceptance Criteria**:
  ```bash
  # Verify schema compiles
  cd floorplan-app && npx convex dev --once 2>&1 | grep -q "Schema compiled" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(schema): add discovery tables and fields`
  - Files: `convex/schema.ts`

---

- [x] 2. Implement view tracking mutation

  **What to do**:
  - Create `projects.trackView` mutation
  - Accept projectId, increment viewCount
  - Debounce: 1 view per session per hour (use session token hash)
  - Write test first: trackView increments count, respects debounce

  **Must NOT do**:
  - Don't store individual view records
  - Don't track IP addresses

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3, 4)
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/projects.ts` - Existing mutation patterns
  - `floorplan-app/convex/lib/auth.ts` - Auth helper pattern

  **Acceptance Criteria**:
  ```bash
  # Run view tracking tests
  cd floorplan-app && npm test -- --grep "trackView" 2>&1 | grep -q "PASS" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(projects): add view tracking with debounce`
  - Files: `convex/projects.ts`, `convex/projects.test.ts`

---

- [x] 3. Implement fork count denormalization

  **What to do**:
  - Modify `sharing.forkProject` to increment source project's forkCount
  - Add transaction to ensure atomicity
  - Write test: forking increments forkCount on source

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, 4)
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/sharing.ts:391-479` - Existing forkProject mutation

  **Acceptance Criteria**:
  ```bash
  # Run fork count tests
  cd floorplan-app && npm test -- --grep "forkCount" 2>&1 | grep -q "PASS" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(sharing): denormalize fork count on source project`
  - Files: `convex/sharing.ts`

---

- [x] 4. Implement trending score calculation cron

  **What to do**:
  - Create `crons.calculateTrendingScores` function
  - Formula: `(views_7d * 1.0) + (forks_7d * 5.0) + (views_30d * 0.3) + (forks_30d * 1.5)`
  - Use time decay: score / (1 + age_days * 0.1)
  - Schedule every 6 hours in crons.ts
  - Write test for formula calculation

  **Must NOT do**:
  - Don't use ML algorithms
  - Don't calculate in real-time

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, 3)
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/crons.ts` - Existing cron patterns

  **Acceptance Criteria**:
  ```bash
  # Verify cron is registered
  cd floorplan-app && grep -q "calculateTrendingScores" convex/crons.ts && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(crons): add trending score calculation every 6h`
  - Files: `convex/crons.ts`, `convex/trending.ts`

---

- [x] 5. Implement slug redirect logic

  **What to do**:
  - Create `projects.updateSlug` mutation
  - Validate new slug format and uniqueness
  - Store old slug in slugRedirects table
  - Create `projects.resolveSlug` query to check redirects
  - Handle reuse: delete redirect if owner creates new project with old slug
  - Write tests for all scenarios

  **Must NOT do**:
  - Don't support redirect chains
  - Don't track redirect analytics

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, 3, 4)
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/projects.ts:119-129` - Existing slug uniqueness check
  - `floorplan-app/src/components/ProjectForm.tsx:155-160` - Slug generation pattern

  **Acceptance Criteria**:
  ```bash
  # Run slug redirect tests
  cd floorplan-app && npm test -- --grep "updateSlug|resolveSlug" 2>&1 | grep -q "PASS" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(projects): add slug editing with redirect history`
  - Files: `convex/projects.ts`, `convex/projects.test.ts`

---

- [x] 6. Create explore queries

  **What to do**:
  - Create `explore.listTrending` query (paginated, sorted by trendingScore)
  - Create `explore.listByTopic` query (filter by topicSlug)
  - Create `explore.listFeatured` query (isFeatured=true)
  - Create `explore.getCollection` query (by slug)
  - Create `explore.listCollections` query (all official collections)
  - Write tests for each query

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 2-5)
  - **Blocked By**: Tasks 2, 3, 4

  **References**:
  - `floorplan-app/convex/projects.ts:listPublicByUsername` - Query pattern

  **Acceptance Criteria**:
  ```bash
  # Verify explore queries exist
  cd floorplan-app && grep -q "listTrending\|listByTopic\|listFeatured" convex/explore.ts && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(explore): add discovery queries`
  - Files: `convex/explore.ts`, `convex/explore.test.ts`

---

- [x] 7. Create collection CRUD mutations

  **What to do**:
  - Create `collections.create` mutation (admin-only)
  - Create `collections.update` mutation (admin-only)
  - Create `collections.delete` mutation (admin-only)
  - Create `collections.addProject` mutation
  - Create `collections.removeProject` mutation
  - Check `user.isAdmin` before allowing mutations
  - Write tests for admin-only enforcement

  **Must NOT do**:
  - Don't allow non-admin collection creation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/sharing.ts` - Mutation pattern with auth

  **Acceptance Criteria**:
  ```bash
  # Run collection CRUD tests
  cd floorplan-app && npm test -- --grep "collections" 2>&1 | grep -q "PASS" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(collections): add admin-only CRUD mutations`
  - Files: `convex/collections.ts`, `convex/collections.test.ts`

---

- [x] 8. Create topic assignment mutations

  **What to do**:
  - Create `topics.assignToProject` mutation (owner or admin)
  - Create `topics.removeFromProject` mutation
  - Limit to 5 topics per project
  - Update topic.projectCount on add/remove
  - Write tests for limit enforcement

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6, 7)
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/schema.ts` - Junction table pattern

  **Acceptance Criteria**:
  ```bash
  # Run topic assignment tests
  cd floorplan-app && npm test -- --grep "topics" 2>&1 | grep -q "PASS" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `feat(topics): add project topic assignment`
  - Files: `convex/topics.ts`, `convex/topics.test.ts`

---

### Phase 2: Explore UI Routes

- [x] 9. Create /explore route

  **What to do**:
  - Create `src/routes/explore/index.tsx`
  - Add Header with nav
  - Add trending section with project cards (24 per page, infinite scroll)
  - Add topics sidebar with filter chips
  - Add featured collections section
  - Use `useQuery(api.explore.listTrending)` etc.
  - Make responsive for mobile

  **Must NOT do**:
  - Don't add search functionality
  - Don't add carousel animations

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 6)
  - **Blocked By**: Task 6

  **References**:
  - `floorplan-app/src/routes/dashboard.tsx` - Page layout pattern
  - `floorplan-app/src/components/ProjectList.tsx` - Project card pattern

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/explore
  2. Wait for: selector ".project-card" to be visible (max 5s)
  3. Assert: At least 1 project card visible
  4. Assert: Topics filter visible
  5. Screenshot: .sisyphus/evidence/explore-page.png
  ```

  **Commit**: YES
  - Message: `feat(explore): add explore page with trending and topics`
  - Files: `src/routes/explore/index.tsx`, `src/components/ExploreGrid.tsx`

---

- [x] 10. Create /explore/topics/[slug] route

  **What to do**:
  - Create `src/routes/explore/topics/[slug].tsx`
  - Show topic header with name and description
  - List projects filtered by topic
  - Add pagination
  - Link back to /explore

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 11)
  - **Blocked By**: Task 9

  **References**:
  - `floorplan-app/src/routes/u/[username]/index.tsx` - Dynamic route pattern

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/explore/topics/residential
  2. Wait for: selector "h1" containing "Residential" (max 5s)
  3. Assert: Project grid visible
  4. Screenshot: .sisyphus/evidence/topic-page.png
  ```

  **Commit**: YES
  - Message: `feat(explore): add topic filter page`
  - Files: `src/routes/explore/topics/[slug].tsx`

---

- [x] 11. Create /explore/collections/[slug] route

  **What to do**:
  - Create `src/routes/explore/collections/[slug].tsx`
  - Show collection header with name, description, curator
  - List projects in collection order
  - Show cover image if available

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 10)
  - **Blocked By**: Task 9

  **References**:
  - `floorplan-app/src/routes/explore/index.tsx` - Pattern from Task 9

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/explore/collections/starter-templates
  2. Wait for: selector "h1" containing "Starter Templates" (max 5s)
  3. Assert: Project list visible
  4. Screenshot: .sisyphus/evidence/collection-page.png
  ```

  **Commit**: YES
  - Message: `feat(explore): add collection detail page`
  - Files: `src/routes/explore/collections/[slug].tsx`

---

### Phase 3: Landing Page & Fork Flow

- [x] 12. Embed 3D viewer on landing page

  **What to do**:
  - Modify `src/routes/index.tsx` to include FloorplanEmbed
  - Query for featured project content via `explore.getFeatured`
  - Lazy load Three.js bundle (dynamic import)
  - Add fallback for WebGL-unsupported browsers
  - Show "Explore More" link to /explore
  - Mount FloorplanUI in viewer mode with full controls

  **Must NOT do**:
  - Don't create carousel of projects
  - Don't allow editing on landing page

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Phase 2)
  - **Blocked By**: Task 9

  **References**:
  - `floorplan-app/src/components/FloorplanEmbed.tsx` - Existing embed component
  - `floorplan-viewer/src/main.ts` - How FloorplanUI is mounted

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/
  2. Wait for: selector "canvas" to be visible (max 10s)
  3. Assert: 3D viewer canvas rendered
  4. Assert: Camera controls visible
  5. Screenshot: .sisyphus/evidence/landing-3d-viewer.png
  ```

  **Commit**: YES
  - Message: `feat(landing): embed interactive 3D viewer`
  - Files: `src/routes/index.tsx`, `src/components/FeaturedViewer.tsx`

---

- [x] 13. Add auth-gated editor panel

  **What to do**:
  - Create `AuthGatedEditorPanel` component
  - When anonymous: show code (read-only) with login prompt overlay
  - When authenticated: show full editor with fork button
  - Use `useSession()` to check auth state
  - Add "Sign in to fork and edit" CTA

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 12)
  - **Blocked By**: Task 11

  **References**:
  - `floorplan-app/src/lib/auth-client.ts` - useSession hook
  - `floorplan-app/src/components/ForkButton.tsx` - Fork UI pattern

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/ (logged out)
  2. Assert: Text "Sign in to fork" visible
  3. Click: "Sign in to fork" button
  4. Assert: Redirected to /login
  5. Screenshot: .sisyphus/evidence/auth-gated-editor.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add auth-gated editor panel for anonymous users`
  - Files: `src/components/AuthGatedEditorPanel.tsx`

---

- [x] 14. Implement fork-to-edit flow

  **What to do**:
  - After sign-in, redirect back to project with fork modal open
  - Pre-populate fork form with project name + " (fork)"
  - Generate unique slug suggestion
  - On fork success, redirect to user's new project in edit mode
  - Show "Now editing your copy" toast

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 13)
  - **Blocked By**: Task 13

  **References**:
  - `floorplan-app/src/components/ForkButton.tsx` - Existing fork modal
  - `floorplan-app/src/routes/(auth)/callback.tsx` - Post-login redirect

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/ (logged in as testuser)
  2. Click: "Fork to Edit" button
  3. Wait for: Fork modal to appear
  4. Fill: Project name "My Fork"
  5. Click: "Create Fork"
  6. Wait for: URL to contain "/u/testuser/"
  7. Assert: Editor mode active
  8. Screenshot: .sisyphus/evidence/fork-flow-complete.png
  ```

  **Commit**: YES
  - Message: `feat(fork): complete fork-to-edit flow from landing page`
  - Files: `src/components/ForkButton.tsx`, `src/routes/index.tsx`

---

### Phase 4: Editable Slugs

- [ ] 15. Add slug edit UI in settings

  **What to do**:
  - Modify `src/routes/u/[username]/[project]/settings.tsx`
  - Add "Change URL Slug" section
  - Show current slug with edit button
  - Validate new slug format and availability in real-time
  - Call `projects.updateSlug` mutation on save
  - Show warning about old URLs redirecting

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Phase 3 tasks)
  - **Blocked By**: Task 5

  **References**:
  - `floorplan-app/src/routes/u/[username]/[project]/settings.tsx` - Existing settings page
  - `floorplan-app/src/components/ProjectForm.tsx:182` - Slug validation pattern

  **Acceptance Criteria**:
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/u/testuser/my-project/settings (logged in)
  2. Assert: "Change URL Slug" section visible
  3. Fill: New slug input with "new-slug-name"
  4. Assert: Availability indicator shows "Available"
  5. Click: "Save Changes"
  6. Assert: Success toast appears
  7. Screenshot: .sisyphus/evidence/slug-edit-ui.png
  ```

  **Commit**: YES
  - Message: `feat(settings): add slug editing UI`
  - Files: `src/routes/u/[username]/[project]/settings.tsx`

---

- [ ] 16. Implement slug redirect handling

  **What to do**:
  - Modify `src/routes/u/[username]/[project]/index.tsx`
  - On load, if project not found, check `projects.resolveSlug`
  - If redirect exists, perform 301 redirect to new URL
  - If no redirect and no project, show 404

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15)
  - **Blocked By**: Task 5

  **References**:
  - `floorplan-app/src/routes/u/[username]/[project]/index.tsx` - Project view route
  - `@solidjs/router` - useNavigate for redirect

  **Acceptance Criteria**:
  ```bash
  # Test redirect via curl
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/u/testuser/old-slug"
  # Assert: Output is "301"
  
  curl -s -L -o /dev/null -w "%{url_effective}" "http://localhost:3000/u/testuser/old-slug"
  # Assert: URL ends with "/new-slug"
  ```

  **Commit**: YES
  - Message: `feat(routing): handle slug redirects`
  - Files: `src/routes/u/[username]/[project]/index.tsx`

---

### Phase 5: Integration Testing

- [ ] 17. E2E tests for explore feature

  **What to do**:
  - Create Playwright test for anonymous browse → fork → edit flow
  - Test explore page loads and filters work
  - Test trending updates after views
  - Test collection and topic pages

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`playwright`, `test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification)
  - **Blocked By**: All previous tasks

  **References**:
  - `floorplan-app/e2e/` - E2E test location (if exists)

  **Acceptance Criteria**:
  ```bash
  # Run E2E tests
  cd floorplan-app && npx playwright test explore 2>&1 | grep -q "passed" && echo "PASS" || echo "FAIL"
  ```

  **Commit**: YES
  - Message: `test(e2e): add explore feature integration tests`
  - Files: `e2e/explore.spec.ts`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(schema): add discovery tables and fields` | convex/schema.ts | npx convex dev --once |
| 2 | `feat(projects): add view tracking with debounce` | convex/projects.ts | npm test |
| 3 | `feat(sharing): denormalize fork count` | convex/sharing.ts | npm test |
| 4 | `feat(crons): add trending score calculation` | convex/crons.ts | npm test |
| 5 | `feat(projects): add slug editing with redirects` | convex/projects.ts | npm test |
| 6 | `feat(explore): add discovery queries` | convex/explore.ts | npm test |
| 7 | `feat(collections): add admin-only CRUD` | convex/collections.ts | npm test |
| 8 | `feat(topics): add project topic assignment` | convex/topics.ts | npm test |
| 9-11 | `feat(explore): add explore UI routes` | src/routes/explore/ | playwright |
| 12-14 | `feat(landing): add 3D viewer and fork flow` | src/routes/index.tsx | playwright |
| 15-16 | `feat(settings): add slug editing` | src/routes/.../settings.tsx | playwright |
| 17 | `test(e2e): add explore feature tests` | e2e/explore.spec.ts | playwright |

---

## Success Criteria

### Verification Commands
```bash
# All backend tests pass
cd floorplan-app && npm test

# Schema compiles
cd floorplan-app && npx convex dev --once

# E2E tests pass
cd floorplan-app && npx playwright test

# Dev server runs without errors
cd floorplan-app && npm run dev
```

### Final Checklist
- [ ] Anonymous users can browse /explore
- [ ] 3D viewer on landing page works
- [ ] Fork-to-edit flow works end-to-end
- [ ] Trending score updates via cron
- [ ] Slug editing works with redirects
- [ ] All tests pass
- [ ] No TypeScript errors
