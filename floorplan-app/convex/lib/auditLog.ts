import { Triggers } from 'convex-helpers/server/triggers';
import { TableHistory } from 'convex-table-history';
import { components } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';

/**
 * Admin audit log - tracks changes to projects and users tables
 * when modified by admin users.
 *
 * Scope controlled by AUDIT_TRAIL_SCOPE env var:
 * - "admin-only": Track projects and users table changes only (default)
 * - "all": Track all table changes (future expansion)
 */

// Initialize table history client for admin audit log
export const adminAuditLog = new TableHistory<DataModel, 'projects' | 'users'>(
  components.adminAuditLog,
  { serializability: 'document' },
);

// Create triggers manager
export const triggers = new Triggers<DataModel>();

// Register triggers for admin-tracked tables
triggers.register('projects', adminAuditLog.trigger());
triggers.register('users', adminAuditLog.trigger());

// Check if audit trail should track all tables
export function shouldTrackAllTables(): boolean {
  return process.env.AUDIT_TRAIL_SCOPE === 'all';
}

// Future: Additional table triggers when AUDIT_TRAIL_SCOPE=all
if (shouldTrackAllTables()) {
  // For future expansion: track topics, collections, etc.
  // triggers.register("topics", adminAuditLog.trigger());
  // triggers.register("collections", adminAuditLog.trigger());
}
