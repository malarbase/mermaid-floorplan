import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  Show,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { useMutation } from "convex-solidjs";
import type { FunctionReference } from "convex/server";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanEmbed = clientOnly(() => import("~/components/FloorplanEmbed"));

// Type-safe API reference builder for when generated files don't exist yet
const api = {
  projects: {
    save: "projects:save" as unknown as FunctionReference<"mutation">,
  },
};

// Type alias for project ID (matches Convex's Id<"projects">)
type ProjectId = string;

export interface FloorplanEditorProps {
  /**
   * Initial DSL content to render
   */
  initialContent: string;

  /**
   * The project ID (for saving)
   */
  projectId?: ProjectId;

  /**
   * The version name to save to (e.g., "main")
   */
  versionName?: string;

  /**
   * Whether editing is enabled (user is owner/editor)
   */
  editable?: boolean;

  /**
   * Theme (light or dark)
   */
  theme?: "light" | "dark";

  /**
   * Project display name (for header)
   */
  projectName?: string;

  /**
   * Username (for header breadcrumb)
   */
  username?: string;

  /**
   * Project slug (for navigation)
   */
  projectSlug?: string;

  /**
   * Current snapshot hash (for permalink display)
   */
  currentHash?: string;

  /**
   * Called when content is modified
   */
  onContentChange?: (content: string) => void;

  /**
   * Called after successful save
   */
  onSave?: (result: { snapshotId: string; hash: string }) => void;
}

/**
 * FloorplanEditor - A full editing environment with save functionality.
 *
 * Wraps FloorplanEmbed and adds:
 * - Dirty state tracking
 * - Save button with Ctrl+S shortcut
 * - Autosave (optional)
 * - Unsaved changes warning
 *
 * @example
 * <FloorplanEditor
 *   initialContent={project.content}
 *   projectId={project._id}
 *   versionName="main"
 *   editable={isOwner}
 *   onSave={() => showToast("Saved!")}
 * />
 */
