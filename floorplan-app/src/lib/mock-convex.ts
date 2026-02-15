import { ConvexClient } from 'convex/browser';
import { getFunctionName } from 'convex/server';
import { createSignal } from 'solid-js';
import { styledApartmentContent } from './mock-floorplan-content';

// Mock project data
const mockProjectsData = [
  {
    _id: 'mock-project-1' as any,
    _creationTime: Date.now(),
    userId: 'dev-user-1',
    slug: 'sample-apartment',
    displayName: 'Sample Apartment',
    description: 'A modern 2-bedroom apartment layout',
    isPublic: true,
    defaultVersion: 'main',
    thumbnail: null,
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now(),
  },
  {
    _id: 'mock-project-2' as any,
    _creationTime: Date.now(),
    userId: 'dev-user-1',
    slug: 'beach-house',
    displayName: 'Beach House',
    description: 'Coastal home with ocean views',
    isPublic: false,
    defaultVersion: 'main',
    thumbnail: null,
    createdAt: Date.now() - 172800000, // 2 days ago
    updatedAt: Date.now() - 3600000, // 1 hour ago
  },
];

// Mock versions
const mockVersionsData = [
  {
    _id: 'mock-version-1' as any,
    _creationTime: Date.now(),
    projectId: 'mock-project-1' as any,
    name: 'main',
    snapshotId: 'mock-snapshot-1' as any,
    description: 'Main version',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  },
];

// Mock snapshots
const mockSnapshotsData = [
  {
    _id: 'mock-snapshot-1' as any,
    _creationTime: Date.now(),
    projectId: 'mock-project-1' as any,
    snapshotHash: 'a1b2c3d4e5f6',
    contentHash: 'a1b2c3d4',
    content: styledApartmentContent,
    message: 'Initial version',
    parentId: null,
    authorId: 'dev-user-1',
    createdAt: Date.now() - 86400000,
  },
];

