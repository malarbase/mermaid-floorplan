# SolidStart Application Capability

The solidstart-app capability provides a full-stack SolidStart application for the mermaid-floorplan project, including authentication via Better Auth and cloud storage via Convex.

## ADDED Requirements

### Requirement: SolidStart Application Structure

The application SHALL use SolidStart as the meta-framework with file-based routing and SSR support.

#### Scenario: Application initializes correctly

- **GIVEN** the floorplan-app package exists
- **WHEN** running `npm run dev` in floorplan-app
- **THEN** a SolidStart development server SHALL start
- **AND** the application SHALL be accessible at localhost

#### Scenario: File-based routing works

- **GIVEN** a route file at `routes/editor.tsx`
- **WHEN** navigating to `/editor`
- **THEN** the editor page component SHALL render

### Requirement: Better Auth Integration

The application SHALL integrate Better Auth for authentication with OAuth provider support.

#### Scenario: Auth handler mounted correctly

- **GIVEN** the auth handler at `routes/api/auth/[...all].ts`
- **WHEN** a request is made to `/api/auth/*`
- **THEN** Better Auth SHALL handle the request

#### Scenario: Google OAuth login flow

- **GIVEN** a user clicks "Sign in with Google"
- **WHEN** the OAuth flow completes successfully
- **THEN** a session cookie SHALL be set
- **AND** the user SHALL be redirected to the dashboard

#### Scenario: Session persists across page loads

- **GIVEN** a user has a valid session cookie
- **WHEN** the user refreshes the page
- **THEN** the user SHALL remain authenticated
- **AND** protected routes SHALL be accessible

### Requirement: Convex Backend Integration

The application SHALL use Convex as the serverless backend database.

#### Scenario: Convex client connects successfully

- **GIVEN** valid Convex environment configuration
- **WHEN** the application loads
- **THEN** the Convex client SHALL establish connection
- **AND** real-time subscriptions SHALL be active

#### Scenario: Database schema deployed

- **GIVEN** the convex/schema.ts file defines tables
- **WHEN** running `npx convex dev` or `npx convex deploy`
- **THEN** the database schema SHALL be created in Convex

### Requirement: Project Cloud Storage

The application SHALL provide cloud storage for user projects using Convex with GitHub-inspired versioning.

#### Scenario: Create new project

- **GIVEN** an authenticated user
- **WHEN** the user creates a new project with a name and content
- **THEN** a project record SHALL be created in Convex
- **AND** a "main" version SHALL be created automatically
- **AND** an initial snapshot SHALL be created with the content
- **AND** the project SHALL appear in the user's dashboard

#### Scenario: Save changes creates snapshot

- **GIVEN** an authenticated user is editing a project
- **WHEN** the user saves changes
- **THEN** a new snapshot SHALL be created with content hash
- **AND** the current version SHALL point to the new snapshot
- **AND** the previous snapshot SHALL remain unchanged

#### Scenario: Load project from dashboard

- **GIVEN** an authenticated user has saved projects
- **WHEN** the user selects a project from the dashboard
- **THEN** the default version's snapshot content SHALL be loaded
- **AND** the editor SHALL display the floorplan

#### Scenario: Delete project

- **GIVEN** an authenticated user owns a project
- **WHEN** the user clicks "Delete" and confirms
- **THEN** the project and all versions/snapshots SHALL be removed
- **AND** the dashboard SHALL reflect the deletion

### Requirement: Version Management

The application SHALL support named versions (like Git branches) for organizing work.

#### Scenario: Create named version

- **GIVEN** an authenticated user viewing a project
- **WHEN** the user creates a new version named "client-review"
- **THEN** a version record SHALL be created pointing to the current snapshot
- **AND** the URL `/u/{user}/{project}/v/client-review` SHALL be accessible

#### Scenario: Switch between versions

- **GIVEN** a project with multiple versions ("main", "client-review")
- **WHEN** the user switches from "main" to "client-review"
- **THEN** the editor SHALL load the snapshot for "client-review"
- **AND** subsequent saves SHALL update "client-review" version

#### Scenario: Version URL is mutable

- **GIVEN** a version URL `/u/alice/beach-house/v/client-review`
- **WHEN** the owner saves new changes to that version
- **THEN** the URL SHALL show the updated content
- **AND** previous content SHALL still be accessible via snapshot permalink

### Requirement: Snapshot Permalinks

