import { Title } from "@solidjs/meta";
import { useParams, A, useNavigate } from "@solidjs/router";
import { Show, createMemo, createSignal, For, createEffect } from "solid-js";
import { useQuery, useMutation } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { useSession } from "~/lib/auth-client";
import { VisibilityToggle } from "~/components/VisibilityToggle";
import { DeleteProjectButton } from "~/components/DeleteProjectButton";
import { InviteByUsernameModal } from "~/components/InviteByUsernameModal";
import { CreateShareLinkModal } from "~/components/CreateShareLinkModal";

// Type-safe API reference builder for when generated files don't exist yet
const api = {
  projects: {
    getBySlug: "projects:getBySlug" as unknown as FunctionReference<"query">,
    update: "projects:update" as unknown as FunctionReference<"mutation">,
  },
  sharing: {
    getCollaborators: "sharing:getCollaborators" as unknown as FunctionReference<"query">,
    getShareLinks: "sharing:getShareLinks" as unknown as FunctionReference<"query">,
    removeCollaborator: "sharing:removeCollaborator" as unknown as FunctionReference<"mutation">,
    updateCollaboratorRole: "sharing:updateCollaboratorRole" as unknown as FunctionReference<"mutation">,
    revokeShareLink: "sharing:revokeShareLink" as unknown as FunctionReference<"mutation">,
  },
};

// Types
interface Project {
  _id: string;
  displayName: string;
  description?: string;
  isPublic: boolean;
  defaultVersion: string;
  userId: string;
  slug: string;
}

interface Owner {
  _id: string;
  username: string;
}

interface ForkedFrom {
  project: Project;
  owner: Owner;
}

interface Collaborator {
  _id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: "viewer" | "editor";
  invitedBy: string;
  createdAt: number;
}

interface ShareLink {
  _id: string;
  token: string;
  role: "viewer" | "editor";
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
  const sessionSignal = useSession();

