import { A } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo, For, Show } from 'solid-js';
import { api } from '../../convex/_generated/api';
import { DeleteProjectButton } from './DeleteProjectButton';
import { VisibilityToggle } from './VisibilityToggle';

// Project type from Convex schema
interface Project {
  _id: string;
  slug: string;
  displayName: string;
  description?: string;
  isPublic: boolean;
  updatedAt: number;
  thumbnail?: string;
}

interface ProjectListProps {
  /** Username for constructing project URLs */
  username?: string;
  /** Empty state call to action */
  onCreateNew?: () => void;
}

/**
 * Project list/grid component for the dashboard.
 * Fetches and displays all projects for the current authenticated user.
 */
export function ProjectList(props: ProjectListProps) {
  // Query user's projects using standard Convex hook
  const projectsQuery = useQuery(api.projects.list, {});

  const projects = createMemo(() => {
    const data = projectsQuery.data();
    return (data as unknown as Project[] | undefined) ?? [];
  });

  const isLoading = createMemo(() => {
    return projectsQuery.isLoading();
  });

  const hasError = createMemo(() => {
    return projectsQuery.error() !== undefined;
  });

  const error = createMemo(() => {
    return projectsQuery.error();
  });

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

  return (
    <div class="w-full">
      {/* Loading State */}
      <Show when={isLoading()}>
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </Show>

      {/* Error State */}
      <Show when={hasError()}>
        <div class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
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
          <span>Failed to load projects: {error()?.message ?? 'Unknown error'}</span>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!isLoading() && !hasError() && projects().length === 0}>
        <div class="empty-state">
          <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h2 class="empty-state-title">No projects yet</h2>
          <p class="empty-state-description">
            Get started by creating your first floorplan project. Use our simple DSL to design
            beautiful spaces.
          </p>
          <Show when={props.onCreateNew}>
            <button
              class="btn btn-primary btn-lg gap-2 shadow-md"
              onClick={() => props.onCreateNew?.()}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Your First Project
            </button>
          </Show>
          <Show when={!props.onCreateNew}>
            <A href="/new" class="btn btn-primary btn-lg gap-2 shadow-md">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Your First Project
            </A>
          </Show>
        </div>
      </Show>

      {/* Projects Grid */}
      <Show when={!isLoading() && !hasError() && projects().length > 0}>
        <div class="projects-grid">
          <For each={projects()}>
            {(project) => (
              <div class="project-card group">
                {/* Link overlay for entire card */}
                <A
                  href={`/u/${props.username ?? 'me'}/${project.slug}`}
                  class="absolute inset-0 z-0"
                  aria-label={`Open ${project.displayName}`}
                />
                {/* Thumbnail */}
                <div class="project-card-thumbnail">
                  <Show when={project.thumbnail}>
                    <img
                      src={project.thumbnail}
                      alt={project.displayName}
                      class="w-full h-full object-cover"
                    />
                  </Show>
                  <Show when={!project.thumbnail}>
                    <svg
                      class="project-card-thumbnail-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M7 10h10M7 14h6"
                      />
                    </svg>
                  </Show>
                </div>
                {/* Card Body */}
                <div class="project-card-body">
                  <h2 class="project-card-title">{project.displayName}</h2>
                  <Show when={project.description}>
                    <p class="project-card-description">{project.description}</p>
                  </Show>
                  <div class="project-card-footer">
                    <span class="project-card-meta">{formatDate(project.updatedAt)}</span>
                    <div class="project-card-actions">
                      <VisibilityToggle
                        projectId={project._id}
                        isPublic={project.isPublic}
                        compact
                      />
                      <A
                        href={`/u/${props.username ?? 'me'}/${project.slug}/settings`}
                        class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Project Settings"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </A>
                      <DeleteProjectButton
                        projectId={project._id}
                        projectName={project.displayName}
                        class="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
