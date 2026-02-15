import { useLocation, useNavigate, useParams } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createEffect, createMemo, on } from 'solid-js';
import { ProjectViewerPage } from '~/components/project/ProjectViewerPage';
import { useProjectData, useShareToken, useVersionData } from '~/hooks/useProjectData';
import { api } from '../../../../../convex/_generated/api';

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

  // Route params
  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);

  // Share token (from ?share= param or sessionStorage)
  const shareToken = useShareToken();

  // Check for slug redirects before loading project
  const slugResolveQuery = useQuery(api.projects.resolveSlug, () => ({
    username: username() ?? '',
    slug: projectSlug() ?? '',
    shareToken: shareToken(),
  }));

  // Handle redirect if slug has changed.
  // Uses createEffect (not createMemo) because this is a side effect.
  // The `on()` wrapper with `defer: true` ensures it only fires when
  // slugResolveQuery.data() actually changes, not during route transitions
  // where params may briefly be undefined.
  createEffect(
    on(
      () => slugResolveQuery.data(),
      (resolved) => {
        if (resolved?.wasRedirected && username() && projectSlug()) {
          const newUrl = `/u/${username()}/${resolved.currentSlug}${location.search}${location.hash}`;
          navigate(newUrl, { replace: true });
        }
      },
      { defer: true },
    ),
  );

  // Project data
  const {
    project,
    forkedFrom,
    projectData,
    isOwner,
    canEdit,
    canManage,
    isProjectLoading,
    projectNotFound,
  } = useProjectData(username, projectSlug, shareToken);

  // Version data (default version)
  const defaultVersion = createMemo(() => project()?.defaultVersion ?? 'main');
  const { content, currentHash, isVersionLoading } = useVersionData(
    () => project()?._id,
    defaultVersion,
    shareToken,
  );

  return (
    <ProjectViewerPage
      username={username}
      projectSlug={projectSlug}
      project={project}
      forkedFrom={forkedFrom}
      projectData={projectData}
      isOwner={isOwner}
      canEdit={canEdit}
      canManage={canManage}
      isProjectLoading={isProjectLoading}
      projectNotFound={projectNotFound}
      content={content}
      currentHash={currentHash}
      isVersionLoading={isVersionLoading}
      versionName={defaultVersion}
      pageTitle={`${project()?.displayName ?? projectSlug()} - Floorplan`}
    />
  );
}
