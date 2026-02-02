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
</file>