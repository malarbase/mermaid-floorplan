import { Title } from "@solidjs/meta";
import { useParams, A, useNavigate } from "@solidjs/router";
import { Show, createMemo, createSignal } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useQuery } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { useSession } from "~/lib/auth-client";
import { UserMenu } from "~/components/UserMenu";
import { CreateVersionModal } from "~/components/CreateVersionModal";
import { VersionSwitcher } from "~/components/VersionSwitcher";
import { PermalinkDisplay } from "~/components/PermalinkDisplay";
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
 * Version view page - shows project at a specific named version.
 * Route: /u/:username/:project/v/:version
 *
 * Versions are mutable references (like git branches).
 * The content shown here updates when the version is updated.
 * Owners/editors can edit and save to this version.
 */
export default function VersionView() {
  const params = useParams();
  const navigate = useNavigate();
  const sessionSignal = useSession();
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);
  const versionName = createMemo(() => params.version);

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

  // Query version data
  const versionQuery = useQuery(
    api.projects.getVersion,
    () => ({
      projectId: project()?._id ?? ("" as any),
      versionName: versionName(),
    }),
    () => ({ enabled: !!project()?._id })
  );

  const versionData = createMemo(() => {
    const data = versionQuery.data() as VersionData | null | undefined;
    return data;
  });

  const content = createMemo(() => versionData()?.snapshot?.content);
  const currentHash = createMemo(() => versionData()?.snapshot?.contentHash);

  const isOwner = createMemo(() => {
    const user = currentUser();
    const own = owner();
    if (!user || !own) return false;
    return (user.username ?? user.name) === own.username;
  });

  const isLoading = createMemo(() => {
    if (projectQuery.isLoading() || projectQuery.data() === undefined) return true;
    if (projectQuery.data() === null) return false;
    return versionQuery.isLoading() || versionQuery.data() === undefined;
  });

  const versionExists = createMemo(() => versionData()?.version != null);

  const isContentMissing = createMemo(() => {
    if (isLoading()) return false;
    if (!projectData() || !versionExists()) return false;
    return !content();
  });

  // Handle save success
  const handleSaveSuccess = (result: { snapshotId: string; hash: string }) => {
    console.log("Saved snapshot:", result.hash);
  };

  // Handle version created
  const handleVersionCreated = (versionId: string, versionName: string) => {
    navigate(`/u/${username()}/${projectSlug()}/v/${versionName}`);
  };

  return (
    <main class="h-screen flex flex-col bg-base-200">
      <Title>
        {projectSlug()} v/{versionName()} - Floorplan
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
          when={projectData() && versionExists()}
          fallback={
            <div class="flex justify-center items-center h-screen">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                  <h2 class="card-title">
                    {!projectData() ? "Project not found" : "Version not found"}
                  </h2>
                  <p>
                    {!projectData()
                      ? "This project doesn't exist or you don't have access."
                      : `Version "${versionName()}" doesn't exist.`}
                  </p>
                  <div class="flex gap-2 justify-center mt-4">
                    <A href="/" class="btn btn-ghost">
                      Go Home
                    </A>
                    <Show when={projectData()}>
                      <A
                        href={`/u/${username()}/${projectSlug()}`}
                        class="btn btn-primary"
                      >
                        View Project
                      </A>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          {/* Header */}
          <header class="bg-base-100 border-b border-base-300 px-4 py-3">
            <div class="max-w-6xl mx-auto flex items-center justify-between">
              <div class="flex items-center gap-4">
                <A href="/" class="btn btn-ghost text-xl tracking-wider flex-shrink-0" style={{ "font-family": "'Bebas Neue', sans-serif" }}>
                  FLOORPLAN
                </A>
                <div>
                  <div class="text-sm breadcrumbs">
                    <ul>
                      <li>
                        <A href={`/u/${username()}`}>{username()}</A>
                      </li>
                      <li>
                        <A href={`/u/${username()}/${projectSlug()}`}>
                          {projectSlug()}
                        </A>
                      </li>
                      <li>v/{versionName()}</li>
                    </ul>
                  </div>
                <h1 class="text-xl font-bold">
                  {project()?.displayName}{" "}
                  <span class="text-base-content/50 font-normal">
                    / {versionName()}
                  </span>
                </h1>
                {/* Forked from attribution */}
                <Show when={forkedFrom()}>
                  <div class="text-sm text-base-content/60 flex items-center gap-1">
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
              </div>

              <div class="flex items-center gap-2">
                {/* Version Switcher */}
                <Show when={project() && username() && projectSlug() && versionName()}>
                  <VersionSwitcher
                    projectId={project()!._id}
                    username={username()!}
                    projectSlug={projectSlug()!}
                    defaultVersion={project()?.defaultVersion}
                    currentVersion={versionName()!}
                    canCreateVersion={isOwner()}
                    onCreateNew={() => setShowCreateVersionModal(true)}
                    size="sm"
                  />
                </Show>

                {/* Permalink Display */}
                <Show when={currentHash() && username() && projectSlug()}>
                  <PermalinkDisplay
                    username={username()!}
                    projectSlug={projectSlug()!}
                    hash={currentHash()!}
                    variant="badge"
                    showCopyButton
                    isCurrent
                  />
                </Show>

                <span class="badge badge-info badge-outline">Mutable URL</span>

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

                <div class="divider divider-horizontal mx-2 h-6 self-center" />
                <UserMenu size="sm" />
              </div>
            </div>
          </header>

          {/* Info Banner */}
          <div class="bg-info/10 border-b border-info/20 px-4 py-2 text-sm text-center text-info-content">
            <div class="flex items-center justify-center gap-2">
              <span>
                This is a mutable URL - content updates when the version is updated.
              </span>
              <Show when={currentHash() && username() && projectSlug()}>
                <span class="hidden sm:inline">For a permanent link:</span>
                <CopyPermalinkButton
                  username={username()!}
                  projectSlug={projectSlug()!}
                  hash={currentHash()!}
                  size="xs"
                  showLabel
                  label="Copy Permalink"
                />
              </Show>
            </div>
          </div>

          {/* Viewer/Editor Container */}
          <div class="flex-1 overflow-hidden">
            <Show
              when={!isContentMissing()}
              fallback={
                <div class="flex justify-center items-center h-full">
                  <div class="card bg-error/10 border border-error">
                    <div class="card-body text-center">
                      <h2 class="card-title text-error">Content Not Available</h2>
                      <p class="text-base-content/70">
                        This version has no content. The data may be corrupted or missing.
                      </p>
                      <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-outline btn-sm mt-4">
                        View Default Version
                      </A>
                    </div>
                  </div>
                </div>
              }
            >
              <FloorplanEditor
                initialContent={content()!}
                projectId={project()?._id}
                versionName={versionName()}
                editable={isOwner()}
                theme="dark"
                projectName={project()?.displayName}
                username={username()}
                projectSlug={projectSlug()}
                currentHash={currentHash()}
                onSave={handleSaveSuccess}
              />
            </Show>
          </div>
        </Show>
      </Show>

      {/* Create Version Modal */}
      <Show when={isOwner() && project() && username() && projectSlug()}>
        <CreateVersionModal
          isOpen={showCreateVersionModal()}
          onClose={() => setShowCreateVersionModal(false)}
          projectId={project()!._id}
          fromVersion={versionName()}
          username={username()!}
          projectSlug={projectSlug()!}
          onSuccess={handleVersionCreated}
        />
      </Show>
    </main>
  );
}
