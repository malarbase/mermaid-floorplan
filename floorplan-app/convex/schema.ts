import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Database schema using GitHub-inspired versioning model:
 * - Users: profiles with usernames (extends Better Auth)
 * - Projects (like repos): container for a floorplan design
 * - Versions (like branches): mutable named references
 * - Snapshots (like commits): immutable content-addressable history
 */
export default defineSchema({
  // Better Auth manages: sessions, accounts, verificationTokens
  // We extend with our own users table for usernames

  // User profiles (linked to Better Auth)
  users: defineTable({
    authId: v.string(), // Better Auth user ID
    username: v.string(), // Unique, URL-safe ("alice" or "u_a1b2c3d4")
    displayName: v.optional(v.string()), // "Alice Smith"
    avatarUrl: v.optional(v.string()),
    usernameSetAt: v.optional(v.number()), // null = still using temp ID
    isAdmin: v.optional(v.boolean()), // Discovery feature - admin users
    // Anti-DOS: track username change history for exponential cooldown
    usernameChanges: v.optional(
      v.array(
        v.object({
          username: v.string(), // The username they changed FROM
          changedAt: v.number(), // When they changed away from it
          heldSince: v.number(), // When they first got that username
        }),
      ),
    ),
    lastUsernameChangeAt: v.optional(v.number()), // Timestamp of most recent change
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_auth_id', ['authId'])
    .index('by_username', ['username']),

  // Released usernames (tenure-proportional reservation, max 1 per user)
  releasedUsernames: defineTable({
    username: v.string(),
    originalUserId: v.id('users'),
    originalUserAuthId: v.optional(v.string()), // For stable comparison (authId doesn't change if user is recreated)
    releasedAt: v.number(),
    expiresAt: v.number(), // Tenure-proportional: min 7d, max 90d
  })
    .index('by_username', ['username'])
    .index('by_original_user', ['originalUserId']),

  // Projects (like GitHub repos)
  projects: defineTable({
    userId: v.id('users'), // Owner
    slug: v.string(), // URL-safe name: "beach-house"
    displayName: v.string(), // "Beach House Design"
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    defaultVersion: v.string(), // "main" - like default branch
    thumbnail: v.optional(v.string()),
    cameraState: v.optional(
      v.object({
        position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        target: v.object({ x: v.number(), y: v.number(), z: v.number() }),
        mode: v.union(v.literal('perspective'), v.literal('orthographic')),
        fov: v.number(),
      }),
    ),
    forkedFrom: v.optional(v.id('projects')), // Source project if forked
    viewCount: v.optional(v.number()), // Discovery feature
    forkCount: v.optional(v.number()), // Discovery feature
    isFeatured: v.optional(v.boolean()), // Discovery feature
    trendingScore: v.optional(v.number()), // Discovery feature
    lastTrendingCalc: v.optional(v.number()), // Discovery feature - timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_slug', ['userId', 'slug'])
    .index('by_user', ['userId', 'updatedAt'])
    .index('by_public', ['isPublic', 'updatedAt'])
    .index('by_trending', ['trendingScore', 'updatedAt'])
    .index('by_featured', ['isFeatured', 'updatedAt']),

  // Versions (like Git branches - mutable pointers)
  versions: defineTable({
    projectId: v.id('projects'),
    name: v.string(), // "main", "v1.0", "client-review"
    snapshotId: v.id('snapshots'), // Points to current snapshot
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_project_name', ['projectId', 'name']),

  // Snapshots (like Git commits - immutable)
  snapshots: defineTable({
    projectId: v.id('projects'),
    snapshotHash: v.string(), // Unique per-save hash (like Git commit SHA) for permalinks
    contentHash: v.string(), // Content-only hash for equivalence checks
    content: v.string(), // DSL content
    message: v.optional(v.string()), // "Added kitchen island"
    parentId: v.optional(v.id('snapshots')), // For history chain
    authorId: v.string(), // User who created this snapshot (authId)
    createdAt: v.number(),
  })
    .index('by_project', ['projectId', 'createdAt'])
    .index('by_snapshot_hash', ['projectId', 'snapshotHash'])
    .index('by_content_hash', ['projectId', 'contentHash']),

  // Project access control (invites)
  projectAccess: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    role: v.union(v.literal('viewer'), v.literal('editor'), v.literal('admin')),
    invitedBy: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId']),

  // Share links (for "anyone with link" access)
  shareLinks: defineTable({
    projectId: v.id('projects'),
    token: v.string(), // Random URL-safe token
    role: v.union(v.literal('viewer'), v.literal('editor')),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_project', ['projectId']),

  // Topics (for project discovery and categorization)
  topics: defineTable({
    slug: v.string(), // URL-safe: "modern-design", "scandinavian"
    displayName: v.string(), // "Modern Design"
    description: v.optional(v.string()),
    color: v.optional(v.string()), // Hex color for display
    isFeatured: v.optional(v.boolean()), // Show in discovery UI
    projectCount: v.optional(v.number()), // Cached count
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),

  // Junction table: projects linked to topics
  projectTopics: defineTable({
    projectId: v.id('projects'),
    topicId: v.id('topics'),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_topic', ['topicId']),

  // Collections (curated groups of projects)
  collections: defineTable({
    slug: v.string(), // URL-safe: "featured-homes"
    displayName: v.string(), // "Featured Home Designs"
    description: v.optional(v.string()),
    projectIds: v.array(v.id('projects')), // Ordered array of project IDs
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),

  // Project activity audit trail
  projectEvents: defineTable({
    projectId: v.id('projects'),
    action: v.string(), // "snapshot.save", "version.restore", "version.create", etc.
    userId: v.id('users'),
    metadata: v.optional(v.any()), // Action-specific data (snapshotId, versionName, etc.)
    createdAt: v.number(),
  }).index('by_project', ['projectId', 'createdAt']),

  // Ownership transfer requests (two-phase handshake)
  transferRequests: defineTable({
    projectId: v.id('projects'),
    fromUserId: v.id('users'),
    toUserId: v.id('users'),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('cancelled'),
      v.literal('expired'),
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId'])
    .index('by_recipient', ['toUserId', 'status'])
    .index('by_status', ['status', 'expiresAt']),

  // Cross-user redirects (after ownership transfers)
  crossUserRedirects: defineTable({
    fromUserId: v.id('users'),
    fromSlug: v.string(),
    toUserId: v.id('users'),
    toSlug: v.string(),
    createdAt: v.number(),
  }).index('by_from', ['fromUserId', 'fromSlug']),

  // Slug redirects (for URL migration history)
  slugRedirects: defineTable({
    fromSlug: v.string(), // Old slug
    toSlug: v.string(), // New slug
    userId: v.id('users'), // User who owns the project
    createdAt: v.number(),
  })
    .index('by_from_slug', ['fromSlug'])
    .index('by_user', ['userId']),
});
