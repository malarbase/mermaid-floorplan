import { A, useNavigate, useParams } from '@solidjs/router';
import { createMemo, Show } from 'solid-js';
import { NotFoundCard } from '~/components/project/ProjectPageLayout';
import { ProjectViewerPage } from '~/components/project/ProjectViewerPage';
import { useProjectData, useShareToken, useVersionData } from '~/hooks/useProjectData';

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

  // Route params
  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);
  const versionName = createMemo(() => params.version);

  // Share token (from ?share= param or sessionStorage)
  const shareToken = useShareToken();

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

  // Version data
  const { content, currentHash, versionExists, isVersionLoading } = useVersionData(
    () => project()?._id,
    versionName,
    shareToken,
  );

  // Handle version created
  const handleVersionCreated = (_versionId: string, newVersionName: string) => {
    navigate(`/u/${username()}/${projectSlug()}/v/${newVersionName}`);
  };

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
      versionExists={versionExists}
      versionName={versionName}
      pageTitle={`${projectSlug()} v/${versionName()} - Floorplan`}
      breadcrumbSuffix={`v/${versionName()}`}
      titleSuffix={<span class="text-base-content/50 font-normal">/ {versionName()}</span>}
      contentMissingMessage="This version has no content. The data may be corrupted or missing."
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
      onVersionCreated={handleVersionCreated}
    />
  );
}
