/**
 * Shared hooks for project data fetching and state management.
 * Reduces duplication across project route components.
 */

import { useQuery } from 'convex-solidjs';
import { type Accessor, createEffect, createMemo, createSignal } from 'solid-js';
import { useSession } from '~/lib/auth-client';
import type { ProjectQueryResult, Snapshot, VersionData } from '~/lib/project-types';
import { convexApi } from '~/lib/project-types';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Hook for fetching and managing project data.
 * Returns project, owner, forkedFrom, and ownership status.
 */
export function useProjectData(
  username: Accessor<string | undefined>,
  projectSlug: Accessor<string | undefined>,
) {
  const sessionSignal = useSession();

  // Query project data from Convex
  const projectQuery = useQuery(convexApi.projects.getBySlug, () => ({
    username: username(),
    projectSlug: projectSlug(),
  }));

  // Get current user session
  const session = createMemo(() => sessionSignal());
  const currentUser = createMemo(() => session()?.data?.user);

  // Derived project data
  const projectData = createMemo(() => {
    const data = projectQuery.data() as ProjectQueryResult | null | undefined;
    return data;
  });

  const project = createMemo(() => projectData()?.project);
  const owner = createMemo(() => projectData()?.owner);
  const forkedFrom = createMemo(() => projectData()?.forkedFrom);

  const isOwner = createMemo(() => {
    const user = currentUser();
    const own = owner();
    if (!user || !own) return false;
    return (user.username ?? user.name) === own.username;
  });

  const isProjectLoading = createMemo(() => {
    return projectQuery.isLoading() || projectQuery.data() === undefined;
  });

  const projectNotFound = createMemo(() => {
    // Server returned null (not found or access denied)
    if (!isProjectLoading() && projectQuery.data() === null) return true;

    // Client-side privacy guard: if the project is private and the user
    // has no session, treat it as "not found". This is needed because in
    // dev mode the Convex auth provider is disabled, so ctx.auth.getUserIdentity()
    // is always null and the dev user fallback grants access to all requests.
    // The client knows the real session state via mock session / Better Auth.
    const proj = projectData()?.project;
    const user = currentUser();
    if (proj && !proj.isPublic && !user) return true;

    return false;
  });

  return {
    project,
    owner,
    forkedFrom,
    projectData,
    isOwner,
    isProjectLoading,
    projectNotFound,
    currentUser,
  };
}

/**
 * Hook for fetching version data (mutable reference to snapshot).
 */
export function useVersionData(
  projectId: Accessor<string | undefined>,
  versionName: Accessor<string | undefined>,
) {
  const versionQuery = useQuery(
    convexApi.projects.getVersion,
    () => ({
      projectId: projectId() ?? ('' as Id<'projects'>),
      versionName: versionName() ?? 'main',
    }),
    () => ({ enabled: !!projectId() }),
  );

  const versionData = createMemo(() => {
    const data = versionQuery.data() as VersionData | null | undefined;
    return data;
  });

  const content = createMemo(() => versionData()?.snapshot?.content);
  const currentHash = createMemo(() => versionData()?.snapshot?.contentHash);
  const versionExists = createMemo(() => versionData()?.version != null);

  const isVersionLoading = createMemo(() => {
    return versionQuery.isLoading() || versionQuery.data() === undefined;
  });

  return {
    versionData,
    content,
    currentHash,
    versionExists,
    isVersionLoading,
  };
}

/**
 * Hook for fetching snapshot data by hash (immutable permalink).
 */
export function useSnapshotData(
  projectId: Accessor<string | undefined>,
  hash: Accessor<string | undefined>,
) {
  const snapshotQuery = useQuery(
    convexApi.projects.getByHash,
    () => ({
      projectId: projectId() ?? ('' as Id<'projects'>),
      hash: hash(),
    }),
    () => ({ enabled: !!projectId() }),
  );

  const snapshot = createMemo(() => {
    const data = snapshotQuery.data() as Snapshot | null | undefined;
    return data;
  });

  const content = createMemo(() => snapshot()?.content);

  const isSnapshotLoading = createMemo(() => {
    return snapshotQuery.isLoading() || snapshotQuery.data() === undefined;
  });

  const snapshotNotFound = createMemo(() => {
    return !isSnapshotLoading() && snapshotQuery.data() === null;
  });

  return {
    snapshot,
    content,
    isSnapshotLoading,
    snapshotNotFound,
  };
}

/**
 * localStorage key for persisted theme preference.
 */
const THEME_STORAGE_KEY = 'floorplan-app-theme';

/**
 * Hook for managing theme state with document sync and localStorage persistence.
 *
 * Priority: localStorage saved preference > initialTheme parameter > "dark"
 */
export function useTheme(initialTheme: 'light' | 'dark' = 'dark') {
  // Read from localStorage first, fall back to parameter
  const stored =
    typeof window !== 'undefined'
      ? (localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null)
      : null;
  const [theme, setTheme] = createSignal<'light' | 'dark'>(stored ?? initialTheme);

  // Sync theme to document for DaisyUI and viewer-core CSS, and persist
  createEffect(() => {
    const currentTheme = theme();
    document.documentElement.dataset.theme = currentTheme;
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    }
  });

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
