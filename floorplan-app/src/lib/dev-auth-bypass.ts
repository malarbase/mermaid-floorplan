// Add to your existing middleware.ts
// This example shows how to bypass auth in development

import { redirect } from "@solidjs/router";

// Check if dev auth bypass is enabled
const isDevBypassEnabled = () => {
  return import.meta.env.DEV && import.meta.env.DEV_AUTH_BYPASS === "true";
};

// Get mock dev user from environment
const getDevUser = () => {
  if (!isDevBypassEnabled()) return null;
  
  return {
    id: "dev-user-1",
    email: import.meta.env.DEV_USER_EMAIL || "dev@example.com",
    name: import.meta.env.DEV_USER_NAME || "Dev User",
    username: "devuser",
    emailVerified: true,
  };
};

// Use in your protected route middleware
export const authMiddleware = async () => {
  // In development with bypass enabled, return mock user
  if (isDevBypassEnabled()) {
    console.log("🔓 Auth bypass enabled - using dev user");
    return getDevUser();
  }

  // Otherwise, check real auth session
  // ... your existing auth check logic
};
