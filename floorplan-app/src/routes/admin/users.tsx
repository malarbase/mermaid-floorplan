import { useMutation, useQuery } from 'convex-solidjs';
import { createSignal, For, Show } from 'solid-js';
import { ConfirmationModal } from '~/components/ui/ConfirmationModal';
import { InlineEdit } from '~/components/ui/InlineEdit';
import { Modal } from '~/components/ui/Modal';
import { Timeline, type TimelineEntry } from '~/components/ui/Timeline';
import { useToast } from '~/components/ui/Toast';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type ModerationAction = 'warn' | 'ban';
type BanDuration = '1d' | '7d' | '30d' | 'permanent';

interface ModerationTarget {
  userId: Id<'users'>;
  username: string;
  action: ModerationAction;
}

interface UnbanTarget {
  userId: Id<'users'>;
  username: string;
}

interface PromoteTarget {
  userId: Id<'users'>;
  username: string;
  action: 'promote' | 'demote';
}

interface ProjectsTarget {
  userId: Id<'users'>;
  username: string;
}

interface HistoryTarget {
  userId: Id<'users'>;
  username: string;
}

function getUserStatus(user: { bannedUntil?: number }) {
  if (user.bannedUntil && user.bannedUntil > Date.now()) {
    if (user.bannedUntil === Number.MAX_SAFE_INTEGER) {
      return { label: 'Banned', class: 'badge-error' };
    }
    return {
      label: `Banned until ${new Date(user.bannedUntil).toLocaleDateString()}`,
      class: 'badge-warning',
    };
  }
  return { label: 'Active', class: 'badge-success' };
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString();
}

