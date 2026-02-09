import { A, useNavigate } from '@solidjs/router';
import type { FunctionReference } from 'convex/server';
import { useQuery } from 'convex-solidjs';
import { createMemo, createSignal, For, Show } from 'solid-js';

// Type-safe API reference builder for when generated files don't exist yet
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

export interface VersionSwitcherProps {
  /** Project ID to fetch versions for */
  projectId: string;
  /** Username for constructing version URLs */
  username: string;
  /** Project slug for constructing version URLs */
  projectSlug: string;
  /** Default version name (shown with "default" badge) */
  defaultVersion?: string;
  /** Currently active version name */
  currentVersion: string;
  /** Whether user can create new versions */
  canCreateVersion?: boolean;
  /** Callback when create new version is clicked */
  onCreateNew?: () => void;
  /** Custom class for the dropdown button */
  class?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Version switcher dropdown component.
 * Allows users to switch between different versions of a project.
 * Similar to GitHub's branch switcher dropdown.
 *
 * @example
 * <VersionSwitcher
 *   projectId={project._id}
 *   username="alice"
 *   projectSlug="beach-house"
 *   defaultVersion="main"
 *   currentVersion="client-review"
 * />
 */
export function VersionSwitcher(props: VersionSwitcherProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');

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

  // Filter versions by search query
  const filteredVersions = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return versions();
    return versions().filter((v) => v.name.toLowerCase().includes(query));
  });

  const isLoading = createMemo(() => versionsQuery.isLoading());

  // Current version info
  const _currentVersionData = createMemo(() =>
    versions().find((v) => v.name === props.currentVersion),
  );

  // Close dropdown when clicking outside
  const _handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.version-switcher-dropdown')) {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle version selection
  const selectVersion = (version: Version) => {
    setIsOpen(false);
    setSearchQuery('');

    // Navigate to the version
    if (version.name === props.defaultVersion) {
      // For default version, go to project root
      navigate(`/u/${props.username}/${props.projectSlug}`);
    } else {
      navigate(`/u/${props.username}/${props.projectSlug}/v/${version.name}`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Get size classes
  const sizeClass = () => {
    switch (props.size) {
      case 'sm':
        return 'btn-sm text-sm';
      case 'lg':
        return 'btn-lg text-lg';
      default:
        return '';
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      class={`version-switcher-dropdown dropdown ${isOpen() ? 'dropdown-open' : ''} ${props.class ?? ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        class={`btn btn-ghost gap-2 ${sizeClass()}`}
        onClick={() => setIsOpen(!isOpen())}
        aria-haspopup="listbox"
        aria-expanded={isOpen()}
      >
        {/* Branch icon */}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span class="font-medium">{props.currentVersion}</span>
        <Show when={props.currentVersion === props.defaultVersion}>
          <span class="badge badge-xs badge-primary">default</span>
        </Show>
        {/* Chevron */}
        <svg
          class={`w-4 h-4 transition-transform ${isOpen() ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Content */}
      <Show when={isOpen()}>
        {/* Backdrop for click outside */}
        <div
          class="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
        />

        <div class="dropdown-content z-50 bg-base-100 rounded-box shadow-xl border border-base-300 w-72 p-0 mt-2">
          {/* Search Header */}
          <div class="p-3 border-b border-base-300">
            <div class="text-sm font-medium text-base-content/70 mb-2">Switch versions</div>
            <input
              type="text"
              class="input input-sm input-bordered w-full"
              placeholder="Find a version..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              autofocus
            />
          </div>

          {/* Version List */}
          <div class="max-h-64 overflow-y-auto">
            <Show
              when={!isLoading()}
              fallback={
                <div class="flex justify-center py-6">
                  <span class="loading loading-spinner loading-sm"></span>
                </div>
              }
            >
              <Show
                when={filteredVersions().length > 0}
                fallback={
                  <div class="text-center py-6 text-base-content/50">
                    <Show when={searchQuery()} fallback={<span>No versions available</span>}>
                      <span>No versions matching "{searchQuery()}"</span>
                    </Show>
                  </div>
                }
              >
                <ul class="menu menu-sm p-2">
                  <For each={filteredVersions()}>
                    {(version) => (
                      <li aria-selected={version.name === props.currentVersion}>
                        <button
                          type="button"
                          class={`flex items-center justify-between w-full ${
                            version.name === props.currentVersion ? 'active' : ''
                          }`}
                          onClick={() => selectVersion(version)}
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            {/* Selected indicator */}
                            <div class="w-4 flex-shrink-0">
                              <Show when={version.name === props.currentVersion}>
                                <svg
                                  class="w-4 h-4 text-success"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </Show>
                            </div>

                            {/* Version info */}
                            <div class="flex flex-col items-start min-w-0">
                              <span class="font-medium truncate max-w-[140px]">{version.name}</span>
                              <Show when={version.description}>
                                <span class="text-xs text-base-content/50 truncate max-w-[140px]">
                                  {version.description}
                                </span>
                              </Show>
                            </div>
                          </div>

                          <div class="flex items-center gap-2 flex-shrink-0">
                            <Show when={version.name === props.defaultVersion}>
                              <span class="badge badge-xs badge-primary">default</span>
                            </Show>
                            <span class="text-xs text-base-content/50">
                              {formatRelativeTime(version.updatedAt)}
                            </span>
                          </div>
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </Show>
          </div>

          {/* Footer */}
          <Show when={props.canCreateVersion || true}>
            <div class="border-t border-base-300 p-2">
              <A
                href={`/u/${props.username}/${props.projectSlug}/history`}
                class="btn btn-ghost btn-sm w-full justify-start gap-2"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                View all versions
              </A>

              <Show when={props.canCreateVersion}>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm w-full justify-start gap-2 text-primary"
                  onClick={() => {
                    setIsOpen(false);
                    setSearchQuery('');
                    props.onCreateNew?.();
                  }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create new version
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export default VersionSwitcher;
