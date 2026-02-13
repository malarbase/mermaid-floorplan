import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { createMemo, createSignal, Show } from 'solid-js';
import { CopyPermalinkButton } from '~/components/CopyPermalinkButton';
import { CreateVersionModal } from '~/components/CreateVersionModal';
import { ForkButton } from '~/components/ForkButton';
import { Header } from '~/components/Header';
import { CapturePreviewButton } from '~/components/project/CapturePreviewButton';
import {
  ContentMissingCard,
  NotFoundCard,
  ProjectBreadcrumbs,
  ProjectPageLayout,
  SettingsIcon,
} from '~/components/project/ProjectPageLayout';
import { SaveIndicator } from '~/components/project/SaveIndicator';
import { VersionSwitcher } from '~/components/VersionSwitcher';
import { VisibilityToggle } from '~/components/VisibilityToggle';
import type { ViewerMode } from '~/components/viewer/FloorplanContainer';
import { useProjectData, useVersionData } from '~/hooks/useProjectData';
import { useProjectSave } from '~/hooks/useProjectSave';
import { useThumbnailCapture } from '~/hooks/useThumbnailCapture';

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() => import('~/components/viewer/FloorplanContainer'));

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
  const { project, forkedFrom, projectData, isOwner, isProjectLoading, projectNotFound } =
    useProjectData(username, projectSlug);

  // Version data
  const { content, currentHash, versionExists, isVersionLoading } = useVersionData(
    () => project()?._id as string | undefined,
    versionName,
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
    const modeParam = typeof searchParams.mode === 'string' ? searchParams.mode : undefined;
    if (modeParam && ['basic', 'advanced', 'editor'].includes(modeParam)) {
      return modeParam as ViewerMode;
    }
    return isOwner() ? 'editor' : 'advanced';
  });

  // --- Core instance (for thumbnail capture) ---
  const [coreInstance, setCoreInstance] = createSignal<any>(null);

  // --- Thumbnail capture hook ---
  const thumbnail = useThumbnailCapture(coreInstance, () => project()?._id as string | undefined);

  // --- Save functionality (shared hook) ---
  const save = useProjectSave(
    content,
    () => project()?._id as string | undefined,
    versionName,
    isOwner,
  );

  // Handle version created
  const handleVersionCreated = (_versionId: string, newVersionName: string) => {
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

      <A href={`/u/${username()}/${projectSlug()}/history`} class="btn btn-ghost btn-sm">
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
        <CapturePreviewButton
          onCapture={() => thumbnail.capture()}
          isCapturing={thumbnail.isCapturing}
          showSuccess={thumbnail.showSuccess}
          disabled={!coreInstance() || save.hasUnsavedChanges()}
          disabledReason={
            save.hasUnsavedChanges() ? 'Save changes before capturing preview' : undefined
          }
        />
        <A href={`/u/${username()}/${projectSlug()}/settings`} class="btn btn-ghost btn-sm">
          <SettingsIcon />
        </A>
      </Show>

      <Show when={isOwner()}>
        <SaveIndicator
          hasUnsavedChanges={save.hasUnsavedChanges}
          isSaving={save.isSaving}
          showSaveSuccess={save.showSaveSuccess}
          saveError={save.saveError}
          onSave={save.handleSave}
        />
      </Show>

      <button
        class="badge badge-outline cursor-pointer hover:badge-primary transition-colors min-w-[6.5rem] justify-center"
        onClick={() => {
          const modes: ViewerMode[] = ['basic', 'advanced', 'editor'];
          const currentIndex = modes.indexOf(mode());
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setSearchParams({ mode: nextMode });
        }}
        title="Click to cycle viewer modes"
      >
        {mode() === 'editor' ? '✏️ Editor' : mode() === 'advanced' ? '⚙️ Advanced' : '👁️ Basic'}
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
          title={!projectData() ? 'Project not found' : 'Version not found'}
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
                <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-primary">
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
            titleSuffix={<span class="text-base-content/50 font-normal">/ {versionName()}</span>}
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
            dsl={save.currentDsl() || content()!}
            mode={mode()}
            onDslChange={save.handleDslChange}
            onCoreReady={setCoreInstance}
            initialCameraState={project()?.cameraState}
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
