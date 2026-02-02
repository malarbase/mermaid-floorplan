# Admin Panel MVP (Phases 1-2)

## TL;DR

> **Quick Summary**: Create a full admin panel with super admin hierarchy, user management, and featured project controls. Super admin is configurable via env var and can promote/demote admins, delete projects, and impersonate users.
> 
> **Deliverables**:
> - Super admin system with env var configuration
> - Admin role management (promote/demote)
> - Featured projects management UI
> - User management UI with impersonation
> - Project deletion capability (super admin)
> - Audit trail foundation with configurable scope
> 
> **Estimated Effort**: Medium (~12-15 tasks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 6 → Task 10

---

## Context

### Original Request
Create a full admin panel with:
1. Super admin configurable via env var with full capabilities (promote/demote admins, delete projects, impersonate users)
2. Admin role for managing featured projects, topics, collections
3. Audit trail with configurable scope (admin-only vs all changes)
4. Balanced UI with stats and activity feed

### Interview Summary
**Key Discussions**:
- Super admin via env var (SUPER_ADMIN_EMAIL) - cannot be locked out
- Two-tier role system: Super Admin > Admin > Regular User
- Audit trail scope configurable via flag (admin actions vs all changes)
- MVP scope: Phases 1-2 (foundation + featured/user management)

**Research Findings**:
- Current `isAdmin` boolean exists but no mutations to set it
- `convex-table-history` library available for audit trails
- Existing auth patterns in `convex/lib/auth.ts` and `convex/devAuth.ts`
- Admin checks already exist in `collections.ts` and `topics.ts`

---

## Work Objectives

### Core Objective
Build an admin panel MVP with super admin hierarchy, user/project management, and audit trail foundation.

### Concrete Deliverables
- `/admin` route with dashboard overview
- `/admin/featured` page for featuring projects
- `/admin/users` page for user management (super admin: promote/demote)
- `convex/admin.ts` with all admin mutations
- Audit trail with `convex-table-history` integration
- Super admin impersonation capability

### Definition of Done
- [ ] Super admin can promote/demote regular admins
- [ ] Admins can feature/unfeature projects
- [ ] Super admin can delete any project
- [ ] Super admin can impersonate users
- [ ] Audit trail records admin actions
- [ ] Non-admins redirected away from /admin
- [ ] All admin actions require proper authorization
- [ ] No TypeScript errors

### Must Have
- Super admin email configurable via `SUPER_ADMIN_EMAIL` env var
- Two-tier role system (Super Admin > Admin)
- Featured projects toggle
- User management with role assignment
- Basic audit logging
- Route protection

### Must NOT Have (Guardrails)
- DO NOT allow super admin to be demoted (protected by env var check)
- DO NOT expose admin routes to non-admins (guard component required)
- DO NOT skip audit logging for sensitive actions
- DO NOT hardcode super admin email in code
- DO NOT allow admins to promote other admins (super admin only)
- DO NOT allow self-demotion for super admin

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Playwright for E2E)
- **User wants tests**: Manual verification + E2E for critical paths
- **Framework**: Playwright

### Automated Verification

**For Admin UI changes** (using playwright skill):
```
1. Navigate to: http://localhost:3000/admin (logged in as admin)
2. Assert: Admin dashboard visible
3. Assert: Navigation sidebar present
4. Screenshot: .sisyphus/evidence/admin-dashboard.png
```

