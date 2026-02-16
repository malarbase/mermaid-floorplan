import { Title } from '@solidjs/meta';
import { A, useNavigate } from '@solidjs/router';
import { useMutation, useQuery } from 'convex-solidjs';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { Header } from '~/components/Header';
import type { FilterType } from '~/components/ProjectList';
import { ProjectList } from '~/components/ProjectList';
import { TempUsernameNudge } from '~/components/TempUsernameNudge';
import { UsernameSelectionModal } from '~/components/UsernameSelectionModal';
import { useAuthRedirect } from '~/hooks/useAuthRedirect';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

/** Card for a single pending transfer request. */
function TransferRequestCard(props: {
  transfer: {
    _id: string;
    projectName: string;
    projectSlug: string;
    senderUsername: string;
    senderDisplayName?: string;
    expiresAt: number;
    createdAt: number;
  };
}) {
  const [isAccepting, setIsAccepting] = createSignal(false);
  const [isDeclining, setIsDeclining] = createSignal(false);
  const [slugCollision, setSlugCollision] = createSignal(false);
  const [customSlug, setCustomSlug] = createSignal('');
  const [error, setError] = createSignal('');

  const acceptMutation = useMutation(api.projects.acceptTransfer);
  const cancelMutation = useMutation(api.projects.cancelTransfer);

  const daysLeft = () => {
    const ms = props.transfer.expiresAt - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  };

  const senderLabel = () => props.transfer.senderDisplayName || props.transfer.senderUsername;

  const handleAccept = async (targetSlug?: string) => {
    setIsAccepting(true);
    setError('');
    try {
      const result = await acceptMutation.mutate({
        requestId: props.transfer._id as Id<'transferRequests'>,
        targetSlug,
      });
      if (
        result &&
        typeof result === 'object' &&
        'slugCollision' in result &&
        result.slugCollision
      ) {
        setSlugCollision(true);
        setCustomSlug(
          (result as { suggestedSlug?: string }).suggestedSlug || props.transfer.projectSlug + '-1',
        );
      } else if (result && typeof result === 'object' && 'success' in result && result.success) {
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept transfer');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    setError('');
    try {
      await cancelMutation.mutate({
        requestId: props.transfer._id as Id<'transferRequests'>,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decline transfer');
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div class="card card-border bg-base-100 shadow-sm">
      <div class="card-body p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Info */}
          <div class="flex-1 min-w-0">
            <p class="text-sm sm:text-base text-base-content">
              <span class="font-semibold">{senderLabel()}</span> wants to transfer{' '}
              <span class="font-bold">{props.transfer.projectName}</span> to you
            </p>
            <p class="text-xs text-base-content/50 mt-1">
              Expires in {daysLeft()} day{daysLeft() !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions */}
          <Show when={!slugCollision()}>
            <div class="flex gap-2 shrink-0">
              <button
                class="btn btn-success btn-sm"
                disabled={isAccepting() || isDeclining()}
                onClick={() => handleAccept()}
              >
                <Show when={isAccepting()} fallback="Accept">
                  <span class="loading loading-spinner loading-xs" />
                </Show>
              </button>
              <button
                class="btn btn-ghost btn-sm text-error"
                disabled={isAccepting() || isDeclining()}
                onClick={handleDecline}
              >
                <Show when={isDeclining()} fallback="Decline">
                  <span class="loading loading-spinner loading-xs" />
                </Show>
              </button>
            </div>
          </Show>
        </div>

        {/* Slug collision resolution */}
        <Show when={slugCollision()}>
          <div class="mt-3 p-3 bg-warning/10 rounded-lg">
            <p class="text-sm text-warning-content mb-2">
              You already have a project with the slug "{props.transfer.projectSlug}". Choose a
              different slug:
            </p>
            <div class="flex gap-2">
              <input
                type="text"
                class="input input-bordered input-sm flex-1"
                value={customSlug()}
                onInput={(e) => setCustomSlug(e.currentTarget.value)}
                placeholder="new-slug"
              />
              <button
                class="btn btn-success btn-sm"
                disabled={isAccepting() || !customSlug().trim()}
                onClick={() => handleAccept(customSlug().trim())}
              >
                <Show when={isAccepting()} fallback="Confirm">
                  <span class="loading loading-spinner loading-xs" />
                </Show>
              </button>
              <button class="btn btn-ghost btn-sm" onClick={() => setSlugCollision(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Show>

        {/* Error message */}
        <Show when={error()}>
          <p class="text-xs text-error mt-2">{error()}</p>
        </Show>
      </div>
    </div>
  );
}

/**
 * User dashboard - shows user's projects (protected route).
 * Route: /dashboard
 */
export default function Dashboard() {
  const { user, isLoading } = useAuthRedirect();
  const navigate = useNavigate();
  const [showUsernameModal, setShowUsernameModal] = createSignal(false);

  // Query current user from Convex for authoritative username
  // This ensures we always have the latest username after changes
  const currentUserQuery = useQuery(api.users.getCurrentUser, {});

  // Queries for stats using standard Convex hooks
  const projectsQuery = useQuery(api.projects.list, {});
  const sharedQuery = useQuery(api.sharing.getSharedWithMe, {});
  const pendingTransfers = useQuery(api.projects.getPendingTransfers, {});

  // Stats computed values
  const totalProjects = createMemo(() => {
    const data = projectsQuery.data() as unknown[] | undefined;
    return data?.length ?? 0;
  });

  const publicProjects = createMemo(() => {
    const data = projectsQuery.data() as { isPublic: boolean }[] | undefined;
    return data?.filter((p) => p.isPublic).length ?? 0;
  });

  const sharedCount = createMemo(() => {
    const data = sharedQuery.data() as unknown[] | undefined;
    return data?.length ?? 0;
  });

  // Use Convex user data as primary source of truth for username
  // Falls back to session data while Convex query is loading
  const username = createMemo(() => {
    const convexUser = currentUserQuery.data() as { username?: string } | undefined;
    return convexUser?.username ?? user()?.username ?? user()?.name ?? 'me';
  });

  const sharedByMeCount = createMemo(() => {
    const data = projectsQuery.data() as { isShared?: boolean }[] | undefined;
    return data?.filter((p) => p.isShared).length ?? 0;
  });

  // Filter state for stat card toggles
  const [filter, setFilter] = createSignal<FilterType>('all');

  return (
    <main class="dashboard-bg">
      <Title>Dashboard - Floorplan</Title>

      {/* Header */}
      <Header />

      {/* Username Selection Modal */}
      <UsernameSelectionModal
        isOpen={showUsernameModal()}
        onClose={() => setShowUsernameModal(false)}
        isFirstLogin={false}
      />

      {/* Main Content */}
      <div class="container-app py-4 sm:py-8">
        {/* Temp Username Nudge */}
        <TempUsernameNudge onSetUsername={() => setShowUsernameModal(true)} />

        {/* Hero Header */}
        <div class="animate-fade-in">
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 class="dashboard-hero-title">My Projects</h1>
              <p class="dashboard-hero-subtitle">Create and manage your floorplan designs</p>
            </div>
            <A href="/new" class="btn btn-primary gap-2 shadow-lg glow-accent w-full sm:w-auto">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Project
            </A>
          </div>
          <div class="dashboard-divider" />
        </div>

        {/* Stats Strip */}
        <Show when={!isLoading()}>
          <div class="stats-grid animate-slide-up">
            <button
              class="stat-card bg-base-200 border border-neutral shadow-sm hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              classList={{
                'stat-card-active !border-primary !bg-primary/12 !shadow-[0_2px_8px] !shadow-primary/20':
                  filter() === 'all',
              }}
              onClick={() => setFilter('all')}
              type="button"
            >
              <div class="stat-card-icon primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{totalProjects()}</div>
                <div class="stat-card-label">Total</div>
              </div>
            </button>

            <button
              class="stat-card bg-base-200 border border-neutral shadow-sm hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              classList={{
                'stat-card-active !border-primary !bg-primary/12 !shadow-[0_2px_8px] !shadow-primary/20':
                  filter() === 'public',
              }}
              onClick={() => setFilter((f) => (f === 'public' ? 'all' : 'public'))}
              type="button"
            >
              <div class="stat-card-icon secondary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{publicProjects()}</div>
                <div class="stat-card-label">Public</div>
              </div>
            </button>

            <button
              class="stat-card bg-base-200 border border-neutral shadow-sm hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              classList={{
                'stat-card-active !border-primary !bg-primary/12 !shadow-[0_2px_8px] !shadow-primary/20':
                  filter() === 'private',
              }}
              onClick={() => setFilter((f) => (f === 'private' ? 'all' : 'private'))}
              type="button"
            >
              <div class="stat-card-icon accent">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{totalProjects() - publicProjects()}</div>
                <div class="stat-card-label">Private</div>
              </div>
            </button>

            <button
              class="stat-card bg-base-200 border border-neutral shadow-sm hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              classList={{
                'stat-card-active !border-primary !bg-primary/12 !shadow-[0_2px_8px] !shadow-primary/20':
                  filter() === 'shared-by-me',
              }}
              onClick={() => setFilter((f) => (f === 'shared-by-me' ? 'all' : 'shared-by-me'))}
              type="button"
            >
              <div class="stat-card-icon warning">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{sharedByMeCount()}</div>
                <div class="stat-card-label">Shared by me</div>
              </div>
            </button>

            <button
              class="stat-card bg-base-200 border border-neutral shadow-sm hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              classList={{
                'stat-card-active !border-primary !bg-primary/12 !shadow-[0_2px_8px] !shadow-primary/20':
                  filter() === 'shared',
              }}
              onClick={() => setFilter((f) => (f === 'shared' ? 'all' : 'shared'))}
              type="button"
            >
              <div class="stat-card-icon info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{sharedCount()}</div>
                <div class="stat-card-label">Shared with me</div>
              </div>
            </button>
          </div>
        </Show>

        {/* Pending Transfer Requests */}
        <Show when={pendingTransfers.data()?.length}>
          <div class="animate-slide-up mb-6">
            <h3 class="text-lg font-semibold mb-3">Pending Transfer Requests</h3>
            <div class="space-y-3">
              <For each={pendingTransfers.data()}>
                {(transfer) => <TransferRequestCard transfer={transfer} />}
              </For>
            </div>
          </div>
        </Show>

        {/* Section Divider */}
        <Show when={!isLoading()}>
          <div class="dashboard-section-divider animate-slide-up-delay-1">
            <span class="dashboard-section-tag">Projects</span>
            <span class="dashboard-section-count">{totalProjects() + sharedCount()}</span>
            <div class="dashboard-section-line" />
          </div>
        </Show>

        {/* Projects Grid */}
        <div class="animate-slide-up-delay-2">
          <Show
            when={!isLoading()}
            fallback={
              <div class="flex justify-center py-12">
                <span class="loading loading-spinner loading-lg text-primary"></span>
              </div>
            }
          >
            <ProjectList
              username={username()}
              onCreateNew={() => navigate('/new')}
              sharedProjects={sharedQuery.data() as any}
              filter={filter()}
            />
          </Show>
        </div>
      </div>
    </main>
  );
}
