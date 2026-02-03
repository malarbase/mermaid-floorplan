import { Component, ErrorBoundary, JSX } from "solid-js";

interface ViewerErrorProps {
  error?: any;
  reset?: () => void;
}

export const ViewerErrorState: Component<ViewerErrorProps> = (props) => {
  return (
    <div class="absolute inset-0 flex items-center justify-center bg-base-300 z-50">
      <div class="card bg-error text-error-content max-w-md shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Viewer Error</h2>
          <p>{props.error?.message || "An unexpected error occurred in the viewer."}</p>
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
    <ErrorBoundary
      fallback={(err, reset) => <ViewerErrorState error={err} reset={reset} />}
    >
      {props.children}
    </ErrorBoundary>
  );
};