  const [showInviteModal, setShowInviteModal] = createSignal(false);
  const [showShareLinkModal, setShowShareLinkModal] = createSignal(false);
  const [displayName, setDisplayName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveSuccess, setSaveSuccess] = createSignal(false);
  const [saveError, setSaveError] = createSignal("");
  const [copiedLinkId, setCopiedLinkId] = createSignal<string | null>(null);

  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);

  // Get current user session
  const session = createMemo(() => sessionSignal());
  const currentUser = createMemo(() => session()?.data?.user);

  // Query project data from Convex
  const projectQuery = useQuery(api.projects.getBySlug, () => ({
    username: username(),
    projectSlug: projectSlug(),
  }));

  const projectData = createMemo(() => {
    const data = projectQuery.data() as { project: Project; owner: Owner; forkedFrom: ForkedFrom | null } | null | undefined;
    return data;
  });

  const project = createMemo(() => projectData()?.project);
  const owner = createMemo(() => projectData()?.owner);
  const forkedFrom = createMemo(() => projectData()?.forkedFrom);

  // Initialize form values when project loads
  createEffect(() => {
    const proj = project();
    if (proj) {
      setDisplayName(proj.displayName);
      setDescription(proj.description ?? "");
    }
  });

  // Query collaborators
  const collaboratorsQuery = useQuery(
    api.sharing.getCollaborators,
    () => (project() ? { projectId: project()!._id } : "skip")
  );

  const collaborators = createMemo(
    () => (collaboratorsQuery.data() as Collaborator[] | undefined) ?? []
  );

  // Query share links
  const shareLinksQuery = useQuery(
    api.sharing.getShareLinks,
    () => (project() ? { projectId: project()!._id } : "skip")
  );

  const shareLinks = createMemo(
    () => (shareLinksQuery.data() as ShareLink[] | undefined) ?? []
  );

  // Check if current user is the owner
  const isOwner = createMemo(() => {
    const user = currentUser();
    const proj = project();
    const own = owner();
    if (!user || !proj || !own) return false;
    return user.name === own.username;
  });

  // Mutations
  const updateProject = useMutation(api.projects.update);
  const removeCollaborator = useMutation(api.sharing.removeCollaborator);
  const updateCollaboratorRole = useMutation(api.sharing.updateCollaboratorRole);
  const revokeShareLink = useMutation(api.sharing.revokeShareLink);

  // Loading state
  const isLoading = createMemo(
    () =>
      projectQuery.isLoading() ||
      collaboratorsQuery.isLoading() ||
      shareLinksQuery.isLoading()
  );

  // Handle save general settings
  const handleSaveGeneralSettings = async (e: Event) => {
    e.preventDefault();
    const proj = project();
    if (!proj) return;

    setIsSaving(true);
    setSaveError("");
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
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove collaborator
  const handleRemoveCollaborator = async (userId: string, username: string) => {
    const proj = project();
    if (!proj) return;

    if (!confirm(`Remove @${username} from this project?`)) return;

    try {
      await removeCollaborator.mutate({
        projectId: proj._id,
        userId,
      });
    } catch (err) {
      console.error("Failed to remove collaborator:", err);
    }
  };

  // Handle update collaborator role
  const handleUpdateRole = async (
    userId: string,
    newRole: "viewer" | "editor"
  ) => {
    const proj = project();
    if (!proj) return;

    try {
      await updateCollaboratorRole.mutate({
        projectId: proj._id,
        userId,
        role: newRole,
      });
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  // Handle revoke share link
  const handleRevokeShareLink = async (linkId: string) => {
    if (!confirm("Revoke this share link? Anyone using it will lose access."))
      return;

    try {
      await revokeShareLink.mutate({ linkId });
    } catch (err) {
      console.error("Failed to revoke share link:", err);
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
      console.error("Failed to copy:", err);
    }
  };

  // Handle project deletion
  const handleProjectDeleted = () => {
    navigate("/dashboard");
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main class="min-h-screen bg-base-200">
      <Title>
        Settings - {project()?.displayName ?? projectSlug()} - Floorplan
      </Title>

      <Show
        when={!isLoading()}
        fallback={
          <div class="flex justify-center items-center h-screen">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        <Show
          when={projectData() && isOwner()}
          fallback={
            <div class="flex justify-center items-center h-screen">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                  <h2 class="card-title">Access Denied</h2>
                  <p>
                    Only the project owner can access settings.
                  </p>
                  <A
                    href={`/u/${username()}/${projectSlug()}`}
                    class="btn btn-primary mt-4"
                  >
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
                    <A href={`/u/${username()}/${projectSlug()}`} class="truncate max-w-[100px] sm:max-w-none">
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
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                      <span class="label-text-alt text-base-content/50">
                        Optional
                      </span>
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
                          ? "Anyone can view this project"
                          : "Only you and collaborators can access"}
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div class="flex items-center gap-4">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      disabled={isSaving()}
                    >
                      <Show when={isSaving()}>
                        <span class="loading loading-spinner loading-sm"></span>
                      </Show>
                      Save Changes
                    </button>

                    <Show when={saveSuccess()}>
                      <span class="text-success flex items-center gap-1">
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Invite
                  </button>
                </div>

                <p class="text-sm text-base-content/60 mt-2">
                  Invite users to collaborate on this project. Editors can make
                  changes, viewers can only view.
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
                                    <div class="bg-neutral text-neutral-content rounded-full w-10">
                                      <Show
                                        when={collab.avatarUrl}
                                        fallback={
                                          <span class="text-sm">
                                            {collab.username
                                              .charAt(0)
                                              .toUpperCase()}
                                          </span>
                                        }
                                      >
                                        <img
                                          src={collab.avatarUrl}
                                          alt={collab.username}
                                        />
                                      </Show>
                                    </div>
                                  </div>
                                  <div>
                                    <div class="font-medium">
                                      @{collab.username}
                                    </div>
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
                                      e.currentTarget.value as "viewer" | "editor"
                                    )
                                  }
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="editor">Editor</option>
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
                                    handleRemoveCollaborator(
                                      collab.userId,
                                      collab.username
                                    )
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
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    Create Link
                  </button>
                </div>

                <p class="text-sm text-base-content/60 mt-2">
                  Create share links to give anyone access without requiring a
                  username.
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
                            <tr class={link.isExpired ? "opacity-50" : ""}>
                              <td>
                                <code class="text-xs bg-base-200 px-2 py-1 rounded">
                                  ...{link.token.slice(-8)}
                                </code>
                              </td>
                              <td>
                                <span
                                  class={`badge badge-sm ${
                                    link.role === "editor"
                                      ? "badge-warning"
                                      : "badge-info"
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
                                  fallback={
                                    <span class="badge badge-ghost badge-sm">
                                      Expired
                                    </span>
                                  }
                                >
                                  <span class="badge badge-success badge-sm">
                                    Active
                                  </span>
                                </Show>
                              </td>
                              <td class="flex gap-1">
                                <Show when={!link.isExpired}>
                                  <button
                                    type="button"
                                    class={`btn btn-ghost btn-sm ${
                                      copiedLinkId() === link._id ? "text-success" : ""
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
                                  onClick={() => handleRevokeShareLink(link._id)}
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

            {/* Danger Zone */}
            <section class="card bg-base-100 shadow border-2 border-error/20">
              <div class="card-body p-4 sm:p-6">
                <h2 class="card-title text-error text-lg sm:text-xl">Danger Zone</h2>

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-t border-base-300 mt-2">
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
          </div>
        </Show>
      </Show>

      {/* Invite Modal */}
      <Show when={project()}>
        <InviteByUsernameModal
          isOpen={showInviteModal()}
          onClose={() => setShowInviteModal(false)}
          projectId={project()!._id}
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
    </main>
  );
}
