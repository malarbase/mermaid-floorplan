import { A, useLocation, useNavigate, useParams } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo } from 'solid-js';
import { ProjectViewerPage } from '~/components/project/ProjectViewerPage';
import { useProjectData, useVersionData } from '~/hooks/useProjectData';
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

  // Check for slug redirects before loading project
  const slugResolveQuery = useQuery(api.projects.resolveSlug, () => ({
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

  return (
    <ProjectViewerPage
      username={username}
      projectSlug={projectSlug}
      project={project}
      forkedFrom={forkedFrom}
      projectData={projectData}
      isOwner={isOwner}
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
