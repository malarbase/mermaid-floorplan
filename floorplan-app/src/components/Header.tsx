import { A, useLocation } from "@solidjs/router";
import { Show, createMemo, Component, JSX } from "solid-js";
import { useSession } from "~/lib/auth-client";
import { LogoutButton } from "./LogoutButton";

/**
 * Header navigation variant types
 */
export type HeaderVariant = "default" | "minimal" | "transparent";

/**
 * Props for the Header component
 */
export interface HeaderProps {
  /**
   * Header style variant
   * - "default": Standard header with background
   * - "minimal": No branding, just navigation
   * - "transparent": Transparent background (for hero sections)
   */
  variant?: HeaderVariant;
  
  /**
   * Additional CSS classes
   */
  class?: string;
  
  /**
   * Show a back button with custom href
   */
  backHref?: string;
  
  /**
   * Custom back button label
   */
  backLabel?: string;
  
  /**
   * Right-side action slot (replaces default user menu)
   */
  actions?: JSX.Element;
  
  /**
   * Hide user menu entirely
   */
  hideUserMenu?: boolean;
}

/**
 * Consistent header/navigation component for the app.
 * 
 * Features:
 * - Auth-aware navigation (shows login/dashboard based on session)
 * - User avatar dropdown with settings and logout
 * - Active link highlighting
 * - Responsive design
 * - Multiple variants for different page contexts
 * 
 * Usage:
 * ```tsx
 * <Header />
 * <Header variant="transparent" />
 * <Header backHref="/dashboard" backLabel="Dashboard" />
 * ```
 */
export const Header: Component<HeaderProps> = (props) => {
  const sessionSignal = useSession();
  const location = useLocation();
  
  const session = createMemo(() => sessionSignal());
  const user = createMemo(() => session()?.data?.user);
  const isLoading = createMemo(() => session()?.isPending ?? true);
  
  // Determine if a nav link is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };
  
  // Get variant-specific classes
  const getVariantClasses = () => {
    switch (props.variant) {
      case "transparent":
        return "bg-transparent";
      case "minimal":
        return "bg-base-100 border-b border-base-200";
      default:
        return "bg-base-100 shadow-sm";
    }
  };
  
  // Get username for profile link (use username field, not display name)
  const username = createMemo(() => user()?.username ?? user()?.name ?? "");

  return (
    <header class={`navbar ${getVariantClasses()} ${props.class ?? ""}`}>
      {/* Left side - Logo/Brand and Back button */}
      <div class="flex-1 gap-2">
        <Show when={props.backHref}>
          <A href={props.backHref!} class="btn btn-ghost btn-sm gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="hidden sm:inline">{props.backLabel ?? "Back"}</span>
          </A>
        </Show>
        
        <Show when={props.variant !== "minimal"}>
          <A href="/" class="btn btn-ghost text-xl font-bold">
            Floorplan
          </A>
        </Show>
        
        {/* Main navigation links */}
        <Show when={user() && !props.backHref}>
          <nav class="hidden md:flex ml-4 gap-1">
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
      </div>

      {/* Right side - Auth actions */}
      <div class="flex-none gap-2">
        <Show when={props.actions} fallback={
          <Show when={!props.hideUserMenu}>
            <Show
              when={!isLoading()}
              fallback={
                <div class="w-10 h-10 rounded-full bg-base-200 animate-pulse" />
              }
            >
              <Show
                when={user()}
                fallback={
                  <div class="flex gap-2">
                    <A href="/login" class="btn btn-ghost btn-sm">
                      Log in
                    </A>
                    <A href="/login" class="btn btn-primary btn-sm">
                      Sign up
                    </A>
                  </div>
                }
              >
                {/* User dropdown */}
                <div class="dropdown dropdown-end">
                  <div tabIndex={0} role="button" class="btn btn-ghost btn-circle avatar">
                    <div class="w-10 rounded-full">
                      <Show
                        when={user()?.image}
                        fallback={
                          <div class="bg-neutral text-neutral-content w-full h-full flex items-center justify-center text-lg font-semibold">
                            {user()?.name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                        }
                      >
                        <img 
                          alt={`${user()?.name}'s avatar`} 
                          src={user()?.image ?? ""} 
                          class="w-full h-full object-cover"
                        />
                      </Show>
                    </div>
                  </div>
                  <ul tabIndex={0} class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
                    <li class="menu-title px-2 py-1">
                      <span class="text-base-content font-medium">{user()?.name}</span>
                      <Show when={user()?.email}>
                        <span class="text-base-content/60 text-xs font-normal">{user()?.email}</span>
                      </Show>
                    </li>
                    <div class="divider my-1" />
                    <li>
                      <A href="/dashboard" class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </A>
                    </li>
                    <Show when={username()}>
                      <li>
                        <A href={`/u/${username()}`} class="flex items-center gap-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </A>
                      </li>
                    </Show>
                    <li>
                      <A href="/new" class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Project
                      </A>
                    </li>
                    <div class="divider my-1" />
                    <li>
                      <A href="/settings" class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </A>
                    </li>
                    <li>
                      <LogoutButton class="flex items-center gap-2 text-error" />
                    </li>
                  </ul>
                </div>
                
                {/* Mobile menu button (for logged in users) */}
                <div class="md:hidden dropdown dropdown-end">
                  <div tabIndex={0} role="button" class="btn btn-ghost btn-circle">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <ul tabIndex={0} class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
                    <li><A href="/dashboard">Dashboard</A></li>
                    <li><A href={`/u/${username()}`}>Profile</A></li>
                    <li><A href="/new">New Project</A></li>
                    <li><A href="/settings">Settings</A></li>
                  </ul>
                </div>
              </Show>
            </Show>
          </Show>
        }>
          {props.actions}
        </Show>
      </div>
    </header>
  );
};

export default Header;
