/**
 * Shared viewer page component used by both the default project route
 * (/u/:username/:project) and the explicit version route (/u/:username/:project/v/:version).
 *
 * All viewer chrome — header actions, mode switching, save indicator,
 * thumbnail capture, version modal — lives here so the route files
 * become thin configuration wrappers.
 */

import { A, useNavigate, useSearchParams } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { type Accessor, createMemo, createSignal, type JSX, Show } from 'solid-js';
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
import { useProjectSave } from '~/hooks/useProjectSave';
import { useThumbnailCapture } from '~/hooks/useThumbnailCapture';
import type { CoreInstance, ForkedFrom, Project, ViewerMode } from '~/lib/project-types';

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() => import('~/components/viewer/FloorplanContainer'));

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectViewerPageProps {
  /** Route param: owner username */
  username: Accessor<string | undefined>;
  /** Route param: project slug */
  projectSlug: Accessor<string | undefined>;

  // --- Project data (from useProjectData) ---
  project: Accessor<Project | undefined>;
  forkedFrom: Accessor<ForkedFrom | null | undefined>;
  projectData: Accessor<unknown>;
  isOwner: Accessor<boolean>;
  canEdit: Accessor<boolean>;
  canManage: Accessor<boolean>;
  isProjectLoading: Accessor<boolean>;
  projectNotFound: Accessor<boolean>;

  // --- Version data (from useVersionData) ---
  content: Accessor<string | undefined>;
  currentHash: Accessor<string | undefined>;
  isVersionLoading: Accessor<boolean>;
  /** Whether the requested version record exists (always true for default version) */
  versionExists?: Accessor<boolean>;

  // --- Version identity ---
  /** The version name being displayed (e.g. "main" or "v2") */
  versionName: Accessor<string | undefined>;

  // --- Customisation points ---
  /** Page title in <head> */
  pageTitle: string;
  /** Breadcrumb suffix shown after the project slug (e.g. "v/beta") */
  breadcrumbSuffix?: string;
  /** Extra JSX appended to the project title in the breadcrumb */
  titleSuffix?: JSX.Element;
  /** Override not-found card content */
  notFoundFallback?: JSX.Element;
  /** Content-missing message */
  contentMissingMessage?: string;
  /** Called after a new version is created via the modal */
  onVersionCreated?: (versionId: string, versionName: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectViewerPage(props: ProjectViewerPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

  // Shortcuts
  const username = props.username;
  const projectSlug = props.projectSlug;
  const project = props.project;
  const isOwner = props.isOwner;
  const canEdit = props.canEdit;
  const canManage = props.canManage;
  const content = props.content;
  const currentHash = props.currentHash;

  // Loading state
  const isLoading = createMemo(() => {
    if (props.isProjectLoading()) return true;
    if (props.projectNotFound()) return false;
    return props.isVersionLoading();
  });

  // Content missing check
  const isContentMissing = createMemo(() => {
    if (isLoading()) return false;
    if (!props.projectData()) return false;
    if (props.versionExists && !props.versionExists()) return false;
    return !content();
  });

  // Viewer mode from search params
  const mode = createMemo((): ViewerMode => {
    const modeParam = typeof searchParams.mode === 'string' ? searchParams.mode : undefined;
    if (modeParam && ['basic', 'advanced', 'editor'].includes(modeParam)) {
      return modeParam as ViewerMode;
    }
    return canEdit() ? 'editor' : 'advanced';
  });

  // --- Core instance (for thumbnail capture) ---
  const [coreInstance, setCoreInstance] = createSignal<CoreInstance | null>(null);

  // --- Thumbnail capture hook ---
  const thumbnail = useThumbnailCapture(coreInstance, () => project()?._id);

  // --- Save functionality (shared hook) ---
  // Auto-capture a preview thumbnail after each save (throttled to every 30s)
  const save = useProjectSave(content, () => project()?._id, props.versionName, canEdit, {
    onSaveSuccess: () => thumbnail.capture(),
  });

  // Handle version created
  const handleVersionCreated = (versionId: string, newVersionName: string) => {
    if (props.onVersionCreated) {
      props.onVersionCreated(versionId, newVersionName);
    } else {
      navigate(`/u/${username()}/${projectSlug()}/v/${newVersionName}`);
    }
  };

  // Not-found fallback
  const notFoundFallback = () =>
    props.notFoundFallback ?? (
      <NotFoundCard
        title="Project not found"
        message="This project doesn't exist or you don't have access."
        actions={
          <A href="/" class="btn btn-primary">
            Go Home
          </A>
        }
      />
    );

  // Show not-found when project is missing, or version doesn't exist
  const showNotFound = createMemo(() => {
    if (props.projectNotFound()) return true;
    if (props.versionExists && !isLoading() && !props.versionExists()) return true;
    return false;
  });

  // Header actions
  const headerActions = () => (
    <>
      {/* Version Switcher */}
      <Show when={project() && username() && projectSlug()}>
        <VersionSwitcher
          projectId={project()!._id}
          username={username()!}
          projectSlug={projectSlug()!}
          defaultVersion={project()?.defaultVersion}
          currentVersion={props.versionName() ?? 'main'}
          canCreateVersion={canEdit()}
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

      {/* Visibility toggle for managers (owners + admin collaborators), static badge for others */}
      <Show
        when={canManage()}
        fallback={
          <Show when={project()?.isPublic}>
            <span class="badge badge-success badge-outline">Public</span>
          </Show>
        }
      >
        <VisibilityToggle projectId={project()!._id} isPublic={project()?.isPublic ?? false} />
      </Show>

      <Show when={canManage()}>
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

      <Show when={canEdit()}>
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
        {mode() === 'editor'
          ? '✏\uFE0F Editor'
          : mode() === 'advanced'
            ? '\u2699\uFE0F Advanced'
            : '\uD83D\uDC41\uFE0F Basic'}
      </button>

      {/* Fork button for non-owners */}
      <Show when={!isOwner() && project()}>
        <ForkButton
          projectId={project()!._id}
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
      title={props.pageTitle}
      isLoading={isLoading()}
      showNotFound={showNotFound()}
      notFoundFallback={notFoundFallback()}
    >
      {/* Header */}
      <Header
        centerContent={
          <ProjectBreadcrumbs
            username={username()!}
            projectSlug={projectSlug()!}
            project={project()}
            forkedFrom={props.forkedFrom()}
            compact
            breadcrumbSuffix={props.breadcrumbSuffix}
            titleSuffix={props.titleSuffix}
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
              message={
                props.contentMissingMessage ??
                'This project version has no content. The data may be corrupted or missing.'
              }
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
      <Show when={canEdit() && project() && username() && projectSlug()}>
        <CreateVersionModal
          isOpen={showCreateVersionModal()}
          onClose={() => setShowCreateVersionModal(false)}
          projectId={project()!._id}
          fromVersion={props.versionName()}
          username={username()!}
          projectSlug={projectSlug()!}
          onSuccess={handleVersionCreated}
        />
      </Show>
    </ProjectPageLayout>
  );
}
