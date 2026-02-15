<file>
00001| 
00002| ## Explore Page Implementation (Task 9)
00003| - **convex-solidjs `useQuery` limitations**: Unlike `convex-react`, passing `"skip"` as a query argument (to conditionally skip) throws an error `The arguments to a Convex function must be an object. Received: skip`.
00004| - **Workaround**: Instead of skipping, pass a dummy argument that ensures the query returns empty/null quickly (e.g., `topicSlug: "_______SKIP_______"`). This maintains type safety while effectively "skipping" the logic.
00005| - **Infinite Scroll**: Implemented simply by increasing `limit` state. Convex query `take(limit)` handles this efficiently.
00006| - **Public vs Private Components**: Created `PublicProjectCard` to avoid tight coupling with `ProjectList` (which has edit/delete actions). Separating read-only views from management views is cleaner.
00007| 
00008| ## Task 11: Collection Detail Page Implementation
00009| - Created dynamic route `/explore/collections/[slug]` using SolidJS Router.
00010| - Implemented `useQuery(api.explore.getCollection)` to fetch collection data.
00011| - **Schema Discrepancy**: Task requested displaying `curator` (createdBy) and `coverImageUrl`, but these fields do not exist in the `collections` schema in `convex/schema.ts`.
00012|   - Implemented `displayName` and `description`.
00013|   - Omitted `curator` and `coverImageUrl` to avoid TypeErrors.
00014|   - Future improvement: Update schema to include these fields if required.
00015| - **Type Safety**: `useParams().slug` can be undefined, but Convex query requires a string. Used `params.slug ?? ""` to satisfy TypeScript (empty string results in "not found" which is handled).
00016| - Reused `PublicProjectCard` for consistent project display.
00017| 
00018| ## Task 10: Topic Filter Page Implementation
00019| - Created `src/routes/explore/topics/[slug].tsx` to handle topic-based project filtering.
00020| - Reused `PublicProjectCard` and `Header` components.
00021| - Duplicated `TOPICS` constant from `explore/index.tsx` as a temporary solution since `convex/explore.ts` `listByTopic` doesn't return topic metadata and modifying backend was out of scope.
00022| - Implemented fallback for unknown topics by formatting the slug.
00023| - Added loading states (skeleton), empty states, and pagination (load more).
00024| - **Key Learnings**:
00025|   - **SolidJS Router Params**: `useParams().slug` can be undefined in types even if guaranteed by route structure. Used `params.slug || ""` to satisfy TS.
00026|   - **Data Handling**: Convex queries return `undefined` initially (loading), then the data object. Need safely typed accessors (e.g., `projects` memo).
00027| - **Technical Debt**:
00028|   - **Topic Metadata**: Topic labels and icons are hardcoded in the frontend. Ideally, the `listByTopic` query should return the topic's `displayName` and `description` from the database so the frontend doesn't need to know about specific topics.
00029|   - **Code Duplication**: `TOPICS` constant is duplicated in `explore/index.tsx` and `explore/topics/[slug].tsx`. Should be moved to a shared constant file or fetched from backend.
00030| 
00031| ## Task 12: Landing Page 3D Viewer
00032| - [Success] Embedded 3D viewer on landing page using `FloorplanEmbed` wrapper and `FeaturedProjectViewer` component.
00033| - [Success] Updated `api.explore.listFeatured` to return enriched data (content + user info) for the landing page.
00034| - [Pattern] Use `floorplan-viewer-core`'s `createFloorplanUI` for full controls in embedded mode.
00035| - [Pattern] Dynamic import of `floorplan-viewer-core` in `onMount` prevents SSR issues with Three.js.
00036| - [Correction] Fixed `displayName` vs `name` property usage from Convex schema.
00037| - [Miss] Failed to create Todo list before starting multi-step task (3 steps). Will correct in future.
00038| 
00039| ## Task 14: Fork-to-Edit Flow Implementation
00040| - Modified `ForkButton` to handle auto-opening via `?fork=true` query param.
00041| - Implemented client-side unique slug generation by fetching user's project list.
00042| - Added toast notification using `useToast` hook.
00043| - Updated `AuthGatedEditorPanel` to append `?fork=true` to the return URL for the login redirect.
00044| - Ensured `callback.tsx` handles the redirect correctly (implicitly supported by preserving query params).
00045| - Verified no LSP errors.
00046| 
00047| ## Task 15: Slug Edit UI Implementation
00048| - Implemented `updateSlug` mutation usage in settings page.
00049| - Added real-time availability check using `getBySlug` query with debouncing.
00050| - **Pattern**: For "is taken" checks, we can reuse `getBySlug` query. If it returns a project that isn't the current one, the slug is taken.
00051| - **Gotcha**: TypeScript error with `useParams` values being potentially undefined led to `setNewSlug(projectSlug())` error. Fixed with fallback `|| ""`.
00052| - **UX**: Added warning about redirects since changing slug breaks old links (though we have redirects, it's good to warn).
</file>
## Task 16: Slug Redirect Handling in Routing
- **Implementation Strategy**: Added `resolveSlug` query check BEFORE main project load to intercept redirects early.
- **Pattern**: Use `createMemo` to watch for redirect result and call `navigate(newUrl, { replace: true })` to avoid adding history entries.
- **Key Code Flow**:
  1. `slugResolveQuery` calls `api.projects.resolveSlug({ username, slug })`
  2. Returns `{ projectId, currentSlug, wasRedirected: boolean }`
  3. If `wasRedirected === true`, construct new URL preserving `location.search` and `location.hash`
  4. Use `replace: true` to replace current history entry (not add new entry)
- **Query Result Handling**: Must check `slugResolveQuery.data()` since Convex queries return `undefined` during loading, then the actual result.
- **URL Preservation**: Used `location.search` (query params) and `location.hash` (fragments) to preserve original request intent.
- **No LSP Errors**: Verified clean TypeScript compilation.
- **Next Task**: Original project loading (getBySlug) will continue normally if no redirect, or user gets redirected before that query runs.

## Task 17: E2E Tests for Explore Feature
- Created comprehensive E2E test suite in `tests/explore/explore.spec.ts` covering:
  - Explore page load and project display
  - Topic filtering via URL params and dedicated routes
  - Collection page structure and not-found states
  - Fork-to-edit flow (anonymous and authenticated users)
  - View count increment tracking
- **Pattern**: Use `test.skip()` for data-dependent tests when prerequisite data doesn't exist (graceful degradation).
- **Responsive Design Testing**: Desktop and mobile use different active state classes (`bg-base-200` vs `btn-neutral`). Tests must check both with regex: `/bg-base-200|btn-neutral/`.
- **Playwright Best Practices Applied**:
  - Used `.first()` to select from multiple matching elements
  - Used `.or()` for fallback selectors when multiple possibilities exist
  - Used `page.waitForLoadState("networkidle")` for async content loading
  - Used conditional logic to skip tests gracefully when data prerequisites aren't met
  - Added proper timeouts for debounced operations (view count: 2.5s)
- **Test Results**: 8 passed, 4 skipped (data-dependent), 0 failed
- **LSP Status**: No TypeScript errors
- **Key Insight**: E2E tests for explore features need to handle missing data gracefully since they depend on projects existing in the database. Using `test.skip()` prevents false failures in development/CI environments.