The application SHALL provide immutable permalink URLs using content hashes.

#### Scenario: Snapshot has unique hash

- **GIVEN** a user saves content to a project
- **WHEN** a snapshot is created
- **THEN** the snapshot SHALL have a content hash (first 8 chars of SHA256)
- **AND** the hash SHALL be unique within the project

#### Scenario: Permalink URL never changes

- **GIVEN** a snapshot permalink `/u/alice/beach-house/s/a1b2c3d4`
- **WHEN** the owner makes changes and saves new versions
- **THEN** the permalink SHALL always show the original snapshot content
- **AND** the permalink SHALL remain valid indefinitely

#### Scenario: Copy permalink for sharing

- **GIVEN** a user viewing a snapshot
- **WHEN** the user clicks "Copy Permalink"
- **THEN** the full URL SHALL be copied to clipboard
- **AND** a confirmation message SHALL be displayed

### Requirement: Version History

The application SHALL display the history of snapshots for a project.

#### Scenario: View project history

- **GIVEN** a project with multiple snapshots
- **WHEN** the user navigates to `/u/{user}/{project}/history`
- **THEN** a chronological list of snapshots SHALL be displayed
- **AND** each entry SHALL show message, author, and timestamp

#### Scenario: Restore from history

- **GIVEN** a user viewing project history
- **WHEN** the user clicks "View" on a historical snapshot
- **THEN** the snapshot content SHALL be displayed in read-only mode
- **AND** the user MAY create a new version from that snapshot

### Requirement: Public Project Sharing

The application SHALL support sharing projects publicly via readable URLs.

#### Scenario: Make project public

- **GIVEN** an authenticated user owns a project
- **WHEN** the user toggles "Make Public"
- **THEN** the project's isPublic flag SHALL be set to true
- **AND** the URL `/u/{username}/{project}` SHALL be accessible to anyone

#### Scenario: View public project without auth

- **GIVEN** a project is marked as public
- **WHEN** an unauthenticated user visits `/u/alice/beach-house`
- **THEN** the viewer SHALL display the default version
- **AND** no login SHALL be required

#### Scenario: View public snapshot permalink

- **GIVEN** a public project with snapshot hash "a1b2c3d4"
- **WHEN** anyone visits `/u/alice/beach-house/s/a1b2c3d4`
- **THEN** the exact snapshot content SHALL be displayed
- **AND** this URL SHALL work forever (immutable)

#### Scenario: Private project not accessible

- **GIVEN** a project is marked as private
- **WHEN** an unauthenticated user attempts to access it
- **THEN** access SHALL be denied
- **AND** a 404 or redirect to login SHALL occur

### Requirement: Viewer-Core Embedding

The application SHALL embed floorplan-viewer-core for 3D rendering.

#### Scenario: Viewer-core renders in editor

- **GIVEN** the editor page is loaded
- **WHEN** a floorplan DSL is provided
- **THEN** the FloorplanApp from viewer-core SHALL render the 3D view
- **AND** camera controls SHALL be functional

#### Scenario: Viewer-core cleanup on navigation

- **GIVEN** the user is on the editor page with viewer-core active
- **WHEN** the user navigates to another page
- **THEN** the FloorplanApp instance SHALL be destroyed
- **AND** Three.js resources SHALL be released

#### Scenario: Auth state passed to viewer-core

- **GIVEN** an authenticated user is on the editor page
- **WHEN** viewer-core initializes
- **THEN** the FloorplanApp SHALL receive `isAuthenticated: true`
- **AND** editing features SHALL be enabled

### Requirement: Protected Route Access

The application SHALL restrict certain routes to authenticated users.

#### Scenario: Unauthenticated user redirected from editor

- **GIVEN** a user is not authenticated
- **WHEN** the user navigates to `/editor`
- **THEN** the user SHALL be redirected to `/login`

#### Scenario: Unauthenticated user redirected from dashboard

- **GIVEN** a user is not authenticated
- **WHEN** the user navigates to `/dashboard`
- **THEN** the user SHALL be redirected to `/login`

#### Scenario: Authenticated user accesses protected route

- **GIVEN** a user is authenticated
- **WHEN** the user navigates to `/editor`
- **THEN** the editor page SHALL render normally

### Requirement: Vercel Deployment

The application SHALL be deployable to Vercel with automatic CI/CD.

#### Scenario: Push to master triggers deployment