// Mock user profiles
const mockUsersData = [
  {
    _id: 'mock-user-1' as any,
    _creationTime: Date.now(),
    authId: 'dev-user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    usernameSetAt: Date.now() - 86400000,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  },
];

// Check if mock mode is enabled
export const isMockMode = () => {
  return import.meta.env.VITE_MOCK_MODE === 'true';
};

// Mock query results
export const mockConvexQueries = {
  // Projects queries
  'projects:list': () => {
    console.log('[MOCK] projects.list() called');
    return mockProjectsData;
  },

  'projects:getBySlug': (args: { username: string; projectSlug: string }) => {
    console.log('[MOCK] projects.getBySlug() called', args);
    return mockProjectsData.find((p) => p.slug === args.projectSlug) || null;
  },

  'projects:getVersion': (args: { projectId: any; versionName: string }) => {
    console.log('[MOCK] projects.getVersion() called', args);
    const version = mockVersionsData.find(
      (v) => v.projectId === args.projectId && v.name === args.versionName,
    );
    if (!version) return null;
    const snapshot = mockSnapshotsData.find((s) => s._id === version.snapshotId);
    return { version, snapshot };
  },

  'projects:getByHash': (args: { projectId: any; hash: string }) => {
    console.log('[MOCK] projects.getByHash() called', args);
    return (
      mockSnapshotsData.find(
        (s) => s.projectId === args.projectId && s.snapshotHash === args.hash,
      ) ||
      mockSnapshotsData.find(
        (s) => s.projectId === args.projectId && s.contentHash === args.hash,
      ) ||
      null
    );
  },

  'projects:getHistory': (args: { projectId: any; limit?: number }) => {
    console.log('[MOCK] projects.getHistory() called', args);
    return mockSnapshotsData
      .filter((s) => s.projectId === args.projectId)
      .slice(0, args.limit || 50);
  },

  'projects:getVersionHistory': (args: {
    projectId: any;
    versionName?: string;
    limit?: number;
  }) => {
    console.log('[MOCK] projects.getVersionHistory() called', args);
    // Flat query: return all snapshots for the project with headOf info
    const projectSnapshots = mockSnapshotsData.filter((s) => s.projectId === args.projectId);
    const projectVersions = mockVersionsData.filter((v) => v.projectId === args.projectId);
    const headMap = new Map<string, string[]>();
    for (const v of projectVersions) {
      const existing = headMap.get(v.snapshotId) ?? [];
      existing.push(v.name);
      headMap.set(v.snapshotId, existing);
    }
    return projectSnapshots
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 50)
      .map((s) => ({
        ...s,
        isHead: headMap.has(s._id),
        headOf: headMap.get(s._id) ?? [],
      }));
  },

  'projects:getProjectActivity': (args: { projectId: any; limit?: number }) => {
    console.log('[MOCK] projects.getProjectActivity() called', args);
    // Return mock activity events
    return [
      {
        _id: 'mock-event-1',
        action: 'project.create',
        metadata: { slug: 'sample-apartment', displayName: 'Sample Apartment' },
        createdAt: Date.now() - 86400000,
        user: { username: 'testuser', displayName: 'Test User', avatarUrl: null },
      },
      {
        _id: 'mock-event-2',
        action: 'snapshot.save',
        metadata: { versionName: 'main', message: 'Initial version' },
        createdAt: Date.now() - 86400000,
        user: { username: 'testuser', displayName: 'Test User', avatarUrl: null },
      },
    ].slice(0, args.limit ?? 50);
  },

  // Users queries
  'users:getByUsername': (args: { username: string }) => {
    console.log('[MOCK] users.getByUsername() called', args);
    return mockUsersData.find((u) => u.username === args.username) || null;
  },

  'users:getCurrentUser': () => {
    console.log('[MOCK] users.getCurrentUser() called');
    return mockUsersData[0];
  },

  'users:getById': (args: { userId: string }) => {
    console.log('[MOCK] users.getById() called', args);
    const user = mockUsersData.find((u) => u._id === args.userId || u.authId === args.userId);
    return user ?? mockUsersData[0];
  },

  'users:hasTempUsername': () => {
    console.log('[MOCK] users.hasTempUsername() called');
    return false; // Mock user has permanent username
  },

  'users:suggestUsername': () => {
    console.log('[MOCK] users.suggestUsername() called');
    return ['testuser', 'devuser', 'floorplan_fan'];
  },

  'users:isUsernameAvailable': (args: { username: string }) => {
    console.log('[MOCK] users.isUsernameAvailable() called', args);
    // Mock: any username >= 3 chars is available
    if (args.username.length < 3) {
      return { available: false, reason: 'invalid_format' };
    }
    return { available: true, reason: 'available' };
  },

  // Sharing queries
  'sharing:getCollaborators': (args: { projectId: any }) => {
    console.log('[MOCK] sharing.getCollaborators() called', args);
    return [];
  },

  'sharing:getShareLinks': (args: { projectId: any }) => {
    console.log('[MOCK] sharing.getShareLinks() called', args);
    return [];
  },

  'sharing:getSharedWithMe': () => {
    console.log('[MOCK] sharing.getSharedWithMe() called');
    return []; // No shared projects in mock mode
  },

  'explore:listFeatured': (args: { limit?: number }) => {
    console.log('[MOCK] explore.listFeatured() called', args);
    const limit = args?.limit ?? 10;
    const featured = mockProjectsData
      .filter((p) => p.isPublic)
      .slice(0, limit)
      .map((p) => {
        const owner = mockUsersData.find((u) => u.authId === p.userId);
        const version = mockVersionsData.find((v) => v.projectId === p._id);
        const snapshot = version
          ? mockSnapshotsData.find((s) => s._id === version.snapshotId)
          : null;
        return {
          ...p,
          ownerName: owner?.username ?? 'unknown',
          content: snapshot?.content ?? styledApartmentContent,
        };
      });
    return { projects: featured };
  },

  'explore:listTrending': (args: { limit?: number }) => {
    console.log('[MOCK] explore.listTrending() called', args);
    const limit = args?.limit ?? 24;
    const trending = mockProjectsData
      .filter((p) => p.isPublic)
      .slice(0, limit)
      .map((p) => {
        const owner = mockUsersData.find((u) => u.authId === p.userId);
        return {
          ...p,
          ownerName: owner?.username ?? 'unknown',
        };
      });
    return { projects: trending };
  },

  'explore:listCollections': () => {
    console.log('[MOCK] explore.listCollections() called');
    return { collections: [] };
  },

  'explore:listByTopic': (args: { topicSlug: string; limit?: number }) => {
    console.log('[MOCK] explore.listByTopic() called', args);
    if (!args.topicSlug) {
      return { projects: [] };
    }
    const limit = args?.limit ?? 24;
    const projects = mockProjectsData
      .filter((p) => p.isPublic)
      .slice(0, limit)
      .map((p) => {
        const owner = mockUsersData.find((u) => u.authId === p.userId);
        return {
          ...p,
          ownerName: owner?.username ?? 'unknown',
        };
      });
    return { projects };
  },
};

