import { useMutation, useQuery } from 'convex-solidjs';
import { createSignal, For, Show } from 'solid-js';
import { useToast } from '~/components/ui/Toast';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export default function UserManagement() {
  const [search, setSearch] = createSignal('');
  const toast = useToast();

  const currentUser = useQuery(api.users.getCurrentUser, {});

  // Check if super admin (frontend approximation - backend enforces)
  const isSuperAdmin = () => currentUser.data()?.isAdmin ?? false;

  const users = useQuery((api.admin as any).listAllUsers, () => ({
    search: search(),
    limit: 100,
  }));

  const promoteToAdmin = useMutation(api.admin.promoteToAdmin);
  const demoteFromAdmin = useMutation(api.admin.demoteFromAdmin);

  const handlePromote = async (userId: Id<'users'>) => {
    if (confirm('Promote this user to admin?')) {
      try {
        await promoteToAdmin.mutate({ userId });
        toast.success('User promoted to admin');
      } catch (err) {
        toast.error('Failed to promote user');
        console.error(err);
      }
    }
  };

  const handleDemote = async (userId: Id<'users'>) => {
    if (confirm('Demote this user from admin?')) {
      try {
        await demoteFromAdmin.mutate({ userId });
        toast.success('User demoted from admin');
      } catch (err) {
        toast.error('Failed to demote user');
        console.error(err);
      }
    }
  };

  return (
    <div class="p-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">👥 Users</h2>
          <p class="text-base-content/60 mt-1">Manage users and roles</p>
        </div>

        <div class="join w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search users..."
            class="input input-bordered join-item w-full sm:w-64"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr class="bg-base-200/50">
                <th>Username</th>
                <th>Display Name</th>
                <Show when={isSuperAdmin()}>
                  <th>Email</th>
                </Show>
                <th>Created</th>
                <th>Role</th>
                <Show when={isSuperAdmin()}>
                  <th class="text-right">Actions</th>
                </Show>
              </tr>
            </thead>
            <tbody>
              <Show when={users.isLoading()}>
                <For each={Array(5)}>
                  {() => (
                    <tr class="animate-pulse">
                      <td>
                        <div class="h-4 w-24 bg-base-300 rounded"></div>
                      </td>
                      <td>
                        <div class="h-4 w-32 bg-base-300 rounded"></div>
                      </td>
                      <Show when={isSuperAdmin()}>
                        <td>
                          <div class="h-4 w-40 bg-base-300 rounded"></div>
                        </td>
                      </Show>
                      <td>
                        <div class="h-4 w-24 bg-base-300 rounded"></div>
                      </td>
                      <td>
                        <div class="h-4 w-16 bg-base-300 rounded"></div>
                      </td>
                      <Show when={isSuperAdmin()}>
                        <td>
                          <div class="h-8 w-24 bg-base-300 rounded ml-auto"></div>
                        </td>
                      </Show>
                    </tr>
                  )}
                </For>
              </Show>

              <Show when={!users.isLoading() && users.data()?.length === 0}>
                <tr>
                  <td
                    colspan={isSuperAdmin() ? 6 : 4}
                    class="text-center py-12 text-base-content/50"
                  >
                    No users found matching your search
                  </td>
                </tr>
              </Show>

              <For each={users.data()}>
                {(user) => (
                  <tr class="hover:bg-base-200/30 transition-colors">
                    <td class="font-mono text-sm">{user.username}</td>
                    <td>
                      <div class="font-medium">{user.displayName || '—'}</div>
                    </td>
                    <Show when={isSuperAdmin()}>
                      <td class="text-base-content/70 text-sm">
                        {user.email || <span class="text-base-content/30 italic">Hidden</span>}
                      </td>
                    </Show>
                    <td class="text-sm text-base-content/70">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Show
                        when={user.isAdmin}
                        fallback={<span class="badge badge-ghost badge-sm">User</span>}
                      >
                        <span
                          class={`badge badge-sm ${user.isSuperAdmin ? 'badge-primary' : 'badge-secondary'}`}
                        >
                          {user.isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </span>
                      </Show>
                    </td>
                    <Show when={isSuperAdmin()}>
                      <td class="text-right">
                        <div class="flex justify-end gap-2">
                          {!user.isAdmin && (
                            <button
                              class="btn btn-xs btn-outline btn-secondary"
                              onClick={() => handlePromote(user._id)}
                            >
                              Promote
                            </button>
                          )}
                          {user.isAdmin &&
                            user._id !== currentUser.data()?._id &&
                            !user.isSuperAdmin && (
                              <button
                                class="btn btn-xs btn-outline btn-error"
                                onClick={() => handleDemote(user._id)}
                              >
                                Demote
                              </button>
                            )}
                        </div>
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
