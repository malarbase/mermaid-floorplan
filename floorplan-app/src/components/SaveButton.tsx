import { createSignal, createMemo, Show } from "solid-js";
import { useMutation } from "convex-solidjs";
import type { FunctionReference } from "convex/server";

// Type-safe API reference builder for when generated files don't exist yet
// This will be replaced with proper imports once `npx convex dev` generates the API
const api = {
  projects: {
    save: "projects:save" as unknown as FunctionReference<"mutation">,
  },
};

// Type alias for project ID (matches Convex's Id<"projects">)
type ProjectId = string;

export interface SaveButtonProps {
  /**
   * The project ID to save to
   */
  projectId: ProjectId;

  /**
   * The version name to update (e.g., "main")
   */
  versionName: string;

  /**
   * Current DSL content to save
   */
  content: string;

  /**
   * Whether the content has unsaved changes
   */
  hasChanges?: boolean;

  /**
   * Optional commit message for the snapshot
   */
  message?: string;

  /**
   * Button style variant
   */
  variant?: "primary" | "ghost" | "outline";

  /**
   * Button size
   */
  size?: "xs" | "sm" | "md" | "lg";

  /**
   * Additional CSS classes
   */
  class?: string;

  /**
   * Called on successful save
   */
  onSave?: (result: { snapshotId: string; hash: string }) => void;

  /**
   * Called on save error
   */
  onError?: (error: Error) => void;
}

/**
 * SaveButton component - handles saving floorplan changes to Convex.
 *
 * Creates a new snapshot and updates the version pointer.
 * Shows loading state during save and success/error feedback.
 *
 * @example
 * <SaveButton
 *   projectId={project._id}
 *   versionName="main"
 *   content={currentDsl}
 *   hasChanges={isDirty}
 *   onSave={() => showToast("Saved!")}
 * />
 */
export function SaveButton(props: SaveButtonProps) {
  const saveMutation = useMutation(api.projects.save);

  const [isSaving, setIsSaving] = createSignal(false);
  const [lastSaveError, setLastSaveError] = createSignal<string | null>(null);
  const [showSuccess, setShowSuccess] = createSignal(false);

  // Button classes based on props
  const buttonClasses = createMemo(() => {
    const variant = props.variant ?? "primary";
    const size = props.size ?? "sm";
    const baseClasses = "btn gap-2";
    const variantClasses =
      variant === "primary"
        ? "btn-primary"
        : variant === "ghost"
          ? "btn-ghost"
          : "btn-outline";
    const sizeClasses = `btn-${size}`;
    return `${baseClasses} ${variantClasses} ${sizeClasses} ${props.class ?? ""}`;
  });

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    if (isSaving()) return;

    setIsSaving(true);
    setLastSaveError(null);
    setShowSuccess(false);

    try {
      const result = (await saveMutation.mutate({
        projectId: props.projectId,
        versionName: props.versionName,
        content: props.content,
        message: props.message,
      })) as { snapshotId: string; hash: string };

      // Show success feedback briefly
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      props.onSave?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setLastSaveError(error.message);
      props.onError?.(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="flex items-center gap-2">
      <button
        type="button"
        class={buttonClasses()}
        onClick={handleSave}
        disabled={isSaving() || !props.hasChanges}
        title={
          !props.hasChanges
            ? "No unsaved changes"
            : isSaving()
              ? "Saving..."
              : "Save changes (Ctrl+S)"
        }
      >
        <Show
          when={!isSaving()}
          fallback={<span class="loading loading-spinner loading-xs"></span>}
        >
          <Show
            when={!showSuccess()}
            fallback={
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
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          </Show>
        </Show>
        <Show when={showSuccess()} fallback="Save">
          Saved!
        </Show>
      </button>

      {/* Error indicator */}
      <Show when={lastSaveError()}>
        <div class="tooltip tooltip-error" data-tip={lastSaveError()}>
          <svg
            class="w-5 h-5 text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </Show>

      {/* Unsaved changes indicator */}
      <Show when={props.hasChanges && !isSaving() && !showSuccess()}>
        <span class="badge badge-warning badge-xs">Unsaved</span>
      </Show>
    </div>
  );
}

export default SaveButton;
