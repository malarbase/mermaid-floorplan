import { Title } from "@solidjs/meta";
import { useParams, A } from "@solidjs/router";
import { Show, createMemo, createSignal } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useQuery } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { PermalinkDisplay } from "~/components/PermalinkDisplay";
import { copyToClipboard, generatePermalink } from "~/lib/permalink";
import { ForkButton } from "~/components/ForkButton";
import { useSession } from "~/lib/auth-client";
import { UserMenu } from "~/components/UserMenu";

// Use clientOnly to prevent SSR issues with Three.js
const FloorplanEmbed = clientOnly(() => import("~/components/FloorplanEmbed"));

// Type-safe API reference builder for when generated files don't exist yet
const api = {
  projects: {
    getBySlug: "projects:getBySlug" as unknown as FunctionReference<"query">,
    getByHash: "projects:getByHash" as unknown as FunctionReference<"query">,
  },
};

// Types
interface Project {
  _id: string;
  displayName: string;
  description?: string;
  isPublic: boolean;
  defaultVersion: string;
  userId: string;
  slug: string;
}

interface Owner {
  _id: string;
  username: string;
}

interface ForkedFrom {
  project: Project;
  owner: Owner;
}

interface Snapshot {
  _id: string;
  contentHash: string;
  content: string;
  message?: string;
  createdAt: number;
  authorId: string;
}

/**
 * Snapshot permalink page - shows project at a specific immutable snapshot.
 * Route: /u/:username/:project/s/:hash
 *
 * Snapshots are immutable (like git commits).
 * This URL will always show exactly the same content.
 */
