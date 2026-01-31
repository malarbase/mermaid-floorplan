import { createSignal, createMemo, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useMutation } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { useSession } from "~/lib/auth-client";

// Type-safe API reference for when generated files don't exist yet
const api = {
  sharing: {
    forkProject: "sharing:forkProject" as unknown as FunctionReference<"mutation">,
  },
};

interface ForkButtonProps {
  projectId: string;
  projectSlug: string;
  projectName: string;
  ownerUsername: string;
  /** Optional size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Optional variant */
  variant?: "primary" | "secondary" | "ghost" | "outline";
  /** Show label text */
  showLabel?: boolean;
}

/**
 * Fork Button Component
 * 
 * Allows users to fork a project to their own account.
 * Shows a modal to customize the fork name.
 */
export function ForkButton(props: ForkButtonProps) {
  const navigate = useNavigate();
  const sessionSignal = useSession();
  
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [slug, setSlug] = createSignal("");
  const [displayName, setDisplayName] = createSignal("");
  const [isForking, setIsForking] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const forkProject = useMutation(api.sharing.forkProject);

  const session = createMemo(() => sessionSignal());
  const currentUser = createMemo(() => session()?.data?.user);
  const isLoggedIn = createMemo(() => !!currentUser());
  const currentUsername = createMemo(() => currentUser()?.name ?? "");

  // Check if user is viewing their own project
  const isOwnProject = createMemo(() => {
    const user = currentUser();
    return user?.name === props.ownerUsername;
  });

  const sizeClass = createMemo(() => {
    switch (props.size) {
      case "xs": return "btn-xs";
      case "sm": return "btn-sm";
      case "lg": return "btn-lg";
      default: return "";
    }
  });

  const variantClass = createMemo(() => {
    switch (props.variant) {
      case "primary": return "btn-primary";
      case "secondary": return "btn-secondary";
      case "ghost": return "btn-ghost";
      case "outline": return "btn-outline";
      default: return "";
    }
  });

  const openModal = () => {
    // Set defaults
    setSlug(props.projectSlug);
    setDisplayName(`${props.projectName}`);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleFork = async () => {
    if (!slug().trim()) {
      setError("Slug is required");
      return;
    }

    // Validate slug format
    const slugValue = slug().toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(slugValue)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens");
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
        // Navigate to the new forked project
        navigate(`/u/${currentUsername()}/${slugValue}`);
      }
    } catch (err) {
      console.error("Fork failed:", err);
      setError(err instanceof Error ? err.message : "Failed to fork project");
    } finally {
      setIsForking(false);
    }
  };

  const handleLogin = () => {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.pathname);
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
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
      <Show when={isModalOpen()}>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Fork Project</h3>
            <p class="py-2 text-base-content/70">
              Create a copy of <strong>{props.projectName}</strong> in your account.
            </p>

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
                  Your project will be at: /u/{currentUsername()}/{slug() || "..."}
                </span>
              </label>
            </div>

            <Show when={error()}>
              <div class="alert alert-error mt-4">
                <svg
                  class="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error()}</span>
              </div>
            </Show>

            <div class="modal-action">
              <button
                class="btn btn-ghost"
                onClick={closeModal}
                disabled={isForking()}
              >
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
          </div>
          <form method="dialog" class="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </div>
      </Show>
    </>
  );
}

export default ForkButton;
