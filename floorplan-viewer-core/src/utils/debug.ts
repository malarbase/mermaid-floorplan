/**
 * Debug logging utilities that only log in development mode.
 *
 * Usage:
 *   import { debug } from './utils/debug.js';
 *   debug.log('[MyComponent]', 'message', { data });
 *   debug.warn('[MyComponent]', 'warning');
 *   debug.error('[MyComponent]', 'error');
 *
 * In production builds, these become no-ops with zero overhead
 * because the bundler will tree-shake the empty functions.
 */

// Vite injects import.meta.env at build time
// This safely checks for it without TypeScript errors
const getIsDev = (): boolean => {
  try {
    // Check Vite's import.meta.env (injected at build time)
    const meta = import.meta as { env?: { DEV?: boolean; MODE?: string } };
    if (meta.env?.DEV !== undefined) return meta.env.DEV;
    if (meta.env?.MODE === 'development') return true;

    // Fallback for Node.js environments
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      return true;
    }
  } catch {
    // If import.meta is not available, assume production
  }
  return false;
};

const isDev = getIsDev();

// No-op functions for production
const noop = () => {};

/**
 * Debug logger - logs only in development mode
 */
export const debug = isDev
  ? {
      log: (...args: unknown[]) => console.log(...args),
      warn: (...args: unknown[]) => console.warn(...args),
      error: (...args: unknown[]) => console.error(...args),
      group: (label: string) => console.group(label),
      groupEnd: () => console.groupEnd(),
      table: (data: unknown) => console.table(data),
    }
  : {
      log: noop,
      warn: noop,
      error: noop,
      group: noop,
      groupEnd: noop,
      table: noop,
    };

/**
 * Create a namespaced debug logger
 *
 * Usage:
 *   const log = createDebugLogger('[InteractiveEditorCore]');
 *   log('Selection changed', { count: 5 });
 */
export function createDebugLogger(namespace: string) {
  if (!isDev) {
    return Object.assign(noop, {
      warn: noop,
      error: noop,
    });
  }

  const logger = (...args: unknown[]) => console.log(namespace, ...args);
  logger.warn = (...args: unknown[]) => console.warn(namespace, ...args);
  logger.error = (...args: unknown[]) => console.error(namespace, ...args);

  return logger;
}

export default debug;
