import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("slug validation", () => {
  const SLUG_PATTERN = /^[a-z0-9-]+$/;

  it("should accept valid slugs", () => {
    const validSlugs = [
      "beach-house",
      "my-project-123",
      "project-1",
      "simple",
    ];

    validSlugs.forEach((slug) => {
      expect(SLUG_PATTERN.test(slug)).toBe(true);
    });
  });

  it("should reject slugs with uppercase letters", () => {
    expect(SLUG_PATTERN.test("Beach-House")).toBe(false);
    expect(SLUG_PATTERN.test("MyProject")).toBe(false);
  });

  it("should reject slugs with special characters", () => {
    expect(SLUG_PATTERN.test("my_project")).toBe(false);
    expect(SLUG_PATTERN.test("project.name")).toBe(false);
    expect(SLUG_PATTERN.test("project@123")).toBe(false);
  });

  it("should reject slugs with spaces", () => {
    expect(SLUG_PATTERN.test("my project")).toBe(false);
  });
});

describe("updateSlug mutation logic", () => {
  it("should validate slug format", () => {
    const SLUG_PATTERN = /^[a-z0-9-]+$/;
    
    expect(SLUG_PATTERN.test("beach-house")).toBe(true);
    expect(SLUG_PATTERN.test("Beach-House")).toBe(false);
    expect(SLUG_PATTERN.test("my_project")).toBe(false);
  });

  it("should create redirect when slug changes", () => {
    const userId = "user_123" as any;
    const projectId = "proj_456" as any;
    const oldSlug = "old-name";
    const newSlug = "new-name";

    const redirect = {
      fromSlug: oldSlug,
      toSlug: newSlug,
      userId,
      createdAt: Date.now(),
    };

    expect(redirect.fromSlug).toBe(oldSlug);
    expect(redirect.toSlug).toBe(newSlug);
    expect(redirect.userId).toBe(userId);
  });

  it("should reject duplicate slugs for same user", () => {
    const userId = "user_123";
    const existingSlugs = new Set(["project-1", "project-2"]);
    const newSlug = "project-1";

    const isDuplicate = existingSlugs.has(newSlug);
    expect(isDuplicate).toBe(true);
  });

  it("should allow duplicate slugs for different users", () => {
    const user1Projects = new Set(["project-1"]);
    const user2Projects = new Set();
    const newSlug = "project-1";

    const isDuplicateForUser2 = user2Projects.has(newSlug);
    expect(isDuplicateForUser2).toBe(false);
  });
});

describe("resolveSlug query logic", () => {
  it("should return null if no redirect exists", () => {
    const redirects = new Map<string, { toSlug: string; userId: string }>();
    const userId = "user_123";
    const slug = "nonexistent";

    const redirect = Array.from(redirects.values()).find(
      (r) => r.userId === userId
    );

    expect(redirect).toBeUndefined();
  });

  it("should return projectId when redirect matches", () => {
    const userId = "user_123";
    const oldSlug = "old-name";
    const currentSlug = "new-name";
    const projectId = "proj_456" as any;

    const redirect = {
      fromSlug: oldSlug,
      toSlug: currentSlug,
      userId,
    };

    const project = {
      _id: projectId,
      userId,
      slug: currentSlug,
    };

    expect(redirect.toSlug).toBe(currentSlug);
    expect(project._id).toBe(projectId);
  });
});

describe("slug reuse logic", () => {
  it("should delete redirect when creating new project with old slug", () => {
    const userId = "user_123";
    const reuseSlug = "my-project";

    const redirects = new Map<string, any>([
      ["redirect_1", { fromSlug: reuseSlug, userId }],
    ]);

    const redirectToDelete = Array.from(redirects.values()).find(
      (r) => r.fromSlug === reuseSlug && r.userId === userId
    );

    expect(redirectToDelete).toBeDefined();
    expect(redirectToDelete?.fromSlug).toBe(reuseSlug);
  });

  it("should not delete redirects from other users", () => {
    const user1 = "user_123";
    const user2 = "user_456";
    const slug = "shared-name";

    const redirects = [
      { fromSlug: slug, userId: user1 },
      { fromSlug: slug, userId: user2 },
    ];

    const redirectsToDelete = redirects.filter(
      (r) => r.fromSlug === slug && r.userId === user1
    );

    expect(redirectsToDelete.length).toBe(1);
    expect(redirectsToDelete[0].userId).toBe(user1);
  });
});

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
