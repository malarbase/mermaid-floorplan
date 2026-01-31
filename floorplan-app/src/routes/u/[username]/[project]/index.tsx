import { Title } from "@solidjs/meta";
import { useParams, A } from "@solidjs/router";
import { Show, createMemo, createSignal } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useQuery } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { useSession } from "~/lib/auth-client";
import { VisibilityToggle } from "~/components/VisibilityToggle";
import { VersionSwitcher } from "~/components/VersionSwitcher";
import { CreateVersionModal } from "~/components/CreateVersionModal";
import { CopyPermalinkButton } from "~/components/CopyPermalinkButton";
import { ForkButton } from "~/components/ForkButton";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanEditor = clientOnly(
  () => import("~/components/FloorplanEditor")
);

// Type-safe API reference builder for when generated files don't exist yet
const api = {
  projects: {
    getBySlug: "projects:getBySlug" as unknown as FunctionReference<"query">,
    getVersion: "projects:getVersion" as unknown as FunctionReference<"query">,
  },
};

// Project and owner types
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

interface Snapshot {
  content: string;
  contentHash: string;
  message?: string;
  createdAt: number;
}

interface VersionData {
  version: { name: string; snapshotId: string };
  snapshot: Snapshot | null;
}

/**
 * Project view page - shows project at default version.
 * Route: /u/:username/:project
 *
 * This shows the default version (usually "main") with editing capabilities
 * for owners and editors.
 */
