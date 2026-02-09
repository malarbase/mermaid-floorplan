import { defineApp } from 'convex/server';
import tableHistory from 'convex-table-history/convex.config';

// Temporarily disabled for self-hosted deployment testing
// import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
// app.use(betterAuth);

// Configure audit log for admin actions
// Scope controlled by AUDIT_TRAIL_SCOPE env var:
// - "admin-only": Track admin mutations only (default)
// - "all": Track all project/user changes
app.use(tableHistory, { name: 'adminAuditLog' });

export default app;
