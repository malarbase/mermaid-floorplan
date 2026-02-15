import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

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
  'cleanup-expired-usernames',
  { hourUTC: 3, minuteUTC: 0 }, // Run at 3:00 AM UTC daily
  internal.users.cleanupExpiredUsernames,
);

/**
 * Calculate trending scores for all projects every 6 hours.
 * Uses view/fork counts with time decay based on project age.
 */
crons.interval(
  'calculate-trending-scores',
  { hours: 6 },
  internal.trending.calculateTrendingScores,
);

/**
 * Expire pending ownership transfer requests daily.
 * Transfers expire 7 days after creation.
 */
crons.daily(
  'expire-transfer-requests',
  { hourUTC: 4, minuteUTC: 0 }, // Run at 4:00 AM UTC daily
  internal.projects.expireTransfers,
);

export default crons;
