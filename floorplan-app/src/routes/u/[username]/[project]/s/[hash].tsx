import { A, useParams, useSearchParams } from '@solidjs/router';
import { clientOnly } from '@solidjs/start';
import { createMemo, Show } from 'solid-js';
import { CopyPermalinkButton } from '~/components/CopyPermalinkButton';
import { Header } from '~/components/Header';
import { PermalinkDisplay } from '~/components/PermalinkDisplay';
import {
  ContentMissingCard,
  InfoBanner,
  LinkIcon,
  NotFoundCard,
  ProjectBreadcrumbs,
  ProjectPageLayout,
} from '~/components/project/ProjectPageLayout';
import type { ViewerMode } from '~/components/viewer/FloorplanContainer';
import { useProjectData, useSnapshotData } from '~/hooks/useProjectData';

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanContainer = clientOnly(() => import('~/components/viewer/FloorplanContainer'));

/**
 * Snapshot permalink page - shows project at a specific immutable snapshot.
 * Route: /u/:username/:project/s/:hash
 *
 * Snapshots are immutable (like git commits).
 * This URL will always show exactly the same content.
 */
export default function SnapshotView() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Route params
  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);
  const hash = createMemo(() => params.hash);

  // Project data
  const { project, forkedFrom, projectData, isOwner, isProjectLoading, projectNotFound } =
    useProjectData(username, projectSlug);

  // Snapshot data
  const { snapshot, content, isSnapshotLoading, snapshotNotFound } = useSnapshotData(
    () => project()?._id as string | undefined,
    hash,
  );

  // Loading state
  const isLoading = createMemo(() => {
    if (isProjectLoading()) return true;
    if (projectNotFound()) return false;
    return isSnapshotLoading();
  });

  // Content missing check
  const isContentMissing = createMemo(() => {
    if (isLoading()) return false;
    if (!projectData() || snapshotNotFound()) return false;
    return !content();
  });

  // Viewer mode (read-only: no editor mode for snapshots)
  const mode = createMemo((): ViewerMode => {
    const modeParam = typeof searchParams.mode === 'string' ? searchParams.mode : undefined;
    if (modeParam && ['basic', 'advanced'].includes(modeParam)) {
      return modeParam as ViewerMode;
    }
    return 'advanced';
  });

  // Format timestamp
  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Header actions (consistent with other project pages)
  const headerActions = () => (
    <>
      {/* Permalink with copy button */}
      <Show when={hash() && username() && projectSlug()}>
        <div class="flex items-center gap-1">
          <span class="badge badge-ghost font-mono" title="Snapshot hash">
            #{hash()?.slice(0, 6)}
          </span>
          <CopyPermalinkButton
            username={username()!}
            projectSlug={projectSlug()!}
            hash={hash()!}
            size="xs"
            variant="ghost"
          />
        </div>
      </Show>

      <A href={`/u/${username()}/${projectSlug()}/history`} class="btn btn-ghost btn-sm">
        History
      </A>

      <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-primary btn-sm">
        Latest
      </A>

      <button
        class="badge badge-outline cursor-pointer hover:badge-primary transition-colors min-w-[6.5rem] justify-center"
        onClick={() => {
          const modes: ViewerMode[] = ['basic', 'advanced'];
          const currentIndex = modes.indexOf(mode());
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setSearchParams({ mode: nextMode });
        }}
        title="Click to cycle viewer modes"
      >
        {mode() === 'advanced' ? '⚙️ Advanced' : '👁️ Basic'}
      </button>
    </>
  );

  return (
    <ProjectPageLayout
      title={`${projectSlug()} s/${hash()} - Floorplan`}
      isLoading={isLoading()}
      showNotFound={projectNotFound() || (!isLoading() && snapshotNotFound())}
      notFoundFallback={
        <NotFoundCard
          title={!projectData() ? 'Project not found' : 'Snapshot not found'}
          message={
            !projectData()
              ? "This project doesn't exist or you don't have access."
              : `The snapshot #${hash()} doesn't exist for this project.`
          }
          actions={
            <>
              <Show when={projectData()}>
                <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-primary">
                  View Project
                </A>
                <A href={`/u/${username()}/${projectSlug()}/history`} class="btn btn-ghost">
                  View History
                </A>
              </Show>
              <Show when={!projectData()}>
                <A href="/" class="btn btn-ghost">
                  Go Home
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
            breadcrumbSuffix={`s/${hash()}`}
            titleSuffix={<span class="font-mono text-base-content/50">#{hash()}</span>}
          />
        }
        actions={headerActions()}
        hideUserMenu={false}
      />

      {/* Snapshot info banner (includes message if present) */}
      <InfoBanner variant="success">
        <LinkIcon />
        <span class="text-sm font-medium">Permanent snapshot</span>
        <Show when={snapshot()?.message}>
          <span class="text-xs opacity-60">&mdash; {snapshot()?.message}</span>
        </Show>
        <span class="text-xs opacity-50 hidden sm:inline">
          {snapshot()?.createdAt ? formatDate(snapshot()!.createdAt) : ''}
        </span>
        <Show when={username() && projectSlug() && hash()}>
          <div class="hidden sm:block ml-auto">
            <PermalinkDisplay
              username={username()!}
              projectSlug={projectSlug()!}
              hash={hash()!}
              variant="badge"
              showCopyButton
              isCurrent
            />
          </div>
        </Show>
      </InfoBanner>

      {/* Viewer Container */}
      <div class="flex-1 overflow-hidden">
        <Show
          when={!isContentMissing()}
          fallback={
            <ContentMissingCard
              username={username()!}
              projectSlug={projectSlug()!}
              message="This snapshot has no content. The data may be corrupted."
            />
          }
        >
          <FloorplanContainer dsl={content()!} mode={mode()} />
        </Show>
      </div>
    </ProjectPageLayout>
  );
}