**For Backend mutations** (using Bash):
```bash
# Verify mutations exist and are callable
npx convex run admin:setFeatured --args '{"projectId": "...", "isFeatured": true}'
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Add super admin env var support
├── Task 2: Install convex-table-history
└── Task 3: Create AdminGuard component

Wave 2 (After Wave 1):
├── Task 4: Create admin.ts mutations (setFeatured, promoteAdmin, demoteAdmin)
├── Task 5: Create admin.ts queries (listAllProjects, listAllUsers)
├── Task 6: Create /admin layout with sidebar
└── Task 7: Configure table-history for admin actions

Wave 3 (After Wave 2):
├── Task 8: Create /admin overview dashboard
├── Task 9: Create /admin/featured page
├── Task 10: Create /admin/users page
├── Task 11: Add super admin capabilities (delete project, impersonate)
└── Task 12: Create /admin/audit page

Critical Path: Task 1 → Task 4 → Task 6 → Task 8
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 11 | 2, 3 |
| 2 | None | 7, 12 | 1, 3 |
| 3 | None | 6, 8, 9, 10 | 1, 2 |
| 4 | 1 | 9, 10, 11 | 5, 6, 7 |
| 5 | None | 9, 10 | 4, 6, 7 |
| 6 | 3 | 8, 9, 10, 12 | 4, 5, 7 |
| 7 | 2 | 12 | 4, 5, 6 |
| 8 | 6 | None | 9, 10 |
| 9 | 4, 5, 6 | None | 8, 10 |
| 10 | 4, 5, 6 | None | 8, 9 |
| 11 | 4 | None | 8, 9, 10, 12 |
| 12 | 6, 7 | None | 8, 9, 10, 11 |

---

## TODOs

### Phase 1: Foundation & Super Admin

- [ ] 1. Add super admin env var support

  **What to do**:
  - Add `SUPER_ADMIN_EMAIL` environment variable to Convex
  - Create helper function `isSuperAdmin(user)` in `convex/lib/auth.ts`
  - Create helper function `requireSuperAdmin(ctx)` that throws if not super admin
  - Super admin check: `user.email === process.env.SUPER_ADMIN_EMAIL`

  **Must NOT do**:
  - DO NOT hardcode any email addresses
  - DO NOT allow super admin status to be stored in database (always from env)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 11
  - **Blocked By**: None

  **References**:
  - `floorplan-app/convex/lib/auth.ts` - Existing auth helpers
  - `floorplan-app/convex/devAuth.ts:6-9` - Env var access pattern

  **Acceptance Criteria**:
  ```bash
  # Verify env var is read
  grep -r "SUPER_ADMIN_EMAIL" floorplan-app/convex/
  # Should find reference in lib/auth.ts
  ```

  **Commit**: YES
  - Message: `feat(admin): add super admin env var support`
  - Files: `convex/lib/auth.ts`

---

- [ ] 2. Install convex-table-history package

  **What to do**:
  - Run `npm install convex-table-history convex-helpers` in floorplan-app
  - Create `convex/convex.config.ts` with table-history component
  - Add `AUDIT_TRAIL_SCOPE` env var (values: "admin-only" | "all")
  - Configure component for admin actions audit log

  **Must NOT do**:
  - DO NOT track all tables yet (start with admin actions only)
  - DO NOT skip the convex.config.ts setup

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 7, 12
  - **Blocked By**: None

  **References**:
  - https://github.com/get-convex/table-history - Library docs
  - `floorplan-app/package.json` - Add dependencies here

  **Acceptance Criteria**:
  ```bash
  # Verify package installed
  grep "convex-table-history" floorplan-app/package.json
  # Verify config created
  test -f floorplan-app/convex/convex.config.ts && echo "EXISTS"
  ```

  **Commit**: YES
  - Message: `chore(deps): install convex-table-history for audit trails`
  - Files: `package.json`, `package-lock.json`, `convex/convex.config.ts`

---

- [ ] 3. Create AdminGuard component

  **What to do**:
  - Create `src/components/AdminGuard.tsx`
  - Check if current user is admin OR super admin
  - Redirect non-admins to `/dashboard` with replace
  - Show loading state while checking
  - Export both `AdminGuard` and `SuperAdminGuard` components

  **Must NOT do**:
  - DO NOT show admin content to non-admins even briefly (loading first)
  - DO NOT forget super admin check

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 6, 8, 9, 10
  - **Blocked By**: None

  **References**:
  - `floorplan-app/src/routes/dashboard.tsx` - Auth check pattern
  - `floorplan-app/src/lib/auth-client.ts` - useSession hook

  **Acceptance Criteria**:
  ```typescript
  // File exists with both exports
  import { AdminGuard, SuperAdminGuard } from "./components/AdminGuard";
  ```

  **Commit**: YES
  - Message: `feat(admin): create AdminGuard and SuperAdminGuard components`
  - Files: `src/components/AdminGuard.tsx`

---

- [ ] 4. Create admin.ts mutations

  **What to do**:
  - Create `convex/admin.ts` with mutations:
    - `setFeatured({ projectId, isFeatured })` - Admin+
    - `promoteToAdmin({ userId })` - Super Admin only
    - `demoteFromAdmin({ userId })` - Super Admin only (cannot demote self or other super admin)
  - Use `requireAdmin` for admin-level, `requireSuperAdmin` for super-level
  - Add audit logging for all mutations (manual for now, triggers in Task 7)

  **Must NOT do**:
  - DO NOT allow admins to promote other admins
  - DO NOT allow super admin to demote themselves
  - DO NOT skip authorization checks

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Tasks 9, 10, 11
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/convex/collections.ts:13-25` - Admin check pattern
  - `floorplan-app/convex/lib/auth.ts` - Auth helpers

  **Acceptance Criteria**:
  ```bash
  # Verify mutations exist
  grep -E "export const (setFeatured|promoteToAdmin|demoteFromAdmin)" floorplan-app/convex/admin.ts
  ```

  **Commit**: YES
  - Message: `feat(admin): add admin mutations for featuring and role management`
  - Files: `convex/admin.ts`

