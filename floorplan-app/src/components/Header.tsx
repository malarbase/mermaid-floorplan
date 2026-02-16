import { A, useLocation } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { type Component, createMemo, type JSX, Show } from 'solid-js';
import { useSession } from '~/lib/auth-client';
import { useAppTheme } from '~/lib/theme';
import { api } from '../../convex/_generated/api';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

/**
 * Header navigation variant types
 */
export type HeaderVariant = 'default' | 'minimal' | 'transparent';

export interface HeaderProps {
  variant?: HeaderVariant;
  class?: string;
  backHref?: string;
  backLabel?: string;
  /** Custom actions rendered before the theme toggle + user menu */
  actions?: JSX.Element;
  /** Custom center content (replaces default nav links). Used for project breadcrumbs/title. */
  centerContent?: JSX.Element;
  hideUserMenu?: boolean;
  showViewerControls?: boolean;
  mode?: 'basic' | 'advanced' | 'editor';
  onCommandPalette?: () => void;
}

/**
 * Unified header component for the entire app.
 *
 * Provides a consistent shell across all pages:
 * - Left: Logo (+ optional back button)
 * - Center: Nav links (default) or custom content (project breadcrumbs, etc.)
 * - Right: Custom actions + theme toggle + user menu
 *
 * Usage:
 * ```tsx
 * <Header />                                    // Default with nav links
 * <Header variant="transparent" />              // Landing page
 * <Header centerContent={<Breadcrumbs />} />    // Project pages
 * <Header backHref="/dashboard" />              // Sub-pages
 * ```
 */
export const Header: Component<HeaderProps> = (props) => {
  const { theme, toggleTheme } = useAppTheme();
  const sessionSignal = useSession();
  const location = useLocation();

  const session = createMemo(() => sessionSignal());
  const user = createMemo(() => session()?.data?.user);

  // Query current user from Convex for authoritative username
  const currentUserQuery = useQuery(api.users.getCurrentUser, {});

  // Determine if a nav link is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const getVariantClasses = () => {
    switch (props.variant) {
      case 'transparent':
        return 'bg-transparent';
      case 'minimal':
        return 'bg-base-200/50 border-b border-neutral backdrop-blur-sm';
      default:
        return 'bg-base-200/80 border-b border-neutral backdrop-blur-sm';
    }
  };

  // Get username for profile link - use Convex data as source of truth, fallback to session
  const username = createMemo(() => {
    const convexUser = currentUserQuery.data() as { username?: string } | undefined;
    return convexUser?.username ?? user()?.username ?? user()?.name ?? '';
  });

  // Theme toggle — DaisyUI swap component with rotate animation
  const ThemeToggleButton = () => (
    <label class="btn btn-sm btn-circle btn-ghost swap swap-rotate">
      <input
        type="checkbox"
        checked={theme() === 'dark'}
        onChange={toggleTheme}
        aria-label={`Switch to ${theme() === 'light' ? 'dark' : 'light'} theme`}
      />
      {/* Sun — visible when swap is ON (dark mode active) */}
      <svg
        aria-hidden="true"
        class="swap-on w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      {/* Moon — visible when swap is OFF (light mode active) */}
      <svg
        aria-hidden="true"
        class="swap-off w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </label>
  );

  return (
    <header
      class={`relative z-50 px-3 sm:px-4 py-2 sm:py-3 ${getVariantClasses()} ${props.class ?? ''}`}
    >
      <div class="header-grid px-1">
        {/* Logo / Back button */}
        <div class="header-logo flex items-center gap-2 sm:gap-4">
          <Show when={props.backHref}>
            <A href={props.backHref!} class="btn btn-ghost btn-sm gap-2">
              <svg
                aria-hidden="true"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span class="hidden sm:inline">{props.backLabel ?? 'Back'}</span>
            </A>
          </Show>

          <Show when={props.variant !== 'minimal'}>
            <A
              href={user() ? '/dashboard' : '/'}
              class="btn btn-ghost text-lg sm:text-xl tracking-wider flex-shrink-0"
              style={{ 'font-family': "'Bebas Neue', sans-serif" }}
            >
              FLOORPLAN
            </A>
          </Show>
        </div>

        {/* Center - Custom content or default nav links */}
        <div class="header-center">
          <Show
            when={props.centerContent}
            fallback={
              /* Default: Navigation links for logged-in users */
              <Show when={user() && !props.backHref}>
                <nav class="hidden md:flex gap-1">
                  <A
                    href="/dashboard"
                    class={`nav-link ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
                  >
                    Dashboard
                  </A>
                  <A
                    href={username() ? `/u/${username()}` : '#'}
                    class={`nav-link ${isActive(`/u/${username()}`) ? 'nav-link-active' : ''}`}
                  >
                    My Profile
                  </A>
                </nav>
              </Show>
            }
          >
            {props.centerContent}
          </Show>
        </div>

        {/* Page-specific actions - row 2 below lg, inline on lg+ */}
        <Show when={props.actions}>
          <div class="header-actions flex flex-wrap items-center gap-1 sm:gap-2">
            {props.actions}
          </div>
        </Show>

        {/* Controls - Theme toggle + User menu (always top-right) */}
        <div class="header-controls flex items-center gap-1 sm:gap-2">
          {/* Viewer controls (mode badge + command palette) */}
          <Show when={props.showViewerControls}>
            <div class="flex items-center gap-2">
              <div class="badge badge-outline">
                {props.mode === 'editor'
                  ? '✏️ Editor'
                  : props.mode === 'advanced'
                    ? '⚙️ Advanced'
                    : '👁️ Basic'}
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                onClick={props.onCommandPalette}
                title="Command palette (Cmd+K)"
              >
                ⌘K
              </button>
            </div>
          </Show>

          {/* Notification bell (authenticated users only) */}
          <Show when={user()}>
            <NotificationBell />
          </Show>

          {/* Theme toggle (always visible) */}
          <ThemeToggleButton />

          {/* User menu (unless hidden) */}
          <Show when={!props.hideUserMenu}>
            <UserMenu size="sm" />
          </Show>
        </div>
      </div>
    </header>
  );
};

export default Header;
