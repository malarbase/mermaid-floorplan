import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_id", ["authId"])
    .index("by_username", ["username"]),

  // Released usernames (for 90-day grace period)
  releasedUsernames: defineTable({
    username: v.string(),
    originalUserId: v.id("users"),
    releasedAt: v.number(),
    expiresAt: v.number(), // 90 days after release
  }).index("by_username", ["username"]),

  // Projects (like GitHub repos)
  projects: defineTable({
    userId: v.id("users"), // Owner
    slug: v.string(), // URL-safe name: "beach-house"
    displayName: v.string(), // "Beach House Design"
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    defaultVersion: v.string(), // "main" - like default branch
    thumbnail: v.optional(v.string()),
    forkedFrom: v.optional(v.id("projects")), // Source project if forked
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_slug", ["userId", "slug"])
    .index("by_user", ["userId", "updatedAt"])
    .index("by_public", ["isPublic", "updatedAt"]),

  // Versions (like Git branches - mutable pointers)
  versions: defineTable({
    projectId: v.id("projects"),
    name: v.string(), // "main", "v1.0", "client-review"
    snapshotId: v.id("snapshots"), // Points to current snapshot
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project_name", ["projectId", "name"]),

  // Snapshots (like Git commits - immutable)
  snapshots: defineTable({
    projectId: v.id("projects"),
    contentHash: v.string(), // SHA256 prefix for permalinks
    content: v.string(), // DSL content
    message: v.optional(v.string()), // "Added kitchen island"
    parentId: v.optional(v.id("snapshots")), // For history chain
    authorId: v.string(), // User who created this snapshot (authId)
    createdAt: v.number(),
  })
    .index("by_project", ["projectId", "createdAt"])
    .index("by_hash", ["projectId", "contentHash"]),

  // Project access control (invites)
  projectAccess: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
    invitedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  // Share links (for "anyone with link" access)
  shareLinks: defineTable({
    projectId: v.id("projects"),
    token: v.string(), // Random URL-safe token
    role: v.union(v.literal("viewer"), v.literal("editor")),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_project", ["projectId"]),
});
