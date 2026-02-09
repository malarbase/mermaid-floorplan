// Better Auth temporarily disabled for self-hosted deployment testing
// import { createClient } from "@convex-dev/better-auth";
// import { components } from "./_generated/api";

/**
 * Better Auth client for Convex - TEMPORARILY DISABLED
 *
 * Re-enable after self-hosted auth configuration is working.
 */

// Stub exports for compatibility
export const betterAuth = {
  getAuthUser: async () => null,
  safeGetAuthUser: async () => null,
};

export const getAuthUser = async () => null;
export const safeGetAuthUser = async () => null;
