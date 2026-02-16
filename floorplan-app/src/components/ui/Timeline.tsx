import { For, Show } from 'solid-js';

export interface TimelineEntry {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Optional badge displayed next to the title */
  badge?: { label: string; class: string };
  /** Entry title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional actor (e.g., username) */
  actor?: string;
}

export interface TimelineProps {
  /** Timeline entries (displayed in provided order) */
  items: TimelineEntry[];
  /** Message when items array is empty. Default: "No history" */
  emptyMessage?: string;
  /** Extra CSS class on the wrapper */
  class?: string;
}

/**
 * A vertical timeline using DaisyUI's timeline component.
 *
 * Each entry shows a timestamp, dot connector, and content box with optional
 * badge, actor, and description.
 *
 * @example
 * ```tsx
 * <Timeline
 *   items={[
 *     {
 *       timestamp: Date.now(),
 *       badge: { label: 'created', class: 'badge-success' },
 *       title: 'Project created',
 *       actor: 'alice',
 *     },
 *   ]}
 * />
 * ```
 */
export function Timeline(props: TimelineProps) {
  return (
    <Show
      when={props.items.length > 0}
      fallback={
        <p class={`text-center text-base-content/50 py-8 ${props.class ?? ''}`}>
          {props.emptyMessage ?? 'No history'}
        </p>
      }
    >
      <ul class={`timeline timeline-vertical timeline-compact ${props.class ?? ''}`}>
        <For each={props.items}>
          {(item, index) => (
            <li>
              <Show when={index() > 0}>
                <hr />
              </Show>
              <div class="timeline-start text-xs text-base-content/60">
                {new Date(item.timestamp).toLocaleString()}
              </div>
              <div class="timeline-middle">
                <svg class="w-4 h-4 fill-current text-base-content/40" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="5" />
                </svg>
              </div>
              <div class="timeline-end timeline-box">
                <div class="flex flex-wrap items-center gap-1.5">
                  <Show when={item.badge}>
                    {(badge) => (
                      <span class={`badge badge-sm ${badge().class}`}>{badge().label}</span>
                    )}
                  </Show>
                  <span class="font-medium">{item.title}</span>
                  <Show when={item.actor}>
                    <span class="text-xs text-base-content/60">by {item.actor}</span>
                  </Show>
                </div>
                <Show when={item.description}>
                  <p class="text-sm text-base-content/70 mt-1">{item.description}</p>
                </Show>
              </div>
              <Show when={index() < props.items.length - 1}>
                <hr />
              </Show>
            </li>
          )}
        </For>
      </ul>
    </Show>
  );
}

export default Timeline;
