# Tasks

## 1. Admin Moderation Backend

- [x] 1.1 Add `warnUser` mutation with reason tracking and audit logging
- [x] 1.2 Add `banUser` mutation with configurable duration (1d, 7d, 30d, permanent)
- [x] 1.3 Add `unbanUser` mutation with optional reason
- [x] 1.4 Add `getUserModerationHistory` query for timeline view
- [x] 1.5 Add `listUserProjects` query for admin project inspection
- [x] 1.6 Expose `bannedUntil` in `listAllUsers` response

## 2. Notifications System

- [x] 2.1 Add `notifications` table to Convex schema
- [x] 2.2 Create `createNotification` helper function
- [x] 2.3 Add `getMyNotifications` query with unread count
- [x] 2.4 Add `markAsRead` and `markAllAsRead` mutations
- [x] 2.5 Integrate notification triggers into admin actions (warn, ban, unban, promote, feature)
- [x] 2.6 Integrate notification triggers into sharing and transfer flows

## 3. Ban Enforcement

- [x] 3.1 Add `bannedUntil` field to users schema
- [x] 3.2 Add ban check in `requireActiveUser` auth helper
- [x] 3.3 Filter banned users from explore/public queries
- [x] 3.4 Add `getBanStatus` query bypassing ban filter
- [x] 3.5 Create `BanGate` component for declarative route protection
- [x] 3.6 Create `BanGuard` component for real-time ban subscription
- [x] 3.7 Create `(protected)/` route group layout
- [x] 3.8 Move dashboard, new, settings routes under protected layout
- [x] 3.9 Create `/banned` route with ban status display
- [x] 3.10 Add `WarningBanner` component for warning dismissal

## 4. Notification Bell UI

- [x] 4.1 Create `NotificationBell` component with unread badge
- [x] 4.2 Add notification dropdown with type-specific icons
- [x] 4.3 Add relative timestamp display
- [x] 4.4 Add mark-as-read and mark-all-as-read actions
- [x] 4.5 Integrate into Header component

## 5. Admin Users Page

- [x] 5.1 Add moderation action buttons (warn, ban, unban)
- [x] 5.2 Add confirmation modals for moderation actions
- [x] 5.3 Add user project viewer modal
- [x] 5.4 Add moderation history timeline modal
- [x] 5.5 Add promote/demote admin actions
- [x] 5.6 Add user status badges (active, warned, banned)

## 6. Reusable UI Components

- [x] 6.1 Create `ConfirmationModal` with typed confirmation support
- [x] 6.2 Create `InlineEdit` click-to-edit component
- [x] 6.3 Create `Timeline` component for moderation history

## 7. Code Quality

- [x] 7.1 Fix all `noSvgWithoutTitle` warnings (24) with `aria-hidden="true"`
- [x] 7.2 Fix all `useButtonType` warnings (18) with `type="button"`
- [x] 7.3 Fix all `noLabelWithoutControl` warnings (6) with for/id pairs
- [x] 7.4 Fix all `noExplicitAny` warnings (7) with proper types or biome-ignore
- [x] 7.5 Remove unused `batchSize` variable in projects.ts