// Mock mutations
export const mockConvexMutations = {
  'projects:create': (args: any) => {
    console.log('[MOCK] projects.create() called', args);
    const newId = `mock-project-${Date.now()}`;
    const newProject = {
      _id: newId as any,
      _creationTime: Date.now(),
      userId: 'dev-user-1',
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockProjectsData.push(newProject);
    return newId;
  },

  'projects:save': (args: any) => {
    console.log('[MOCK] projects.save() called', args);
    const hash = Math.random().toString(36).substring(7);
    return { snapshotId: `mock-snapshot-${Date.now()}`, hash };
  },

  'projects:moveVersionToSnapshot': (args: any) => {
    console.log('[MOCK] projects.moveVersionToSnapshot() called', args);
    return { success: true, snapshotId: args.snapshotId };
  },

  'projects:deleteVersion': (args: any) => {
    console.log('[MOCK] projects.deleteVersion() called', args);
    if (args.versionName === 'main') {
      throw new Error('Cannot delete the default version');
    }
    return undefined;
  },

  'projects:delete': (args: { projectId: any }) => {
    console.log('[MOCK] projects.delete() called', args);
    const index = mockProjectsData.findIndex((p) => p._id === args.projectId);
    if (index >= 0) mockProjectsData.splice(index, 1);
    return true;
  },

  'users:createProfile': (args: any) => {
    console.log('[MOCK] users.createProfile() called', args);
    return 'mock-user-1';
  },

  'users:updateUsername': (args: any) => {
    console.log('[MOCK] users.updateUsername() called', args);
    return true;
  },

  'users:setUsername': (args: { username: string }) => {
    console.log('[MOCK] users.setUsername() called', args);
    return true;
  },

  'sharing:leaveProject': (args: { projectId: any }) => {
    console.log('[MOCK] sharing.leaveProject() called', args);
    return true;
  },
};

// Helper to wrap useQuery with mock mode check
export function createMockQuery<T>(queryFn: () => T, mockFn: () => T): () => T {
  if (isMockMode()) {
    return mockFn;
  }
  return queryFn;
}

// Helper to wrap useMutation with mock mode check
export function createMockMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  mockFn: (args: TArgs) => TResult,
): (args: TArgs) => Promise<TResult> {
  if (isMockMode()) {
    return async (args: TArgs) => {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate network delay
      return mockFn(args);
    };
  }
  return mutationFn;
}

/**
 * Mock-aware useQuery hook.
 * In mock mode, returns data from mockConvexQueries.
 * In normal mode, uses the real useQuery from convex-solidjs.
 *
 * Usage:
 * ```tsx
 * const projects = useMockableQuery("projects:list", () => ({}));
 * // projects.data() returns the data
 * // projects.isLoading() returns loading state
 * // projects.error() returns any error
 *
 * // To conditionally skip a query, use the enabled option:
 * const version = useMockableQuery(
 *   "projects:getVersion",
 *   () => ({ projectId: project()?._id ?? "" }),
 *   { enabled: !!project() }
 * );
 * ```
 */
