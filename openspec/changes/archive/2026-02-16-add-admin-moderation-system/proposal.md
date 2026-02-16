# Add Admin Moderation System

## Why

The floorplan-app needed moderation capabilities to manage user behavior at scale. Without moderation tools, admins had no way to warn, ban, or track problematic users. Additionally, users had no mechanism to receive notifications about admin actions, collaboration invites, or project events.

## What Changed

### Admin Moderation Mutations (convex/admin.ts)

- Added `warnUser` mutation with reason tracking and audit logging
- Added `banUser` mutation with configurable duration (1d, 7d, 30d, permanent)
- Added `unbanUser` mutation with optional reason
- Added `getUserModerationHistory` query for timeline view
- Added `listUserProjects` query for admin project inspection
- Exposed `bannedUntil` field in `listAllUsers` for status display

### Notifications System (convex/notifications.ts, convex/schema.ts)

- Added `notifications` table with type, title, message, metadata, and read status
- Created `createNotification` helper called from admin mutations, sharing, and project events
- Notification types: `collaborator.invite`, `collaborator.roleChange`, `collaborator.remove`, `transfer.requested`, `transfer.accepted`, `transfer.rejected`, `project.forked`, `project.featured`, `warning`, `ban`, `ban_lifted`, `admin.promoted`
- Added notification triggers to `setFeatured`, `promoteToAdmin`, sharing, and transfer flows

### Ban Enforcement (convex/lib/auth.ts, convex/lib/access.ts, convex/explore.ts)

- Added `bannedUntil` field to users schema (optional)
- Added ban check in `requireActiveUser` auth helper
- Filtered banned users from explore/public queries
- Added `getBanStatus` query that bypasses ban filter for frontend detection

### Frontend: Ban Gate & Guard

- Added `BanGate` component: declarative gate that blocks banned users from protected routes
- Added `BanGuard` component: real-time subscription for live ban/unban navigation
- Created `(protected)/` route group layout wrapping dashboard, new, and settings routes
- Added `/banned` route with ban status display
- Added `WarningBanner` component for active warning dismissal

### Frontend: Notification Bell

- Added `NotificationBell` component with unread count badge
- Dropdown with notification list, type-specific icons, and relative timestamps
- Mark-as-read on click, mark-all-as-read action
- Integrated into Header component

### Admin Users Page Expansion (routes/admin/users.tsx)

- Added moderation action buttons (warn, ban, unban) with confirmation modals
- Added user project viewer modal
- Added moderation history timeline modal
- Added promote/demote admin actions (super admin only)
- Added status badges (active, warned, banned)

### Reusable UI Components

- `ConfirmationModal`: typed confirmation support, loading states, customizable styling
- `InlineEdit`: click-to-edit text fields with save/cancel
- `Timeline`: DaisyUI-based timeline component for moderation history

### Code Quality (biome lint)

- Resolved all 56 biome lint warnings across the codebase
- Added `aria-hidden="true"` to 24 decorative SVGs
- Added `type="button"` to 18 button elements
- Fixed 6 label-input associations
- Replaced `any` types with proper types or documented biome-ignore comments
- Removed 1 unused variable

## Scope

- **In scope:** Admin moderation tools, notifications, ban enforcement, lint cleanup
- **Out of scope:** Email notifications, moderation appeal flow, rate limiting on notifications
