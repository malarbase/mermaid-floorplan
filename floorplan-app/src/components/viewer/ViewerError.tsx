import { type Component, ErrorBoundary, type JSX } from 'solid-js';

interface ViewerErrorProps {
  error?: Error | string | { message?: string };
  reset?: () => void;
}

export const ViewerErrorState: Component<ViewerErrorProps> = (props) => {
  const message = () => {
    const e = props.error;
    if (!e) return 'An unexpected error occurred in the viewer.';
    if (typeof e === 'string') return e;
    return e.message ?? 'An unexpected error occurred in the viewer.';
  };

  return (
    <div class="absolute inset-0 flex items-center justify-center bg-base-300 z-50">
      <div class="card bg-error text-error-content max-w-md shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Viewer Error</h2>
          <p>{message()}</p>
          <div class="card-actions justify-end">
            <button
              class="btn btn-sm btn-ghost"
              onClick={() => props.reset?.() || window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ViewerErrorBoundary: Component<{ children: JSX.Element }> = (props) => {
  return (
    <ErrorBoundary fallback={(err, reset) => <ViewerErrorState error={err} reset={reset} />}>
      {props.children}
    </ErrorBoundary>
  );
};
