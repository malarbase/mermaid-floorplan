import { MetaProvider, Title } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { Suspense } from 'solid-js';
import { ConvexClientProvider } from '~/components/ConvexProvider';
import SessionGuard from '~/components/SessionGuard';
import { PageErrorBoundary } from '~/components/ui/ErrorBoundary';
import { Loading } from '~/components/ui/Loading';
import { ToastProvider } from '~/components/ui/Toast';
import WarningBanner from '~/components/WarningBanner';
import { ThemeProvider } from '~/lib/theme';
import './app.css';

/**
 * Root application component.
 *
 * Provides:
 * - MetaProvider for page titles and meta tags
 * - ConvexProvider for database access
 * - PageErrorBoundary for catching unhandled errors
 * - ToastProvider for notifications
 * - Suspense for async component loading
 */
export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Floorplan - Design Beautiful Spaces</Title>
          <PageErrorBoundary>
            <ConvexClientProvider>
              <ThemeProvider>
                <ToastProvider position="top-right" defaultDuration={4000}>
                  <SessionGuard />
                  <WarningBanner />
                  <Suspense
                    fallback={
                      <div class="min-h-screen flex items-center justify-center bg-base-200">
                        <Loading size="lg" text="Loading..." />
                      </div>
                    }
                  >
                    {props.children}
                  </Suspense>
                </ToastProvider>
              </ThemeProvider>
            </ConvexClientProvider>
          </PageErrorBoundary>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
