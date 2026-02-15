/**
 * Global theme context for the application.
 *
 * Provides a single source of truth for theme state, accessible from any component
 * via useAppTheme(). Theme preference is persisted to localStorage.
 *
 * Usage:
 *   // In app.tsx root layout:
 *   <ThemeProvider>{props.children}</ThemeProvider>
 *
 *   // In any component:
 *   const { theme, toggleTheme, setTheme } = useAppTheme();
 */

import { createContext, type ParentProps, useContext } from 'solid-js';
import { useTheme } from '~/hooks/useProjectData';

type ThemeContextValue = ReturnType<typeof useTheme>;

const ThemeContext = createContext<ThemeContextValue>();

/**
 * Provides global theme state to the component tree.
 * Must be placed in the root layout (app.tsx).
 */
export function ThemeProvider(props: ParentProps) {
  const themeValue = useTheme('dark');
  return <ThemeContext.Provider value={themeValue}>{props.children}</ThemeContext.Provider>;
}

/**
 * Access the global theme state from any component.
 *
 * @returns { theme, setTheme, toggleTheme }
 * @throws if used outside of ThemeProvider
 */
export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return ctx;
}
