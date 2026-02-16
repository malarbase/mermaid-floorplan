# Admin Moderation System

Adds moderation tools, notifications, and ban enforcement to the floorplan-app.

## ADDED Requirements

### Requirement: Admin Moderation Actions

Admins SHALL be able to warn, ban, and unban users with reason tracking and audit logging.

#### Scenario: Admin warns a user

- **GIVEN** an authenticated admin user
- **WHEN** the admin calls `warnUser` with a userId and reason
- **THEN** a warning notification SHALL be created for the target user
- **AND** the action SHALL be recorded in the audit log

#### Scenario: Admin bans a user with duration

- **GIVEN** an authenticated admin user
- **WHEN** the admin calls `banUser` with a userId, reason, and duration (1d, 7d, 30d, permanent)
- **THEN** the target user's `bannedUntil` field SHALL be set accordingly
- **AND** a ban notification SHALL be created for the target user
- **AND** the action SHALL be recorded in the audit log

#### Scenario: Admin unbans a user

- **GIVEN** an authenticated admin user
- **WHEN** the admin calls `unbanUser` with a userId
- **THEN** the target user's `bannedUntil` field SHALL be cleared
- **AND** a ban_lifted notification SHALL be created for the target user

#### Scenario: Admin cannot moderate themselves

- **GIVEN** an authenticated admin user
- **WHEN** the admin attempts to warn, ban, or unban themselves
- **THEN** the mutation SHALL throw an error

#### Scenario: Admin cannot moderate super admins

- **GIVEN** an authenticated admin user
- **WHEN** the admin attempts to warn or ban a super admin
- **THEN** the mutation SHALL throw an error

### Requirement: Notifications System

Users SHALL receive real-time notifications for moderation actions, collaboration events, and project events.

#### Scenario: Notification created on admin action

- **GIVEN** an admin performs a moderation action (warn, ban, promote, feature)
- **WHEN** the mutation completes successfully
- **THEN** a notification SHALL be inserted into the notifications table for the target user

#### Scenario: User retrieves notifications

- **GIVEN** an authenticated user with notifications
- **WHEN** the user queries `getMyNotifications`
- **THEN** notifications SHALL be returned ordered by creation time (newest first)
- **AND** an unread count SHALL be included

#### Scenario: User marks notification as read

- **GIVEN** an authenticated user with an unread notification
- **WHEN** the user calls `markAsRead` with the notification ID
- **THEN** the notification's `readAt` field SHALL be set to the current timestamp

#### Scenario: User marks all notifications as read

- **GIVEN** an authenticated user with multiple unread notifications
- **WHEN** the user calls `markAllAsRead`
- **THEN** all unread notifications SHALL have their `readAt` field set

### Requirement: Ban Enforcement

Banned users SHALL be blocked from accessing protected routes and excluded from public queries.

#### Scenario: Banned user redirected to /banned

- **GIVEN** a user with an active ban (bannedUntil > now)
- **WHEN** the user navigates to a protected route (dashboard, settings, new)
- **THEN** the BanGate SHALL redirect to `/banned`
- **AND** the children SHALL NOT render

#### Scenario: Ban status checked in real-time

- **GIVEN** a user currently viewing a protected page
- **WHEN** an admin bans that user
- **THEN** the BanGuard SHALL detect the ban via real-time subscription
- **AND** the user SHALL be navigated to `/banned`

#### Scenario: Ban lifted navigates away from /banned

- **GIVEN** a banned user on the `/banned` page
- **WHEN** the ban expires or is lifted by an admin
- **THEN** the BanGuard SHALL detect the change
- **AND** the user SHALL be navigated to `/dashboard`

#### Scenario: Banned users excluded from explore

- **GIVEN** users with active bans
- **WHEN** the explore page queries public projects
- **THEN** projects from banned users SHALL be excluded

### Requirement: Notification Bell UI

The header SHALL display a notification bell with unread count and dropdown list.

#### Scenario: Unread badge displayed

- **GIVEN** a user with 3 unread notifications
- **WHEN** the header renders
- **THEN** the notification bell SHALL show a badge with "3"

#### Scenario: Notification dropdown lists items

- **GIVEN** a user opens the notification dropdown
- **WHEN** the dropdown renders
- **THEN** notifications SHALL be listed with type-specific icons and relative timestamps

#### Scenario: Click marks notification as read

- **GIVEN** a user with an unread notification in the dropdown
- **WHEN** the user clicks the notification
- **THEN** the notification SHALL be marked as read
- **AND** the unread badge count SHALL decrease

### Requirement: Admin Users Page Moderation

The admin users page SHALL provide moderation controls for each user.

#### Scenario: Moderation actions visible for non-admin users

- **GIVEN** an admin viewing the users list
- **WHEN** a user row renders for a non-admin, non-self user
- **THEN** warn and ban buttons SHALL be visible

#### Scenario: Moderation history viewable

- **GIVEN** an admin clicks the history button for a user
- **WHEN** the modal opens
- **THEN** a timeline of moderation events SHALL be displayed with actor, action, reason, and timestamp

#### Scenario: User projects viewable

- **GIVEN** an admin clicks the projects button for a user
- **WHEN** the modal opens
- **THEN** a list of the user's projects SHALL be displayed

### Requirement: Reusable UI Components

The application SHALL provide reusable ConfirmationModal, InlineEdit, and Timeline components.

#### Scenario: ConfirmationModal with typed confirmation

- **GIVEN** a ConfirmationModal with `typedConfirmation="DELETE"`
- **WHEN** the user types "DELETE" in the input
- **THEN** the confirm button SHALL become enabled

#### Scenario: Timeline renders events

- **GIVEN** a Timeline with event items
- **WHEN** the component renders
- **THEN** events SHALL be displayed in chronological order with DaisyUI timeline styling
