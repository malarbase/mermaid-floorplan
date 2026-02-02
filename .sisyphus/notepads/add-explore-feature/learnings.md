
## Explore Page Implementation (Task 9)
- **convex-solidjs `useQuery` limitations**: Unlike `convex-react`, passing `"skip"` as a query argument (to conditionally skip) throws an error `The arguments to a Convex function must be an object. Received: skip`.
- **Workaround**: Instead of skipping, pass a dummy argument that ensures the query returns empty/null quickly (e.g., `topicSlug: "_______SKIP_______"`). This maintains type safety while effectively "skipping" the logic.
- **Infinite Scroll**: Implemented simply by increasing `limit` state. Convex query `take(limit)` handles this efficiently.
- **Public vs Private Components**: Created `PublicProjectCard` to avoid tight coupling with `ProjectList` (which has edit/delete actions). Separating read-only views from management views is cleaner.

## Task 11: Collection Detail Page Implementation
- Created dynamic route `/explore/collections/[slug]` using SolidJS Router.
- Implemented `useQuery(api.explore.getCollection)` to fetch collection data.
- **Schema Discrepancy**: Task requested displaying `curator` (createdBy) and `coverImageUrl`, but these fields do not exist in the `collections` schema in `convex/schema.ts`.
  - Implemented `displayName` and `description`.
  - Omitted `curator` and `coverImageUrl` to avoid TypeErrors.
  - Future improvement: Update schema to include these fields if required.
- **Type Safety**: `useParams().slug` can be undefined, but Convex query requires a string. Used `params.slug ?? ""` to satisfy TypeScript (empty string results in "not found" which is handled).
- Reused `PublicProjectCard` for consistent project display.

## Task 10: Topic Filter Page Implementation
- Created `src/routes/explore/topics/[slug].tsx` to handle topic-based project filtering.
- Reused `PublicProjectCard` and `Header` components.
- Duplicated `TOPICS` constant from `explore/index.tsx` as a temporary solution since `convex/explore.ts` `listByTopic` doesn't return topic metadata and modifying backend was out of scope.
- Implemented fallback for unknown topics by formatting the slug.
- Added loading states (skeleton), empty states, and pagination (load more).
- **Key Learnings**:
  - **SolidJS Router Params**: `useParams().slug` can be undefined in types even if guaranteed by route structure. Used `params.slug || ""` to satisfy TS.
  - **Data Handling**: Convex queries return `undefined` initially (loading), then the data object. Need safely typed accessors (e.g., `projects` memo).
- **Technical Debt**:
  - **Topic Metadata**: Topic labels and icons are hardcoded in the frontend. Ideally, the `listByTopic` query should return the topic's `displayName` and `description` from the database so the frontend doesn't need to know about specific topics.
  - **Code Duplication**: `TOPICS` constant is duplicated in `explore/index.tsx` and `explore/topics/[slug].tsx`. Should be moved to a shared constant file or fetched from backend.
