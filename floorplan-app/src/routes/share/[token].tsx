import { Title } from '@solidjs/meta';
import { A, useNavigate, useParams } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo, onMount, Show } from 'solid-js';
import { convexApi } from '~/lib/project-types';

interface ShareLinkValidation {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'project_not_found';
  projectId?: string;
  projectSlug?: string;
  projectName?: string;
  ownerUsername?: string;
  role?: 'viewer' | 'editor';
}

/**
 * Share link redirect page.
 * Route: /share/:token
 *
 * Validates the share link token and redirects to the project,
 * passing the token as a query parameter for access control.
 */
export default function ShareLinkPage() {
  const params = useParams();
  const navigate = useNavigate();

  const token = createMemo(() => params.token);

  // Validate the share link
  const validationQuery = useQuery(convexApi.sharing.validateShareLink, () => ({
    token: token(),
  }));

  const validation = createMemo(() => {
    const data = validationQuery.data() as ShareLinkValidation | null | undefined;
    return data;
  });

  const isLoading = createMemo(() => validationQuery.isLoading());

  // Auto-redirect when validation succeeds
  onMount(() => {
    // Use effect-like behavior with setTimeout to watch for validation changes
    const checkAndRedirect = () => {
      const v = validation();
      const t = token();
      if (v?.valid && v.ownerUsername && v.projectSlug && t) {
        // Store the token in sessionStorage for the project page to use
        sessionStorage.setItem('share_token', t);
        // Redirect to the project page
        navigate(`/u/${v.ownerUsername}/${v.projectSlug}?share=${t}`);
      }
    };

    // Check immediately if already loaded
    checkAndRedirect();

    // Also set up an interval to check (since we can't use createEffect in SSR context easily)
    const interval = setInterval(checkAndRedirect, 100);

    return () => clearInterval(interval);
  });

  return (
    <main class="min-h-screen bg-base-200 flex items-center justify-center">
      <Title>Share Link - Floorplan</Title>

      <div class="card bg-base-100 shadow-xl max-w-md w-full mx-4">
        <div class="card-body text-center">
          <Show
            when={!isLoading()}
            fallback={
              <>
                <span class="loading loading-spinner loading-lg mx-auto"></span>
                <p class="mt-4 text-base-content/60">Validating share link...</p>
              </>
            }
          >
            <Show
              when={validation()?.valid}
              fallback={
                <>
                  <div class="text-error mb-4">
                    <svg
                      class="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 class="card-title justify-center">Invalid Share Link</h2>
                  <p class="text-base-content/60">
                    <Show when={validation()?.reason === 'expired'}>
                      This share link has expired.
                    </Show>
                    <Show when={validation()?.reason === 'not_found'}>
                      This share link doesn't exist or has been revoked.
                    </Show>
                    <Show when={validation()?.reason === 'project_not_found'}>
                      The project associated with this link no longer exists.
                    </Show>
                    <Show when={!validation()?.reason}>This share link is not valid.</Show>
                  </p>
                  <div class="card-actions justify-center mt-4">
                    <A href="/" class="btn btn-primary">
                      Go to Home
                    </A>
                  </div>
                </>
              }
            >
              {/* Valid link - show project info while redirecting */}
              <div class="text-success mb-4">
                <svg
                  class="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 class="card-title justify-center">Access Granted</h2>
              <p class="text-base-content/60">
                Redirecting you to <span class="font-medium">{validation()?.projectName}</span>...
              </p>
              <div class="mt-4">
                <span
                  class={`badge ${
                    validation()?.role === 'editor' ? 'badge-warning' : 'badge-info'
                  }`}
                >
                  {validation()?.role === 'editor' ? 'Can edit' : 'View only'}
                </span>
              </div>
              <span class="loading loading-dots loading-md mx-auto mt-4"></span>
            </Show>
          </Show>
        </div>
      </div>
    </main>
  );
}
