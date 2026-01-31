import { createMiddleware } from "@solidjs/start/middleware";

/**
 * Middleware for handling authentication and protected routes.
 * 
 * Protected routes:
 * - /dashboard
 * - /new
 * - /settings
 * 
 * Note: Actual auth check happens client-side with useSession.
 * This middleware is a placeholder for future server-side auth checks.
 */
export default createMiddleware({
  onRequest: async (event) => {
    // For now, let client handle auth checks
    // Can add server-side session validation here later
  },
});