---

- [ ] 5. Create admin.ts queries

  **What to do**:
  - Add queries to `convex/admin.ts`:
    - `listAllProjects({ search?, cursor?, limit })` - Paginated, searchable
    - `listAllUsers({ search?, cursor?, limit })` - Paginated, searchable
    - `getStats()` - Return counts: totalUsers, totalProjects, featuredCount, adminCount
  - All queries require admin authorization
  - Include isFeatured, isAdmin flags in results

  **Must NOT do**:
  - DO NOT expose user emails to non-super-admins (username only)
  - DO NOT skip pagination (could be thousands of records)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: None

  **References**:
  - `floorplan-app/convex/explore.ts` - Pagination pattern
  - `floorplan-app/convex/projects.ts` - Query patterns

  **Acceptance Criteria**:
  ```bash
  # Verify queries exist
  grep -E "export const (listAllProjects|listAllUsers|getStats)" floorplan-app/convex/admin.ts
  ```

  **Commit**: YES (group with Task 4 if same session)
  - Message: `feat(admin): add admin queries for projects and users`
  - Files: `convex/admin.ts`

---

- [ ] 6. Create /admin layout with sidebar

  **What to do**:
  - Create `src/routes/admin.tsx` as layout route
  - Wrap with AdminGuard component
  - Add sidebar navigation:
    - Overview (/)
    - Featured Projects (/featured)
    - Users (/users) - Show "Super Admin" badge if super admin only features
    - Audit Log (/audit)
  - Add header with "Admin Dashboard" title and user info
  - Style consistent with existing app design

  **Must NOT do**:
  - DO NOT skip AdminGuard wrapper
  - DO NOT show super-admin-only links to regular admins

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Tasks 8, 9, 10, 12
  - **Blocked By**: Task 3

  **References**:
  - `floorplan-app/src/routes/dashboard.tsx` - Layout pattern
  - `floorplan-app/src/components/Header.tsx` - Header pattern

  **Acceptance Criteria**:
  ```
  # Playwright verification:
  1. Navigate to: http://localhost:3000/admin (logged in as admin)
  2. Assert: Sidebar with navigation visible
  3. Assert: Header with "Admin Dashboard" visible
  4. Screenshot: .sisyphus/evidence/admin-layout.png
  ```

  **Commit**: YES
  - Message: `feat(admin): create admin layout with sidebar navigation`
  - Files: `src/routes/admin.tsx`

---

- [ ] 7. Configure table-history for admin actions

  **What to do**:
  - Create `convex/lib/auditLog.ts` with TableHistory setup
  - Create trigger for admin actions table
  - Wrap admin mutations with audit logging trigger
  - Add `AUDIT_TRAIL_SCOPE` check:
    - "admin-only": Only track admin table changes
    - "all": Track projects, users, collections, topics (future)
  - Export `adminAuditLog` client for queries

  **Must NOT do**:
  - DO NOT track all tables if scope is "admin-only"
  - DO NOT skip attribution (who made the change)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`repo-maintenance`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 12
  - **Blocked By**: Task 2

  **References**:
  - https://github.com/get-convex/table-history - Implementation guide
  - `floorplan-app/convex/convex.config.ts` - Component setup from Task 2

  **Acceptance Criteria**:
  ```bash
  # Verify audit log setup
  test -f floorplan-app/convex/lib/auditLog.ts && echo "EXISTS"
  grep "TableHistory" floorplan-app/convex/lib/auditLog.ts
  ```

  **Commit**: YES
  - Message: `feat(admin): configure table-history for audit logging`
  - Files: `convex/lib/auditLog.ts`, `convex/admin.ts` (update)

