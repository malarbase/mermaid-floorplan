import { Title } from "@solidjs/meta";
import { useParams, A, useNavigate } from "@solidjs/router";
import { Show, For, createMemo, createSignal } from "solid-js";
import { useQuery } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { useSession } from "~/lib/auth-client";
import { CreateVersionModal } from "~/components/CreateVersionModal";
import { copyToClipboard, generatePermalink } from "~/lib/permalink";

// Type-safe API reference builder for when generated files don't exist yet
const api = {
  projects: {
    getBySlug: "projects:getBySlug" as unknown as FunctionReference<"query">,
    listVersions: "projects:listVersions" as unknown as FunctionReference<"query">,
    getHistory: "projects:getHistory" as unknown as FunctionReference<"query">,
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

interface Version {
  _id: string;
  name: string;
  snapshotId: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface Snapshot {
  _id: string;
  contentHash: string;
  message?: string;
  createdAt: number;
  authorId: string;
}

/**
 * Version history page - shows all versions and snapshots for a project.
 * Route: /u/:username/:project/history
 */
export default function ProjectHistory() {
  const params = useParams();
  const navigate = useNavigate();
  const sessionSignal = useSession();

  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);

  // Auth state
  const session = createMemo(() => sessionSignal());
  const currentUser = createMemo(() => session()?.data?.user);

  // Query project data
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

  // Check if current user is the owner
  const isOwner = createMemo(() => {
    const user = currentUser();
    const own = owner();
    if (!user || !own) return false;
    return user.name === own.username;
  });

  // Query versions
  const versionsQuery = useQuery(
    api.projects.listVersions,
    () => project() ? { projectId: project()!._id } : "skip"
  );

  const versions = createMemo(() => {
    const data = versionsQuery.data() as Version[] | undefined;
    if (!data) return [];
    // Sort: default version first, then by updatedAt desc
    const defaultVersion = project()?.defaultVersion;
    return [...data].sort((a, b) => {
      if (a.name === defaultVersion) return -1;
      if (b.name === defaultVersion) return 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  // Query snapshots
  const historyQuery = useQuery(
    api.projects.getHistory,
    () => project() ? { projectId: project()!._id, limit: 50 } : "skip"
  );

  const snapshots = createMemo(() => {
    const data = historyQuery.data() as Snapshot[] | undefined;
    return data ?? [];
  });

  // Loading states
  const isLoading = createMemo(
    () => projectQuery.isLoading() || versionsQuery.isLoading() || historyQuery.isLoading()
  );

  // Create version modal state
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

  // Track which snapshot hash was just copied
  const [copiedHash, setCopiedHash] = createSignal<string | null>(null);

  const handleVersionCreated = (versionId: string, versionName: string) => {
    navigate(`/u/${username()}/${projectSlug()}/v/${versionName}`);
  };

  // Copy permalink to clipboard
  const handleCopyPermalink = async (hash: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const u = username();
    const p = projectSlug();
    if (!u || !p) return;
    
    const url = generatePermalink(u, p, hash, true);
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatRelativeDate = (ts: number) => {
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return formatDate(ts);
  };

  return (
    <main class="min-h-screen bg-base-200 px-4 py-6 sm:p-8">
      <Title>{projectSlug()} History - Floorplan</Title>

      <Show
        when={!isLoading()}
        fallback={
          <div class="flex justify-center items-center h-64">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        <Show
          when={projectData()}
          fallback={
            <div class="flex justify-center items-center h-64">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                  <h2 class="card-title">Project not found</h2>
                  <p>This project doesn't exist or you don't have access.</p>
                  <A href="/" class="btn btn-ghost mt-4">Go Home</A>
                </div>
              </div>
            </div>
          }
        >
          <div class="max-w-4xl mx-auto">
            {/* Header */}
            <div class="mb-6 sm:mb-8">
              <div class="text-xs sm:text-sm breadcrumbs mb-2">
                <ul>
                  <li><A href={`/u/${username()}`}>{username()}</A></li>
                  <li><A href={`/u/${username()}/${projectSlug()}`} class="truncate max-w-[100px] sm:max-w-none">{projectSlug()}</A></li>
                  <li>History</li>
                </ul>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 class="text-xl sm:text-2xl md:text-3xl font-bold">{project()?.displayName} - History</h1>
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
                <A
                  href={`/u/${username()}/${projectSlug()}`}
                  class="btn btn-ghost btn-sm w-full sm:w-auto"
                >
                  Back to Project
                </A>
              </div>
            </div>

            {/* Versions Section */}
            <section class="mb-8">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Versions ({versions().length})
                </h2>
                <Show when={isOwner()}>
                  <button
                    class="btn btn-primary btn-sm"
                    onClick={() => setShowCreateVersionModal(true)}
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Version
                  </button>
                </Show>
              </div>

              <div class="text-sm text-base-content/70 mb-4">
                Versions are mutable references (like Git branches). Content changes when the version is updated.
              </div>
              
              <div class="grid gap-3">
                <Show
                  when={versions().length > 0}
                  fallback={
                    <div class="card bg-base-100 shadow">
                      <div class="card-body text-center text-base-content/70">
                        No versions found
                      </div>
                    </div>
                  }
                >
                  <For each={versions()}>
                    {(version) => (
                      <A
                        href={`/u/${username()}/${projectSlug()}/v/${version.name}`}
                        class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                      >
                        <div class="card-body py-3 sm:py-4 px-4">
                          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div class="flex flex-wrap items-center gap-1 sm:gap-2">
                              <svg class="w-4 sm:w-5 h-4 sm:h-5 text-base-content/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span class="font-mono font-semibold text-sm sm:text-base">{version.name}</span>
                              <Show when={version.name === project()?.defaultVersion}>
                                <span class="badge badge-primary badge-xs sm:badge-sm">default</span>
                              </Show>
                              <Show when={version.description}>
                                <span class="text-xs sm:text-sm text-base-content/70 truncate max-w-[150px] sm:max-w-none">
                                  - {version.description}
                                </span>
                              </Show>
                            </div>
                            <div class="flex items-center gap-2 text-xs sm:text-sm">
                              <span class="text-base-content/50">
                                {formatRelativeDate(version.updatedAt)}
                              </span>
                              <span class="badge badge-info badge-xs sm:badge-sm badge-outline">mutable</span>
                            </div>
                          </div>
                        </div>
                      </A>
                    )}
                  </For>
                </Show>
              </div>
            </section>

            {/* Snapshots Section */}
            <section>
              <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Snapshots ({snapshots().length})
              </h2>

              <div class="text-sm text-base-content/70 mb-4">
                Snapshots are immutable permalinks (like Git commits). Content never changes.
              </div>
              
              <div class="grid gap-3">
                <Show
                  when={snapshots().length > 0}
                  fallback={
                    <div class="card bg-base-100 shadow">
                      <div class="card-body text-center text-base-content/70">
                        No snapshots yet. Save changes to create snapshots.
                      </div>
                    </div>
                  }
                >
                  <For each={snapshots()}>
                    {(snapshot) => (
                      <div class="card bg-base-100 shadow hover:shadow-lg transition-shadow">
                        <div class="card-body py-3 sm:py-4 px-4">
                          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <A 
                              href={`/u/${username()}/${projectSlug()}/s/${snapshot.contentHash}`}
                              class="flex flex-wrap items-center gap-1 sm:gap-2 flex-1 hover:text-primary transition-colors min-w-0"
                            >
                              <svg class="w-4 sm:w-5 h-4 sm:h-5 text-base-content/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span class="font-mono text-xs sm:text-sm bg-base-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[120px] sm:max-w-none">
                                #{snapshot.contentHash}
                              </span>
                              <Show when={snapshot.message}>
                                <span class="text-xs sm:text-sm text-base-content/70 truncate max-w-[150px] sm:max-w-[300px]">
                                  {snapshot.message}
                                </span>
                              </Show>
                            </A>
                            <div class="flex items-center gap-2 text-xs sm:text-sm">
                              {/* Copy Permalink Button */}
                              <button
                                type="button"
                                class="btn btn-ghost btn-xs gap-1"
                                onClick={(e) => handleCopyPermalink(snapshot.contentHash, e)}
                                title="Copy permalink"
                              >
                                <Show
                                  when={copiedHash() !== snapshot.contentHash}
                                  fallback={
                                    <>
                                      <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span class="text-success text-xs">Copied!</span>
                                    </>
                                  }
                                >
                                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span class="text-xs hidden sm:inline">Copy</span>
                                </Show>
                              </button>
                              <span class="text-base-content/50 hidden sm:inline">
                                {formatRelativeDate(snapshot.createdAt)}
                              </span>
                              <span class="text-base-content/50 sm:hidden">
                                {formatRelativeDate(snapshot.createdAt).split(' ')[0]}
                              </span>
                              <span class="badge badge-success badge-xs sm:badge-sm badge-outline hidden sm:inline-flex">permanent</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </section>
          </div>

          {/* Create Version Modal */}
          <Show when={isOwner() && project() && username() && projectSlug()}>
            <CreateVersionModal
              isOpen={showCreateVersionModal()}
              onClose={() => setShowCreateVersionModal(false)}
              projectId={project()!._id}
              fromVersion={project()?.defaultVersion}
              username={username()!}
              projectSlug={projectSlug()!}
              onSuccess={handleVersionCreated}
            />
          </Show>
        </Show>
      </Show>
    </main>
  );
}
