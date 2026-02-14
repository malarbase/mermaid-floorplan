import { useNavigate, useSearchParams } from '@solidjs/router';
import { useMutation, useQuery } from 'convex-solidjs';
import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import { Modal } from '~/components/ui/Modal';
import { useToast } from '~/components/ui/Toast';
import { useSession } from '~/lib/auth-client';
import { api } from '../../convex/_generated/api';

interface ForkButtonProps {
  projectId: string;
  projectSlug: string;
  projectName: string;
  ownerUsername: string;
  /** Optional size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Optional variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  /** Show label text */
  showLabel?: boolean;
  /** Default name to use when forking */
  defaultName?: string;
}

/**
 * Fork Button Component
 *
 * Allows users to fork a project to their own account.
 * Shows a modal to customize the fork name.
 */
export function ForkButton(props: ForkButtonProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionSignal = useSession();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [slug, setSlug] = createSignal('');
  const [displayName, setDisplayName] = createSignal('');
  const [isForking, setIsForking] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const forkProject = useMutation(api.sharing.forkProject);
  const userProjects = useQuery(api.projects.list, {});

  const session = createMemo(() => sessionSignal());
  const currentUser = createMemo(() => session()?.data?.user);
  const isLoggedIn = createMemo(() => !!currentUser());
  const currentUsername = createMemo(() => currentUser()?.username ?? currentUser()?.name ?? '');

  const isOwnProject = createMemo(() => {
    const user = currentUser();
    return (user?.username ?? user?.name) === props.ownerUsername;
  });

  const sizeClass = createMemo(() => {
    switch (props.size) {
      case 'xs':
        return 'btn-xs';
      case 'sm':
        return 'btn-sm';
      case 'lg':
        return 'btn-lg';
      default:
        return '';
    }
  });

  const variantClass = createMemo(() => {
    switch (props.variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'ghost':
        return 'btn-ghost';
      case 'outline':
        return 'btn-outline';
      default:
        return '';
    }
  });

  const openModal = () => {
    const baseName = props.defaultName || `${props.projectName} (fork)`;
    setDisplayName(baseName);
    setError(null);

    const projects = userProjects.data() || [];
    const existingSlugs = new Set((projects as { slug: string }[]).map((p) => p.slug));

    let baseSlug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!baseSlug) baseSlug = 'fork';

    let uniqueSlug = baseSlug;
    let counter = 2;

    while (existingSlugs.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    setSlug(uniqueSlug);
    setIsModalOpen(true);
  };

  createEffect(() => {
    if (isLoggedIn() && searchParams.fork === 'true' && !isOwnProject()) {
      setSearchParams({ fork: undefined });
      openModal();
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleFork = async () => {
    if (!slug().trim()) {
      setError('Slug is required');
      return;
    }

    // Validate slug format
    const slugValue = slug().toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(slugValue)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsForking(true);
    setError(null);

    try {
      const result = await forkProject.mutate({
        projectId: props.projectId,
        slug: slugValue,
        displayName: displayName().trim() || undefined,
      });

      if (result?.success && result?.projectId) {
        closeModal();
        toast.success('Now editing your copy');
        // Navigate to the new forked project
        navigate(`/u/${currentUsername()}/${slugValue}`);
      }
    } catch (err) {
      console.error('Fork failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fork project');
    } finally {
      setIsForking(false);
    }
  };

  const handleLogin = () => {
    const returnUrl = encodeURIComponent(`${window.location.pathname}?fork=true`);
    navigate(`/login?returnUrl=${returnUrl}`);
  };

  // Don't show fork button for own projects
  if (isOwnProject()) {
    return null;
  }

  return (
    <>
      <Show
        when={isLoggedIn()}
        fallback={
          <button
            class={`btn ${sizeClass()} ${variantClass()}`}
            onClick={handleLogin}
            title="Sign in to fork this project"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <Show when={props.showLabel !== false}>
              <span>Fork</span>
            </Show>
          </button>
        }
      >
        <button
          class={`btn ${sizeClass()} ${variantClass()}`}
          onClick={openModal}
          title="Fork this project"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <Show when={props.showLabel !== false}>
            <span>Fork</span>
          </Show>
        </button>
      </Show>

      {/* Fork Modal */}
      <Modal
        isOpen={isModalOpen()}
        onClose={closeModal}
        title="Fork Project"
        description={
          <>
            Create a copy of <strong>{props.projectName}</strong> in your account.
          </>
        }
        error={error() ?? undefined}
      >
        <div class="form-control w-full mt-4">
          <label class="label">
            <span class="label-text">Project Name</span>
          </label>
          <input
            type="text"
            placeholder="My Fork"
            class="input input-bordered w-full"
            value={displayName()}
            onInput={(e) => setDisplayName(e.currentTarget.value)}
          />
        </div>

        <div class="form-control w-full mt-3">
          <label class="label">
            <span class="label-text">URL Slug</span>
          </label>
          <input
            type="text"
            placeholder="my-fork"
            class="input input-bordered w-full font-mono"
            value={slug()}
            onInput={(e) => setSlug(e.currentTarget.value.toLowerCase())}
          />
          <label class="label">
            <span class="label-text-alt text-base-content/60">
              Your project will be at: /u/{currentUsername()}/{slug() || '...'}
            </span>
          </label>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" onClick={closeModal} disabled={isForking()}>
            Cancel
          </button>
          <button
            class="btn btn-primary"
            onClick={handleFork}
            disabled={isForking() || !slug().trim()}
          >
            <Show
              when={!isForking()}
              fallback={<span class="loading loading-spinner loading-sm"></span>}
            >
              Fork Project
            </Show>
          </button>
        </div>
      </Modal>
    </>
  );
}

export default ForkButton;
