import { useParams, A, useNavigate, useLocation, useSearchParams } from "@solidjs/router";
import { Show, createMemo, createSignal } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useQuery } from "convex-solidjs";
import { VisibilityToggle } from "~/components/VisibilityToggle";
import { VersionSwitcher } from "~/components/VersionSwitcher";
import { CreateVersionModal } from "~/components/CreateVersionModal";
import { CopyPermalinkButton } from "~/components/CopyPermalinkButton";
import { Header } from "~/components/Header";
import { ForkButton } from "~/components/ForkButton";
import {
  ProjectPageLayout,
  ProjectBreadcrumbs,
  NotFoundCard,
  ContentMissingCard,
  SettingsIcon,
} from "~/components/project/ProjectPageLayout";
import { useProjectData, useVersionData } from "~/hooks/useProjectData";
import { projectApi } from "~/lib/project-types";
import type { ViewerMode } from "~/components/viewer/FloorplanContainer";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(
  () => import("~/components/viewer/FloorplanContainer")
);

/**
 * Project view page - shows project at default version.
 * Route: /u/:username/:project
 *
 * This shows the default version (usually "main") with editing capabilities
 * for owners and editors.
 */
export default function ProjectView() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

  // Route params
  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);

  // Check for slug redirects before loading project
  const slugResolveQuery = useQuery(
    projectApi.projects.resolveSlug,
    () => ({
      username: username(),
      slug: projectSlug(),
    })
  );

  // Handle redirect if slug has changed
  createMemo(() => {
    const resolved = slugResolveQuery.data();
    if (resolved && resolved.wasRedirected) {
      const newUrl = `/u/${username()}/${resolved.currentSlug}${location.search}${location.hash}`;
      navigate(newUrl, { replace: true });
    }
  });

  // Project data
  const {
    project,
    owner,
    forkedFrom,
    projectData,
    isOwner,
    isProjectLoading,
    projectNotFound,
  } = useProjectData(username, projectSlug);

  // Version data (default version)
  const defaultVersion = createMemo(() => project()?.defaultVersion ?? "main");
  const { content, currentHash, isVersionLoading } = useVersionData(
    () => project()?._id as string | undefined,
    defaultVersion
  );

  // Loading state
  const isLoading = createMemo(() => {
    if (isProjectLoading()) return true;
    if (projectNotFound()) return false;
    return isVersionLoading();
  });

  // Content missing check
  const isContentMissing = createMemo(() => {
    if (isLoading()) return false;
    if (!projectData()) return false;
    return !content();
  });

  // Viewer mode
  const mode = createMemo((): ViewerMode => {
    const modeParam = typeof searchParams.mode === "string" ? searchParams.mode : undefined;
    if (modeParam && ["basic", "advanced", "editor"].includes(modeParam)) {
      return modeParam as ViewerMode;
    }
    return isOwner() ? "editor" : "advanced";
  });

  // Handle save success
  const handleSaveSuccess = (result: { snapshotId: string; hash: string }) => {
    console.log("Saved snapshot:", result.hash);
  };

  // Header actions
  const headerActions = () => (
    <>
      {/* Version Switcher */}
      <Show when={project() && username() && projectSlug()}>
        <VersionSwitcher
          projectId={project()!._id as string}
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
          projectId={project()!._id as string}
          isPublic={project()?.isPublic ?? false}
        />
      </Show>

      <Show when={isOwner()}>
        <A
          href={`/u/${username()}/${projectSlug()}/settings`}
          class="btn btn-ghost btn-sm"
        >
          <SettingsIcon />
        </A>
      </Show>

      <button
        class="badge badge-outline cursor-pointer hover:badge-primary transition-colors min-w-[6.5rem] justify-center"
        onClick={() => {
          const modes: ViewerMode[] = ["basic", "advanced", "editor"];
          const currentIndex = modes.indexOf(mode());
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setSearchParams({ mode: nextMode });
        }}
        title="Click to cycle viewer modes"
      >
        {mode() === "editor"
          ? "✏️ Editor"
          : mode() === "advanced"
            ? "⚙️ Advanced"
            : "👁️ Basic"}
      </button>

      {/* Fork button for non-owners */}
      <Show when={!isOwner() && project()}>
        <ForkButton
          projectId={project()!._id as string}
          projectSlug={projectSlug()!}
          projectName={project()!.displayName}
          ownerUsername={username()!}
          size="sm"
          variant="ghost"
        />
      </Show>
    </>
  );

  return (
    <ProjectPageLayout
      title={`${project()?.displayName ?? projectSlug()} - Floorplan`}
      isLoading={isLoading()}
      showNotFound={projectNotFound()}
      notFoundFallback={
        <NotFoundCard
          title="Project not found"
          message="This project doesn't exist or you don't have access."
          actions={
            <A href="/" class="btn btn-primary">
              Go Home
            </A>
          }
        />
      }
    >
      {/* Header */}
      <Header
        centerContent={
          <ProjectBreadcrumbs
            username={username()!}
            projectSlug={projectSlug()!}
            project={project()}
            forkedFrom={forkedFrom()}
            compact
          />
        }
        actions={headerActions()}
        hideUserMenu={false}
      />

      {/* Viewer/Editor Container */}
      <div class="flex-1 overflow-hidden">
        <Show
          when={!isContentMissing()}
          fallback={
            <ContentMissingCard
              username={username()!}
              projectSlug={projectSlug()!}
              message="This project version has no content. The data may be corrupted or missing."
            />
          }
        >
          <FloorplanContainer
            dsl={content()!}
            mode={mode()}
            onDslChange={(newDsl: string) => {
              console.log("DSL changed:", newDsl.slice(0, 100));
            }}
          />
        </Show>
      </div>

      {/* Create Version Modal */}
      <Show when={isOwner() && project() && username() && projectSlug()}>
        <CreateVersionModal
          isOpen={showCreateVersionModal()}
          onClose={() => setShowCreateVersionModal(false)}
          projectId={project()!._id as string}
          fromVersion={project()?.defaultVersion}
          username={username()!}
          projectSlug={projectSlug()!}
          onSuccess={(versionId, versionName) => {
            // Navigation is handled by the modal
          }}
        />
      </Show>
    </ProjectPageLayout>
  );
}
