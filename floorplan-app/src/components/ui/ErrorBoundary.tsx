import { type ParentProps, ErrorBoundary as SolidErrorBoundary } from 'solid-js';
import { HardNavigate } from '~/components/ui/HardNavigate';

interface ErrorBoundaryProps extends ParentProps {
  /** Fallback component or render function */
  fallback?: (err: Error, reset: () => void) => any;
  /** Called when an error is caught */
  onError?: (err: Error) => void;
}

/**
 * ErrorBoundary - catches JavaScript errors anywhere in the child component tree.
 *
 * Uses Solid's built-in ErrorBoundary with a consistent fallback UI.
 *
 * @example
 * <ErrorBoundary>
 *   <ComponentThatMightFail />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary
 *   onError={(err) => logToService(err)}
 *   fallback={(err, reset) => (
 *     <CustomErrorDisplay error={err} onReset={reset} />
 *   )}
 * >
 *   <App />
 * </ErrorBoundary>
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  const handleError = (err: Error) => {
    // Log error to console
    console.error('ErrorBoundary caught an error:', err);

    // Call optional error handler
    props.onError?.(err);
  };

  const defaultFallback = (err: Error, reset: () => void) => (
    <div class="min-h-[400px] flex items-center justify-center p-8">
      <div class="card bg-base-100 shadow-xl max-w-lg w-full">
        <div class="card-body text-center">
          {/* Error Icon */}
          <div class="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 class="text-xl font-bold">Something went wrong</h2>

          <p class="text-base-content/70 mt-2">
            An unexpected error occurred. Please try again or go back to the home page.
          </p>

          {/* Error details (collapsible) */}
          <details class="mt-4 text-left">
            <summary class="cursor-pointer text-sm text-base-content/50 hover:text-base-content/70">
              Show error details
            </summary>
            <div class="mt-2 p-3 bg-base-200 rounded-lg overflow-x-auto">
              <p class="font-mono text-xs text-error mb-2">
                {err.name}: {err.message}
              </p>
              {err.stack && (
                <pre class="font-mono text-xs text-base-content/50 whitespace-pre-wrap break-words">
                  {err.stack.split('\n').slice(1, 5).join('\n')}
                </pre>
              )}
            </div>
          </details>

          {/* Actions */}
          <div class="flex gap-3 justify-center mt-6">
            <button type="button" class="btn btn-primary" onClick={reset}>
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
            <HardNavigate href="/" class="btn btn-ghost">
              Go Home
            </HardNavigate>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SolidErrorBoundary
      fallback={(err, reset) => {
        handleError(err);
        return props.fallback ? props.fallback(err, reset) : defaultFallback(err, reset);
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

/**
 * PageErrorBoundary - error boundary for full-page content.
 */
export function PageErrorBoundary(props: ParentProps) {
  return (
    <ErrorBoundary
      fallback={(err, reset) => (
        <div class="min-h-screen flex items-center justify-center bg-base-200 p-8">
          <div class="card bg-base-100 shadow-xl max-w-lg w-full">
            <div class="card-body text-center">
              <div class="flex justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-20 w-20 text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 class="text-2xl font-bold">Oops! Something went wrong</h1>

              <p class="text-base-content/70 mt-2">
                We're sorry, but an unexpected error occurred. Our team has been notified.
              </p>

              <details class="mt-4 text-left">
                <summary class="cursor-pointer text-sm text-base-content/50 hover:text-base-content/70">
                  Technical details
                </summary>
                <div class="mt-2 p-3 bg-base-200 rounded-lg">
                  <p class="font-mono text-xs text-error">{err.message}</p>
                </div>
              </details>

              <div class="flex gap-3 justify-center mt-6">
                <button type="button" class="btn btn-primary" onClick={reset}>
                  Try Again
                </button>
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
                <HardNavigate href="/" class="btn btn-ghost">
                  Go Home
                </HardNavigate>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {props.children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
