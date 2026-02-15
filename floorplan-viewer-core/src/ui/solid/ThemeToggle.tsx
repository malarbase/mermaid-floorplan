/**
 * ThemeToggle - Solid.js Theme Toggle Component
 *
 * A simple theme toggle button that switches between light and dark themes.
 *
 * Features:
 * - Reactive state with createSignal()
 * - Animated icon transition
 * - Keyboard accessible
 * - System preference detection
 */

import { createEffect, createSignal, onMount } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark';

export interface ThemeToggleProps {
  /** Initial theme (defaults to system preference) */
  initialTheme?: Theme;
  /** Callback when theme changes */
  onThemeChange?: (theme: Theme) => void;
  /** Whether to persist theme to localStorage */
  persist?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Utilities
// ============================================================================

const STORAGE_KEY_DEFAULT = 'floorplan-theme';

/**
 * Detect system color scheme preference.
 */
function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Load theme from localStorage.
 */
function loadTheme(key: string): Theme | null {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  }
  return null;
}

/**
 * Save theme to localStorage.
 */
function saveTheme(key: string, theme: Theme): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, theme);
  }
}

// ============================================================================
// Component
// ============================================================================

export function ThemeToggle(props: ThemeToggleProps) {
  const storageKey = props.storageKey ?? STORAGE_KEY_DEFAULT;

  // Initialize theme from props, storage, or system preference
  const getInitialTheme = (): Theme => {
    if (props.initialTheme) return props.initialTheme;
    if (props.persist) {
      const stored = loadTheme(storageKey);
      if (stored) return stored;
    }
    return getSystemTheme();
  };

  const [theme, setTheme] = createSignal<Theme>(getInitialTheme());

  // Apply theme to document
  createEffect(() => {
    const currentTheme = theme();
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    document.body.classList.toggle('light-theme', currentTheme === 'light');

    // Persist if enabled
    if (props.persist) {
      saveTheme(storageKey, currentTheme);
    }

    // Notify callback
    props.onThemeChange?.(currentTheme);
  });

  // Listen for system theme changes
  onMount(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        // Only update if not persisted (user hasn't manually set theme)
        if (!props.persist || !loadTheme(storageKey)) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  });

  // Toggle handler
  const handleToggle = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  // Keyboard handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <button
      class={`fp-theme-toggle ${props.className ?? ''}`}
      classList={{
        'fp-theme-toggle--dark': theme() === 'dark',
        'fp-theme-toggle--light': theme() === 'light',
      }}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={theme() === 'dark'}
      aria-label={`Switch to ${theme() === 'dark' ? 'light' : 'dark'} theme`}
      title={theme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      <span class="fp-theme-toggle-icon" aria-hidden="true">
        {theme() === 'dark' ? '☀️' : '🌙'}
      </span>
      {props.showLabel && (
        <span class="fp-theme-toggle-label">{theme() === 'dark' ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}

export default ThemeToggle;

// ============================================================================
// Wrapper for Vanilla Integration
// ============================================================================

export interface ThemeToggleConfig {
  /** Initial theme */
  initialTheme?: Theme;
  /** Callback when theme changes */
  onThemeChange?: (theme: Theme) => void;
  /** Persist to localStorage */
  persist?: boolean;
  /** Storage key */
  storageKey?: string;
  /** Show label */
  showLabel?: boolean;
}

export interface ThemeToggleAPI {
  /** The toggle element */
  element: HTMLElement;
  /** Get current theme */
  getTheme: () => Theme;
  /** Set theme programmatically */
  setTheme: (theme: Theme) => void;
  /** Toggle theme */
  toggle: () => void;
  /** Destroy and cleanup */
  dispose: () => void;
}

/**
 * Create a Solid-based ThemeToggle with vanilla-compatible API.
 */
export function createSolidThemeToggle(config: ThemeToggleConfig = {}): ThemeToggleAPI {
  const { render } = require('solid-js/web');

  // Create container
  const container = document.createElement('div');
  container.id = 'solid-theme-toggle-root';
  container.style.display = 'inline-block';

  // Internal state for external access
  let currentTheme: Theme = config.initialTheme ?? getSystemTheme();
  let setThemeSignal: ((theme: Theme) => void) | undefined;

  // Render component
  const dispose = render(() => {
    const [theme, setTheme] = createSignal<Theme>(currentTheme);
    setThemeSignal = setTheme;

    // Track changes
    createEffect(() => {
      currentTheme = theme();
      config.onThemeChange?.(currentTheme);
    });

    return (
      <ThemeToggle
        initialTheme={currentTheme}
        onThemeChange={(t) => {
          currentTheme = t;
          config.onThemeChange?.(t);
        }}
        persist={config.persist}
        storageKey={config.storageKey}
        showLabel={config.showLabel}
      />
    );
  }, container);

  return {
    element: container,

    getTheme: () => currentTheme,

    setTheme: (theme: Theme) => {
      currentTheme = theme;
      setThemeSignal?.(theme);
    },

    toggle: () => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      currentTheme = newTheme;
      setThemeSignal?.(newTheme);
    },

    dispose: () => {
      dispose();
      container.remove();
    },
  };
}
