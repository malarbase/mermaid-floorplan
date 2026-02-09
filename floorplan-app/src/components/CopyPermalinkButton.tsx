import { createSignal, Show } from 'solid-js';
import { copyToClipboard, generatePermalink } from '~/lib/permalink';

export interface CopyPermalinkButtonProps {
  /** Project owner's username */
  username: string;
  /** Project slug */
  projectSlug: string;
  /** Content hash of the snapshot */
  hash: string;
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'primary' | 'secondary';
  /** Show label text */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Additional CSS classes */
  class?: string;
  /** Callback when copy succeeds */
  onCopy?: () => void;
  /** Callback when copy fails */
  onError?: () => void;
}

/**
 * CopyPermalinkButton - A button that copies a snapshot permalink to the clipboard.
 *
 * This provides a consistent, reusable way to share permalinks across the app.
 *
 * @example
 * <CopyPermalinkButton
 *   username="alice"
 *   projectSlug="beach-house"
 *   hash="a1b2c3d4"
 *   size="sm"
 *   showLabel
 * />
 */
export function CopyPermalinkButton(props: CopyPermalinkButtonProps) {
  const [copied, setCopied] = createSignal(false);
  const [error, setError] = createSignal(false);

  const handleCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const absoluteUrl = generatePermalink(props.username, props.projectSlug, props.hash, true);

    const success = await copyToClipboard(absoluteUrl);

    if (success) {
      setCopied(true);
      setError(false);
      props.onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } else {
      setError(true);
      props.onError?.();
      setTimeout(() => setError(false), 2000);
    }
  };

  const sizeClass = () => {
    switch (props.size) {
      case 'xs':
        return 'btn-xs';
      case 'sm':
        return 'btn-sm';
      case 'lg':
        return 'btn-lg';
      default:
        return '';
    }
  };

  const variantClass = () => {
    switch (props.variant) {
      case 'outline':
        return 'btn-outline';
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      default:
        return 'btn-ghost';
    }
  };

  const iconSize = () => {
    switch (props.size) {
      case 'xs':
        return 'w-3 h-3';
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  return (
    <button
      type="button"
      class={`btn ${sizeClass()} ${variantClass()} gap-1 ${props.class ?? ''}`}
      onClick={handleCopy}
      title={copied() ? 'Copied!' : error() ? 'Failed to copy' : 'Copy permalink to clipboard'}
    >
      <Show when={error()}>
        <svg
          class={`${iconSize()} text-error`}
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
        <Show when={props.showLabel}>
          <span class="text-error">Failed</span>
        </Show>
      </Show>

      <Show when={copied() && !error()}>
        <svg
          class={`${iconSize()} text-success`}
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
        <Show when={props.showLabel}>
          <span class="text-success">Copied!</span>
        </Show>
      </Show>

      <Show when={!copied() && !error()}>
        {/* Link/Share icon */}
        <svg class={iconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <Show when={props.showLabel}>
          <span>{props.label ?? 'Copy Link'}</span>
        </Show>
      </Show>
    </button>
  );
}

export default CopyPermalinkButton;
