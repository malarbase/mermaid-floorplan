import { createMemo, Show, For, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { useQuery, useMutation } from "convex-solidjs";
import type { FunctionReference } from "convex/server";

// Type-safe API reference
const api = {
  sharing: {
    getSharedWithMe: "sharing:getSharedWithMe" as unknown as FunctionReference<"query">,
    leaveProject: "sharing:leaveProject" as unknown as FunctionReference<"mutation">,
  },
};

// Shared project type from getSharedWithMe query
interface SharedProject {
  project: {
    _id: string;
    slug: string;
    displayName: string;
    description?: string;
    isPublic: boolean;
    updatedAt: number;
  };
  owner: {
    username: string;
    displayName?: string;
  };
  role: "viewer" | "editor";
  sharedAt: number;
}

interface SharedProjectListProps {
  /** Optional class name for styling */
  class?: string;
}

/**
 * Component to display projects shared with the current user.
 * Shows a list of projects they've been invited to collaborate on.
 */
export function SharedProjectList(props: SharedProjectListProps) {
  const [leavingProjectId, setLeavingProjectId] = createSignal<string | null>(null);
  const [confirmLeave, setConfirmLeave] = createSignal<SharedProject | null>(null);

  // Query shared projects
  const sharedQuery = useQuery(api.sharing.getSharedWithMe, () => ({}));

  const leaveProject = useMutation(api.sharing.leaveProject);

  const sharedProjects = createMemo(() => {
    return (sharedQuery.data() as SharedProject[] | undefined) ?? [];
  });

  const isLoading = createMemo(() => {
    return sharedQuery.isLoading();
  });

  const hasError = createMemo(() => {
    return sharedQuery.error() !== undefined;
  });

  const error = createMemo(() => {
    return sharedQuery.error();
  });

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "Today";
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle leaving a project
  const handleLeave = async (project: SharedProject) => {
    setLeavingProjectId(project.project._id);
    try {
      await leaveProject.mutate({ projectId: project.project._id as unknown as any });
      setConfirmLeave(null);
    } catch (err) {
      console.error("Failed to leave project:", err);
      alert("Failed to leave project. Please try again.");
    } finally {
      setLeavingProjectId(null);
    }
  };

  // If no shared projects, don't render anything
  if (!isLoading() && !hasError() && sharedProjects().length === 0) {
    return null;
  }

  return (
    <div class={props.class}>
      <div class="shared-section-header">
        <svg
          class="shared-section-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 class="shared-section-title">Shared with me</h2>
      </div>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-md"></span>
        </div>
      </Show>

      {/* Error State */}
      <Show when={hasError()}>
        <div class="alert alert-error mb-4">
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
          <span>Failed to load shared projects: {error()?.message ?? "Unknown error"}</span>
        </div>
      </Show>

      {/* Shared Projects List */}
      <Show when={!isLoading() && !hasError() && sharedProjects().length > 0}>
        <div class="projects-grid">
          <For each={sharedProjects()}>
            {(shared) => (
              <div class="project-card group">
                {/* Link to project */}
                <A
                  href={`/u/${shared.owner.username}/${shared.project.slug}`}
                  class="absolute inset-0 z-0"
                  aria-label={`Open ${shared.project.displayName}`}
                />
                <div class="project-card-body">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex-1 min-w-0">
                      <h3 class="project-card-title truncate">{shared.project.displayName}</h3>
                      <p class="text-sm text-base-content/60 truncate flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 inline flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {shared.owner.displayName ?? shared.owner.username}
                      </p>
                    </div>
                    <span class={`role-badge ${shared.role}`}>
                      {shared.role === "editor" ? "Can edit" : "View only"}
                    </span>
                  </div>
                  <Show when={shared.project.description}>
                    <p class="project-card-description">
                      {shared.project.description}
                    </p>
                  </Show>
                  <div class="project-card-footer">
                    <span class="project-card-meta">
                      Shared {formatDate(shared.sharedAt)}
                    </span>
                    <div class="project-card-actions">
                      {/* Leave project button */}
                      <button
                        class="btn btn-ghost btn-xs text-error"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmLeave(shared);
                        }}
                        disabled={leavingProjectId() === shared.project._id}
                        title="Leave project"
                      >
                        <Show
                          when={leavingProjectId() !== shared.project._id}
                          fallback={<span class="loading loading-spinner loading-xs"></span>}
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </Show>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Leave Confirmation Modal */}
      <dialog class={`modal ${confirmLeave() ? "modal-open" : ""}`}>
        <div class="modal-box">
          <h3 class="font-bold text-lg">Leave Project?</h3>
          <p class="py-4">
            Are you sure you want to leave{" "}
            <strong>{confirmLeave()?.project.displayName}</strong>? You will lose access to this
            project and will need to be re-invited to access it again.
          </p>
          <div class="modal-action">
            <button class="btn btn-ghost" onClick={() => setConfirmLeave(null)}>
              Cancel
            </button>
            <button
              class="btn btn-error"
              onClick={() => confirmLeave() && handleLeave(confirmLeave()!)}
              disabled={leavingProjectId() !== null}
            >
              <Show
                when={leavingProjectId() === null}
                fallback={<span class="loading loading-spinner loading-sm"></span>}
              >
                Leave Project
              </Show>
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button onClick={() => setConfirmLeave(null)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
