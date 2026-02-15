import { Title } from '@solidjs/meta';
import { A, useNavigate, useParams } from '@solidjs/router';
import { useMutation, useQuery } from 'convex-solidjs';
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import { CreateShareLinkModal } from '~/components/CreateShareLinkModal';
import { DeleteProjectButton } from '~/components/DeleteProjectButton';
import { InviteByUsernameModal } from '~/components/InviteByUsernameModal';
import { VisibilityToggle } from '~/components/VisibilityToggle';
import { useProjectData } from '~/hooks/useProjectData';
import { asId } from '~/lib/project-types';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

interface Collaborator {
  _id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'viewer' | 'editor' | 'admin';
  invitedBy: string;
  createdAt: number;
}

interface ShareLink {
  _id: string;
  token: string;
  role: 'viewer' | 'editor';
  expiresAt?: number;
  createdAt: number;
  isExpired: boolean;
}

/**
 * Project settings page - manage project settings, collaborators, and share links.
 * Route: /u/:username/:project/settings
 *
 * Only accessible by project owner.
 */
export default function ProjectSettings() {
  const params = useParams();
  const navigate = useNavigate();

  const [showInviteModal, setShowInviteModal] = createSignal(false);
  const [showShareLinkModal, setShowShareLinkModal] = createSignal(false);
  const [displayName, setDisplayName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveSuccess, setSaveSuccess] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');
  const [copiedLinkId, setCopiedLinkId] = createSignal<string | null>(null);

  const [isEditingSlug, setIsEditingSlug] = createSignal(false);
  const [newSlug, setNewSlug] = createSignal('');
  const [debouncedSlug, setDebouncedSlug] = createSignal('');
  const [slugSaveError, setSlugSaveError] = createSignal('');

  // Transfer ownership state
  const [transferTarget, setTransferTarget] = createSignal('');
  const [transferConfirmName, setTransferConfirmName] = createSignal('');
  const [isTransferring, setIsTransferring] = createSignal(false);
  const [transferError, setTransferError] = createSignal('');
  const [transferPending, setTransferPending] = createSignal(false);
  const [transferPendingRecipient, setTransferPendingRecipient] = createSignal('');
  const [transferRequestId, setTransferRequestId] = createSignal<string | null>(null);
  // Confirmation modals (replace native confirm())
  const [confirmRemoveCollab, setConfirmRemoveCollab] = createSignal<{
    userId: string;
    username: string;
  } | null>(null);
  const [confirmRevokeLink, setConfirmRevokeLink] = createSignal<string | null>(null);

  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);

  // Project data from shared hook
  const {
    project,
    owner,
    forkedFrom,
    projectData,
    isOwner,
    canManage,
    isProjectLoading,
    currentUser,
  } = useProjectData(username, projectSlug);

  // Initialize form values when project loads
  createEffect(() => {
    const proj = project();
    if (proj) {
      setDisplayName(proj.displayName);
      setDescription(proj.description ?? '');
    }
  });

  // Query collaborators
  const collaboratorsQuery = useQuery(
    api.sharing.getCollaborators,
    () => ({ projectId: (project()?._id ?? '') as Id<'projects'> }),
    () => ({ enabled: !!project() }),
  );

  const collaborators = createMemo(
    () => (collaboratorsQuery.data() as Collaborator[] | undefined) ?? [],
  );

  // Query share links
  const shareLinksQuery = useQuery(
    api.sharing.getShareLinks,
    () => ({ projectId: (project()?._id ?? '') as Id<'projects'> }),
    () => ({ enabled: !!project() }),
  );

  const shareLinks = createMemo(() => (shareLinksQuery.data() as ShareLink[] | undefined) ?? []);

  // Mutations
  const updateProject = useMutation(api.projects.update);
  const updateProjectSlug = useMutation(api.projects.updateSlug);
  const removeCollaborator = useMutation(api.sharing.removeCollaborator);
  const updateCollaboratorRole = useMutation(api.sharing.updateCollaboratorRole);
  const revokeShareLink = useMutation(api.sharing.revokeShareLink);
  const requestTransfer = useMutation(api.projects.requestTransfer);
  const cancelTransfer = useMutation(api.projects.cancelTransfer);

  // Loading state
  const isLoading = createMemo(
    () => isProjectLoading() || collaboratorsQuery.isLoading() || shareLinksQuery.isLoading(),
  );

  // Handle save general settings
  const handleSaveGeneralSettings = async (e: Event) => {
    e.preventDefault();
    const proj = project();
    if (!proj) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      await updateProject.mutate({
        projectId: proj._id,
        displayName: displayName(),
        description: description() || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  createEffect(() => {
    const s = newSlug();
    const timer = setTimeout(() => setDebouncedSlug(s), 500);
    onCleanup(() => clearTimeout(timer));
  });

  const slugCheckQuery = useQuery(
    api.projects.getBySlug,
    () => ({ username: username() ?? '', projectSlug: debouncedSlug() || '' }),
    () => ({
      enabled: isEditingSlug() && !!debouncedSlug() && debouncedSlug() !== projectSlug(),
    }),
  );

  const isSlugTaken = createMemo(() => !!slugCheckQuery.data());
  const isSlugValidFormat = createMemo(() => /^[a-z0-9-]+$/.test(newSlug()));
  const canSaveSlug = createMemo(
    () =>
      newSlug() &&
      newSlug() !== projectSlug() &&
      isSlugValidFormat() &&
      !isSlugTaken() &&
      !slugCheckQuery.isLoading(),
  );

  const handleSaveSlug = async () => {
    const proj = project();
    if (!proj || !canSaveSlug()) return;

    setIsSaving(true);
    setSlugSaveError('');

    try {
      const result = await updateProjectSlug.mutate({
        projectId: proj._id,
        newSlug: newSlug(),
      });
      navigate(`/u/${username()}/${result.newSlug}/settings`, { replace: true });
    } catch (err) {
      setSlugSaveError(err instanceof Error ? err.message : 'Failed to update slug');
      setIsSaving(false);
    }
  };

  const startEditingSlug = () => {
    setNewSlug(projectSlug() || '');
    setIsEditingSlug(true);
  };

  const cancelEditingSlug = () => {
    setIsEditingSlug(false);
    setNewSlug('');
    setSlugSaveError('');
  };

  // Handle remove collaborator (confirmed via modal)
  const handleRemoveCollaborator = async (userId: string) => {
    const proj = project();
    if (!proj) return;

    try {
      await removeCollaborator.mutate({
        projectId: proj._id,
        userId: asId<'users'>(userId),
      });
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    } finally {
      setConfirmRemoveCollab(null);
    }
  };

  // Handle update collaborator role
  const handleUpdateRole = async (userId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    const proj = project();
    if (!proj) return;

    try {
      await updateCollaboratorRole.mutate({
        projectId: proj._id,
        userId: asId<'users'>(userId),
        role: newRole,
      });
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  // Handle revoke share link (confirmed via modal)
  const handleRevokeShareLink = async (linkId: string) => {
    try {
      await revokeShareLink.mutate({ linkId: asId<'shareLinks'>(linkId) });
    } catch (err) {
      console.error('Failed to revoke share link:', err);
    } finally {
      setConfirmRevokeLink(null);
    }
  };

  // Handle copy share link
  const handleCopyShareLink = async (token: string, linkId: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle project deletion
  const handleProjectDeleted = () => {
    navigate('/dashboard');
  };

  // Handle transfer ownership request
  const handleRequestTransfer = async () => {
    const proj = project();
    if (!proj || !transferTarget()) return;

    setIsTransferring(true);
    setTransferError('');

    try {
      const reqId = await requestTransfer.mutate({
        projectId: proj._id,
        toUserId: asId<'users'>(transferTarget()),
      });
      // Find the recipient username for the pending state display
      const recipient = collaborators().find((c) => c.userId === transferTarget());
      setTransferRequestId(reqId as unknown as string);
      setTransferPending(true);
      setTransferPendingRecipient(recipient?.username ?? 'user');
      setTransferTarget('');
      setTransferConfirmName('');
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Failed to request transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle cancel transfer
  const handleCancelTransfer = async () => {
    const reqId = transferRequestId();
    if (!reqId) return;

    setIsTransferring(true);
    setTransferError('');

    try {
      await cancelTransfer.mutate({
        requestId: asId<'transferRequests'>(reqId),
      });
      setTransferPending(false);
      setTransferPendingRecipient('');
      setTransferRequestId(null);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Failed to cancel transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <main class="min-h-screen bg-base-200">
      <Title>Settings - {project()?.displayName ?? projectSlug()} - Floorplan</Title>

      <Show
        when={!isLoading()}
        fallback={
          <div class="flex justify-center items-center h-screen">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        <Show
          when={projectData() && canManage()}
          fallback={
            <div class="flex justify-center items-center h-screen">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                  <h2 class="card-title">Access Denied</h2>
                  <p>You don't have permission to manage this project.</p>
                  <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-primary mt-4">
                    Back to Project
                  </A>
                </div>
              </div>
            </div>
          }
        >
          {/* Header */}
          <header class="bg-base-100 border-b border-base-300 px-3 sm:px-4 py-3 sm:py-4">
            <div class="max-w-3xl mx-auto">
              <div class="text-xs sm:text-sm breadcrumbs">
                <ul>
                  <li>
                    <A href={`/u/${username()}`}>{username()}</A>
                  </li>
                  <li>
                    <A
                      href={`/u/${username()}/${projectSlug()}`}
                      class="truncate max-w-[100px] sm:max-w-none"
                    >
                      {projectSlug()}
                    </A>
                  </li>
                  <li>Settings</li>
                </ul>
              </div>
              <h1 class="text-xl sm:text-2xl font-bold mt-2">Project Settings</h1>
              {/* Forked from attribution */}
              <Show when={forkedFrom()}>
                <div class="text-sm text-base-content/60 flex items-center gap-1 mt-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <span>forked from</span>
                  <A
                    href={`/u/${forkedFrom()!.owner.username}/${forkedFrom()!.project.slug}`}
                    class="link link-hover font-medium"
                  >
                    {forkedFrom()!.owner.username}/{forkedFrom()!.project.slug}
                  </A>
                </div>
              </Show>
            </div>
          </header>

          {/* Content */}
          <div class="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {/* General Settings */}
            <section class="card bg-base-100 shadow">
              <div class="card-body">
                <h2 class="card-title">General</h2>

                <form onSubmit={handleSaveGeneralSettings} class="space-y-4">
                  {/* Display Name */}
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">Project Name</span>
                    </label>
                    <input
                      type="text"
                      class="input input-bordered w-full"
                      value={displayName()}
                      onInput={(e) => setDisplayName(e.currentTarget.value)}
                      placeholder="My Floorplan"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">Description</span>
                      <span class="label-text-alt text-base-content/50">Optional</span>
                    </label>
                    <textarea
                      class="textarea textarea-bordered w-full"
                      value={description()}
                      onInput={(e) => setDescription(e.currentTarget.value)}
                      placeholder="A brief description of this floorplan..."
                      rows={3}
                    />
                  </div>

                  {/* Visibility */}
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text">Visibility</span>
                    </label>
                    <div class="flex items-center gap-4">
                      <Show when={project()}>
                        <VisibilityToggle
                          projectId={project()!._id}
                          isPublic={project()?.isPublic ?? false}
                        />
                      </Show>
                      <span class="text-sm text-base-content/60">
                        {project()?.isPublic
                          ? 'Anyone can view this project'
                          : 'Only you and collaborators can access'}
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div class="flex items-center gap-4">
                    <button type="submit" class="btn btn-primary" disabled={isSaving()}>
                      <Show when={isSaving()}>
                        <span class="loading loading-spinner loading-sm"></span>
                      </Show>
                      Save Changes
                    </button>

                    <Show when={saveSuccess()}>
                      <span class="text-success flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Saved
                      </span>
                    </Show>

                    <Show when={saveError()}>
                      <span class="text-error">{saveError()}</span>
                    </Show>
                  </div>
                </form>
              </div>
            </section>

            <Show when={isOwner()}>
              <section class="card bg-base-100 shadow">
                <div class="card-body">
                  <h2 class="card-title">Change URL Slug</h2>

                  <Show
                    when={!isEditingSlug()}
                    fallback={
                      <div class="space-y-4">
                        <div class="alert alert-warning text-sm">
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
                            <h3 class="font-bold">Warning</h3>
                            <div class="text-xs">
                              Changing the slug will change the URL of your project. Old URLs will
                              automatically redirect to the new one.
                            </div>
                          </div>
                        </div>

                        <div class="form-control w-full">
                          <label class="label">
                            <span class="label-text">New Slug</span>
                          </label>
                          <div class="flex flex-col gap-2">
                            <input
                              type="text"
                              class={`input input-bordered w-full font-mono ${
                                !isSlugValidFormat() || isSlugTaken()
                                  ? 'input-error'
                                  : newSlug() !== projectSlug() && debouncedSlug() === newSlug()
                                    ? 'input-success'
                                    : ''
                              }`}
                              value={newSlug()}
                              onInput={(e) => {
                                const val = e.currentTarget.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, '');
                                setNewSlug(val);
                              }}
                              placeholder="my-project-slug"
                              disabled={isSaving()}
                            />
                            <div class="flex items-center justify-between text-xs min-h-[1.25rem]">
                              <span class="text-base-content/60">
                                {window.location.origin}/u/{username()}/{newSlug() || '...'}
                              </span>

                              <Show when={newSlug() && newSlug() !== projectSlug()}>
                                <Show
                                  when={!slugCheckQuery.isLoading()}
                                  fallback={
                                    <span class="loading loading-spinner loading-xs"></span>
                                  }
                                >
                                  <Show when={isSlugTaken()}>
                                    <span class="text-error font-medium flex items-center gap-1">
                                      <span>✗</span> Slug already taken
                                    </span>
                                  </Show>
                                  <Show when={!isSlugTaken() && isSlugValidFormat()}>
                                    <span class="text-success font-medium flex items-center gap-1">
                                      <span>✓</span> Available
                                    </span>
                                  </Show>
                                </Show>
                              </Show>
                            </div>
                          </div>
                        </div>

                        <div class="flex items-center gap-2">
                          <button
                            class="btn btn-primary"
                            onClick={handleSaveSlug}
                            disabled={isSaving() || !canSaveSlug()}
                          >
                            <Show when={isSaving()} fallback="Save Slug">
                              <span class="loading loading-spinner loading-sm"></span>
                              Saving...
                            </Show>
                          </button>
                          <button
                            class="btn btn-ghost"
                            onClick={cancelEditingSlug}
                            disabled={isSaving()}
                          >
                            Cancel
                          </button>

                          <Show when={slugSaveError()}>
                            <span class="text-error text-sm">{slugSaveError()}</span>
                          </Show>
                        </div>
                      </div>
                    }
                  >
                    <div>
                      <p class="text-sm text-base-content/60 mb-4">
                        The URL slug determines the address of your project.
                      </p>
                      <div class="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                        <code class="flex-1 font-mono text-sm">
                          {window.location.origin}/u/{username()}/{projectSlug()}
                        </code>
                        <button class="btn btn-sm btn-outline" onClick={startEditingSlug}>
                          Change Slug
                        </button>
                      </div>
                    </div>
                  </Show>
                </div>
              </section>
            </Show>

            {/* Collaborators */}
            <section class="card bg-base-100 shadow">
              <div class="card-body">
                <div class="flex items-center justify-between">
                  <h2 class="card-title">Collaborators</h2>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Invite
                  </button>
                </div>

                <p class="text-sm text-base-content/60 mt-2">
                  Invite users to collaborate on this project. Editors can make changes, viewers can
                  only view.
                </p>

                {/* Collaborator List */}
                <Show
                  when={collaborators().length > 0}
                  fallback={
                    <div class="py-8 text-center text-base-content/50">
                      <svg
                        class="w-12 h-12 mx-auto mb-2 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p>No collaborators yet</p>
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm mt-2"
                        onClick={() => setShowInviteModal(true)}
                      >
                        Invite your first collaborator
                      </button>
                    </div>
                  }
                >
                  <div class="overflow-x-auto mt-4">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Added</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={collaborators()}>
                          {(collab) => (
                            <tr>
                              <td>
                                <div class="flex items-center gap-3">
                                  <div class="avatar placeholder">
                                    <div class="bg-neutral text-neutral-content rounded-full w-10 flex items-center justify-center">
                                      <Show
                                        when={collab.avatarUrl}
                                        fallback={
                                          <span class="text-sm">
                                            {collab.username.charAt(0).toUpperCase()}
                                          </span>
                                        }
                                      >
                                        <img src={collab.avatarUrl} alt={collab.username} />
                                      </Show>
                                    </div>
                                  </div>
                                  <div>
                                    <div class="font-medium">@{collab.username}</div>
                                    <Show when={collab.displayName}>
                                      <div class="text-sm text-base-content/60">
                                        {collab.displayName}
                                      </div>
                                    </Show>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <select
                                  class="select select-bordered select-sm"
                                  value={collab.role}
                                  onChange={(e) =>
                                    handleUpdateRole(
                                      collab.userId,
                                      e.currentTarget.value as 'viewer' | 'editor' | 'admin',
                                    )
                                  }
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="editor">Editor</option>
                                  <Show when={isOwner()}>
                                    <option value="admin">Admin</option>
                                  </Show>
                                </select>
                              </td>
                              <td class="text-sm text-base-content/60">
                                {formatDate(collab.createdAt)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  class="btn btn-ghost btn-sm text-error"
                                  onClick={() =>
                                    setConfirmRemoveCollab({
                                      userId: collab.userId,
                                      username: collab.username,
                                    })
                                  }
                                  title="Remove collaborator"
                                >
                                  <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            </section>

            {/* Share Links */}
            <section class="card bg-base-100 shadow">
              <div class="card-body">
                <div class="flex items-center justify-between">
                  <h2 class="card-title">Share Links</h2>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    onClick={() => setShowShareLinkModal(true)}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    Create Link
                  </button>
                </div>

                <p class="text-sm text-base-content/60 mt-2">
                  Create share links to give anyone access without requiring a username.
                </p>

                {/* Existing Share Links */}
                <Show
                  when={shareLinks().length > 0}
                  fallback={
                    <div class="py-6 text-center text-base-content/50">
                      <svg
                        class="w-10 h-10 mx-auto mb-2 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <p>No share links yet</p>
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm mt-2"
                        onClick={() => setShowShareLinkModal(true)}
                      >
                        Create your first share link
                      </button>
                    </div>
                  }
                >
                  <div class="overflow-x-auto mt-4">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>Link</th>
                          <th>Role</th>
                          <th>Created</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={shareLinks()}>
                          {(link) => (
                            <tr class={link.isExpired ? 'opacity-50' : ''}>
                              <td>
                                <code class="text-xs bg-base-200 px-2 py-1 rounded">
                                  ...{link.token.slice(-8)}
                                </code>
                              </td>
                              <td>
                                <span
                                  class={`badge badge-sm ${
                                    link.role === 'editor' ? 'badge-warning' : 'badge-info'
                                  }`}
                                >
                                  {link.role}
                                </span>
                              </td>
                              <td class="text-sm text-base-content/60">
                                {formatDate(link.createdAt)}
                              </td>
                              <td>
                                <Show
                                  when={!link.isExpired}
                                  fallback={<span class="badge badge-ghost badge-sm">Expired</span>}
                                >
                                  <span class="badge badge-success badge-sm">Active</span>
                                </Show>
                              </td>
                              <td class="flex gap-1">
                                <Show when={!link.isExpired}>
                                  <button
                                    type="button"
                                    class={`btn btn-ghost btn-sm ${
                                      copiedLinkId() === link._id ? 'text-success' : ''
                                    }`}
                                    onClick={() => handleCopyShareLink(link.token, link._id)}
                                    title="Copy link"
                                  >
                                    <Show
                                      when={copiedLinkId() !== link._id}
                                      fallback={
                                        <svg
                                          class="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      }
                                    >
                                      <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="2"
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                    </Show>
                                  </button>
                                </Show>
                                <button
                                  type="button"
                                  class="btn btn-ghost btn-sm text-error"
                                  onClick={() => setConfirmRevokeLink(link._id)}
                                  title="Revoke link"
                                >
                                  <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            </section>

            {/* Danger Zone (owner only) */}
            <Show when={isOwner()}>
              <section class="card bg-base-100 shadow border-2 border-error/20">
                <div class="card-body p-4 sm:p-6">
                  <h2 class="card-title text-error text-lg sm:text-xl">Danger Zone</h2>

                  {/* Transfer Ownership */}
                  <div class="py-4 border-t border-base-300 mt-2">
                    <div class="flex flex-col gap-3">
                      <div>
                        <p class="font-medium text-sm sm:text-base">Transfer Ownership</p>
                        <p class="text-xs sm:text-sm text-base-content/60">
                          Transfer this project to an existing collaborator. They must accept the
                          transfer.
                        </p>
                      </div>

                      <Show
                        when={!transferPending()}
                        fallback={
                          <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-warning/10 rounded-lg">
                            <div class="flex-1">
                              <p class="text-sm font-medium text-warning">
                                Transfer pending — waiting for @{transferPendingRecipient()} to
                                accept
                              </p>
                            </div>
                            <button
                              class="btn btn-outline btn-warning btn-sm"
                              onClick={handleCancelTransfer}
                              disabled={isTransferring()}
                            >
                              <Show when={isTransferring()}>
                                <span class="loading loading-spinner loading-sm"></span>
                              </Show>
                              Cancel Transfer
                            </button>
                          </div>
                        }
                      >
                        <Show
                          when={collaborators().length > 0}
                          fallback={
                            <p class="text-sm text-base-content/50 italic">
                              No collaborators to transfer to. Invite a collaborator first.
                            </p>
                          }
                        >
                          <div class="flex flex-col gap-3">
                            <div class="form-control w-full">
                              <label class="label">
                                <span class="label-text">Transfer to</span>
                              </label>
                              <select
                                class="select select-bordered w-full"
                                value={transferTarget()}
                                onChange={(e) => setTransferTarget(e.currentTarget.value)}
                              >
                                <option value="">Select a collaborator...</option>
                                <For each={collaborators()}>
                                  {(collab) => (
                                    <option value={collab.userId}>@{collab.username}</option>
                                  )}
                                </For>
                              </select>
                            </div>

                            <div class="form-control w-full">
                              <label class="label">
                                <span class="label-text">
                                  Type{' '}
                                  <code class="font-mono text-error">{project()?.displayName}</code>{' '}
                                  to confirm
                                </span>
                              </label>
                              <input
                                type="text"
                                class="input input-bordered w-full"
                                value={transferConfirmName()}
                                onInput={(e) => setTransferConfirmName(e.currentTarget.value)}
                                placeholder={project()?.displayName ?? ''}
                              />
                            </div>

                            <Show when={transferError()}>
                              <p class="text-error text-sm">{transferError()}</p>
                            </Show>

                            <div>
                              <button
                                class="btn btn-error btn-outline"
                                onClick={handleRequestTransfer}
                                disabled={
                                  isTransferring() ||
                                  !transferTarget() ||
                                  transferConfirmName() !== project()?.displayName
                                }
                              >
                                <Show when={isTransferring()}>
                                  <span class="loading loading-spinner loading-sm"></span>
                                </Show>
                                Request Transfer
                              </button>
                            </div>
                          </div>
                        </Show>
                      </Show>
                    </div>
                  </div>

                  {/* Delete Project */}
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-t border-base-300">
                    <div>
                      <p class="font-medium text-sm sm:text-base">Delete this project</p>
                      <p class="text-xs sm:text-sm text-base-content/60">
                        Once deleted, this project cannot be recovered.
                      </p>
                    </div>
                    <Show when={project()}>
                      <DeleteProjectButton
                        projectId={project()!._id}
                        projectName={project()!.displayName}
                        onDeleted={handleProjectDeleted}
                      />
                    </Show>
                  </div>
                </div>
              </section>
            </Show>
          </div>
        </Show>
      </Show>

      {/* Invite Modal */}
      <Show when={project()}>
        <InviteByUsernameModal
          isOpen={showInviteModal()}
          onClose={() => setShowInviteModal(false)}
          projectId={project()!._id}
          isOwner={isOwner()}
          onSuccess={(username, role) => {
            console.log(`Invited ${username} as ${role}`);
          }}
        />
      </Show>

      {/* Create Share Link Modal */}
      <Show when={project()}>
        <CreateShareLinkModal
          isOpen={showShareLinkModal()}
          onClose={() => setShowShareLinkModal(false)}
          projectId={project()!._id}
          onSuccess={(token, role) => {
            console.log(`Created ${role} share link: ${token}`);
          }}
        />
      </Show>

      {/* Remove Collaborator Confirmation Modal */}
      <dialog class={`modal ${confirmRemoveCollab() ? 'modal-open' : ''}`}>
        <div class="modal-box">
          <h3 class="font-bold text-lg">Remove Collaborator</h3>
          <p class="py-4">
            Are you sure you want to remove <strong>@{confirmRemoveCollab()?.username}</strong> from
            this project? They will lose access immediately.
          </p>
          <div class="modal-action">
            <button class="btn btn-ghost" onClick={() => setConfirmRemoveCollab(null)}>
              Cancel
            </button>
            <button
              class="btn btn-error"
              onClick={() => {
                const collab = confirmRemoveCollab();
                if (collab) handleRemoveCollaborator(collab.userId);
              }}
            >
              Remove
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button onClick={() => setConfirmRemoveCollab(null)}>close</button>
        </form>
      </dialog>

      {/* Revoke Share Link Confirmation Modal */}
      <dialog class={`modal ${confirmRevokeLink() ? 'modal-open' : ''}`}>
        <div class="modal-box">
          <h3 class="font-bold text-lg">Revoke Share Link</h3>
          <p class="py-4">
            Are you sure you want to revoke this share link? Anyone using it will lose access
            immediately.
          </p>
          <div class="modal-action">
            <button class="btn btn-ghost" onClick={() => setConfirmRevokeLink(null)}>
              Cancel
            </button>
            <button
              class="btn btn-error"
              onClick={() => {
                const linkId = confirmRevokeLink();
                if (linkId) handleRevokeShareLink(linkId);
              }}
            >
              Revoke
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button onClick={() => setConfirmRevokeLink(null)}>close</button>
        </form>
      </dialog>
    </main>
  );
}
