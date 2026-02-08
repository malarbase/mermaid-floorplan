import { A, useLocation } from "@solidjs/router";
import { Show, createMemo, Component, JSX } from "solid-js";
import { useSession } from "~/lib/auth-client";
import { useAppTheme } from "~/lib/theme";
import { UserMenu } from "./UserMenu";

/**
 * Header navigation variant types
 */
export type HeaderVariant = "default" | "minimal" | "transparent";

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
  
  // Determine if a nav link is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };
  
  const getVariantClasses = () => {
    switch (props.variant) {
      case "transparent":
        return "bg-transparent";
      case "minimal":
        return "bg-base-200/50 border-b border-neutral backdrop-blur-sm";
      default:
        return "bg-base-200/80 border-b border-neutral backdrop-blur-sm";
    }
  };
  
  // Get username for profile link (use username field, not display name)
  const username = createMemo(() => user()?.username ?? user()?.name ?? "");

  // Theme toggle button (reused in both standalone and viewer controls)
  const ThemeToggleButton = () => (
    <button
      class={`btn btn-sm btn-circle shadow-sm transition-colors ${
        theme() === "light"
          ? "bg-neutral text-neutral-content hover:bg-neutral-focus"
          : "bg-base-300 text-base-content hover:bg-base-200"
      }`}
      onClick={toggleTheme}
      title={`Switch to ${theme() === "light" ? "dark" : "light"} theme`}
    >
      {theme() === "light" ? "🌙" : "☀️"}
    </button>
  );

  return (
    <header class={`relative z-50 px-3 sm:px-4 py-2 sm:py-3 ${getVariantClasses()} ${props.class ?? ""}`}>
      <div class="flex items-center gap-2 sm:gap-4 px-1">
        {/* Left side - Logo/Brand and Back button */}
        <div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Show when={props.backHref}>
            <A href={props.backHref!} class="btn btn-ghost btn-sm gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span class="hidden sm:inline">{props.backLabel ?? "Back"}</span>
            </A>
          </Show>
          
          <Show when={props.variant !== "minimal"}>
            <A href="/" class="btn btn-ghost text-lg sm:text-xl tracking-wider flex-shrink-0" style={{ "font-family": "'Bebas Neue', sans-serif" }}>
              FLOORPLAN
            </A>
          </Show>
        </div>

        {/* Center - Custom content or default nav links */}
        <div class="flex-1 min-w-0">
          <Show
            when={props.centerContent}
            fallback={
              /* Default: Navigation links for logged-in users */
              <Show when={user() && !props.backHref}>
                <nav class="hidden md:flex gap-1">
                  <A 
                    href="/dashboard" 
                    class={`nav-link ${isActive("/dashboard") ? "nav-link-active" : ""}`}
                  >
                    Dashboard
                  </A>
                  <A 
                    href={username() ? `/u/${username()}` : "#"} 
                    class={`nav-link ${isActive(`/u/${username()}`) ? "nav-link-active" : ""}`}
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

        {/* Right side - Actions + Theme toggle + User menu */}
        <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Page-specific actions */}
          <Show when={props.actions}>
            <div class="flex flex-wrap items-center gap-1 sm:gap-2">
              {props.actions}
            </div>
          </Show>

          {/* Viewer controls (mode badge + command palette) */}
          <Show when={props.showViewerControls}>
            <div class="flex items-center gap-2">
              <div class="badge badge-outline">
                {props.mode === 'editor' ? '✏️ Editor' : props.mode === 'advanced' ? '⚙️ Advanced' : '👁️ Basic'}
              </div>
              <button
                class="btn btn-ghost btn-sm"
                onClick={props.onCommandPalette}
                title="Command palette (Cmd+K)"
              >
                ⌘K
              </button>
            </div>
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
