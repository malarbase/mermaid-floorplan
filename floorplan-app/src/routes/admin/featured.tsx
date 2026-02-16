import { useMutation, useQuery } from 'convex-solidjs';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { ConfirmationModal } from '~/components/ui/ConfirmationModal';
import { useToast } from '~/components/ui/Toast';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface Project {
  _id: Id<'projects'>;
  displayName: string;
  slug: string;
  ownerUsername: string;
  viewCount: number;
  forkCount: number;
  isFeatured: boolean;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function FeaturedProjects() {
  const [search, setSearch] = createSignal('');
  const [filter, setFilter] = createSignal<
    'all' | 'featured' | 'not-featured' | 'public' | 'private'
  >('all');
  const [limit, setLimit] = createSignal(50);
  const toast = useToast();

  const projects = useQuery(api.admin.listAllProjects, () => ({
    search: search(),
    limit: limit(),
  }));

  const setFeatured = useMutation(api.admin.setFeatured);
  const deleteProject = useMutation(api.admin.deleteProject);

  const adminStatus = useQuery(api.admin.getCurrentUserAdminStatus, {});
  const isSuperAdmin = () => adminStatus.data()?.isSuperAdmin ?? false;

  // Modal state for featuring a private project
  const [featureWarning, setFeatureWarning] = createSignal<{
    projectId: Id<'projects'>;
    projectName: string;
  } | null>(null);

  // Modal state for delete confirmation
  const [deleteTarget, setDeleteTarget] = createSignal<{
    projectId: Id<'projects'>;
    projectName: string;
  } | null>(null);

  const filteredProjects = createMemo(() => {
    const allProjects = projects.data() as Project[] | undefined;
    if (!allProjects) return [];

    const currentFilter = filter();
    if (currentFilter === 'all') return allProjects;
    if (currentFilter === 'featured') return allProjects.filter((p) => p.isFeatured);
    if (currentFilter === 'not-featured') return allProjects.filter((p) => !p.isFeatured);
    if (currentFilter === 'public') return allProjects.filter((p) => p.isPublic);
    if (currentFilter === 'private') return allProjects.filter((p) => !p.isPublic);
    return allProjects;
  });

  const handleToggle = async (
    projectId: Id<'projects'>,
    currentFeatured: boolean,
    projectName: string,
    isPublic: boolean,
  ) => {
    // Warn when featuring a private project — show modal instead of proceeding
    if (!currentFeatured && !isPublic) {
      setFeatureWarning({ projectId, projectName });
      return;
    }

    await doSetFeatured(projectId, !currentFeatured, projectName);
  };

  const doSetFeatured = async (
    projectId: Id<'projects'>,
    isFeatured: boolean,
    projectName: string,
  ) => {
    try {
      await setFeatured.mutate({ projectId, isFeatured });
      toast.success(
        isFeatured
          ? `Added "${projectName}" to featured`
          : `Removed "${projectName}" from featured`,
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to update featured status');
    }
  };

  const handleDelete = (projectId: Id<'projects'>, projectName: string) => {
    setDeleteTarget({ projectId, projectName });
  };

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;

    try {
      await deleteProject.mutate({ projectId: target.projectId });
      toast.success(`Project "${target.projectName}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div class="p-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Featured Projects</h1>
          <p class="text-base-content/60 mt-1">
            Curate high-quality floorplans for the explore page
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div class="join w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search projects..."
              class="input input-bordered join-item w-full sm:w-64"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>

          <select
            class="select select-bordered w-full sm:w-auto"
            value={filter()}
            onChange={(e) =>
              setFilter(
                e.currentTarget.value as 'all' | 'featured' | 'not-featured' | 'public' | 'private',
              )
            }
          >
            <option value="all">All Projects</option>
            <option value="featured">Featured Only</option>
            <option value="not-featured">Not Featured</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr class="bg-base-200/50">
                <th class="w-12"></th>
                <th>Project</th>
                <th>Owner</th>
                <th class="text-right">Stats</th>
                <th class="text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              <Show when={projects.isLoading()}>
                <For each={Array(5)}>
                  {() => (
                    <tr class="animate-pulse">
                      <td>
                        <div class="h-4 w-4 bg-base-300 rounded"></div>
                      </td>
                      <td>
                        <div class="h-4 w-32 bg-base-300 rounded mb-2"></div>
                        <div class="h-3 w-20 bg-base-200 rounded"></div>
                      </td>
                      <td>
                        <div class="h-4 w-24 bg-base-300 rounded"></div>
                      </td>
                      <td>
                        <div class="h-4 w-16 bg-base-300 rounded ml-auto"></div>
                      </td>
                      <td>
                        <div class="h-8 w-32 bg-base-300 rounded ml-auto"></div>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>

              <Show when={!projects.isLoading() && filteredProjects().length === 0}>
                <tr>
                  <td colspan="5" class="text-center py-12 text-base-content/50">
                    No projects found matching your criteria
                  </td>
                </tr>
              </Show>

              <For each={filteredProjects()}>
                {(project) => (
                  <tr class="hover:bg-base-200/30 transition-colors">
                    <td class="text-center">
                      <Show when={project.isFeatured}>
                        <span class="text-yellow-500 text-xl" title="Featured">
                          ★
                        </span>
                      </Show>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <span class="font-bold">{project.displayName || 'Untitled Project'}</span>
                        <span
                          class={`badge badge-xs ${project.isPublic ? 'badge-success' : 'badge-ghost text-base-content/40'}`}
                          title={project.isPublic ? 'Public' : 'Private'}
                        >
                          {project.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <div class="text-xs text-base-content/60 font-mono mt-0.5">
                        {project.slug}
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="avatar placeholder">
                          <div class="bg-neutral text-neutral-content rounded-full w-6 flex items-center justify-center">
                            <span class="text-xs">{project.ownerUsername[0]?.toUpperCase()}</span>
                          </div>
                        </div>
                        <span class="text-sm">{project.ownerUsername}</span>
                      </div>
                    </td>
                    <td class="text-right">
                      <div class="flex justify-end gap-4 text-xs font-medium text-base-content/70">
                        <span class="flex items-center gap-1" title="Views">
                          <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          {project.viewCount}
                        </span>
                        <span class="flex items-center gap-1" title="Forks">
                          <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                          {project.forkCount}
                        </span>
                      </div>
                    </td>
                    <td class="text-right">
                      <div class="flex justify-end gap-2">
                        <button
                          type="button"
                          class={`btn btn-sm w-28 ${
                            project.isFeatured
                              ? 'btn-warning btn-outline hover:btn-error hover:text-white hover:border-error'
                              : 'btn-ghost border-base-300'
                          }`}
                          onClick={() =>
                            handleToggle(
                              project._id,
                              project.isFeatured,
                              project.displayName || 'Untitled',
                              project.isPublic,
                            )
                          }
                        >
                          {project.isFeatured ? (
                            <>
                              <span class="group-hover:hidden">Featured</span>
                              <span class="hidden group-hover:inline">Unfeature</span>
                            </>
                          ) : (
                            'Feature'
                          )}
                        </button>

                        <Show when={isSuperAdmin()}>
                          <button
                            type="button"
                            class="btn btn-sm btn-error btn-outline"
                            onClick={() =>
                              handleDelete(project._id, project.displayName || 'Untitled')
                            }
                            title="Super Admin: Delete project"
                          >
                            🗑️
                          </button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <Show when={projects.data()?.length === limit()}>
          <div class="p-4 border-t border-base-200 flex justify-center bg-base-50">
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              onClick={() => setLimit((l) => l + 50)}
              disabled={projects.isLoading()}
            >
              Load more projects
            </button>
          </div>
        </Show>
      </div>

      {/* Feature private project warning modal */}
      <ConfirmationModal
        isOpen={featureWarning() !== null}
        onClose={() => setFeatureWarning(null)}
        title="Feature a private project?"
        description={`"${featureWarning()?.projectName}" is a private project. It will appear on the explore page, but other users won't be able to open or view it.`}
        confirmLabel="Feature Anyway"
        confirmClass="btn-warning"
        onConfirm={async () => {
          const w = featureWarning();
          if (w) {
            await doSetFeatured(w.projectId, true, w.projectName);
          }
          setFeatureWarning(null);
        }}
      />

      {/* Delete project confirmation modal */}
      <ConfirmationModal
        isOpen={deleteTarget() !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete project permanently?"
        confirmLabel="Delete Project"
        confirmClass="btn-error"
        typedConfirmation={deleteTarget()?.projectName}
        onConfirm={confirmDelete}
      >
        <div class="space-y-2">
          <p class="text-base-content/70">
            This will permanently delete <strong>{deleteTarget()?.projectName}</strong> along with
            all its versions, snapshots, access permissions, share links, and topics.
          </p>
          <p class="text-error font-medium text-sm">This action cannot be undone.</p>
        </div>
      </ConfirmationModal>
    </div>
  );
}
