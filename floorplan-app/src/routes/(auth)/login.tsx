import { Title } from '@solidjs/meta';
import { A, useNavigate } from '@solidjs/router';
import { createEffect, createMemo } from 'solid-js';
import { Header } from '~/components/Header';
import { authClient, useSession } from '~/lib/auth-client';

/**
 * Login page with Google OAuth sign-in.
 * Features a polished, centered card design with visual appeal.
 */
export default function Login() {
  const sessionSignal = useSession();
  const navigate = useNavigate();

  // Derive session state from the signal
  const session = createMemo(() => sessionSignal());
  const isLoggedIn = createMemo(() => session()?.data != null);
  const isPending = createMemo(() => session()?.isPending ?? false);

  // Redirect to dashboard if already logged in
  createEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard', { replace: true });
    }
  });

  const handleGoogleSignIn = () => {
    authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    });
  };

  return (
    <main class="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200">
      <Title>Login - Floorplan App</Title>

      {/* Header */}
      <Header variant="minimal" hideUserMenu />

      {/* Decorative background pattern */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        {/* Grid pattern overlay */}
        <div
          class="absolute inset-0 opacity-[0.02]"
          style={{
            'background-image': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main content */}
      <div class="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-md animate-fade-in">
          {/* Login card */}
          <div class="card bg-base-100 shadow-2xl border border-base-300/50">
            <div class="card-body p-8 sm:p-10">
              {/* Logo/Brand section */}
              <div class="flex flex-col items-center mb-6">
                {/* Floorplan icon */}
                <div class="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
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

                <h1 class="text-2xl sm:text-3xl font-bold text-base-content">
                  Welcome to Floorplan
                </h1>
                <p class="text-base-content/60 mt-2 text-center text-sm sm:text-base">
                  Create, save, and share your floorplan designs
                </p>
              </div>

              {/* Sign in button */}
              <div class="mt-4">
                <button
                  class="btn btn-primary w-full h-12 text-base gap-3 shadow-md hover:shadow-lg transition-shadow"
                  onClick={handleGoogleSignIn}
                  disabled={isPending()}
                >
                  {isPending() ? (
                    <span class="loading loading-spinner loading-sm" />
                  ) : (
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div class="divider text-xs text-base-content/40 my-6">or</div>

              {/* Guest option */}
              <A
                href="/"
                class="btn btn-ghost btn-sm w-full text-base-content/70 hover:text-base-content"
              >
                Continue as guest (view only)
              </A>
            </div>
          </div>

          {/* Footer note */}
          <p class="text-center text-xs text-base-content/40 mt-6">
            By signing in, you agree to our{' '}
            <A href="/terms" class="link link-hover">
              Terms of Service
            </A>{' '}
            and{' '}
            <A href="/privacy" class="link link-hover">
              Privacy Policy
            </A>
          </p>
        </div>
      </div>
    </main>
  );
}
