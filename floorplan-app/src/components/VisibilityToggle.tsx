import { createSignal, Show } from "solid-js";
import { useMutation } from "convex-solidjs";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface VisibilityToggleProps {
  projectId: Id<"projects"> | string;

  /**
   * Current visibility state
   */
  isPublic: boolean;

  /**
   * Show as a compact badge-style toggle
   */
  compact?: boolean;

  /**
   * Called when visibility is changed
   */
  onToggle?: (newValue: boolean) => void;

  /**
   * Additional CSS classes
   */
  class?: string;
}

/**
 * Interactive toggle for switching a project between public and private.
 *
 * Features:
 * - Dropdown menu with visibility options
 * - Loading state during update
 * - Immediate visual feedback
 *
 * @example
 * <VisibilityToggle
 *   projectId={project._id}
 *   isPublic={project.isPublic}
 *   onToggle={(isPublic) => console.log("Now public:", isPublic)}
 * />
 */
export function VisibilityToggle(props: VisibilityToggleProps) {
  const updateProject = useMutation(api.projects.update);

  const [isLoading, setIsLoading] = createSignal(false);
  const [localIsPublic, setLocalIsPublic] = createSignal(props.isPublic);

  // Update local state when props change
  const isPublic = () => localIsPublic();

  const handleToggle = async () => {
    const newValue = !isPublic();
    setIsLoading(true);
    setLocalIsPublic(newValue); // Optimistic update

    try {
      await updateProject.mutate({
        projectId: props.projectId as Id<"projects">,
        isPublic: newValue,
      });
      props.onToggle?.(newValue);
    } catch (error) {
      // Revert on error
      setLocalIsPublic(!newValue);
      console.error("Failed to update visibility:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compact badge-style toggle
  if (props.compact) {
    return (
      <button
        type="button"
        class={`btn btn-xs gap-1 ${
          isPublic() ? "btn-success btn-outline" : "btn-ghost border border-base-content/20"
        } ${props.class ?? ""}`}
        onClick={handleToggle}
        disabled={isLoading()}
        title={isPublic() ? "Click to make private" : "Click to make public"}
      >
        <Show when={isLoading()}>
          <span class="loading loading-spinner loading-xs"></span>
        </Show>
        <Show when={!isLoading()}>
          <Show
            when={isPublic()}
            fallback={
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Show>
        </Show>
        {isPublic() ? "Public" : "Private"}
      </button>
    );
  }

  // Full dropdown toggle
  return (
    <div class={`dropdown dropdown-end ${props.class ?? ""}`}>
      <div
        tabindex="0"
        role="button"
        class={`btn btn-sm gap-1 ${isPublic() ? "btn-success btn-outline" : "btn-ghost"}`}
      >
        <Show when={isLoading()}>
          <span class="loading loading-spinner loading-xs"></span>
        </Show>
        <Show when={!isLoading()}>
          <Show
            when={isPublic()}
            fallback={
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
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
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </Show>
        </Show>
        {isPublic() ? "Public" : "Private"}
        <svg
          class="w-3 h-3"
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
      </div>
      <ul
        tabindex="0"
        class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-64 border border-base-300"
      >
        <li>
          <button
            type="button"
            class={`flex items-start gap-3 ${!isPublic() ? "active" : ""}`}
            onClick={async () => {
              if (isPublic()) await handleToggle();
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            <svg
              class="w-5 h-5 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div class="text-left">
              <div class="font-medium">Private</div>
              <div class="text-xs text-base-content/60">
                Only you and collaborators can view
              </div>
            </div>
          </button>
        </li>
        <li>
          <button
            type="button"
            class={`flex items-start gap-3 ${isPublic() ? "active" : ""}`}
            onClick={async () => {
              if (!isPublic()) await handleToggle();
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            <svg
              class="w-5 h-5 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div class="text-left">
              <div class="font-medium">Public</div>
              <div class="text-xs text-base-content/60">
                Anyone with the link can view
              </div>
            </div>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default VisibilityToggle;
