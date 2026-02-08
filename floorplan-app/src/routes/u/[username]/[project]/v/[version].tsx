import { useParams, A, useNavigate, useSearchParams } from "@solidjs/router";
import { Show, createMemo, createSignal, createEffect, onCleanup } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useMutation } from "convex-solidjs";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

  // Route params
  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);
  const versionName = createMemo(() => params.version);

  // Project data
  const {
    project,
    forkedFrom,
    projectData,
    isOwner,
    isProjectLoading,
    projectNotFound,
  } = useProjectData(username, projectSlug);

  // Version data
  const { content, currentHash, versionExists, isVersionLoading } = useVersionData(
    () => project()?._id as string | undefined,
    versionName
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
    if (!projectData() || !versionExists()) return false;
    return !content();
  });

  // Viewer mode (consistent with index.tsx)
  const mode = createMemo((): ViewerMode => {
    const modeParam = typeof searchParams.mode === "string" ? searchParams.mode : undefined;
    if (modeParam && ["basic", "advanced", "editor"].includes(modeParam)) {
      return modeParam as ViewerMode;
    }
    return isOwner() ? "editor" : "advanced";
  });

  // --- Save functionality ---
  const saveMutation = useMutation(projectApi.projects.save);
  const [currentDsl, setCurrentDsl] = createSignal<string>("");
  const [isSaving, setIsSaving] = createSignal(false);
  const [showSaveSuccess, setShowSaveSuccess] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [lastSavedContent, setLastSavedContent] = createSignal<string>("");

  // Sync initial content
  createEffect(() => {
    const c = content();
    if (c) {
      setCurrentDsl(c);
      setLastSavedContent(c);
    }
  });

  const hasUnsavedChanges = createMemo(() => currentDsl() !== lastSavedContent());

  const handleDslChange = (newDsl: string) => {
    setCurrentDsl(newDsl);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!isOwner() || !project()?._id || !versionName() || !hasUnsavedChanges() || isSaving()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await saveMutation.mutate({
        projectId: project()!._id as string,
        versionName: versionName()!,
        content: currentDsl(),
      });
      setLastSavedContent(currentDsl());
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut (Ctrl+S / Cmd+S)
  createEffect(() => {
    if (!isOwner()) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
  });

  // Warn before leaving with unsaved changes
  createEffect(() => {
    if (hasUnsavedChanges()) {
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", onBeforeUnload);
      onCleanup(() => window.removeEventListener("beforeunload", onBeforeUnload));
    }
  });

  // Handle version created
  const handleVersionCreated = (versionId: string, newVersionName: string) => {
    navigate(`/u/${username()}/${projectSlug()}/v/${newVersionName}`);
  };

  // Header actions (consistent with index.tsx)
  const headerActions = () => (
    <>
      {/* Version Switcher */}
      <Show when={project() && username() && projectSlug() && versionName()}>
        <VersionSwitcher
          projectId={project()!._id as string}
          username={username()!}
          projectSlug={projectSlug()!}
          defaultVersion={project()?.defaultVersion}
          currentVersion={versionName()!}
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

      {/* Save indicator + button (owner only, editor mode) */}
      <Show when={isOwner()}>
        <Show when={hasUnsavedChanges()}>
          <button
            type="button"
            class="btn btn-primary btn-sm gap-1"
            onClick={handleSave}
            disabled={isSaving()}
            title="Save (Ctrl+S)"
          >
            <Show
              when={!isSaving()}
              fallback={<span class="loading loading-spinner loading-xs"></span>}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </Show>
            Save
          </button>
        </Show>
        <Show when={showSaveSuccess()}>
          <span class="badge badge-success badge-sm gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        </Show>
        <Show when={saveError()}>
          <div class="tooltip tooltip-error" data-tip={saveError()}>
            <span class="badge badge-error badge-sm">Save failed</span>
          </div>
        </Show>
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
      title={`${projectSlug()} v/${versionName()} - Floorplan`}
      isLoading={isLoading()}
      showNotFound={projectNotFound() || (!isLoading() && !versionExists())}
      notFoundFallback={
        <NotFoundCard
          title={!projectData() ? "Project not found" : "Version not found"}
          message={
            !projectData()
              ? "This project doesn't exist or you don't have access."
              : `Version "${versionName()}" doesn't exist.`
          }
          actions={
            <>
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
            </>
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
            breadcrumbSuffix={`v/${versionName()}`}
            titleSuffix={
              <span class="text-base-content/50 font-normal">/ {versionName()}</span>
            }
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
              message="This version has no content. The data may be corrupted or missing."
            />
          }
        >
          <FloorplanContainer
            dsl={content()!}
            mode={mode()}
            onDslChange={handleDslChange}
          />
        </Show>
      </div>

      {/* Create Version Modal */}
      <Show when={isOwner() && project() && username() && projectSlug()}>
        <CreateVersionModal
          isOpen={showCreateVersionModal()}
          onClose={() => setShowCreateVersionModal(false)}
          projectId={project()!._id as string}
          fromVersion={versionName()}
          username={username()!}
          projectSlug={projectSlug()!}
          onSuccess={handleVersionCreated}
        />
      </Show>
    </ProjectPageLayout>
  );
}