export default function UserManagement() {
  const [search, setSearch] = createSignal('');
  const toast = useToast();

  // --- Modal state signals ---
  const [moderationTarget, setModerationTarget] = createSignal<ModerationTarget | null>(null);
  const [moderationReason, setModerationReason] = createSignal('');
  const [banDuration, setBanDuration] = createSignal<BanDuration>('1d');

  const [unbanTarget, setUnbanTarget] = createSignal<UnbanTarget | null>(null);
  const [unbanReason, setUnbanReason] = createSignal('');

  const [promoteTarget, setPromoteTarget] = createSignal<PromoteTarget | null>(null);

  const [projectsTarget, setProjectsTarget] = createSignal<ProjectsTarget | null>(null);
  const [historyTarget, setHistoryTarget] = createSignal<HistoryTarget | null>(null);

  // --- Queries ---
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const adminStatus = useQuery(api.admin.getCurrentUserAdminStatus, {});
  const isSuperAdmin = () => adminStatus.data?.()?.isSuperAdmin ?? false;

  const users = useQuery(api.admin.listAllUsers, () => ({
    search: search(),
    limit: 100,
  }));

  const userProjects = useQuery(
    api.admin.listUserProjects,
    () => ({ userId: projectsTarget()?.userId as string }),
    () => ({ enabled: !!projectsTarget() }),
  );

  const moderationHistory = useQuery(
    api.admin.getUserModerationHistory,
    () => ({ userId: historyTarget()?.userId as string }),
    () => ({ enabled: !!historyTarget() }),
  );

  // --- Mutations ---
  const promoteToAdmin = useMutation(api.admin.promoteToAdmin);
  const demoteFromAdmin = useMutation(api.admin.demoteFromAdmin);
  const warnUser = useMutation(api.admin.warnUser);
  const banUser = useMutation(api.admin.banUser);
  const unbanUser = useMutation(api.admin.unbanUser);
  const updateUserDisplayName = useMutation(api.admin.updateUserDisplayName);

  // --- Column count for colspan ---
  const colCount = () => (isSuperAdmin() ? 7 : 5);

  // --- Helpers ---
  const isBanned = (user: { bannedUntil?: number }) =>
    !!(user.bannedUntil && user.bannedUntil > Date.now());

  const isSelf = (userId: Id<'users'>) => userId === currentUser.data?.()?._id;

  // --- Handlers ---
  const handleModeration = async () => {
    const target = moderationTarget();
    if (!target) return;
    const reason = moderationReason().trim();
    if (!reason) return;

    try {
      if (target.action === 'warn') {
        await warnUser.mutate({ userId: target.userId, reason });
        toast.success(`Warning sent to ${target.username}`);
      } else {
        await banUser.mutate({ userId: target.userId, reason, duration: banDuration() });
        toast.success(`${target.username} has been banned`);
      }
      setModerationTarget(null);
      setModerationReason('');
      setBanDuration('1d');
    } catch (err) {
      toast.error(`Failed to ${target.action} user`);
      console.error(err);
    }
  };

  const handleUnban = async () => {
    const target = unbanTarget();
    if (!target) return;

    try {
      await unbanUser.mutate({
        userId: target.userId,
        reason: unbanReason().trim() || undefined,
      });
      toast.success(`${target.username} has been unbanned`);
      setUnbanTarget(null);
      setUnbanReason('');
    } catch (err) {
      toast.error('Failed to unban user');
      console.error(err);
    }
  };

  const handlePromoteDemote = async () => {
    const target = promoteTarget();
    if (!target) return;

    try {
      if (target.action === 'promote') {
        await promoteToAdmin.mutate({ userId: target.userId });
        toast.success(`${target.username} promoted to admin`);
      } else {
        await demoteFromAdmin.mutate({ userId: target.userId });
        toast.success(`${target.username} demoted from admin`);
      }
      setPromoteTarget(null);
    } catch (err) {
      toast.error(`Failed to ${target.action} user`);
      console.error(err);
    }
  };

  const handleDisplayNameSave = async (userId: Id<'users'>, displayName: string) => {
    try {
      await updateUserDisplayName.mutate({ userId, displayName });
      toast.success('Display name updated');
    } catch (err) {
      toast.error('Failed to update display name');
      console.error(err);
    }
  };

  // --- Timeline mapping ---
  const historyEntries = (): TimelineEntry[] => {
    const data = moderationHistory.data?.();
    if (!data?.history) return [];
    return data.history.map((entry) => ({
      timestamp: entry.timestamp,
      badge:
        entry.action === 'warn'
          ? { label: 'Warning', class: 'badge-warning' }
          : entry.action === 'ban'
            ? { label: 'Banned', class: 'badge-error' }
            : { label: 'Unbanned', class: 'badge-success' },
      title:
        entry.action === 'warn'
          ? 'Warning issued'
          : entry.action === 'ban'
            ? `Banned (${entry.duration})`
            : 'Unbanned',
      description: entry.reason,
      actor: entry.actorUsername,
    }));
  };

  return (
    <div class="p-6">
      {/* Header */}
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Users</h2>
          <p class="text-base-content/60 mt-1">Manage users and moderation</p>
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

      {/* Table */}
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
                <th>Status</th>
                <th>Actions</th>
                <Show when={isSuperAdmin()}>
                  <th class="text-right">Role Actions</th>
                </Show>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeletons */}
              <Show when={users.isLoading?.()}>
                <For each={Array(5)}>
                  {() => (
                    <tr class="animate-pulse">
                      <td>
                        <div class="h-4 w-24 bg-base-300 rounded" />
                      </td>
                      <td>
                        <div class="h-4 w-32 bg-base-300 rounded" />
                      </td>
                      <Show when={isSuperAdmin()}>
                        <td>
                          <div class="h-4 w-40 bg-base-300 rounded" />
                        </td>
                      </Show>
                      <td>
                        <div class="h-4 w-24 bg-base-300 rounded" />
                      </td>
                      <td>
                        <div class="h-4 w-16 bg-base-300 rounded" />
                      </td>
                      <td>
                        <div class="h-8 w-36 bg-base-300 rounded" />
                      </td>
                      <Show when={isSuperAdmin()}>
                        <td>
                          <div class="h-8 w-24 bg-base-300 rounded ml-auto" />
                        </td>
                      </Show>
                    </tr>
                  )}
                </For>
              </Show>

              {/* Empty state */}
              <Show when={!users.isLoading?.() && users.data?.()?.length === 0}>
                <tr>
                  <td colspan={colCount()} class="text-center py-12 text-base-content/50">
                    No users found matching your search
                  </td>
                </tr>
              </Show>

              {/* User rows */}
              <For each={users.data?.()}>
                {(user) => {
                  const status = () => getUserStatus(user);
                  return (
                    <tr class="hover:bg-base-200/30 transition-colors">
                      {/* Username */}
                      <td class="font-mono text-sm">{user.username}</td>

                      {/* Display Name (inline edit) */}
                      <td>
                        <InlineEdit
                          value={user.displayName || ''}
                          placeholder="No display name"
                          onSave={(val) => handleDisplayNameSave(user._id, val)}
                        />
                      </td>

                      {/* Email (super admin only) */}
                      <Show when={isSuperAdmin()}>
                        <td class="text-base-content/70 text-sm">
                          {user.email || <span class="text-base-content/30 italic">Hidden</span>}
                        </td>
                      </Show>

                      {/* Created */}
                      <td class="text-sm text-base-content/70">{formatDate(user.createdAt)}</td>

                      {/* Status badge */}
                      <td>
                        <span class={`badge badge-sm ${status().class}`}>{status().label}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div class="flex items-center gap-1">
                          {/* Warn / Ban / Unban — not for super admins or self */}
                          <Show when={!user.isSuperAdmin && !isSelf(user._id)}>
                            <button
                              type="button"
                              class="btn btn-xs btn-outline btn-warning"
                              onClick={() => {
                                setModerationReason('');
                                setModerationTarget({
                                  userId: user._id,
                                  username: user.username,
                                  action: 'warn',
                                });
                              }}
                            >
                              Warn
                            </button>
                            <Show
                              when={!isBanned(user)}
                              fallback={
                                <button
                                  type="button"
                                  class="btn btn-xs btn-outline btn-success"
                                  onClick={() => {
                                    setUnbanReason('');
                                    setUnbanTarget({ userId: user._id, username: user.username });
                                  }}
                                >
                                  Unban
                                </button>
                              }
                            >
                              <button
                                type="button"
                                class="btn btn-xs btn-outline btn-error"
                                onClick={() => {
                                  setModerationReason('');
                                  setBanDuration('1d');
                                  setModerationTarget({
                                    userId: user._id,
                                    username: user.username,
                                    action: 'ban',
                                  });
                                }}
                              >
                                Ban
                              </button>
                            </Show>
                          </Show>

                          {/* View Projects */}
                          <button
                            type="button"
                            class="btn btn-xs btn-ghost"
                            title="View projects"
                            onClick={() =>
                              setProjectsTarget({ userId: user._id, username: user.username })
                            }
                          >
                            <svg
                              aria-hidden="true"
                              class="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                              />
                            </svg>
                          </button>

                          {/* History */}
                          <button
                            type="button"
                            class="btn btn-xs btn-ghost"
                            title="Moderation history"
                            onClick={() =>
                              setHistoryTarget({ userId: user._id, username: user.username })
                            }
                          >
                            <svg
                              aria-hidden="true"
                              class="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* Role Actions (super admin only) */}
                      <Show when={isSuperAdmin()}>
                        <td class="text-right">
                          <div class="flex justify-end gap-2">
                            <Show when={!user.isAdmin}>
                              <button
                                type="button"
                                class="btn btn-xs btn-outline btn-secondary"
                                onClick={() =>
                                  setPromoteTarget({
                                    userId: user._id,
                                    username: user.username,
                                    action: 'promote',
                                  })
                                }
                              >
                                Promote
                              </button>
                            </Show>
                            <Show when={user.isAdmin && !isSelf(user._id) && !user.isSuperAdmin}>
                              <button
                                type="button"
                                class="btn btn-xs btn-outline btn-error"
                                onClick={() =>
                                  setPromoteTarget({
                                    userId: user._id,
                                    username: user.username,
                                    action: 'demote',
                                  })
                                }
                              >
                                Demote
                              </button>
                            </Show>
                          </div>
                        </td>
                      </Show>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modals ===== */}

      {/* Moderation Modal (Warn / Ban) */}
      <ConfirmationModal
        isOpen={!!moderationTarget()}
        onClose={() => setModerationTarget(null)}
        onConfirm={handleModeration}
        title={
          moderationTarget()?.action === 'warn'
            ? `Warn ${moderationTarget()?.username}`
            : `Ban ${moderationTarget()?.username}`
        }
        confirmLabel={moderationTarget()?.action === 'warn' ? 'Send Warning' : 'Ban User'}
        confirmClass={moderationTarget()?.action === 'warn' ? 'btn-warning' : 'btn-error'}
      >
        <div class="form-control w-full mt-2">
          <label class="label" for="moderation-reason">
            <span class="label-text">Reason</span>
          </label>
          <textarea
            id="moderation-reason"
            class="textarea textarea-bordered w-full"
            rows={3}
            placeholder="Reason for this action..."
            value={moderationReason()}
            onInput={(e) => setModerationReason(e.currentTarget.value)}
          />
        </div>

        <Show when={moderationTarget()?.action === 'ban'}>
          <div class="form-control w-full mt-4">
            <span class="label-text mb-2 block">Ban duration</span>
            <div class="flex flex-col gap-2">
              <For
                each={[
                  { value: '1d' as BanDuration, label: '1 Day' },
                  { value: '7d' as BanDuration, label: '7 Days' },
                  { value: '30d' as BanDuration, label: '30 Days' },
                  { value: 'permanent' as BanDuration, label: 'Permanent' },
                ]}
              >
                {(opt) => (
                  <label
                    class="flex items-center gap-2 cursor-pointer"
                    for={`ban-duration-${opt.value}`}
                  >
                    <input
                      id={`ban-duration-${opt.value}`}
                      type="radio"
                      name="ban-duration"
                      class="radio radio-sm"
                      checked={banDuration() === opt.value}
                      onChange={() => setBanDuration(opt.value)}
                    />
                    <span class="label-text">{opt.label}</span>
                  </label>
                )}
              </For>
            </div>
          </div>
        </Show>
      </ConfirmationModal>

      {/* Unban Modal */}
      <ConfirmationModal
        isOpen={!!unbanTarget()}
        onClose={() => setUnbanTarget(null)}
        onConfirm={handleUnban}
        title={`Unban ${unbanTarget()?.username}?`}
        description="This will immediately restore the user's access."
        confirmLabel="Unban User"
        confirmClass="btn-success"
      >
        <div class="form-control w-full mt-2">
          <label class="label" for="unban-reason">
            <span class="label-text">Reason (optional)</span>
          </label>
          <textarea
            id="unban-reason"
            class="textarea textarea-bordered w-full"
            rows={2}
            placeholder="Reason for unbanning..."
            value={unbanReason()}
            onInput={(e) => setUnbanReason(e.currentTarget.value)}
          />
        </div>
      </ConfirmationModal>

      {/* Promote / Demote Modal */}
      <ConfirmationModal
        isOpen={!!promoteTarget()}
        onClose={() => setPromoteTarget(null)}
        onConfirm={handlePromoteDemote}
        title={
          promoteTarget()?.action === 'promote'
            ? `Promote ${promoteTarget()?.username} to admin?`
            : `Demote ${promoteTarget()?.username} from admin?`
        }
        confirmLabel={promoteTarget()?.action === 'promote' ? 'Promote' : 'Demote'}
        confirmClass={promoteTarget()?.action === 'promote' ? 'btn-secondary' : 'btn-error'}
      />

      {/* View Projects Modal */}
      <Modal
        isOpen={!!projectsTarget()}
        onClose={() => setProjectsTarget(null)}
        title={`Projects by ${projectsTarget()?.username ?? ''}`}
        class="max-w-3xl"
      >
        <Show
          when={!userProjects.isLoading?.()}
          fallback={
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-md" />
            </div>
          }
        >
          <Show
            when={(userProjects.data?.()?.length ?? 0) > 0}
            fallback={<p class="text-center text-base-content/50 py-8">No projects found</p>}
          >
            <div class="overflow-x-auto mt-4">
              <table class="table table-sm w-full">
                <thead>
                  <tr class="bg-base-200/50">
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Visibility</th>
                    <th>Featured</th>
                    <th>Views</th>
                    <th>Forks</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={userProjects.data?.()}>
                    {(project) => (
                      <tr class="hover:bg-base-200/30">
                        <td class="font-medium">{project.displayName}</td>
                        <td class="font-mono text-sm text-base-content/70">{project.slug}</td>
                        <td>
                          <span
                            class={`badge badge-sm ${project.isPublic ? 'badge-success' : 'badge-ghost'}`}
                          >
                            {project.isPublic ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td>
                          <Show when={project.isFeatured}>
                            <span class="text-warning" title="Featured">
                              &#9733;
                            </span>
                          </Show>
                        </td>
                        <td class="text-sm">{project.viewCount ?? 0}</td>
                        <td class="text-sm">{project.forkCount ?? 0}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>

        <div class="modal-action">
          <button type="button" class="btn" onClick={() => setProjectsTarget(null)}>
            Close
          </button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={!!historyTarget()}
        onClose={() => setHistoryTarget(null)}
        title={`Moderation history: ${historyTarget()?.username ?? ''}`}
        class="max-w-2xl"
      >
        <Show
          when={!moderationHistory.isLoading?.()}
          fallback={
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-md" />
            </div>
          }
        >
          <div class="mt-4">
            <Timeline items={historyEntries()} emptyMessage="No moderation history" />
          </div>
        </Show>

        <div class="modal-action">
          <button type="button" class="btn" onClick={() => setHistoryTarget(null)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
