## ADDED Requirements

### Requirement: Convex Generated Types for All API Calls

The floorplan-app SHALL use Convex generated types from `convex/_generated/api` for all query, mutation, and action references, eliminating manual `as unknown as FunctionReference` casts.

#### Scenario: No manual FunctionReference casts in app code
- **GIVEN** the app previously used `convexApi.projects.getBySlug` (a manually typed cast)
- **WHEN** the migration is complete
- **THEN** all consumers SHALL import `api` from `convex/_generated/api`
- **AND** query references SHALL be `api.projects.getBySlug` with full type inference
- **AND** zero `as unknown as FunctionReference` casts SHALL remain in application code

#### Scenario: New route uses generated types
- **WHEN** a developer adds a new route that queries Convex
- **THEN** they SHALL import from `convex/_generated/api`
- **AND** TypeScript SHALL infer argument types and return types automatically
- **AND** no manual type annotations SHALL be needed for the query reference

#### Scenario: convexApi object removed
- **GIVEN** `project-types.ts` currently exports a `convexApi` object with 30+ manual casts
- **WHEN** migration is complete
- **THEN** the `convexApi` export SHALL be removed from `project-types.ts`
- **AND** the deprecated `projectApi` alias SHALL also be removed

### Requirement: Typed Convex Query Results

Convex query results SHALL flow through to consumers with proper TypeScript types, eliminating manual result casting.

#### Scenario: Query result used without cast
- **GIVEN** a route component calls `useQuery(api.projects.list, {})`
- **WHEN** the query resolves
- **THEN** `.data()` SHALL return a typed result matching the Convex function's return type
- **AND** no `as unknown as PublicProject[]` cast SHALL be required

#### Scenario: Mutation arguments type-checked
- **GIVEN** a component calls `useMutation(api.projects.save)`
- **WHEN** the developer passes arguments
- **THEN** TypeScript SHALL enforce the correct argument shape
- **AND** missing required fields SHALL produce compile-time errors

#### Scenario: Return type annotations on Convex functions
- **GIVEN** a Convex query function `projects:getBySlug`
- **WHEN** it returns a result
- **THEN** the function SHALL have explicit return type annotations
- **AND** the generated types SHALL reflect the annotated return shape

### Requirement: Convex Codegen in Build Pipeline

The build pipeline SHALL generate Convex types before SolidStart compilation to ensure type availability.

#### Scenario: Types generated before build
- **GIVEN** a developer runs `npm run build` in `floorplan-app/`
- **WHEN** the build starts
- **THEN** `npx convex codegen` SHALL run first (via `prebuild` script)
- **AND** `convex/_generated/api.ts` SHALL be up to date before TypeScript compilation begins

#### Scenario: CI build includes codegen
- **GIVEN** a CI pipeline builds `floorplan-app`
- **WHEN** the build step executes
- **THEN** Convex codegen SHALL run automatically
- **AND** type errors from stale generated types SHALL not occur

#### Scenario: Dev server uses live codegen
- **GIVEN** a developer runs `npx convex dev` alongside the SolidStart dev server
- **WHEN** they modify a Convex function
- **THEN** generated types SHALL update automatically
- **AND** the SolidStart dev server SHALL pick up the new types via HMR