export function useMockableQuery<T = unknown>(
  queryName: keyof typeof mockConvexQueries,
  args: () => Record<string, unknown>,
  options?: { enabled?: boolean },
): {
  data: () => T | undefined;
  isLoading: () => boolean;
  error: () => Error | undefined;
} {
  // Mock mode - return mock data immediately
  if (isMockMode()) {
    const [data, setData] = createSignal<T | undefined>(undefined);
    const [isLoading, setIsLoading] = createSignal(true);
    const [error, setError] = createSignal<Error | undefined>(undefined);

    // Simulate async data loading
    setTimeout(() => {
      try {
        // Check if query is enabled (defaults to true)
        if (options?.enabled === false) {
          setIsLoading(false);
          return;
        }

        const currentArgs = args();
        const mockFn = mockConvexQueries[queryName];
        if (mockFn) {
          const result = mockFn(currentArgs as any) as T;
          setData(() => result);
        } else {
          console.warn(`[MOCK] No mock handler for query: ${queryName}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      setIsLoading(false);
    }, 100); // Small delay to simulate network

    return { data, isLoading, error };
  }

  // Real mode - use actual Convex useQuery
  // Dynamic import to avoid SSR issues
  const { useQuery } = require('convex-solidjs');
  const query = useQuery(queryName as any, args, options);

  return {
    data: () => query.data() as T | undefined,
    isLoading: () => query.isLoading?.() ?? false,
    error: () => query.error?.() ?? undefined,
  };
}

/**
 * Mock-aware useMutation hook.
 * In mock mode, uses mock mutation handlers.
 * In normal mode, uses the real useMutation from convex-solidjs.
 */
export function useMockableMutation<TArgs = Record<string, unknown>, TResult = unknown>(
  mutationName: keyof typeof mockConvexMutations,
): (args: TArgs) => Promise<TResult> {
  if (isMockMode()) {
    return async (args: TArgs) => {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate network
      const mockFn = mockConvexMutations[mutationName];
      if (mockFn) {
        return mockFn(args as any) as TResult;
      }
      console.warn(`[MOCK] No mock handler for mutation: ${mutationName}`);
      return undefined as TResult;
    };
  }

  // Real mode - use actual Convex useMutation
  const { useMutation } = require('convex-solidjs');
  const mutation = useMutation(mutationName as any);
  return mutation;
}

function getQueryKey(query: unknown): string | null {
  try {
    const name = getFunctionName(query as any);
    return name.replace(/\./g, ':');
  } catch {
    return null;
  }
}

function getMockHandler(queryKey: string): ((args: unknown) => unknown) | null {
  const handler = (mockConvexQueries as Record<string, (args: unknown) => unknown>)[queryKey];
  return handler ?? null;
}

export function createMockConvexClient(): ConvexClient {
  const mockDataCache = new Map<string, unknown>();

  const client = new ConvexClient('https://mock-convex.invalid');

  const innerClient = client.client;
  if (innerClient) {
    const originalLocalQueryResult = innerClient.localQueryResult.bind(innerClient);
    (innerClient as any).localQueryResult = (queryName: string, args: any): any => {
      const queryKey = queryName.replace(/\./g, ':');
      const cacheKey = `${queryKey}:${JSON.stringify(args)}`;
      const cached = mockDataCache.get(cacheKey);
      if (cached !== undefined) return cached;
      return originalLocalQueryResult(queryName, args);
    };
  }

  (client as any).onUpdate = (
    query: unknown,
    args: unknown,
    callback: (result: unknown) => void,
    _onError?: (error: Error) => void,
  ): (() => void) => {
    const queryKey = getQueryKey(query);

    if (queryKey) {
      const handler = getMockHandler(queryKey);
      if (handler) {
        setTimeout(() => {
          try {
            const result = handler(args);
            const cacheKey = `${queryKey}:${JSON.stringify(args)}`;
            mockDataCache.set(cacheKey, result);
            callback(result);
          } catch (err) {
            console.error(`[MOCK] Error in query ${queryKey}:`, err);
            callback(undefined);
          }
        }, 50);
        return () => {};
      }
      console.warn(`[MOCK] No handler for query: ${queryKey}`);
    }

    callback(undefined);
    return () => {};
  };

  (client as any).mutation = async (mutation: unknown, args: unknown): Promise<unknown> => {
    const mutationKey = getQueryKey(mutation);
    if (mutationKey) {
      const handler = (mockConvexMutations as Record<string, (args: unknown) => unknown>)[
        mutationKey
      ];
      if (handler) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return handler(args);
      }
      console.warn(`[MOCK] No handler for mutation: ${mutationKey}`);
    }
    return null;
  };

  (client as any).action = async (action: unknown, args: unknown): Promise<unknown> => {
    const actionKey = getQueryKey(action);
    console.log(`[MOCK] Action called: ${actionKey}`, args);
    return null;
  };

  return client;
}
