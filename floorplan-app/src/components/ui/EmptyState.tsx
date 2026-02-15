import { type JSX, Show } from 'solid-js';

export interface EmptyStateProps {
  /** Icon element displayed above the message */
  icon?: JSX.Element;
  /** Primary message */
  message: string;
  /** Optional secondary description */
  description?: string;
  /** Call-to-action element (button, link, etc.) */
  action?: JSX.Element;
  /** Whether to render inside a card container */
  card?: boolean;
  /** Extra CSS classes on the outer container */
  class?: string;
}

/**
 * Empty state placeholder — shown when a list or section has no content.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<FolderIcon />}
 *   message="No projects yet"
 *   description="Create your first floorplan to get started."
 *   action={<A href="/new" class="btn btn-primary">New Project</A>}
 *   card
 * />
 * ```
 */
export function EmptyState(props: EmptyStateProps) {
  const content = () => (
    <div class={`flex flex-col items-center text-center py-8 ${props.class ?? ''}`}>
      <Show when={props.icon}>
        <div class="mb-4 opacity-50">{props.icon}</div>
      </Show>
      <p class="text-base-content/70 font-medium">{props.message}</p>
      <Show when={props.description}>
        <p class="text-base-content/50 text-sm mt-1">{props.description}</p>
      </Show>
      <Show when={props.action}>
        <div class="mt-4">{props.action}</div>
      </Show>
    </div>
  );

  if (props.card) {
    return (
      <div class="card bg-base-100">
        <div class="card-body">{content()}</div>
      </div>
    );
  }

  return content();
}

export default EmptyState;
