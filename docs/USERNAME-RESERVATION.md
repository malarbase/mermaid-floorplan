# Username Reservation System

Adaptive anti-DOS protection for username changes in the floorplan app.

## Problem

Without rate limiting, a malicious user could:

- **Cycle attack**: Change username repeatedly to reserve many popular names
- **Rapid squatting**: Change every minute, locking up one username per change
- **Grab-and-release**: Hold a username for 5 minutes, get a 90-day reservation

## Solution: Three Interlocking Mechanisms

### 1. Exponential Change Cooldown

Each username change in a rolling 365-day window increases the wait before the next change.

**Formula**: `cooldown_days = min(7 × 2^(n-1), 180)`

| Change # (in year) | Cooldown before next |
|---------------------|---------------------|
| 1st                 | 0 (free)            |
| 2nd                 | 7 days              |
| 3rd                 | 14 days             |
| 4th                 | 28 days             |
| 5th                 | 56 days             |
| 6th                 | 112 days            |
| 7th+                | 180 days (cap)      |

A normal user who changes once or twice a year barely notices. A squatter hits months-long waits by their 4th change.

### 2. Tenure-Proportional Reservation

Instead of a flat 90-day grace period, the reservation duration scales with how long the user actually held the username.

**Formula**: `reservation_days = clamp(floor(days_held × 0.5), 7, 90)`

| Time held   | Reservation duration |
|-------------|---------------------|
| < 14 days   | 7 days (minimum)    |
| 1 month     | 15 days             |
| 2 months    | 30 days             |
| 6+ months   | 90 days (maximum)   |

A squatter who grabs a name for 5 minutes gets only 7 days of reservation. A legitimate user who held their name for a year gets the full 90 days.

### 3. Single Reservation Limit

Only the **most recently released** username is reserved. When a user changes username again, their previous reservation is immediately released.

Before: `alice → bob → charlie` = 2 reservations (alice + bob)
After: `alice → bob → charlie` = 1 reservation (bob only, alice released)

This completely prevents hoarding via cycling.

### 4. Free "Undo" Exception

Reclaiming your most recently released username:

- Does **not** count as a change for cooldown purposes
- Does **not** increment the change counter
- Immediately removes the reservation (you're taking it back)

This handles the legitimate "oops, I want my old name back" case.

## Attack Scenario Analysis

| Attack                               | Outcome                                                    |
|--------------------------------------|------------------------------------------------------------|
| Grab-and-release (hold 5 min)        | 7-day reservation only, next change in 7 days              |
| Cycling A→B→C→A→B→...               | Only 1 reservation at a time; exponential cooldowns         |
| Grab popular name, sit 1 day, release | 7-day reservation (minimum), cooldown starts               |
| Legitimate user changes after 1 year | 90-day reservation, no cooldown issues                     |
| "Oops, want my old name back"        | Free undo, no penalty                                      |
| 5 changes in a year                  | 56-day wait before 6th change                              |

## Implementation

### Schema

```typescript
// users table additions
usernameChanges: v.optional(v.array(v.object({
  username: v.string(),   // Username changed FROM
  changedAt: v.number(),  // When they changed away
  heldSince: v.number(),  // When they first got it
}))),
lastUsernameChangeAt: v.optional(v.number()),
```

### Key Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | `users.usernameChanges`, `releasedUsernames.by_original_user` index |
| `convex/users.ts` | `setUsername` mutation with all anti-DOS logic, `getUsernameCooldown` query |
| `src/components/UsernameChangeModal.tsx` | UI showing cooldown status, reservation duration, undo option |

### Constants (configurable in `convex/users.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `BASE_COOLDOWN_DAYS` | 7 | Base wait between changes |
| `MAX_COOLDOWN_DAYS` | 180 | Cooldown cap |
| `RESERVATION_FACTOR` | 0.5 | Reservation = 50% of hold time |
| `MIN_RESERVATION_DAYS` | 7 | Minimum reservation |
| `MAX_RESERVATION_DAYS` | 90 | Maximum reservation |

### Convex Functions

- **`users:setUsername`** (mutation) - Enforces all anti-DOS rules
- **`users:getUsernameCooldown`** (query) - Returns cooldown status for UI
- **`users:isUsernameAvailable`** (query) - Checks availability with reservation-aware logic
- **`users:cleanupExpiredUsernames`** (internal mutation) - Periodic cleanup

## UI Behavior

### When cooldown is active
- Error banner shows days remaining and change count
- Username input is disabled
- "Reclaim @oldname for free" link is shown if applicable

### Confirmation step
- Shows tenure-proportional reservation duration (e.g. "reserved for 15 days")
- For undo: green success banner, "Reclaim Username" button
- For normal change: warning banner with consequences list
- Shows escalation warning if user has recent changes

### First-time setup
- No cooldown applies when setting username for the first time (from temp `u_xxxxx`)
- No reservation created for the temp username
