import { A } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { type Component, createMemo, Show } from 'solid-js';
import { useSession } from '~/lib/auth-client';
import { api } from '../../convex/_generated/api';
import { LogoutButton } from './LogoutButton';

export interface UserMenuProps {
  size?: 'sm' | 'md';
}

export const UserMenu: Component<UserMenuProps> = (props) => {
  const sessionSignal = useSession();

  const session = createMemo(() => sessionSignal());
  const user = createMemo(() => session()?.data?.user);
  const isLoading = createMemo(() => session()?.isPending ?? true);

  // Query current user from Convex for authoritative username
  const currentUserQuery = useQuery(api.users.getCurrentUser, {});

  // Use Convex data as source of truth, fallback to session
  const username = createMemo(() => {
    const convexUser = currentUserQuery.data() as { username?: string } | undefined;
    return convexUser?.username ?? user()?.username ?? user()?.name ?? '';
  });

  const avatarSize = () => (props.size === 'sm' ? 'w-8' : 'w-10');
  const avatarSizeClass = () => (props.size === 'sm' ? 'w-8 h-8' : 'w-10 h-10');

  return (
    <Show
      when={!isLoading()}
      fallback={<div class={`${avatarSizeClass()} rounded-full bg-base-200 animate-pulse`} />}
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
        <div class="dropdown dropdown-end">
          <button
            type="button"
            tabIndex={0}
            class="btn btn-ghost btn-circle avatar"
            classList={{ 'btn-sm': props.size === 'sm' }}
          >
            <div class={`${avatarSize()} rounded-full`}>
              <Show
                when={user()?.image}
                fallback={
                  <div class="bg-neutral text-neutral-content w-full h-full flex items-center justify-center text-lg font-semibold">
                    {user()?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                }
              >
                <img
                  alt={`${user()?.name}'s avatar`}
                  src={user()?.image ?? ''}
                  class="w-full h-full object-cover"
                />
              </Show>
            </div>
          </button>
          <ul class="menu menu-sm dropdown-content mt-3 z-[100] p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-content/15 ring-1 ring-base-content/10">
            <li class="menu-title px-2 py-1">
              <span class="text-base-content font-medium">{user()?.name}</span>
              <Show when={user()?.email}>
                <span class="text-base-content/60 text-xs font-normal">{user()?.email}</span>
              </Show>
            </li>
            <div class="divider my-1" />
            <li>
              <A href="/dashboard" class="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </A>
            </li>
            <Show when={username()}>
              <li>
                <A href={`/u/${username()}`} class="flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </A>
              </li>
            </Show>
            <li>
              <A href="/new" class="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Project
              </A>
            </li>
            <div class="divider my-1" />
            <li>
              <A href="/settings" class="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </A>
            </li>
            <li>
              <LogoutButton class="flex items-center gap-2 text-error" />
            </li>
          </ul>
        </div>
      </Show>
    </Show>
  );
};

export default UserMenu;
