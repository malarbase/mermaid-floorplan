import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled jobs for periodic tasks.
 */
const crons = cronJobs();

/**
 * Clean up expired released usernames daily.
 * Released usernames have a 90-day grace period where only the original
 * owner can reclaim them. After expiration, they become available to anyone.
 */
crons.daily(
  "cleanup-expired-usernames",
  { hourUTC: 3, minuteUTC: 0 }, // Run at 3:00 AM UTC daily
  internal.users.cleanupExpiredUsernames
);

export default crons;
