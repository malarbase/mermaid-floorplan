import { Title } from '@solidjs/meta';
import { useNavigate } from '@solidjs/router';
import { createMemo, Show } from 'solid-js';
import { Header } from '~/components/Header';
import { ProjectForm } from '~/components/ProjectForm';
import { useAuthRedirect } from '~/hooks/useAuthRedirect';

/**
 * Create new project page (protected route).
 * Route: /new
 *
 * Uses the ProjectForm component for creating new floorplan projects.
 * After successful creation, navigates to the project view page.
 */
export default function NewProject() {
  const { user, isLoading } = useAuthRedirect('/login?redirect=/new');
  const navigate = useNavigate();

  // Get username for URL (use username field, not display name)
  const username = createMemo(() => user()?.username ?? user()?.name ?? 'you');

  // Handle successful project creation
  const handleSuccess = (_projectId: string, slug?: string) => {
    // If we have the slug, navigate directly to the project
    if (slug && username()) {
      navigate(`/u/${username()}/${slug}`);
    } else {
      // Fallback to dashboard
      navigate('/dashboard');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <main class="min-h-screen bg-base-200">
      <Title>New Project - Floorplan</Title>

      {/* Header with back button */}
      <Header backHref="/dashboard" backLabel="Dashboard" />

      <div class="max-w-2xl mx-auto px-4 py-6 sm:p-8">
        {/* Page Title */}
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold">Create New Project</h1>
          <p class="text-sm sm:text-base text-base-content/70 mt-1 sm:mt-2">
            Start a new floorplan design
          </p>
        </div>

        {/* Form */}
        <Show
          when={!isLoading()}
          fallback={
            <div class="flex justify-center py-12">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          }
        >
          <ProjectForm
            mode="create"
            username={username()}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Show>
      </div>
    </main>
  );
}
