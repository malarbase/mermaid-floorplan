import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { HttpStatusCode } from '@solidjs/start';
import { Header } from '~/components/Header';

/**
 * 404 Not Found page.
 */
export default function NotFound() {
  return (
    <main class="min-h-screen bg-base-200">
      <Title>Page Not Found - Floorplan</Title>
      <HttpStatusCode code={404} />

      {/* Header */}
      <Header />

      {/* Content */}
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <div class="card bg-base-100 shadow-xl max-w-md w-full">
          <div class="card-body text-center">
            <div class="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-16 w-16 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 class="text-4xl font-bold mb-2">404</h1>
            <h2 class="text-xl font-semibold mb-4">Page Not Found</h2>

            <p class="text-base-content/70 mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>

            <div class="flex gap-3 justify-center">
              <A href="/" class="btn btn-primary">
                Go Home
              </A>
              <A href="/dashboard" class="btn btn-ghost">
                Dashboard
              </A>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
