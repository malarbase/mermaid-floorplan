import { A, useLocation, useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { useQuery } from 'convex-solidjs';
import { createMemo, createSignal, Show } from 'solid-js';
import { CopyPermalinkButton } from '~/components/CopyPermalinkButton';
import { CreateVersionModal } from '~/components/CreateVersionModal';
import { ForkButton } from '~/components/ForkButton';
import { Header } from '~/components/Header';
import {
  ContentMissingCard,
  NotFoundCard,
  ProjectBreadcrumbs,
  ProjectPageLayout,
  SettingsIcon,
} from '~/components/project/ProjectPageLayout';
import { VersionSwitcher } from '~/components/VersionSwitcher';
import { VisibilityToggle } from '~/components/VisibilityToggle';
import type { ViewerMode } from '~/components/viewer/FloorplanContainer';
import { useProjectData, useVersionData } from '~/hooks/useProjectData';
import { useThumbnailCapture } from '~/hooks/useThumbnailCapture';
import { projectApi } from '~/lib/project-types';

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() => import('~/components/viewer/FloorplanContainer'));

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
  const slugResolveQuery = useQuery(projectApi.projects.resolveSlug, () => ({
    username: username(),
    slug: projectSlug(),
  }));

  // Handle redirect if slug has changed
  createMemo(() => {
    const resolved = slugResolveQuery.data();
    if (resolved?.wasRedirected) {
      const newUrl = `/u/${username()}/${resolved.currentSlug}${location.search}${location.hash}`;
      navigate(newUrl, { replace: true });
    }
  });

  // Project data
  const { project, owner, forkedFrom, projectData, isOwner, isProjectLoading, projectNotFound } =
    useProjectData(username, projectSlug);

  // Version data (default version)
  const defaultVersion = createMemo(() => project()?.defaultVersion ?? 'main');
  const { content, currentHash, isVersionLoading } = useVersionData(
    () => project()?._id as string | undefined,
    defaultVersion,
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
          currentVersion={project()?.defaultVersion ?? 'main'}
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
        <button
          type="button"
          class="btn btn-ghost btn-sm gap-1"
          onClick={() => thumbnail.capture()}
          disabled={thumbnail.isCapturing() || !coreInstance()}
          title="Capture preview thumbnail for project card"
        >
          <Show
            when={!thumbnail.isCapturing()}
            fallback={<span class="loading loading-spinner loading-xs"></span>}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Show>
          <Show when={thumbnail.showSuccess()} fallback={<></>}>
            <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </Show>
        </button>
        <A href={`/u/${username()}/${projectSlug()}/settings`} class="btn btn-ghost btn-sm">
          <SettingsIcon />
        </A>
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
              console.log('DSL changed:', newDsl.slice(0, 100));
            }}
            onCoreReady={setCoreInstance}
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
          onSuccess={(_versionId, _versionName) => {
            // Navigation is handled by the modal
          }}
        />
      </Show>
    </ProjectPageLayout>
  );
}