- **GIVEN** a Vercel project linked to the GitHub repository
- **WHEN** changes to floorplan-app/** are pushed to master
- **THEN** Vercel SHALL automatically deploy the application
- **AND** the application SHALL be accessible at the Vercel URL

#### Scenario: Preview deployments for PRs

- **GIVEN** a pull request modifying floorplan-app
- **WHEN** the PR is created or updated
- **THEN** a preview deployment SHALL be created
- **AND** a preview URL SHALL be available for testing

#### Scenario: SSR works correctly

- **GIVEN** the SolidStart application is deployed
- **WHEN** a user visits the application
- **THEN** the initial HTML SHALL be server-rendered
- **AND** hydration SHALL complete without errors

### Requirement: Logout Functionality

The application SHALL provide logout capability that clears authentication state.

#### Scenario: User logs out successfully

- **GIVEN** an authenticated user
- **WHEN** the user clicks "Logout"
- **THEN** the session cookie SHALL be cleared
- **AND** the user SHALL be redirected to the home page
- **AND** protected routes SHALL no longer be accessible

### Requirement: Username Management

The application SHALL provide username selection and management for user profiles.

#### Scenario: First login shows username selection

- **GIVEN** a user completes social login for the first time
- **WHEN** the callback completes
- **THEN** a username selection modal SHALL appear
- **AND** suggestions based on social profile SHALL be offered
- **AND** availability SHALL be checked in real-time

#### Scenario: Username suggestion from social provider

- **GIVEN** a user signs in with GitHub username "octocat"
- **WHEN** the username selection modal appears
- **THEN** "octocat" SHALL be suggested if available
- **AND** alternatives like "octocat-designs" SHALL be offered if taken

#### Scenario: User skips username selection

- **GIVEN** a user on the username selection modal
- **WHEN** the user clicks "Skip for now"
- **THEN** a temporary username (`u_xxxx`) SHALL be assigned
- **AND** the dashboard SHALL show a nudge to claim a username

#### Scenario: Username change with warning

- **GIVEN** an authenticated user with a set username
- **WHEN** the user attempts to change their username
- **THEN** a warning modal SHALL explain consequences
- **AND** the user MUST confirm to proceed

#### Scenario: Old username enters grace period

- **GIVEN** a user changes username from "alice" to "alice-designs"
- **WHEN** the change completes
- **THEN** "alice" SHALL be reserved for 90 days
- **AND** only the original owner MAY reclaim "alice" during this period

#### Scenario: Old username URL shows renamed message

- **GIVEN** a user changed username from "alice" to "alice-designs"
- **WHEN** someone visits `/u/alice/project`
- **THEN** a "user has changed their username" page SHALL display
- **AND** NO automatic redirect SHALL occur (prevents squatting)

### Requirement: Project Collaboration

The application SHALL support inviting collaborators to private projects.

#### Scenario: Invite collaborator by username

- **GIVEN** an authenticated user owns a project
- **WHEN** the user invites "@bob" as an editor
- **THEN** bob SHALL receive access to view and edit the project
- **AND** the project SHALL appear in bob's shared projects

#### Scenario: Share link with configurable role

- **GIVEN** an authenticated user owns a project
- **WHEN** the user creates a share link with "viewer" role
- **THEN** a unique URL token SHALL be generated
- **AND** anyone with the link SHALL have view-only access

#### Scenario: Remove collaborator access

- **GIVEN** a project owner with collaborators
- **WHEN** the owner removes a collaborator
- **THEN** that user SHALL lose access immediately
- **AND** the project SHALL disappear from their shared list

### Requirement: Project Forking

The application SHALL allow users to fork viewable projects.

#### Scenario: Fork public project

- **GIVEN** a user viewing a public project
- **WHEN** the user clicks "Fork"
- **THEN** a copy of the project SHALL be created under their account
- **AND** "Forked from @alice/beach-house" SHALL be displayed

#### Scenario: Fork shared project

- **GIVEN** a user with viewer access to a private project
- **WHEN** the user clicks "Fork"
- **THEN** a copy SHALL be created under their account
- **AND** the fork SHALL be private by default

#### Scenario: Cannot fork inaccessible project

- **GIVEN** a private project without access
- **WHEN** an unauthorized user attempts to fork
- **THEN** the fork action SHALL be denied
- **AND** a 404 or access denied message SHALL display