---

### Phase 2: Featured Projects & User Management

- [ ] 8. Create /admin overview dashboard

  **What to do**:
  - Create `src/routes/admin/index.tsx`
  - Display stats cards:
    - Total Projects
    - Featured Projects
    - Total Users
    - Admin Users
  - Display recent admin activity (from audit log, if available)
  - Add quick actions: "Feature a Project", "Manage Users"
  - Responsive grid layout

  **Must NOT do**:
  - DO NOT add complex charts (keep it simple for MVP)
  - DO NOT skip loading states

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: None
  - **Blocked By**: Tasks 5, 6

  **References**:
  - `floorplan-app/src/routes/dashboard.tsx` - Dashboard pattern
  - `floorplan-app/convex/admin.ts:getStats` - Stats query from Task 5

  **Acceptance Criteria**:
  ```
  # Playwright verification:
  1. Navigate to: http://localhost:3000/admin
  2. Assert: Stats cards visible (4 cards)
  3. Assert: Quick action buttons present
  4. Screenshot: .sisyphus/evidence/admin-overview.png
  ```

  **Commit**: YES
  - Message: `feat(admin): create admin overview dashboard`
  - Files: `src/routes/admin/index.tsx`

---

- [ ] 9. Create /admin/featured page

  **What to do**:
  - Create `src/routes/admin/featured.tsx`
  - Display paginated table of all projects:
    - Project name, slug
    - Owner username
    - View count, fork count
    - Featured toggle switch
  - Add search input (filter by name/slug)
  - Add filter dropdown: All / Featured / Not Featured
  - Toggle calls `admin.setFeatured` mutation
  - Show success/error toast on toggle

  **Must NOT do**:
  - DO NOT allow editing project content (just featuring)
  - DO NOT skip pagination for large project lists

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10)
  - **Blocks**: None
  - **Blocked By**: Tasks 4, 5, 6

  **References**:
  - `floorplan-app/src/routes/explore/index.tsx` - Project grid pattern
  - `floorplan-app/convex/admin.ts` - Queries and mutations

  **Acceptance Criteria**:
  ```
  # Playwright verification:
  1. Navigate to: http://localhost:3000/admin/featured
  2. Assert: Project table visible
  3. Assert: Search input present
  4. Assert: Featured toggle switches visible
  5. Screenshot: .sisyphus/evidence/admin-featured.png
  ```

  **Commit**: YES
  - Message: `feat(admin): create featured projects management page`
  - Files: `src/routes/admin/featured.tsx`

---

- [ ] 10. Create /admin/users page

  **What to do**:
  - Create `src/routes/admin/users.tsx`
  - Display paginated table of all users:
    - Username, display name
    - Email (super admin only - hide for regular admins)
    - Created date
    - Admin badge if admin
    - Super Admin badge if super admin
  - Add search input (filter by username)
  - Super Admin only features:
    - "Promote to Admin" button (for non-admins)
    - "Demote from Admin" button (for admins, not super admin)
  - Regular admins see read-only list
  - Confirmation modal for promote/demote actions

  **Must NOT do**:
  - DO NOT allow demoting super admin
  - DO NOT show promote/demote to regular admins
  - DO NOT expose emails to regular admins

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: None
  - **Blocked By**: Tasks 4, 5, 6

  **References**:
  - `floorplan-app/src/routes/admin/featured.tsx` - Table pattern from Task 9
  - `floorplan-app/convex/admin.ts` - promoteToAdmin, demoteFromAdmin mutations

  **Acceptance Criteria**:
  ```
  # Playwright verification (as super admin):
  1. Navigate to: http://localhost:3000/admin/users
  2. Assert: User table visible
  3. Assert: Promote/Demote buttons visible for eligible users
  4. Assert: Super Admin badge on super admin user
  5. Screenshot: .sisyphus/evidence/admin-users.png
  ```

  **Commit**: YES
  - Message: `feat(admin): create user management page`
  - Files: `src/routes/admin/users.tsx`

---

