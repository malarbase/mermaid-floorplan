import { createSignal, Show } from 'solid-js';

export interface CopyButtonProps {
  /** The text to copy to the clipboard */
  textToCopy: string | (() => string);
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'primary' | 'secondary';
  /** Label shown in the default state */
  label?: string;
  /** Always show label text (not just on hover) */
  showLabel?: boolean;
  /** Extra CSS classes */
  class?: string;
  /** Callback when copy succeeds */
  onCopy?: () => void;
  /** Callback when copy fails */
  onError?: () => void;
}

/**
 * Generic copy-to-clipboard button with success/error state feedback.
 *
 * Handles the clipboard API call, a 2-second "Copied!" confirmation,
 * and an error state. Works as a standalone button or as part of a larger
 * UI (e.g. next to a permalink badge).
 *
 * @example
 * ```tsx
 * <CopyButton textToCopy={url()} size="sm" showLabel label="Copy Link" />
 * ```
 */
export function CopyButton(props: CopyButtonProps) {
  const [copied, setCopied] = createSignal(false);
  const [error, setError] = createSignal(false);

  const handleCopy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const text = typeof props.textToCopy === 'function' ? props.textToCopy() : props.textToCopy;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(false);
      props.onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: textarea approach
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setError(false);
        props.onCopy?.();
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError(true);
        props.onError?.();
        setTimeout(() => setError(false), 2000);
      }
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
      title={
        copied() ? 'Copied!' : error() ? 'Failed to copy' : (props.label ?? 'Copy to clipboard')
      }
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
        <svg class={iconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <Show when={props.showLabel}>
          <span>{props.label ?? 'Copy'}</span>
        </Show>
      </Show>
    </button>
  );
}

export default CopyButton;
