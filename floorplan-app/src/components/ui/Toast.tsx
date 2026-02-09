import { createContext, createSignal, For, type ParentProps, Show, useContext } from 'solid-js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: () => Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue>();

/**
 * Hook to access toast functions.
 *
 * @example
 * const toast = useToast();
 * toast.success("Project saved!");
 * toast.error("Failed to save", "Error");
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps extends ParentProps {
  /** Position of toast container */
  position?: ToastPosition;
  /** Default duration in ms */
  defaultDuration?: number;
}

/**
 * ToastProvider - provides toast notification functionality to the app.
 *
 * @example
 * // In app.tsx
 * <ToastProvider position="top-right" defaultDuration={5000}>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider(props: ToastProviderProps) {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const position = () => props.position ?? 'top-right';
  const defaultDuration = () => props.defaultDuration ?? 5000;

  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const addToast = (toast: Omit<Toast, 'id'>): string => {
    const id = generateId();
    const duration = toast.duration ?? defaultDuration();

    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message: string, title?: string) =>
    addToast({ type: 'success', message, title });

  const error = (message: string, title?: string) => addToast({ type: 'error', message, title });

  const warning = (message: string, title?: string) =>
    addToast({ type: 'warning', message, title });

  const info = (message: string, title?: string) => addToast({ type: 'info', message, title });

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  };

  // Position classes
  const positionClasses = () => {
    switch (position()) {
      case 'top-left':
        return 'toast-start toast-top';
      case 'top-center':
        return 'toast-center toast-top';
      case 'top-right':
        return 'toast-end toast-top';
      case 'bottom-left':
        return 'toast-start toast-bottom';
      case 'bottom-center':
        return 'toast-center toast-bottom';
      default:
        return 'toast-end toast-bottom';
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {props.children}

      {/* Toast Container */}
      <div class={`toast ${positionClasses()} z-50`}>
        <For each={toasts()}>
          {(toast) => <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />}
        </For>
      </div>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem(props: ToastItemProps) {
  const { toast, onDismiss } = props;
  const dismissible = () => toast.dismissible !== false;

  const alertClass = () => {
    switch (toast.type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      default:
        return 'alert-info';
    }
  };

  const iconPath = () => {
    switch (toast.type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'error':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  return (
    <div class={`alert ${alertClass()} shadow-lg min-w-[280px] max-w-sm animate-slide-in-right`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath()} />
      </svg>
      <div class="flex-1 min-w-0">
        <Show when={toast.title}>
          <h4 class="font-semibold text-sm">{toast.title}</h4>
        </Show>
        <p class="text-sm truncate">{toast.message}</p>
      </div>
      <Show when={dismissible()}>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </Show>
    </div>
  );
}

/**
 * Standalone toast function for use outside React components.
 * Note: This requires the ToastProvider to be mounted.
 */
let globalToastHandler: ToastContextValue | null = null;

export function setGlobalToastHandler(handler: ToastContextValue) {
  globalToastHandler = handler;
}

export function toast(type: ToastType, message: string, title?: string): string | null {
  if (!globalToastHandler) {
    console.warn('Toast handler not initialized. Make sure ToastProvider is mounted.');
    return null;
  }
  return globalToastHandler.addToast({ type, message, title });
}

export default ToastProvider;
