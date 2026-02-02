
## Trending Score Calculation (Task 4)

### Implementation Details
- Created `convex/trending.ts` with `calculateTrendingScore()` function
- Formula: `(views_7d * 1.0) + (forks_7d * 5.0) + (views_30d * 0.3) + (forks_30d * 1.5)`
- Time decay applied: `score / (1 + age_days * 0.1)` where age_days = (now - createdAt) / (1 day in ms)
- Cron job scheduled every 6 hours using `crons.interval()`

### Testing Approach
- Followed TDD: wrote 6 tests before implementation
- Tests cover: basic calculation, time decay, zero values, recent vs older activity weighting, fork vs view weighting, new projects
- Created `vitest.convex.config.ts` for convex-specific tests (excluded by default vitest config)
- All tests pass using `npx vitest run --config vitest.convex.config.ts`

### Files Created
- `convex/trending.ts` - Core logic (1346 bytes)
- `convex/trending.test.ts` - Test suite (3605 bytes)
- `vitest.convex.config.ts` - Test config for convex directory

### Files Modified
- `convex/crons.ts` - Added `calculate-trending-scores` cron job (6 hour interval)

### Schema Fields Used
- `projects.trendingScore` - Calculated trending score
- `projects.lastTrendingCalc` - Timestamp of last calculation
- `projects.viewCount` - Used for views_30d (simplified, no time windows yet)
- `projects.forkCount` - Used for forks_30d (simplified, no time windows yet)

### Notes
- Current implementation uses total viewCount/forkCount for both 7d and 30d windows
- Future enhancement: Track time-windowed counts separately
- Formula favors recent activity (7d) over older activity (30d) and forks over views
- Time decay ensures newer projects aren't penalized vs old projects with legacy activity

## Task 5: Slug Redirect Implementation

### Key Implementation Details

1. **Schema Structure**: The `slugRedirects` table uses `fromSlug` and `toSlug` (not `projectId`) to support slug-to-slug redirects. This allows the redirect to always point to the current slug even if it changes multiple times.

2. **Slug Validation Pattern**: `/^[a-z0-9-]+$/` - only lowercase letters, numbers, and hyphens allowed.

3. **Redirect Cleanup on Reuse**: When a user creates a new project with a slug that was previously used as a redirect, the old redirect is deleted. This prevents stale redirects from pointing to non-existent projects.

4. **Authorization**: Only project owners can update slugs (not editors).

5. **Test Location**: Convex tests must be in `src/test/` directory because `vitest.config.ts` excludes `convex/**` from test runs.

### Convex Query/Mutation Patterns

- Mutations require auth via `requireUserForMutation(ctx)`
- Queries can use `requireUserForQuery(ctx)` for optional auth
- Use `.withIndex()` for efficient queries on indexed fields
- Use `.filter()` for additional conditions after index lookup
- Always validate input format before database operations

### Testing Strategy

- Unit tests for validation logic (regex patterns, uniqueness checks)
- Logic tests for redirect creation and resolution
- Edge case tests for reuse scenarios and cross-user isolation
- All tests in `src/test/` directory with `.test.ts` extension


## Convex Crypto Fix

### Problem
Convex functions run in V8 isolates (browser-like environment), NOT Node.js. Importing Node.js `crypto` module causes compilation error: "The package 'crypto' wasn't found on the file system but is built into node".

### Solution
Use Web Crypto API (`crypto.subtle`) which is available in Convex runtime.

**Node.js Pattern (WRONG for Convex):**
```typescript
import * as crypto from "crypto";
const hash = crypto.createHash("sha256").update(data).digest("hex");
```

**Web Crypto Pattern (CORRECT for Convex):**
```typescript
const encoder = new TextEncoder();
const data = encoder.encode(input);
const hashBuffer = await crypto.subtle.digest("SHA-256", data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
```

### Key Differences
- Web Crypto is async (returns Promise)
- Requires TextEncoder for string → bytes conversion
- Returns ArrayBuffer, needs conversion to hex string
- Algorithm name is "SHA-256" (not "sha256")

### Verification
Run `npx convex dev --once` to verify Convex functions compile without errors.


## Task 6: Explore Queries Implementation

### Convex Index Usage
- The `by_trending` index is `["trendingScore", "updatedAt"]` - cannot use `.eq()` on trendingScore
- The `by_featured` index is `["isFeatured", "updatedAt"]` - similar constraint
- Must use `.filter()` for isPublic check instead of index equality

### Correct Pattern
```typescript
// WRONG: Cannot use .eq() on first index field without constraints
.withIndex("by_trending", (q) => q.eq("isPublic", true))

// CORRECT: Use index without constraints, then filter
.withIndex("by_trending")
.order("desc")
.filter((q) => q.eq(q.field("isPublic"), true))
```

### Test Strategy
- convex-test package is NOT installed in the project
- Convex tests are excluded in vitest.config.ts (`exclude: ['convex/**']`)
- Tests for pure functions (like trending.ts) use plain vitest
- For query/mutation tests, simple structural tests verifying exports exist are sufficient
- Acceptance criteria only checks for function existence, not full integration tests

### Query Implementations
1. **listTrending**: Returns public projects sorted by trendingScore DESC, default limit 24
2. **listByTopic**: Filters projects by topic slug via projectTopics junction table, only public projects
3. **listFeatured**: Returns projects with isFeatured=true, sorted by featuredAt DESC
4. **getCollection**: Returns collection by slug with all project details, preserves project order
5. **listCollections**: Returns all collections (no isOfficial filter in schema)

### Files Created
- `convex/explore.ts` - All 5 discovery queries
- `convex/explore.test.ts` - Structural tests verifying exports

