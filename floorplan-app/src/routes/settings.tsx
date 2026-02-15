import { Title } from '@solidjs/meta';
import { useMutation, useQuery } from 'convex-solidjs';
import { createMemo, createSignal, Show } from 'solid-js';
import { Header } from '~/components/Header';
import { LogoutButton } from '~/components/LogoutButton';
import { SessionsSection } from '~/components/SessionsSection';
import { UsernameChangeModal, useUsernameChangeModal } from '~/components/UsernameChangeModal';
import { useAuthRedirect } from '~/hooks/useAuthRedirect';
import { api } from '../../convex/_generated/api';

/**
 * User settings page - allows users to manage their account.
 * Route: /settings
 */
export default function Settings() {
  const { user, isLoading } = useAuthRedirect();
  const usernameChangeModal = useUsernameChangeModal();

  // Get user profile from Convex
  const userProfileQuery = useQuery(api.users.getCurrentUser, () => ({}));

  const userProfile = createMemo(() => {
    return userProfileQuery.data() as
      | {
          username: string;
          displayName?: string;
          avatarUrl?: string;
          usernameSetAt?: number;
        }
      | null
      | undefined;
  });

  const isTempUsername = createMemo(() => {
    const profile = userProfile();
    if (!profile) return false;
    return profile.username.startsWith('u_') && !profile.usernameSetAt;
  });

  // Display name editing state
  const [isEditingName, setIsEditingName] = createSignal(false);
  const [editedName, setEditedName] = createSignal('');
  const [isSavingName, setIsSavingName] = createSignal(false);
  const updateProfileMutation = useMutation(api.users.updateProfile);

  const startEditingName = () => {
    setEditedName(userProfile()?.displayName ?? '');
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const saveDisplayName = async () => {
    const newName = editedName().trim();
    if (!newName || newName === userProfile()?.displayName) {
      cancelEditingName();
      return;
    }

    setIsSavingName(true);
    try {
      await updateProfileMutation.mutate({ displayName: newName });
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update display name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDisplayName();
    } else if (e.key === 'Escape') {
      cancelEditingName();
    }
  };

  return (
    <main class="min-h-screen bg-base-200">
      <Title>Settings - Floorplan</Title>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <div class="px-4 py-6 sm:p-8">
        <div class="max-w-2xl mx-auto">
          {/* Page Header */}
          <div class="mb-6 sm:mb-8">
            <h1 class="text-2xl sm:text-3xl font-bold">Settings</h1>
            <p class="text-sm sm:text-base text-base-content/70 mt-1">
              Manage your account settings
            </p>
          </div>

          <Show
            when={!isLoading() && userProfile()}
            fallback={
              <div class="flex justify-center py-12">
                <span class="loading loading-spinner loading-lg"></span>
              </div>
            }
          >
            {/* Profile Section */}
            <div class="card bg-base-100 shadow-xl mb-6">
              <div class="card-body">
                <h2 class="card-title text-lg mb-4">Profile</h2>

                {/* Avatar and Name */}
                <div class="flex items-center gap-4 mb-6">
                  <Show
                    when={userProfile()?.avatarUrl}
                    fallback={
                      <div class="avatar placeholder">
                        <div class="bg-neutral text-neutral-content w-16 rounded-full flex items-center justify-center">
                          <span class="text-2xl">
                            {userProfile()?.displayName?.charAt(0).toUpperCase() ?? '?'}
                          </span>
                        </div>
                      </div>
                    }
                  >
                    <div class="avatar">
                      <div class="w-16 rounded-full">
                        <img alt="User avatar" src={userProfile()?.avatarUrl ?? ''} />
                      </div>
                    </div>
                  </Show>
                  <div class="flex-1 min-w-0">
                    {/* Click-to-edit display name */}
                    <Show
                      when={isEditingName()}
                      fallback={
                        <button
                          type="button"
                          class="group flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors text-left"
                          onClick={startEditingName}
                          title="Click to edit display name"
                        >
                          <span class="truncate">{userProfile()?.displayName ?? 'Unknown'}</span>
                          <svg
                            class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-base-content/50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      }
                    >
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          class="input input-bordered input-sm w-full max-w-xs"
                          value={editedName()}
                          onInput={(e) => setEditedName(e.currentTarget.value)}
                          onKeyDown={handleNameKeyDown}
                          onBlur={() => {
                            // Small delay to allow button clicks to register
                            setTimeout(() => {
                              if (isEditingName()) saveDisplayName();
                            }, 150);
                          }}
                          disabled={isSavingName()}
                          autofocus
                          placeholder="Display name"
                          maxLength={50}
                        />
                        <Show when={isSavingName()}>
                          <span class="loading loading-spinner loading-xs"></span>
                        </Show>
                      </div>
                      <p class="text-xs text-base-content/50 mt-1">
                        Press Enter to save, Escape to cancel
                      </p>
                    </Show>
                    <div class="text-base-content/70 text-sm mt-0.5">{user()?.email}</div>
                  </div>
                </div>

                {/* Username */}
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Username</span>
                  </label>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div class="flex-1">
                      <div class="input input-bordered flex items-center gap-2 bg-base-200 text-sm sm:text-base">
                        <span class="text-base-content/50">@</span>
                        <span class={`truncate ${isTempUsername() ? 'text-warning' : ''}`}>
                          {userProfile()?.username}
                        </span>
                        <Show when={isTempUsername()}>
                          <span class="badge badge-warning badge-xs sm:badge-sm">Temp</span>
                        </Show>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn btn-outline w-full sm:w-auto"
                      onClick={() => usernameChangeModal.open()}
                    >
                      Change
                    </button>
                  </div>
                  <label class="label">
                    <span class="label-text-alt text-base-content/50">
                      Your profile URL: floorplan.app/u/{userProfile()?.username}
                    </span>
                  </label>
                </div>

                {/* Temporary username notice */}
                <Show when={isTempUsername()}>
                  <div class="alert alert-warning mt-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="stroke-current shrink-0 h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <h3 class="font-bold">Set your username</h3>
                      <p class="text-sm">
                        You're currently using a temporary username. Choose a permanent one to
                        personalize your profile URL.
                      </p>
                    </div>
                    <button
                      type="button"
                      class="btn btn-sm"
                      onClick={() => usernameChangeModal.open()}
                    >
                      Choose Username
                    </button>
                  </div>
                </Show>
              </div>
            </div>

            {/* Sessions Section */}
            <SessionsSection />

            {/* Account Section */}
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-lg mb-4">Account</h2>

                <div class="space-y-4">
                  {/* Connected Account */}
                  <div>
                    <div class="text-sm font-medium mb-2">Connected Account</div>
                    <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <div class="flex-1">
                        <div class="font-medium">Google</div>
                        <div class="text-sm text-base-content/70">{user()?.email}</div>
                      </div>
                      <span class="badge badge-success badge-sm">Connected</span>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <div class="pt-4 border-t border-base-200">
                    <LogoutButton class="btn btn-outline btn-error" />
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Username Change Modal */}
      <UsernameChangeModal
        isOpen={usernameChangeModal.isOpen()}
        onClose={() => usernameChangeModal.close()}
      />
    </main>
  );
}