export default function SnapshotView() {
  const params = useParams();
  const sessionSignal = useSession();
  const username = createMemo(() => params.username);
  const projectSlug = createMemo(() => params.project);
  const hash = createMemo(() => params.hash);

  const [copied, setCopied] = createSignal(false);

  // Get current user session
  const session = createMemo(() => sessionSignal());
  const currentUser = createMemo(() => session()?.data?.user);

  // Query project data first
  const projectQuery = useQuery(api.projects.getBySlug, () => ({
    username: username(),
    projectSlug: projectSlug(),
  }));

  const projectData = createMemo(() => {
    const data = projectQuery.data() as { project: Project; owner: Owner; forkedFrom: ForkedFrom | null } | null | undefined;
    return data;
  });

  const project = createMemo(() => projectData()?.project);
  const owner = createMemo(() => projectData()?.owner);
  const forkedFrom = createMemo(() => projectData()?.forkedFrom);

  const isOwner = createMemo(() => {
    const user = currentUser();
    const own = owner();
    if (!user || !own) return false;
    return (user.username ?? user.name) === own.username;
  });

  // Query snapshot data
  const snapshotQuery = useQuery(
    api.projects.getByHash,
    () => ({
      projectId: project()?._id ?? ("" as any),
      hash: hash(),
    }),
    () => ({ enabled: !!project()?._id })
  );

  const snapshot = createMemo(() => {
    const data = snapshotQuery.data() as Snapshot | null | undefined;
    return data;
  });

  const content = createMemo(() => snapshot()?.content);

  const isLoading = createMemo(() => {
    if (projectQuery.isLoading() || projectQuery.data() === undefined) return true;
    if (projectQuery.data() === null) return false;
    return snapshotQuery.isLoading() || snapshotQuery.data() === undefined;
  });

  const isContentMissing = createMemo(() => {
    if (isLoading()) return false;
    if (!projectData() || !snapshot()) return false;
    return !content();
  });

  // Format timestamp
  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Copy permalink to clipboard
  const copyPermalink = async () => {
    const u = username();
    const p = projectSlug();
    const h = hash();
    if (!u || !p || !h) return;
    
    const url = generatePermalink(u, p, h, true);
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main class="min-h-screen bg-base-200">
      <Title>
        {projectSlug()} s/{hash()} - Floorplan
      </Title>

      <Show
        when={!isLoading()}
        fallback={
          <div class="flex justify-center items-center h-screen">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        <Show
          when={projectData()}
          fallback={
            <div class="flex justify-center items-center h-screen">
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
          <Show
            when={snapshot()}
            fallback={
              <div class="flex justify-center items-center h-screen">
                <div class="card bg-base-100 shadow-xl">
                  <div class="card-body text-center">
                    <h2 class="card-title">Snapshot not found</h2>
                    <p>
                      The snapshot <code class="bg-base-200 px-2 py-1 rounded">#{hash()}</code>{" "}
                      doesn't exist for this project.
                    </p>
                    <div class="flex gap-2 justify-center mt-4">
                      <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-primary">
                        View Project
                      </A>
                      <A
                        href={`/u/${username()}/${projectSlug()}/history`}
                        class="btn btn-ghost"
                      >
                        View History
                      </A>
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            {/* Header */}
            <header class="bg-base-100 border-b border-base-300 p-4">
              <div class="max-w-6xl mx-auto flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <A href="/" class="btn btn-ghost text-xl tracking-wider flex-shrink-0" style={{ "font-family": "'Bebas Neue', sans-serif" }}>
                    FLOORPLAN
                  </A>
                  <div>
                    <div class="text-sm breadcrumbs">
                      <ul>
                        <li>
                          <A href={`/u/${username()}`}>{username()}</A>
                        </li>
                        <li>
                          <A href={`/u/${username()}/${projectSlug()}`}>{projectSlug()}</A>
                        </li>
                        <li>s/{hash()}</li>
                      </ul>
                    </div>
                  <h1 class="text-xl font-bold">
                    {project()?.displayName}{" "}
                    <span class="font-mono text-base-content/50">#{hash()}</span>
                  </h1>
                  <Show when={snapshot()?.message}>
                    <p class="text-sm text-base-content/70 mt-1">{snapshot()?.message}</p>
                  </Show>
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
                </div>

                <div class="flex items-center gap-2">
                  {/* Copy Permalink Button */}
                  <button
                    class="btn btn-ghost btn-sm gap-2"
                    onClick={copyPermalink}
                  >
                    <Show
                      when={!copied()}
                      fallback={
                        <>
                          <svg
                            class="w-4 h-4 text-success"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Copied!
                        </>
                      }
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Permalink
                    </Show>
                  </button>

                  <A href={`/u/${username()}/${projectSlug()}/history`} class="btn btn-ghost btn-sm">
                    History
                  </A>

                  <A href={`/u/${username()}/${projectSlug()}`} class="btn btn-primary btn-sm">
                    Latest
                  </A>

                  <span class="badge badge-success">Permanent Link</span>

                  {/* Fork button for non-owners */}
                  <Show when={!isOwner() && project() && username()}>
                    <ForkButton
                      projectId={project()!._id}
                      projectSlug={projectSlug()!}
                      projectName={project()!.displayName}
                      ownerUsername={username()!}
                      size="sm"
                      variant="ghost"
                    />
                  </Show>

                  <div class="divider divider-horizontal mx-2 h-6 self-center" />
                  <UserMenu size="sm" />
                </div>
              </div>
            </header>

            {/* Permalink Info Banner */}
            <div class="bg-success/10 border-b border-success/20 p-3">
              <div class="max-w-6xl mx-auto flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <svg
                    class="w-5 h-5 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-success-content">
                      This is a permanent snapshot
                    </p>
                    <p class="text-xs text-success-content/70">
                      This content will never change. Created{" "}
                      {snapshot()?.createdAt ? formatDate(snapshot()!.createdAt) : ""}
                    </p>
                  </div>
                </div>

                <Show when={username() && projectSlug() && hash()}>
                  <div class="hidden sm:block">
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
              </div>
            </div>

            {/* Viewer Container */}
            <div class="h-[calc(100vh-160px)]">
              <Show
                when={!isContentMissing()}
                fallback={
                  <div class="flex justify-center items-center h-full">
                    <div class="card bg-error/10 border border-error">
                      <div class="card-body text-center">
                        <h2 class="card-title text-error">Content Not Available</h2>
                        <p class="text-base-content/70">
                          This snapshot has no content. The data may be corrupted.
                        </p>
                        <A href={`/u/${username()}/${projectSlug()}/history`} class="btn btn-outline btn-sm mt-4">
                          View History
                        </A>
                      </div>
                    </div>
                  </div>
                }
              >
                <FloorplanEmbed dsl={content()!} theme="dark" editable={false} />
              </Show>
            </div>
          </Show>
        </Show>
      </Show>
    </main>
  );
}