- [ ] 11. Add super admin capabilities (delete project, impersonate)

  **What to do**:
  - Add mutations to `convex/admin.ts`:
    - `deleteProject({ projectId })` - Super Admin only, hard delete
    - `startImpersonation({ userId })` - Super Admin only, returns session token
    - `endImpersonation()` - Return to super admin session
  - Update `/admin/users` page:
    - Add "Impersonate" button (super admin only)
    - Show impersonation banner when active
  - Update `/admin/featured` page:
    - Add "Delete Project" button with confirmation (super admin only)
  - Audit log all these actions

  **Must NOT do**:
  - DO NOT allow impersonating another super admin
  - DO NOT skip confirmation for destructive actions
  - DO NOT forget to log impersonation start/end

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`repo-maintenance`, `frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10, 12)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:
  - `floorplan-app/convex/admin.ts` - Existing mutations
  - `floorplan-app/src/lib/auth-client.ts` - Session management

  **Acceptance Criteria**:
  ```bash
  # Verify super admin mutations exist
  grep -E "export const (deleteProject|startImpersonation|endImpersonation)" floorplan-app/convex/admin.ts
  ```

  **Commit**: YES
  - Message: `feat(admin): add super admin delete and impersonate capabilities`
  - Files: `convex/admin.ts`, `src/routes/admin/users.tsx`, `src/routes/admin/featured.tsx`

---

- [ ] 12. Create /admin/audit page

  **What to do**:
  - Create `src/routes/admin/audit.tsx`
  - Display paginated list of admin actions:
    - Timestamp
    - Action type (featured, promoted, demoted, deleted, impersonated)
    - Actor (who did it)
    - Target (what/who was affected)
    - Details (before/after if applicable)
  - Add date range filter
  - Add action type filter
  - Use `adminAuditLog.listHistory()` query

  **Must NOT do**:
  - DO NOT show system/cron actions (only human admin actions)
  - DO NOT skip pagination

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `floorplan-app/convex/lib/auditLog.ts` - Audit log queries from Task 7
  - https://github.com/get-convex/table-history - Query patterns

  **Acceptance Criteria**:
  ```
  # Playwright verification:
  1. Navigate to: http://localhost:3000/admin/audit
  2. Assert: Audit log table visible
  3. Assert: Date filter present
  4. Assert: Action type filter present
  5. Screenshot: .sisyphus/evidence/admin-audit.png
  ```

  **Commit**: YES
  - Message: `feat(admin): create audit log viewer page`
  - Files: `src/routes/admin/audit.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(admin): add super admin env var support` | `convex/lib/auth.ts` | grep check |
| 2 | `chore(deps): install convex-table-history` | `package.json`, `convex/convex.config.ts` | npm ls |
| 3 | `feat(admin): create AdminGuard components` | `src/components/AdminGuard.tsx` | LSP check |
| 4-5 | `feat(admin): add admin mutations and queries` | `convex/admin.ts` | npx convex dev |
| 6 | `feat(admin): create admin layout` | `src/routes/admin.tsx` | Playwright |
| 7 | `feat(admin): configure audit logging` | `convex/lib/auditLog.ts` | grep check |
| 8 | `feat(admin): create overview dashboard` | `src/routes/admin/index.tsx` | Playwright |
| 9 | `feat(admin): create featured management` | `src/routes/admin/featured.tsx` | Playwright |
| 10 | `feat(admin): create user management` | `src/routes/admin/users.tsx` | Playwright |
| 11 | `feat(admin): add super admin capabilities` | Multiple files | Playwright + grep |
| 12 | `feat(admin): create audit log viewer` | `src/routes/admin/audit.tsx` | Playwright |

---

## Success Criteria

### Verification Commands
```bash
# All admin routes exist
ls -la floorplan-app/src/routes/admin/

# All mutations/queries exist
grep -E "export const" floorplan-app/convex/admin.ts

# Audit log configured
test -f floorplan-app/convex/lib/auditLog.ts

# No TypeScript errors
cd floorplan-app && npm run typecheck 2>&1 | grep -v node_modules
```

### Final Checklist
- [ ] Super admin can promote/demote admins
- [ ] Admins can feature/unfeature projects
- [ ] Super admin can delete any project
- [ ] Super admin can impersonate users
- [ ] Audit trail records admin actions
- [ ] Non-admins redirected away from /admin
- [ ] All admin actions require proper authorization
- [ ] No TypeScript errors
