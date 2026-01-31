// Development utilities for mocking auth sessions
// Use these in development to bypass OAuth

import { createSignal } from "solid-js";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  image?: string | null;
}

// Mock user presets for testing different scenarios
export const mockUsers = {
  admin: {
    id: "dev-user-admin",
    email: "admin@example.com",
    name: "Admin User",
    username: "admin",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
  },
  regularUser: {
    id: "dev-user-1",
    email: "user@example.com",
    name: "Test User",
    username: "testuser",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
  },
  newUser: {
    id: "dev-user-new",
    email: "new@example.com",
    name: "New User",
    username: undefined, // Simulates first-time login without username
    image: null,
  },
} as const;

// Store mock session in localStorage for persistence across page reloads
const MOCK_SESSION_KEY = "mock-dev-session";

export function setMockSession(user: MockUser) {
  if (import.meta.env.PROD) {
    console.warn("Mock sessions are only available in development");
    return;
  }

  localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({
    user,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    createdAt: Date.now(),
  }));

  console.log("Mock session created:", user);
}

export function getMockSession(): MockUser | null {
  if (import.meta.env.PROD) return null;

  const stored = localStorage.getItem(MOCK_SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    if (session.expiresAt < Date.now()) {
      clearMockSession();
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

export function clearMockSession() {
  localStorage.removeItem(MOCK_SESSION_KEY);
  console.log("Mock session cleared");
}

// Hook to check if we're using a mock session
export function useMockSession() {
  const [user, setUser] = createSignal<MockUser | null>(getMockSession());

  const login = (preset: keyof typeof mockUsers = "regularUser") => {
    const mockUser = mockUsers[preset];
    setMockSession(mockUser);
    setUser(mockUser);
  };

  const logout = () => {
    clearMockSession();
    setUser(null);
  };

  return { user, login, logout };
}

// Middleware helper: Use mock session if available, fallback to real auth
export function getAuthUser(realAuthUser: any): MockUser | null {
  if (import.meta.env.DEV) {
    const mockUser = getMockSession();
    if (mockUser) {
      console.log("Using mock session:", mockUser.email);
      return mockUser;
    }
  }
  return realAuthUser;
}