export default function ProjectView() {
  const params = useParams();
  const sessionSignal = useSession();
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

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

  // Derived project data
  const projectData = createMemo(() => {
    const data = projectQuery.data() as { project: Project; owner: Owner; forkedFrom: ForkedFrom | null } | null | undefined;
    return data;
  });

  const project = createMemo(() => projectData()?.project);
  const owner = createMemo(() => projectData()?.owner);
  const forkedFrom = createMemo(() => projectData()?.forkedFrom);

  // Query version data (default version)
  const versionQuery = useQuery(
    api.projects.getVersion,
    () =>
      project()
        ? {
            projectId: project()!._id,
            versionName: project()!.defaultVersion,
          }
        : "skip"
  );

  const versionData = createMemo(() => {
    const data = versionQuery.data() as VersionData | null | undefined;
    return data;
  });

  const content = createMemo(
    () =>
      versionData()?.snapshot?.content ??
      `floorplan ${projectSlug()}
  floor MainFloor 40x30
    room LivingRoom 20x15 at 0,0
      door south
    room Kitchen 15x12 at 20,0
      door west`
  );

  const currentHash = createMemo(() => versionData()?.snapshot?.contentHash);

  // Check if current user is the owner
  const isOwner = createMemo(() => {
    const user = currentUser();
    const proj = project();
    const own = owner();
    if (!user || !proj || !own) return false;
    // Compare by username (since we may not have internal user IDs in session)
    return user.name === own.username;
  });

  // Loading state
  const isLoading = createMemo(
    () => projectQuery.isLoading() || versionQuery.isLoading()
  );

  // Handle save success
  const handleSaveSuccess = (result: { snapshotId: string; hash: string }) => {
    console.log("Saved snapshot:", result.hash);
  };

  return (
    <main class="h-screen flex flex-col bg-base-200">
      <Title>
        {project()?.displayName ?? projectSlug()} - Floorplan
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
          when={projectData()}
          fallback={
            <div class="flex justify-center items-center h-screen">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                  <h2 class="card-title">Project not found</h2>
                  <p>This project doesn't exist or you don't have access.</p>
                  <A href="/" class="btn btn-primary mt-4">
                    Go Home
                  </A>
                </div>
              </div>
            </div>
          }
        >
          {/* Project Header */}
          <header class="bg-base-100 border-b border-base-300 px-3 sm:px-4 py-2 sm:py-3">
            <div class="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div class="min-w-0 flex-1">
                <div class="text-xs sm:text-sm breadcrumbs">
                  <ul>
                    <li>
                      <A href={`/u/${username()}`}>{username()}</A>
                    </li>
                    <li class="truncate">{projectSlug()}</li>
                  </ul>
                </div>
                <h1 class="text-base sm:text-xl font-bold truncate">{project()?.displayName}</h1>
                {/* Forked from attribution */}
                <Show when={forkedFrom()}>
                  <div class="text-xs sm:text-sm text-base-content/60 flex items-center gap-1">
                    <svg
                      class="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0"
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
                    <span class="hidden sm:inline">forked from</span>
                    <span class="sm:hidden">from</span>
                    <A
                      href={`/u/${forkedFrom()!.owner.username}/${forkedFrom()!.project.slug}`}
                      class="link link-hover font-medium truncate"
                    >
                      {forkedFrom()!.owner.username}/{forkedFrom()!.project.slug}
                    </A>
                  </div>
                </Show>
              </div>

              <div class="flex flex-wrap items-center gap-1 sm:gap-2">
                {/* Version Switcher */}
                <Show when={project() && username() && projectSlug()}>
                  <VersionSwitcher
                    projectId={project()!._id}
                    username={username()!}
                    projectSlug={projectSlug()!}
                    defaultVersion={project()?.defaultVersion}
                    currentVersion={project()?.defaultVersion ?? "main"}
                    canCreateVersion={isOwner()}
                    onCreateNew={() => setShowCreateVersionModal(true)}
                    size="sm"
                  />
                </Show>

                {/* Permalink with copy button */}
                <Show when={currentHash() && username() && projectSlug()}>
                  <div class="flex items-center gap-1">
                    <A
                      href={`/u/${username()}/${projectSlug()}/s/${currentHash()}`}
                      class="badge badge-ghost font-mono"
                      title="Permalink to this version"
                    >
                      #{currentHash()?.slice(0, 6)}
                    </A>
                    <CopyPermalinkButton
                      username={username()!}
                      projectSlug={projectSlug()!}
                      hash={currentHash()!}
                      size="xs"
                      variant="ghost"
                    />
                  </div>
                </Show>

                <A
                  href={`/u/${username()}/${projectSlug()}/history`}
                  class="btn btn-ghost btn-sm"
                >
                  History
                </A>

                {/* Visibility toggle for owners, static badge for others */}
                <Show
                  when={isOwner()}
                  fallback={
                    <Show when={project()?.isPublic}>
                      <span class="badge badge-success badge-outline">Public</span>
                    </Show>
                  }
                >
                  <VisibilityToggle
                    projectId={project()!._id}
                    isPublic={project()?.isPublic ?? false}
                  />
                </Show>

                {/* Fork button for non-owners */}
                <Show when={!isOwner() && project() && username()}>
                  <ForkButton
                    projectId={project()!._id}
                    projectSlug={projectSlug()!}
                    projectName={project()!.displayName}
                    ownerUsername={username()!}
                    size="sm"
                    variant="ghost"
                  />
                </Show>

                <Show when={isOwner()}>
                  <A
                    href={`/u/${username()}/${projectSlug()}/settings`}
                    class="btn btn-ghost btn-sm"
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </A>
                </Show>
              </div>
            </div>
          </header>

          {/* Viewer/Editor Container */}
          <div class="flex-1 overflow-hidden">
            <FloorplanEditor
              initialContent={content()}
              projectId={project()?._id}
              versionName={project()?.defaultVersion}
              editable={isOwner()}
              theme="dark"
              projectName={project()?.displayName}
              username={username()}
              projectSlug={projectSlug()}
              currentHash={currentHash()}
              onSave={handleSaveSuccess}
            />
          </div>
        </Show>
      </Show>

      {/* Create Version Modal */}
      <Show when={isOwner() && project() && username() && projectSlug()}>
        <CreateVersionModal
          isOpen={showCreateVersionModal()}
          onClose={() => setShowCreateVersionModal(false)}
          projectId={project()!._id}
          fromVersion={project()?.defaultVersion}
          username={username()!}
          projectSlug={projectSlug()!}
          onSuccess={(versionId, versionName) => {
            // Navigation is handled by the modal
          }}
        />
      </Show>
    </main>
  );
}
