import { createSignal, Show, createMemo } from "solid-js";
import { A } from "@solidjs/router";
import {
  generatePermalink,
  copyToClipboard,
  shortenHash,
} from "~/lib/permalink";

export interface PermalinkDisplayProps {
  /** Project owner's username */
  username: string;
  /** Project slug */
  projectSlug: string;
  /** Content hash of the snapshot */
  hash: string;
  /** Display variant */
  variant?: "badge" | "inline" | "full";
  /** Whether this is the current/active snapshot */
  isCurrent?: boolean;
  /** Optional snapshot message to display */
  message?: string;
  /** Optional timestamp */
  timestamp?: number;
  /** Show copy button */
  showCopyButton?: boolean;
  /** Additional CSS classes */
  class?: string;
}

/**
 * PermalinkDisplay - Shows a permalink with copy functionality.
 *
 * Displays the content hash as a clickable link to the immutable snapshot.
 * Optionally includes a copy button for easy sharing.
 *
 * @example
 * <PermalinkDisplay
 *   username="alice"
 *   projectSlug="beach-house"
 *   hash="a1b2c3d4"
 *   variant="badge"
 *   showCopyButton
 * />
 */
export function PermalinkDisplay(props: PermalinkDisplayProps) {
  const [copied, setCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal(false);

  const permalink = createMemo(() =>
    generatePermalink(props.username, props.projectSlug, props.hash)
  );

  const absolutePermalink = createMemo(() =>
    generatePermalink(props.username, props.projectSlug, props.hash, true)
  );

  const shortHash = createMemo(() => shortenHash(props.hash));

  const handleCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const success = await copyToClipboard(absolutePermalink());

    if (success) {
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Badge variant - compact display
  const BadgeVariant = () => (
    <div class={`flex items-center gap-1 ${props.class ?? ""}`}>
      <A
        href={permalink()}
        class={`badge gap-1 ${props.isCurrent ? "badge-primary" : "badge-ghost"}`}
        title="Permalink to this snapshot (immutable)"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        #{shortHash()}
      </A>
      <Show when={props.showCopyButton}>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          onClick={handleCopy}
          title={copied() ? "Copied!" : "Copy permalink"}
        >
          <Show
            when={!copied()}
            fallback={
              <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            }
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </Show>
        </button>
      </Show>
    </div>
  );

  // Inline variant - text with link
  const InlineVariant = () => (
    <span class={`inline-flex items-center gap-1 ${props.class ?? ""}`}>
      <A href={permalink()} class="link link-hover font-mono text-sm">
        #{shortHash()}
      </A>
      <Show when={props.showCopyButton}>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          onClick={handleCopy}
          title={copied() ? "Copied!" : "Copy permalink"}
        >
          <Show
            when={!copied()}
            fallback={
              <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            }
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
          </Show>
        </button>
        <Show when={copied()}>
          <span class="text-xs text-success">Copied!</span>
        </Show>
      </Show>
    </span>
  );

  // Full variant - card-like display
  const FullVariant = () => (
    <div class={`card bg-base-100 shadow-sm ${props.class ?? ""}`}>
      <div class="card-body p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            {/* Link icon */}
            <div class="bg-success/10 p-2 rounded-lg">
              <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>

            <div>
              <A
                href={permalink()}
                class="font-mono text-lg hover:text-primary transition-colors"
              >
                #{props.hash}
              </A>
              <Show when={props.message}>
                <p class="text-sm text-base-content/70">{props.message}</p>
              </Show>
              <Show when={props.timestamp}>
                <p class="text-xs text-base-content/50">
                  {formatTimestamp(props.timestamp!)}
                </p>
              </Show>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="badge badge-success badge-sm badge-outline">Permanent</span>

            <button
              type="button"
              class="btn btn-ghost btn-sm gap-2"
              onClick={handleCopy}
              title={copied() ? "Copied!" : "Copy permalink"}
            >
              <Show
                when={!copied()}
                fallback={
                  <>
                    <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                }
              >
                <Show
                  when={!copyError()}
                  fallback={
                    <>
                      <svg class="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Failed
                    </>
                  }
                >
                  <>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                </Show>
              </Show>
            </button>

            <A href={permalink()} class="btn btn-primary btn-sm">
              View
            </A>
          </div>
        </div>

        {/* URL display */}
        <div class="mt-2 bg-base-200 rounded-lg p-2">
          <code class="text-xs text-base-content/70 break-all select-all">
            {typeof window !== "undefined" ? absolutePermalink() : permalink()}
          </code>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Show when={props.variant === "badge"}>
        <BadgeVariant />
      </Show>
      <Show when={props.variant === "inline" || !props.variant}>
        <InlineVariant />
      </Show>
      <Show when={props.variant === "full"}>
        <FullVariant />
      </Show>
    </>
  );
}

export default PermalinkDisplay;
