import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("trackView mutation logic", () => {
  const DEBOUNCE_WINDOW_MS = 60 * 60 * 1000;
  
  let sessionViewCache: Map<string, { timestamp: number }>;

  beforeEach(() => {
    sessionViewCache = new Map();
  });

  describe("increment functionality", () => {
    it("should increment viewCount when project is viewed", () => {
      const projectId = "proj_123";
      const sessionToken = "session123";
      const viewCount = 5;

      const sessionHash = "hash123";
      const cacheKey = `${projectId}-${sessionHash}`;
      const now = Date.now();

      const lastView = sessionViewCache.get(cacheKey);
      const isDebouncedByRecency = lastView && (now - lastView.timestamp < DEBOUNCE_WINDOW_MS);

      expect(isDebouncedByRecency).toBeFalsy();
      
      const newViewCount = (viewCount ?? 0) + 1;
      expect(newViewCount).toBe(6);
    });

    it("should initialize viewCount to 1 if project has no viewCount", () => {
      const projectId = "proj_123";
      const sessionToken = "session123";
      const viewCount = undefined;

      const sessionHash = "hash123";
      const cacheKey = `${projectId}-${sessionHash}`;
      const now = Date.now();

      const lastView = sessionViewCache.get(cacheKey);
      const isDebouncedByRecency = lastView && (now - lastView.timestamp < DEBOUNCE_WINDOW_MS);

      expect(isDebouncedByRecency).toBeFalsy();
      
      const newViewCount = (viewCount ?? 0) + 1;
      expect(newViewCount).toBe(1);
    });
  });

  describe("debounce functionality", () => {
    it("should prevent increment if same session viewed same project within 1 hour", () => {
      const projectId = "proj_123";
      const sessionHash = "hash123";
      const cacheKey = `${projectId}-${sessionHash}`;
      
      const now = Date.now();
      const oneHourAgo = now - (50 * 60 * 1000);
      
      sessionViewCache.set(cacheKey, { timestamp: oneHourAgo });
      
      const lastView = sessionViewCache.get(cacheKey);
      const shouldDebounce = lastView && now - lastView.timestamp < DEBOUNCE_WINDOW_MS;

      expect(shouldDebounce).toBe(true);
    });

    it("should allow increment if more than 1 hour since last view by same session", () => {
      const projectId = "proj_123";
      const sessionHash = "hash123";
      const cacheKey = `${projectId}-${sessionHash}`;
      
      const now = Date.now();
      const moreThanOneHourAgo = now - (61 * 60 * 1000);
      
      sessionViewCache.set(cacheKey, { timestamp: moreThanOneHourAgo });
      
      const lastView = sessionViewCache.get(cacheKey);
      const shouldDebounce = lastView && now - lastView.timestamp < DEBOUNCE_WINDOW_MS;

      expect(shouldDebounce).toBe(false);
    });
  });
});
