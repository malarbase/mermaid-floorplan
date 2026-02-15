import { A } from '@solidjs/router';
import { Show } from 'solid-js';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorDisplayProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Additional details (like error stack or ID) */
  details?: string;
  /** Error severity for styling */
  severity?: ErrorSeverity;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Retry button handler */
  onRetry?: () => void;
  /** Whether to show a home link */
  showHomeLink?: boolean;
  /** Whether to show in full-page mode */
  fullPage?: boolean;
  /** Whether to show in a card */
  card?: boolean;
  /** Additional CSS classes */
  class?: string;
}

/**
 * ErrorDisplay component - displays error messages with consistent styling.
 *
 * @example
 * // Simple inline error
 * <ErrorDisplay message="Failed to load data" />
 *
 * @example
 * // Full-page error with retry
 * <ErrorDisplay
 *   fullPage
 *   title="Something went wrong"
 *   message="We couldn't load your projects"
 *   showRetry
 *   onRetry={() => refetch()}
 * />
 */
export function ErrorDisplay(props: ErrorDisplayProps) {
  const severity = () => props.severity ?? 'error';

  const iconPath = () => {
    switch (severity()) {
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'info':
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  const alertClass = () => {
    switch (severity()) {
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-error';
    }
  };

  const iconColor = () => {
    switch (severity()) {
      case 'warning':
        return 'text-warning';
      case 'info':
        return 'text-info';
      default:
        return 'text-error';
    }
  };

  const ErrorContent = () => (
    <div class={`flex flex-col items-center text-center gap-4 ${props.class ?? ''}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class={`h-16 w-16 ${iconColor()}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath()} />
      </svg>

      <Show when={props.title}>
        <h2 class="text-xl font-bold">{props.title}</h2>
      </Show>

      <p class="text-base-content/70">{props.message}</p>

      <Show when={props.details}>
        <details class="text-sm text-base-content/50 max-w-md">
          <summary class="cursor-pointer hover:text-base-content/70">Show details</summary>
          <pre class="mt-2 p-2 bg-base-200 rounded text-left overflow-x-auto text-xs">
            {props.details}
          </pre>
        </details>
      </Show>

      <div class="flex gap-3 flex-wrap justify-center">
        <Show when={props.showRetry && props.onRetry}>
          <button type="button" class="btn btn-primary" onClick={props.onRetry}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        </Show>

        <Show when={props.showHomeLink}>
          <A href="/" class="btn btn-ghost">
            Go Home
          </A>
        </Show>
      </div>
    </div>
  );

  // Full page variant
  if (props.fullPage) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-base-200 p-8">
        <div class="card bg-base-100 shadow-xl max-w-md w-full">
          <div class="card-body">
            <ErrorContent />
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  if (props.card) {
    return (
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <ErrorContent />
        </div>
      </div>
    );
  }

  // Alert variant (inline)
  return (
    <div class={`alert ${alertClass()} ${props.class ?? ''}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath()} />
      </svg>
      <div class="flex-1">
        <Show when={props.title}>
          <h3 class="font-bold">{props.title}</h3>
        </Show>
        <span>{props.message}</span>
      </div>
      <Show when={props.showRetry && props.onRetry}>
        <button type="button" class="btn btn-sm btn-ghost" onClick={props.onRetry}>
          Retry
        </button>
      </Show>
    </div>
  );
}

/**
 * NotFoundError - standard "not found" error display.
 */
export function NotFoundError(props: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div class="flex justify-center items-center min-h-[60vh] p-8">
      <div class="card bg-base-100 shadow-xl max-w-md w-full">
        <div class="card-body text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-16 mx-auto text-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          <h2 class="text-xl font-bold mt-4">{props.title ?? 'Not Found'}</h2>
          <p class="text-base-content/70">
            {props.message ??
              "The resource you're looking for doesn't exist or you don't have access."}
          </p>

          <A href={props.backHref ?? '/'} class="btn btn-primary mt-4">
            {props.backLabel ?? 'Go Home'}
          </A>
        </div>
      </div>
    </div>
  );
}

/**
 * AccessDeniedError - standard "access denied" error display.
 */
export function AccessDeniedError(props: { message?: string; showLoginLink?: boolean }) {
  return (
    <div class="flex justify-center items-center min-h-[60vh] p-8">
      <div class="card bg-base-100 shadow-xl max-w-md w-full">
        <div class="card-body text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-16 mx-auto text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>

          <h2 class="text-xl font-bold mt-4">Access Denied</h2>
          <p class="text-base-content/70">
            {props.message ?? "You don't have permission to access this resource."}
          </p>

          <div class="flex gap-3 justify-center mt-4">
            <A href="/" class="btn btn-ghost">
              Go Home
            </A>
            <Show when={props.showLoginLink}>
              <A href="/login" class="btn btn-primary">
                Log In
              </A>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;
