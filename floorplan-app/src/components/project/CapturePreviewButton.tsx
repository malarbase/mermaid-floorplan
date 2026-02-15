import { type Accessor, Show } from 'solid-js';

interface CapturePreviewButtonProps {
  onCapture: () => void;
  isCapturing: Accessor<boolean>;
  showSuccess: Accessor<boolean>;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Camera icon button that captures a thumbnail preview of the 3D view.
 * Shows a spinner while capturing and a green checkmark on success.
 */
export function CapturePreviewButton(props: CapturePreviewButtonProps) {
  return (
    <button
      type="button"
      class="btn btn-ghost btn-sm gap-1"
      onClick={props.onCapture}
      disabled={props.isCapturing() || props.disabled}
      title={props.disabledReason ?? 'Capture preview thumbnail for project card'}
    >
      <Show
        when={!props.isCapturing()}
        fallback={<span class="loading loading-spinner loading-xs"></span>}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </Show>
      <Show when={props.showSuccess()} fallback={<></>}>
        <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </Show>
    </button>
  );
}
