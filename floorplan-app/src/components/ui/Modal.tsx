import { type JSX, Show } from 'solid-js';

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the user requests to close (backdrop click, cancel button, etc.) */
  onClose: () => void;
  /** Modal title */
  title: string | JSX.Element;
  /** Optional description below the title */
  description?: string | JSX.Element;
  /** Modal body content */
  children: JSX.Element;
  /** Optional error message shown in an alert above the actions */
  error?: string;
  /** Extra CSS class applied to the modal-box */
  class?: string;
  /** Use <dialog> element (some modals use <dialog> for Portal compat) */
  useDialog?: boolean;
}

/**
 * Reusable DaisyUI modal wrapper.
 *
 * Handles the boilerplate: open/close gating, backdrop, title, error alert,
 * and the modal-box container. Consumers provide `children` (the form body)
 * and an optional `error`.
 *
 * Actions (cancel / submit buttons) should be placed inside children
 * wrapped in `<div class="modal-action">`.
 *
 * @example
 * ```tsx
 * <Modal isOpen={open()} onClose={close} title="Create Version" error={error()}>
 *   <form onSubmit={handleSubmit}>
 *     <input ... />
 *     <div class="modal-action">
 *       <button class="btn" onClick={close}>Cancel</button>
 *       <button class="btn btn-primary" type="submit">Create</button>
 *     </div>
 *   </form>
 * </Modal>
 * ```
 */
export function Modal(props: ModalProps) {
  const content = () => (
    <div class={`modal-box ${props.class ?? ''}`}>
      <h3 class="font-bold text-lg">{props.title}</h3>

      <Show when={props.description}>
        <p class="py-4 text-base-content/70">{props.description}</p>
      </Show>

      {props.children}

      {/* Error alert */}
      <Show when={props.error}>
        <div class="alert alert-error mt-4">
          <svg class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{props.error}</span>
        </div>
      </Show>
    </div>
  );

  return (
    <Show when={props.isOpen}>
      <Show
        when={props.useDialog}
        fallback={
          <div class="modal modal-open">
            {content()}
            <div class="modal-backdrop" onClick={() => props.onClose()} />
          </div>
        }
      >
        <dialog class="modal modal-open">
          {content()}
          <div class="modal-backdrop" onClick={() => props.onClose()} />
        </dialog>
      </Show>
    </Show>
  );
}

export default Modal;
