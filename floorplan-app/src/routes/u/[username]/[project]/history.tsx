import { Title } from '@solidjs/meta';
import { A, useNavigate, useParams } from '@solidjs/router';
import { useMutation, useQuery } from 'convex-solidjs';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { CreateVersionModal } from '~/components/CreateVersionModal';
import { DeleteVersionModal } from '~/components/DeleteVersionModal';
import { Modal } from '~/components/ui/Modal';
import { useProjectData, useShareToken } from '~/hooks/useProjectData';
import { copyToClipboard, generatePermalink } from '~/lib/permalink';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

interface Version {
  _id: string;
  name: string;
  snapshotId: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface VersionSnapshot {
  _id: string;
  snapshotHash: string;
  contentHash: string;
  message?: string;
  parentId?: string;
  authorId: string;
  createdAt: number;
  isHead: boolean;
  headOf: string[];
}

// --- Helper functions ---

const formatDate = (ts: number) => {
  const date = new Date(ts);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const formatRelativeDate = (ts: number) => {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
};

const formatActionText = (action: string, metadata: any): string => {
  switch (action) {
    case 'project.create':
      return 'created this project';
    case 'snapshot.save':
      return `saved ${metadata?.versionName ? `version "${metadata.versionName}"` : ''}${metadata?.message ? ` — "${metadata.message}"` : ''}`;
    case 'version.create':
      return `created version "${metadata?.versionName ?? ''}"${metadata?.fromVersion ? ` from "${metadata.fromVersion}"` : ''}`;
    case 'version.restore':
      return `restored version "${metadata?.versionName ?? ''}" to snapshot ${metadata?.toSnapshotId?.slice?.(0, 6) ?? ''}`;
    case 'version.delete':
      return `deleted version "${metadata?.versionName ?? ''}"`;
    case 'project.update':
      return 'updated project settings';
    case 'project.rename':
      return `renamed project from "${metadata?.oldSlug ?? ''}" to "${metadata?.newSlug ?? ''}"`;
    case 'project.fork':
      return 'forked this project';
    case 'collaborator.invite':
      return `invited ${metadata?.inviteeUsername ?? 'someone'} as ${metadata?.role ?? 'collaborator'}`;
    case 'collaborator.remove':
      return 'removed a collaborator';
    case 'collaborator.roleChange':
      return `changed a collaborator's role to ${metadata?.newRole ?? ''}`;
    case 'collaborator.leave':
      return 'left the project';
    case 'shareLink.create':
      return `created a share link (${metadata?.role ?? 'viewer'})`;
    case 'shareLink.revoke':
      return 'revoked a share link';
    default:
      return action;
  }
};

// --- Copy Permalink Button (shared by snapshot items) ---

function CopyPermalinkButton(props: {
  hash: string;
  username: string;
  projectSlug: string;
  copiedHash: () => string | null;
  onCopied: (hash: string) => void;
}) {
  const handleClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = generatePermalink(props.username, props.projectSlug, props.hash, true);
    const success = await copyToClipboard(url);
    if (success) {
      props.onCopied(props.hash);
    }
  };

  return (
    <button
      type="button"
      class="btn btn-ghost btn-xs gap-1"
      onClick={handleClick}
      title="Copy permalink"
    >
      <Show
        when={props.copiedHash() !== props.hash}
        fallback={
          <>
            <svg class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-success text-xs">Copied!</span>
          </>
        }
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <span class="text-xs hidden sm:inline">Copy</span>
      </Show>
    </button>
  );
}

// --- Version Card with expandable snapshot timeline ---

function VersionCard(props: {
  version: Version;
  isDefault: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  username: string;
  projectSlug: string;
  projectId: Id<'projects'>;
  isOwner: boolean;
  copiedHash: () => string | null;
  onCopied: (hash: string) => void;
}) {
  // Query version history only when expanded
  const historyQuery = useQuery(
    api.projects.getVersionHistory,
    () => ({
      projectId: props.projectId,
      versionName: props.version.name,
      limit: 50,
    }),
    () => ({ enabled: props.isExpanded }),
  );

  const snapshots = createMemo(() => {
    const data = historyQuery.data() as VersionSnapshot[] | undefined;
    return data ?? [];
  });

  // Build a map of contentHash → earliest snapshot (for detecting content reverts)
  const contentOriginals = createMemo(() => {
    const map = new Map<string, { snapshotHash: string; message?: string }>();
    // Iterate oldest-first (list is desc by createdAt, so reverse)
    for (const s of [...snapshots()].reverse()) {
      if (!map.has(s.contentHash)) {
        map.set(s.contentHash, { snapshotHash: s.snapshotHash, message: s.message });
      }
    }
    return map;
  });

  // For a given snapshot, get the original if this is a content duplicate
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const getContentOriginal = (snapshot: VersionSnapshot) => {
    const first = contentOriginals().get(snapshot.contentHash);
    if (first && first.snapshotHash !== snapshot.snapshotHash) return first;
    return null;
  };

  const moveToSnapshot = useMutation(api.projects.moveVersionToSnapshot);
  const [restoringId, setRestoringId] = createSignal<string | null>(null);
  const [restoreTarget, setRestoreTarget] = createSignal<VersionSnapshot | null>(null);
  const [restoreError, setRestoreError] = createSignal('');

  const handleRestoreClick = (snapshot: VersionSnapshot) => {
    setRestoreTarget(snapshot);
    setRestoreError('');
  };

  const handleRestoreConfirm = async () => {
    const snapshot = restoreTarget();
    if (!snapshot) return;

    setRestoringId(snapshot._id);
    setRestoreError('');
    try {
      await moveToSnapshot.mutate({
        projectId: props.projectId,
        versionName: props.version.name,
        snapshotId: snapshot._id as Id<'snapshots'>, // snapshot._id comes from Convex data
      });
      setRestoreTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore snapshot';
      setRestoreError(message);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div class="card bg-base-100 shadow">
      {/* Version header - clickable to expand/collapse */}
      <div
        class="card-body py-3 sm:py-4 px-4 cursor-pointer select-none hover:bg-base-200/50 transition-colors"
        onClick={props.onToggle}
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Expand/collapse chevron */}
            <svg
              class="w-4 h-4 text-base-content/40 transition-transform flex-shrink-0"
              classList={{ 'rotate-90': props.isExpanded }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span class="font-mono font-bold text-sm sm:text-base">{props.version.name}</span>
            <Show when={props.isDefault}>
              <span class="badge badge-primary badge-xs sm:badge-sm">default</span>
            </Show>
            {/* Delete button for non-default versions */}
            <Show when={props.isOwner && !props.isDefault}>
              <button
                type="button"
                class="btn btn-ghost btn-xs text-error/60 hover:text-error"
                title={`Delete version "${props.version.name}"`}
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </Show>
            <Show when={props.version.description}>
              <span class="text-xs sm:text-sm text-base-content/60 truncate max-w-[200px] sm:max-w-none">
                {props.version.description}
              </span>
            </Show>
          </div>
          <div class="flex items-center gap-2 text-xs sm:text-sm pl-6 sm:pl-0">
            <span class="text-base-content/50">{formatRelativeDate(props.version.updatedAt)}</span>
            <A
              href={`/u/${props.username}/${props.projectSlug}/v/${props.version.name}`}
              class="btn btn-ghost btn-xs"
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              View
            </A>
          </div>
        </div>
      </div>

      {/* Expandable snapshot timeline */}
      <Show when={props.isExpanded}>
        <div class="border-t border-base-300">
          <Show
            when={!historyQuery.isLoading()}
            fallback={
              <div class="flex justify-center py-6">
                <span class="loading loading-spinner loading-sm"></span>
              </div>
            }
          >
            <Show
              when={snapshots().length > 0}
              fallback={
                <div class="py-6 text-center text-sm text-base-content/50">No snapshots yet</div>
              }
            >
              <div class="px-4 sm:px-6 py-4">
                {/* Timeline container */}
                <div class="relative ml-3 sm:ml-4 border-l-2 border-base-300 pl-5 sm:pl-6 space-y-4">
                  <For each={snapshots()}>
                    {(snapshot, index) => (
                      <div class="relative">
                        {/* Timeline dot */}
                        <div
                          class="absolute -left-[1.625rem] sm:-left-[1.8125rem] top-1 w-3 h-3 rounded-full border-2"
                          classList={{
                            'bg-primary border-primary': snapshot.headOf.includes(
                              props.version.name,
                            ),
                            'bg-base-100 border-base-300': !snapshot.headOf.includes(
                              props.version.name,
                            ),
                          }}
                        />

                        {/* Snapshot content */}
                        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-2">
                          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                            {/* Hash badge */}
                            <A
                              href={`/u/${props.username}/${props.projectSlug}/s/${snapshot.snapshotHash}`}
                              class="font-mono text-xs bg-base-200 hover:bg-base-300 px-1.5 py-0.5 rounded transition-colors"
                            >
                              {snapshot.snapshotHash.slice(0, 6)}
                            </A>
                            {/* HEAD badge */}
                            <Show when={snapshot.headOf.length > 0}>
                              <For each={snapshot.headOf}>
                                {(versionName) => (
                                  <span class="badge badge-success badge-xs">
                                    {versionName} HEAD
                                  </span>
                                )}
                              </For>
                            </Show>
                            {/* Message */}
                            <Show when={snapshot.message}>
                              <span class="text-xs sm:text-sm text-base-content/80 truncate max-w-[180px] sm:max-w-[350px]">
                                {snapshot.message}
                              </span>
                            </Show>
                            <Show when={!snapshot.message}>
                              <span class="text-xs text-base-content/40 italic">no message</span>
                            </Show>
                            {/* Content equivalence indicator */}
                            <Show when={getContentOriginal(snapshot)}>
                              {(original) => (
                                <A
                                  href={`/u/${props.username}/${props.projectSlug}/s/${original().snapshotHash}`}
                                  class="badge badge-ghost badge-xs gap-1 text-base-content/50 hover:text-base-content/80"
                                  title={`Same content as snapshot ${original().snapshotHash.slice(0, 6)}${original().message ? ` ("${original().message}")` : ''}`}
                                >
                                  <svg
                                    class="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                    />
                                  </svg>
                                  = {original().snapshotHash.slice(0, 6)}
                                </A>
                              )}
                            </Show>
                          </div>
                          <div class="flex items-center gap-1.5 flex-shrink-0">
                            <span class="text-xs text-base-content/50">
                              {formatRelativeDate(snapshot.createdAt)}
                            </span>
                            <CopyPermalinkButton
                              hash={snapshot.snapshotHash}
                              username={props.username}
                              projectSlug={props.projectSlug}
                              copiedHash={props.copiedHash}
                              onCopied={props.onCopied}
                            />
                            {/* Restore button for non-HEAD snapshots (owner/editor only) */}
                            <Show
                              when={!snapshot.headOf.includes(props.version.name) && props.isOwner}
                            >
                              <button
                                class="btn btn-warning btn-xs"
                                onClick={() => handleRestoreClick(snapshot)}
                                disabled={restoringId() !== null}
                              >
                                Restore
                              </button>
                            </Show>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </Show>

      {/* Restore confirmation modal */}
      <Modal
        isOpen={!!restoreTarget()}
        onClose={() => setRestoreTarget(null)}
        title={
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Restore Snapshot
          </span>
        }
        description={
          <>
            Move version <span class="font-mono font-medium">{props.version.name}</span> to snapshot{' '}
            <span class="font-mono font-medium">{restoreTarget()?.snapshotHash.slice(0, 6)}</span>?
          </>
        }
        error={restoreError()}
      >
        <div class="space-y-3">
          <Show when={restoreTarget()?.message}>
            <div class="bg-base-200 rounded-lg p-3">
              <span class="text-xs text-base-content/50">Snapshot message</span>
              <p class="text-sm mt-1">{restoreTarget()?.message}</p>
            </div>
          </Show>
          <p class="text-sm text-base-content/70">
            This moves the version pointer to the selected snapshot. All snapshots remain accessible
            — nothing is deleted.
          </p>
        </div>
        <div class="modal-action">
          <button
            type="button"
            class="btn"
            onClick={() => setRestoreTarget(null)}
            disabled={restoringId() !== null}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-warning"
            onClick={handleRestoreConfirm}
            disabled={restoringId() !== null}
          >
            <Show when={restoringId() !== null}>
              <span class="loading loading-spinner loading-sm"></span>
            </Show>
            Restore
          </button>
        </div>
      </Modal>

      {/* Delete version modal */}
      <Show when={!props.isDefault}>
        <DeleteVersionModal
          isOpen={showDeleteModal()}
          onClose={() => setShowDeleteModal(false)}
          projectId={props.projectId}
          versionName={props.version.name}
        />
      </Show>
    </div>
  );
}

// --- Main Page Component ---

/**
 * Version history page - shows versions with expandable snapshot timelines.
 * Route: /u/:username/:project/history
 */
export default function ProjectHistory() {
  const params = useParams();
  const navigate = useNavigate();

  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);

  // Share token (from ?share= param or sessionStorage)
  const shareToken = useShareToken();

  // Project data from shared hook
  const { project, owner, forkedFrom, projectData, isOwner, isProjectLoading } = useProjectData(
    username,
    projectSlug,
    shareToken,
  );

  // Query versions
  const versionsQuery = useQuery(
    api.projects.listVersions,
    () => ({ projectId: (project()?._id ?? '') as Id<'projects'> }),
    () => ({ enabled: !!project() }),
  );

  const activityQuery = useQuery(
    api.projects.getProjectActivity,
    () => ({ projectId: (project()?._id ?? '') as Id<'projects'>, limit: 30 }),
    () => ({ enabled: !!project() }),
  );

  const versions = createMemo(() => {
    const data = versionsQuery.data() as Version[] | undefined;
    if (!data) return [];
    // Sort: default version first, then by updatedAt desc
    const defaultVersion = project()?.defaultVersion;
    return [...data].sort((a, b) => {
      if (a.name === defaultVersion) return -1;
      if (b.name === defaultVersion) return 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  // Loading state
  const isLoading = createMemo(() => isProjectLoading() || versionsQuery.isLoading());

  // Create version modal state
  const [showCreateVersionModal, setShowCreateVersionModal] = createSignal(false);

  // Track which versions are expanded
  const [expandedVersions, setExpandedVersions] = createSignal<Set<string>>(new Set());

  const toggleVersion = (versionName: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionName)) next.delete(versionName);
      else next.add(versionName);
      return next;
    });
  };

  // Auto-expand default version when data loads
  createEffect(() => {
    const defaultVersion = project()?.defaultVersion;
    if (defaultVersion && expandedVersions().size === 0) {
      setExpandedVersions(new Set([defaultVersion]));
    }
  });

  // Track which snapshot hash was just copied
  const [copiedHash, setCopiedHash] = createSignal<string | null>(null);

  const handleCopied = (hash: string) => {
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVersionCreated = (_versionId: string, versionName: string) => {
    navigate(`/u/${username()}/${projectSlug()}/v/${versionName}`);
  };

  return (
    <main class="min-h-screen bg-base-200 px-4 py-6 sm:p-8">
      <Title>{projectSlug()} History - Floorplan</Title>

      <Show
        when={!isLoading()}
        fallback={
          <div class="flex justify-center items-center h-64">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        <Show
          when={projectData()}
          fallback={
            <div class="flex justify-center items-center h-64">
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body text-center">
                  <h2 class="card-title">Project not found</h2>
                  <p>This project doesn't exist or you don't have access.</p>
                  <A href="/" class="btn btn-ghost mt-4">
                    Go Home
                  </A>
                </div>
              </div>
            </div>
          }
        >
          <div class="max-w-4xl mx-auto">
            {/* Header */}
            <div class="mb-6 sm:mb-8">
              <div class="text-xs sm:text-sm breadcrumbs mb-2">
                <ul>
                  <li>
                    <A href={`/u/${username()}`}>{username()}</A>
                  </li>
                  <li>
                    <A
                      href={`/u/${username()}/${projectSlug()}`}
                      class="truncate max-w-[100px] sm:max-w-none"
                    >
                      {projectSlug()}
                    </A>
                  </li>
                  <li>History</li>
                </ul>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 class="text-xl sm:text-2xl md:text-3xl font-bold">
                    {project()?.displayName} - History
                  </h1>
                  {/* Forked from attribution */}
                  <Show when={forkedFrom()}>
                    <div class="text-sm text-base-content/60 flex items-center gap-1 mt-1">
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
                <A
                  href={`/u/${username()}/${projectSlug()}`}
                  class="btn btn-ghost btn-sm w-full sm:w-auto"
                >
                  Back to Project
                </A>
              </div>
            </div>

            {/* Versions with snapshot timelines */}
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Versions ({versions().length})
                </h2>
                <Show when={isOwner()}>
                  <button
                    class="btn btn-primary btn-sm"
                    onClick={() => setShowCreateVersionModal(true)}
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    New Version
                  </button>
                </Show>
              </div>

              <div class="text-sm text-base-content/70 mb-4">
                Each version tracks its own snapshot history. Expand a version to see its timeline.
              </div>

              <div class="grid gap-3">
                <Show
                  when={versions().length > 0}
                  fallback={
                    <div class="card bg-base-100 shadow">
                      <div class="card-body text-center text-base-content/70">
                        No versions found
                      </div>
                    </div>
                  }
                >
                  <For each={versions()}>
                    {(version) => (
                      <VersionCard
                        version={version}
                        isDefault={version.name === project()?.defaultVersion}
                        isExpanded={expandedVersions().has(version.name)}
                        onToggle={() => toggleVersion(version.name)}
                        username={username()!}
                        projectSlug={projectSlug()!}
                        projectId={project()!._id}
                        isOwner={isOwner()}
                        copiedHash={copiedHash}
                        onCopied={handleCopied}
                      />
                    )}
                  </For>
                </Show>
              </div>
            </section>

            {/* Activity Feed */}
            <section class="mt-8">
              <h2 class="text-xl font-semibold flex items-center gap-2 mb-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Activity
              </h2>
              <div class="card bg-base-100 shadow">
                <div class="card-body py-3 px-4">
                  <Show
                    when={!activityQuery.isLoading()}
                    fallback={
                      <div class="flex justify-center py-6">
                        <span class="loading loading-spinner loading-sm"></span>
                      </div>
                    }
                  >
                    <Show
                      when={(activityQuery.data() as any[])?.length > 0}
                      fallback={
                        <div class="py-4 text-center text-sm text-base-content/50">
                          No activity yet
                        </div>
                      }
                    >
                      <div class="space-y-3">
                        <For each={activityQuery.data() as any[]}>
                          {(event) => (
                            <div class="flex items-start gap-3 py-2 border-b border-base-200 last:border-0">
                              <div class="avatar placeholder flex-shrink-0">
                                <div class="w-7 h-7 rounded-full bg-base-300 text-base-content/70">
                                  <span class="text-xs">
                                    {(event.user?.displayName ?? event.user?.username ?? '?')
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-1 text-sm">
                                  <span class="font-medium">
                                    {event.user?.displayName ?? event.user?.username}
                                  </span>
                                  <span class="text-base-content/60">
                                    {formatActionText(event.action, event.metadata)}
                                  </span>
                                </div>
                                <div class="text-xs text-base-content/40 mt-0.5">
                                  {formatRelativeDate(event.createdAt)}
                                </div>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </Show>
                </div>
              </div>
            </section>
          </div>

          {/* Create Version Modal */}
          <Show when={isOwner() && project() && username() && projectSlug()}>
            <CreateVersionModal
              isOpen={showCreateVersionModal()}
              onClose={() => setShowCreateVersionModal(false)}
              projectId={project()!._id}
              fromVersion={project()?.defaultVersion}
              username={username()!}
              projectSlug={projectSlug()!}
              onSuccess={handleVersionCreated}
            />
          </Show>
        </Show>
      </Show>
    </main>
  );
}
