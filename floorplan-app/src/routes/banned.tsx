import { A, useNavigate } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createEffect } from 'solid-js';
import { api } from '../../convex/_generated/api';

export default function BannedPage() {
  const navigate = useNavigate();
  const loginHref = import.meta.env.DEV ? '/dev-login' : '/login';

  const banStatus = useQuery(api.users.getBanStatus, {});

  // Redirect away from /banned when ban is lifted (real-time via Convex subscription)
  createEffect(() => {
    const status = banStatus.data();
    if (status && !status.isBanned) {
      navigate('/dashboard', { replace: true });
    }
  });

  return (
    <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div class="card bg-base-100 shadow-xl max-w-md w-full">
        <div class="card-body text-center">
          <div class="flex justify-center mb-4">
            <svg
              class="w-16 h-16 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>

          <h1 class="text-2xl font-bold text-error">Account Suspended</h1>

          <p class="text-base-content/70 mt-2">
            Your account has been suspended by an administrator. If you believe this is a mistake,
            please contact support.
          </p>

          <div class="divider" />

          <div class="flex flex-col gap-2">
            <A href={loginHref} class="btn btn-outline btn-sm">
              Return to Login
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
