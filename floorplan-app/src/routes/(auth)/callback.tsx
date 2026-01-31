import { Title } from "@solidjs/meta";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createEffect, onMount } from "solid-js";
import { useSession } from "~/lib/auth-client";

/**
 * OAuth callback page.
 * 
 * This page is shown briefly while the OAuth flow completes.
 * Better Auth handles the actual callback at /api/auth/callback/:provider,
 * this page handles the redirect after authentication.
 */
export default function Callback() {
  const sessionSignal = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  onMount(() => {
    // Check for errors in the callback
    const error = searchParams.error;
    if (error) {
      const errorStr = Array.isArray(error) ? error[0] : error;
      console.error("OAuth error:", errorStr);
      navigate("/login?error=" + encodeURIComponent(errorStr), { replace: true });
      return;
    }
  });

  createEffect(() => {
    const session = sessionSignal();
    
    // Once we have session data, redirect to dashboard
    if (session?.data) {
      const redirectParam = searchParams.redirect;
      const redirectTo = Array.isArray(redirectParam) ? redirectParam[0] : (redirectParam ?? "/dashboard");
      navigate(redirectTo, { replace: true });
    }
    
    // If not pending and no session, something went wrong
    if (!session?.isPending && !session?.data) {
      navigate("/login?error=auth_failed", { replace: true });
    }
  });

  return (
    <main class="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 via-base-100 to-base-200">
      <Title>Completing sign in... - Floorplan App</Title>
      
      {/* Decorative background */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>
      
      {/* Loading content */}
      <div class="relative text-center animate-fade-in">
        <div class="card bg-base-100 shadow-xl p-8 sm:p-12">
          {/* Animated logo */}
          <div class="flex justify-center mb-6">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg animate-pulse">
              <svg 
                class="w-9 h-9 text-primary-content" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </div>
          </div>
          
          {/* Loading spinner */}
          <div class="flex justify-center mb-4">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
          
          <h2 class="text-lg font-semibold text-base-content mb-2">
            Completing sign in
          </h2>
          <p class="text-sm text-base-content/60">
            Please wait while we set up your account...
          </p>
        </div>
      </div>
    </main>
  );
}
