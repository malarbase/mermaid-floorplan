import { Title } from '@solidjs/meta';
import { A, useParams } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo, For, Match, Show, Switch } from 'solid-js';
import { Header } from '~/components/Header';
import { useSession } from '~/lib/auth-client';
import { api } from '../../../../convex/_generated/api';

/**
 * User Renamed component - shown when visiting an old username URL.
 * Displays a message that the user has changed their username and links to their new profile.
 */
function UserRenamed(props: {
  oldUsername: string;
  newUsername: string;
  displayName?: string | null;
}) {
  return (
    <main class="min-h-screen bg-base-200">
      <Title>Username Changed - Floorplan</Title>
      <Header />

      <div class="flex items-center justify-center p-8 min-h-[calc(100vh-4rem)]">
        <div class="card bg-base-100 shadow-xl max-w-md w-full">
          <div class="card-body text-center">
            <div class="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-16 w-16 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 class="text-2xl font-bold mb-2">Username Changed</h1>

            <p class="text-base-content/70 mb-4">
              The user <span class="font-mono font-semibold">@{props.oldUsername}</span> has changed
              their username.
            </p>

            <div class="divider"></div>

            <div class="flex items-center justify-center gap-3 mb-4">
              <div class="avatar placeholder">
                <div class="bg-neutral text-neutral-content rounded-full w-12 flex items-center justify-center">
                  <span class="text-lg">
                    {(props.displayName || props.newUsername)?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div class="text-left">
                <Show when={props.displayName}>
                  <p class="font-semibold">{props.displayName}</p>
                </Show>
                <p class="font-mono text-base-content/70">@{props.newUsername}</p>
              </div>
            </div>

            <A href={`/u/${props.newUsername}`} class="btn btn-primary">
              Go to New Profile
            </A>

            <div class="mt-4">
              <A href="/" class="link link-hover text-sm text-base-content/50">
                Back to Home
              </A>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * User Not Found component - shown when username doesn't exist and wasn't renamed.
 */
function UserNotFound(props: { username: string }) {
  return (
    <main class="min-h-screen bg-base-200">
      <Title>User Not Found - Floorplan</Title>
      <Header />

      <div class="flex items-center justify-center p-8 min-h-[calc(100vh-4rem)]">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 class="text-2xl font-bold mb-2">User Not Found</h1>

            <p class="text-base-content/70 mb-4">
              The user <span class="font-mono font-semibold">@{props.username}</span> does not
              exist.
            </p>

            <A href="/" class="btn btn-primary">
              Back to Home
            </A>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * User profile page - shows user's public projects.
 * Route: /u/:username
 *
 * Handles three cases:
 * 1. User exists - show their profile and projects
 * 2. User was renamed - show "user renamed" page with link to new profile
 * 3. User doesn't exist - show "user not found" page
 */
export default function UserProfile() {
  const params = useParams();
  const username = createMemo(() => params.username);
  const session = useSession();
  const currentUser = createMemo(() => session()?.data?.user);
  const isOwnProfile = createMemo(() => {
    const cur = currentUser();
    return cur && (cur.username ?? cur.name) === username();
  });

  const userQuery = useQuery(api.users.getByUsername, () => ({ username: username() as string }));

  const projectsQuery = useQuery(api.projects.listPublicByUsername, () => ({
    username: username() as string,
  }));

  const isLoading = () => userQuery.isLoading() || projectsQuery.isLoading();
  const user = () => userQuery.data();

  const profileAvatarUrl = createMemo(
    () => user()?.avatarUrl ?? (isOwnProfile() ? currentUser()?.image : undefined),
  );
  const projects = () => projectsQuery.data() ?? [];

  // TODO: Add previousOwner query when username history is implemented
  const previousOwner = () =>
    null as { oldUsername: string; newUsername: string; displayName?: string } | null;

  return (
    <Switch
      fallback={
        <main class="min-h-screen bg-base-200 flex items-center justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </main>
      }
    >
      {/* Loading state */}
      <Match when={isLoading()}>
        <main class="min-h-screen bg-base-200 flex items-center justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </main>
      </Match>

      {/* User exists - show profile */}
      <Match when={user()}>
        {(userData) => (
          <main class="min-h-screen bg-base-200">
            <Title>{username()} - Floorplan</Title>
            <Header />

            <div class="max-w-4xl mx-auto p-8">
              {/* User Header */}
              <div class="flex items-center gap-4 mb-8">
                <Show
                  when={profileAvatarUrl()}
                  fallback={
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content rounded-full w-16 flex items-center justify-center">
                        <span class="text-2xl">
                          {(userData().displayName || username())?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <div class="avatar">
                    <div class="w-16 rounded-full">
                      <img src={profileAvatarUrl()!} alt={userData().displayName || username()} />
                    </div>
                  </div>
                </Show>
                <div>
                  <h1 class="text-2xl font-bold">{userData().displayName || username()}</h1>
                  <p class="text-base-content/70 font-mono">@{username()}</p>
                </div>
              </div>

              {/* Projects List */}
              <h2 class="text-xl font-semibold mb-4">Public Projects</h2>
              <Show
                when={projects().length > 0}
                fallback={
                  <div class="card bg-base-100">
                    <div class="card-body text-center">
                      <p class="text-base-content/70">No public projects yet.</p>
                    </div>
                  </div>
                }
              >
                <div class="grid gap-4">
                  <For each={projects()}>
                    {(project) => (
                      <A
                        href={`/u/${username()}/${project.slug}`}
                        class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                      >
                        <div class="card-body">
                          <h2 class="card-title">{project.displayName}</h2>
                          <Show when={project.description}>
                            <p class="text-base-content/70">{project.description}</p>
                          </Show>
                          <p class="text-sm text-base-content/50">
                            Updated {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </A>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </main>
        )}
      </Match>

      {/* User was renamed - show redirect page */}
      <Match when={user() === null && previousOwner()}>
        {(prevOwner) => (
          <UserRenamed
            oldUsername={prevOwner().oldUsername}
            newUsername={prevOwner().newUsername}
            displayName={prevOwner().displayName}
          />
        )}
      </Match>

      {/* User not found and wasn't renamed */}
      <Match when={user() === null && previousOwner() === null}>
        <UserNotFound username={username() || ''} />
      </Match>
    </Switch>
  );
}
