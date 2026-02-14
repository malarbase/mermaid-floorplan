import { type Accessor, createSignal, Show } from 'solid-js';

interface SaveIndicatorProps {
  hasUnsavedChanges: Accessor<boolean>;
  isSaving: Accessor<boolean>;
  showSaveSuccess: Accessor<boolean>;
  saveError: Accessor<string | null>;
  onSave: (message?: string) => void;
}

/**
 * Save button with dropdown for optional commit message.
 *
 * - Click "Save" or Ctrl+S for quick save (no message).
 * - Click the chevron to expand a message input for annotated saves.
 */
export function SaveIndicator(props: SaveIndicatorProps) {
  const [showMessageInput, setShowMessageInput] = createSignal(false);
  const [message, setMessage] = createSignal('');

  const handleQuickSave = () => {
    props.onSave();
  };

  const handleSaveWithMessage = () => {
    props.onSave(message());
    setMessage('');
    setShowMessageInput(false);
  };

  const handleMessageKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveWithMessage();
    }
    if (e.key === 'Escape') {
      setShowMessageInput(false);
      setMessage('');
    }
  };

  return (
    <>
      <Show when={props.hasUnsavedChanges()}>
        <div class="relative flex items-center gap-0">
          {/* Main save button */}
          <button
            type="button"
            class="btn btn-primary btn-sm gap-1 rounded-r-none"
            onClick={handleQuickSave}
            disabled={props.isSaving()}
            title="Save (Ctrl+S)"
          >
            <Show
              when={!props.isSaving()}
              fallback={<span class="loading loading-spinner loading-xs"></span>}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {/* Chevron dropdown toggle */}
          <button
            type="button"
            class="btn btn-primary btn-sm rounded-l-none border-l border-primary-content/20 px-1.5"
            onClick={() => setShowMessageInput(!showMessageInput())}
            disabled={props.isSaving()}
            title="Save with message"
          >
            <svg
              class="w-3.5 h-3.5 transition-transform"
              classList={{ 'rotate-180': showMessageInput() }}
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

          {/* Message input dropdown */}
          <Show when={showMessageInput()}>
            <div class="absolute top-full right-0 mt-1 z-50 w-72 bg-base-100 rounded-lg shadow-lg border border-base-300 p-3">
              <label class="text-xs text-base-content/60 mb-1 block">
                Snapshot message (optional)
              </label>
              <input
                type="text"
                class="input input-bordered input-sm w-full"
                placeholder='e.g., "Added kitchen island"'
                value={message()}
                onInput={(e) => setMessage(e.currentTarget.value)}
                onKeyDown={handleMessageKeyDown}
                autofocus
              />
              <div class="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  onClick={() => {
                    setShowMessageInput(false);
                    setMessage('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-xs"
                  onClick={handleSaveWithMessage}
                  disabled={props.isSaving()}
                >
                  Save
                </button>
              </div>
            </div>
          </Show>
        </div>
      </Show>
      <Show when={props.showSaveSuccess()}>
        <span class="badge badge-success badge-sm gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <Show when={props.saveError()}>
        <div class="tooltip tooltip-error" data-tip={props.saveError()}>
          <span class="badge badge-error badge-sm">Save failed</span>
        </div>
      </Show>
    </>
  );
}