export function FloorplanEditor(props: FloorplanEditorProps) {
  const navigate = useNavigate();
  const saveMutation = useMutation(api.projects.save);

  // State
  const [currentContent, setCurrentContent] = createSignal(props.initialContent);
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = createSignal(false);
  const [lastSavedContent, setLastSavedContent] = createSignal(props.initialContent);
  const [showSaveModal, setShowSaveModal] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal("");

  // Derived state
  const hasUnsavedChanges = createMemo(
    () => currentContent() !== lastSavedContent()
  );

  const canSave = createMemo(
    () =>
      props.editable &&
      props.projectId &&
      props.versionName &&
      hasUnsavedChanges() &&
      !isSaving()
  );

  // Update initial content when props change
  createEffect(() => {
    const newContent = props.initialContent;
    setCurrentContent(newContent);
    setLastSavedContent(newContent);
  });

  // Handle DSL changes from the viewer
  const handleContentChange = (newContent: string) => {
    setCurrentContent(newContent);
    setSaveError(null);
    props.onContentChange?.(newContent);
  };

  // Save function
  const performSave = async (message?: string) => {
    if (!canSave()) return;

    setIsSaving(true);
    setSaveError(null);
    setShowSaveSuccess(false);

    try {
      const result = (await saveMutation.mutate({
        projectId: props.projectId!,
        versionName: props.versionName!,
        content: currentContent(),
        message: message || undefined,
      })) as { snapshotId: string; hash: string };

      // Update last saved content
      setLastSavedContent(currentContent());

      // Show success feedback
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);

      props.onSave?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
      setShowSaveModal(false);
      setSaveMessage("");
    }
  };

  // Quick save (no message)
  const quickSave = () => performSave();

  // Save with message
  const saveWithMessage = () => {
    if (canSave()) {
      setShowSaveModal(true);
    }
  };

  // Keyboard shortcut handler (Ctrl+S / Cmd+S)
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (canSave()) {
        quickSave();
      }
    }
  };

  // Register keyboard shortcut
  createEffect(() => {
    if (props.editable) {
      document.addEventListener("keydown", handleKeyDown);
      onCleanup(() => {
        document.removeEventListener("keydown", handleKeyDown);
      });
    }
  });

  // Warn about unsaved changes before leaving
  createEffect(() => {
    if (hasUnsavedChanges()) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      onCleanup(() => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      });
    }
  });

  return (
    <div class="flex flex-col h-full">
      {/* Editor Toolbar */}
      <Show when={props.editable}>
        <div class="flex flex-wrap items-center justify-between bg-base-100 border-b border-base-300 px-2 sm:px-4 py-2 gap-2">
          <div class="flex items-center gap-1 sm:gap-2">
            {/* Save status indicator */}
            <Show when={hasUnsavedChanges()}>
              <span class="badge badge-warning badge-xs sm:badge-sm gap-1">
                <svg
                  class="w-2.5 sm:w-3 h-2.5 sm:h-3"
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
                <span class="hidden sm:inline">Unsaved changes</span>
                <span class="sm:hidden">Unsaved</span>
              </span>
            </Show>

            <Show when={showSaveSuccess()}>
              <span class="badge badge-success badge-xs sm:badge-sm gap-1">
                <svg
                  class="w-2.5 sm:w-3 h-2.5 sm:h-3"
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
                Saved
              </span>
            </Show>

            <Show when={saveError()}>
              <div class="tooltip tooltip-error" data-tip={saveError()}>
                <span class="badge badge-error badge-xs sm:badge-sm gap-1">
                  <svg
                    class="w-2.5 sm:w-3 h-2.5 sm:h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span class="hidden sm:inline">Save failed</span>
                  <span class="sm:hidden">Error</span>
                </span>
              </div>
            </Show>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            {/* Quick Save Button */}
            <button
              type="button"
              class="btn btn-primary btn-xs sm:btn-sm gap-1 sm:gap-2"
              onClick={quickSave}
              disabled={!canSave()}
              title="Save (Ctrl+S)"
            >
              <Show
                when={!isSaving()}
                fallback={<span class="loading loading-spinner loading-xs"></span>}
              >
                <svg
                  class="w-3.5 sm:w-4 h-3.5 sm:h-4"
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
              Save
            </button>

            {/* Save with Message Button */}
            <button
              type="button"
              class="btn btn-ghost btn-xs sm:btn-sm"
              onClick={saveWithMessage}
              disabled={!canSave()}
              title="Save with commit message"
            >
              <svg
                class="w-3.5 sm:w-4 h-3.5 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </button>
          </div>
        </div>
      </Show>

      {/* Viewer Container */}
      <div class="flex-1">
        <FloorplanEmbed
          dsl={currentContent()}
          theme={props.theme ?? "dark"}
          editable={props.editable}
          onDslChange={handleContentChange}
          onSave={quickSave}
        />
      </div>

      {/* Save with Message Modal */}
      <Show when={showSaveModal()}>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Save Changes</h3>
            <p class="py-2 text-base-content/70">
              Add a description of your changes (optional).
            </p>

            <div class="form-control">
              <textarea
                class="textarea textarea-bordered"
                placeholder="e.g., Added kitchen island, Resized living room..."
                value={saveMessage()}
                onInput={(e) =>
                  setSaveMessage((e.target as HTMLTextAreaElement).value)
                }
                rows={3}
              />
            </div>

            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveMessage("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => performSave(saveMessage())}
                disabled={isSaving()}
              >
                <Show
                  when={!isSaving()}
                  fallback={<span class="loading loading-spinner loading-xs"></span>}
                >
                  Save
                </Show>
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => {
              setShowSaveModal(false);
              setSaveMessage("");
            }}
          />
        </div>
      </Show>
    </div>
  );
}

export default FloorplanEditor;
