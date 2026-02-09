import { A } from '@solidjs/router';
import type { FunctionReference } from 'convex/server';
import { useQuery } from 'convex-solidjs';
import { createMemo, For, Show } from 'solid-js';

// Type-safe API reference builder for when generated files don't exist yet
// This will be replaced with proper imports once `npx convex dev` generates the API
const api = {
  projects: {
    listVersions: 'projects:listVersions' as unknown as FunctionReference<'query'>,
  },
};

// Version type from Convex schema
interface Version {
  _id: string;
  name: string;
  snapshotId: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface VersionListProps {
  /** Project ID to fetch versions for */
  projectId: string;
  /** Username for constructing version URLs */
  username: string;
  /** Project slug for constructing version URLs */
  projectSlug: string;
  /** Default version name (highlighted) */
  defaultVersion?: string;
  /** Currently active version (highlighted differently) */
  activeVersion?: string;
  /** Callback when a version is selected */
  onVersionSelect?: (version: Version) => void;
  /** Whether to show compact view */
  compact?: boolean;
  /** Show create new version button */
  showCreateButton?: boolean;
  /** Callback when create new version is clicked */
  onCreateNew?: () => void;
}

/**
 * Version list component for displaying all versions of a project.
 * Similar to Git branches - shows mutable named references.
 */
export function VersionList(props: VersionListProps) {
  // Query project's versions from Convex
  const versionsQuery = useQuery(api.projects.listVersions, () => ({
    projectId: props.projectId,
  }));

  const versions = createMemo(() => {
    const data = versionsQuery.data() as Version[] | undefined;
    if (!data) return [];
    // Sort: default version first, then by updatedAt desc
    return [...data].sort((a, b) => {
      if (a.name === props.defaultVersion) return -1;
      if (b.name === props.defaultVersion) return 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  const isLoading = createMemo(() => versionsQuery.isLoading());
  const hasError = createMemo(() => versionsQuery.error() !== undefined);
  const error = createMemo(() => versionsQuery.error());

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Check if version is the active one
  const isActive = (version: Version) => version.name === props.activeVersion;
  const isDefault = (version: Version) => version.name === props.defaultVersion;

  return (
    <div class="w-full">
      {/* Loading State */}
      <Show when={isLoading()}>
        <div class="flex justify-center py-4">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
      </Show>

      {/* Error State */}
      <Show when={hasError()}>
        <div class="alert alert-error alert-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Failed to load versions: {error()?.message ?? 'Unknown error'}</span>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!isLoading() && !hasError() && versions().length === 0}>
        <div class="text-center py-4 text-base-content/70">
          <p>No versions found</p>
        </div>
      </Show>

      {/* Versions List */}
      <Show when={!isLoading() && !hasError() && versions().length > 0}>
        <Show when={props.compact} fallback={<FullVersionList />}>
          <CompactVersionList />
        </Show>
      </Show>

      {/* Create New Version Button */}
      <Show when={props.showCreateButton}>
        <button
          class="btn btn-sm btn-outline btn-primary w-full mt-2"
          onClick={() => props.onCreateNew?.()}
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Version
        </button>
      </Show>
    </div>
  );

  // Full version list with cards
  function FullVersionList() {
    return (
      <div class="space-y-2">
        <For each={versions()}>
          {(version) => (
            <div
              class={`card bg-base-100 shadow-sm hover:shadow transition-shadow cursor-pointer ${
                isActive(version) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => props.onVersionSelect?.(version)}
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    {/* Version icon */}
                    <svg
                      class="w-5 h-5 text-base-content/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <A
                      href={`/u/${props.username}/${props.projectSlug}/v/${version.name}`}
                      class="font-medium hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {version.name}
                    </A>
                    {/* Default badge */}
                    <Show when={isDefault(version)}>
                      <span class="badge badge-sm badge-primary">default</span>
                    </Show>
                    {/* Active indicator */}
                    <Show when={isActive(version)}>
                      <span class="badge badge-sm badge-success">current</span>
                    </Show>
                  </div>
                  <span class="text-xs text-base-content/50">{formatDate(version.updatedAt)}</span>
                </div>
                <Show when={version.description}>
                  <p class="text-sm text-base-content/70 mt-1">{version.description}</p>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    );
  }

  // Compact version list (dropdown style)
  function CompactVersionList() {
    return (
      <ul class="menu menu-sm bg-base-100 rounded-box p-0">
        <For each={versions()}>
          {(version) => (
            <li>
              <A
                href={`/u/${props.username}/${props.projectSlug}/v/${version.name}`}
                class={`flex items-center justify-between ${isActive(version) ? 'active' : ''}`}
                onClick={(e) => {
                  if (props.onVersionSelect) {
                    e.preventDefault();
                    props.onVersionSelect(version);
                  }
                }}
              >
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {version.name}
                  <Show when={isDefault(version)}>
                    <span class="badge badge-xs badge-primary">default</span>
                  </Show>
                </span>
                <span class="text-xs opacity-50">{formatDate(version.updatedAt)}</span>
              </A>
            </li>
          )}
        </For>
      </ul>
    );
  }
}

export default VersionList;
