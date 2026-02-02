
## Explore Page Implementation (Task 9)
- **convex-solidjs `useQuery` limitations**: Unlike `convex-react`, passing `"skip"` as a query argument (to conditionally skip) throws an error `The arguments to a Convex function must be an object. Received: skip`.
- **Workaround**: Instead of skipping, pass a dummy argument that ensures the query returns empty/null quickly (e.g., `topicSlug: "_______SKIP_______"`). This maintains type safety while effectively "skipping" the logic.
- **Infinite Scroll**: Implemented simply by increasing `limit` state. Convex query `take(limit)` handles this efficiently.
- **Public vs Private Components**: Created `PublicProjectCard` to avoid tight coupling with `ProjectList` (which has edit/delete actions). Separating read-only views from management views is cleaner.
