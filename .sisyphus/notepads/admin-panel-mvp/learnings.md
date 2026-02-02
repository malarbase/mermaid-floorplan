
## Task 4: Admin Mutations

### Implementation Summary
Created `convex/admin.ts` with three core admin mutations:
1. **setFeatured** - Admin+ can toggle project featured status
2. **promoteToAdmin** - Super Admin only, promotes users to admin
3. **demoteFromAdmin** - Super Admin only, with safety checks

### Auth Helper Addition
Added `requireAdmin(ctx)` to `convex/lib/auth.ts`:
- Checks `user.isAdmin || isSuperAdmin(user)`
- Parallel structure to existing `requireSuperAdmin`
- Returns user object or throws "Admin access required"

### Safety Mechanisms
- **Self-demotion prevention**: Cannot demote yourself
- **Super admin protection**: Cannot demote super admins
- **Duplicate checks**: promoteToAdmin checks if already admin
- **Null guards**: All mutations check user exists before patching

### Audit Log Placeholders
All mutations include `// TODO: Audit log (Task 7)` comments where audit logging will be wired up via triggers in Task 7.

### Convex Validation
Ran `npx convex dev --once` - all functions validated successfully. LSP showed stale cache errors but Convex compilation passed.

## Task 5: Admin Queries

**Date**: 2026-02-03

### What was done
- Added three admin queries to `convex/admin.ts`:
  - `listAllProjects()` - Paginated, searchable project list with owner enrichment
  - `listAllUsers()` - Paginated, searchable user list (email visibility restricted to super admins)
  - `getStats()` - Summary statistics (total projects, featured, users, admins)

### Key Implementation Details
- All queries require admin authorization via `requireAdmin(ctx)`
- `listAllUsers` uses `isSuperAdmin()` to conditionally expose user emails
- Search filters work on displayName and slug (projects) or username and displayName (users)
- Default limit is 50 records, configurable via args
- Owner username enrichment uses Promise.all for efficiency
- Includes `isSuperAdmin` flag in user results for UI display

### Security Patterns
- Email visibility: Only super admins see user emails
- Authorization: All queries guarded by `requireAdmin()`
- Safe field mapping: Explicit field selection instead of returning raw documents

### TypeScript/LSP Notes
- LSP may show false positive "Module has no exported member" errors
- These are caching issues - actual compilation works fine
- Verified with `npx tsc --noEmit --skipLibCheck` (no errors)
- Exports from `lib/auth.ts` are valid: `requireAdmin`, `requireSuperAdmin`, `isSuperAdmin`

### Files Modified
- `convex/admin.ts` - Added queries section (lines 88-201)
- Updated imports to include `query` from `_generated/server`

### Testing Strategy
- Verification: `grep -E "export const (listAllProjects|listAllUsers|getStats)" convex/admin.ts`
- TypeScript check: `npm run typecheck` (no errors)
- Pagination tested with limit parameter
- Search tested with case-insensitive filtering

### Dependencies
- Task 4 (mutations) was already complete
- Task 1 (super admin helpers) provided `requireAdmin`, `requireSuperAdmin`, `isSuperAdmin`
- Uses standard Convex query/mutation patterns from existing codebase


## Task 7: Configure table-history for admin actions

### Implementation Approach
- Created `convex/lib/auditLog.ts` with TableHistory setup for automatic audit logging
- Used **Option 1** (track source tables): Projects and users table changes are automatically logged via triggers
- Trigger-wrapped database captures all mutations to projects.isFeatured and users.isAdmin
- Attribution is automatic via convex-table-history (tracks who made the change)

### Key Technical Decisions
1. **Automatic vs Manual Logging**: Chose trigger-based automatic logging over manual entries
   - Benefit: No need to manually log each action in mutations
   - Benefit: Cannot be accidentally forgotten
   - Benefit: Captures all changes consistently

2. **TableHistory Configuration**:
   - Used `serializability: "document"` for per-document change tracking
   - Registered triggers for "projects" and "users" tables only (admin-only scope)
   - Component name: "adminAuditLog" (matches convex.config.ts)

3. **Custom Mutation Wrapper**:
   - Wrapped raw mutation with customMutation + customCtx(triggers.wrapDB)
   - This ensures all admin mutations automatically trigger audit logging
   - Pattern from convex-helpers for server-side custom functions

### Environment Variable
- `AUDIT_TRAIL_SCOPE`: Controls which tables to track
  - "admin-only" (default): Only projects and users
  - "all": Future expansion to track all tables (topics, collections, etc.)

### Files Modified
- `floorplan-app/convex/lib/auditLog.ts` (NEW): TableHistory setup and triggers
- `floorplan-app/convex/admin.ts` (UPDATED): Import triggers and wrap mutations

### Verification
- ✅ Convex dev server starts successfully with `npx convex dev --once`
- ✅ No build errors in our new files
- ✅ Generated API types updated correctly

### For Task 12 (Audit Log Viewer)
To query audit history:
```typescript
import { adminAuditLog } from "./lib/auditLog";

// Query changes to a specific document
const history = await adminAuditLog.listHistory(ctx, tableId, documentId);

// Each entry will have:
// - timestamp: When the change occurred
// - table: "projects" or "users"
// - documentId: Which record was changed
// - changes: Before/after values
// - userId: Who made the change (attribution)
```
