import { Title } from "@solidjs/meta";
import { A, useParams } from "@solidjs/router";
import { Show, For, createMemo } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../../../convex/_generated/api";
import { Header } from "~/components/Header";
import { PublicProjectCard } from "~/components/PublicProjectCard";

export default function CollectionPage() {
  const params = useParams();
  
  const query = useQuery(api.explore.getCollection, () => ({ 
    slug: params.slug ?? "" 
  }));

  const collection = createMemo(() => query.data()?.collection);
  const projects = createMemo(() => query.data()?.projects ?? []);
  
  const isLoading = createMemo(() => query.isLoading());
  const notFound = createMemo(() => !isLoading() && query.data() === null);

  return (
    <main class="min-h-screen bg-base-100">
      <Title>{collection()?.displayName ? `${collection()?.displayName} - Floorplan` : 'Collection - Floorplan'}</Title>
      <Header />

      <div class="container-app py-8">
        <div class="mb-6">
          <A href="/explore" class="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Explore
          </A>
        </div>

        <Show when={isLoading()}>
          <div class="flex flex-col gap-8 animate-pulse">
            <div class="h-10 bg-base-300 w-1/3 rounded"></div>
            <div class="h-4 bg-base-300 w-1/2 rounded"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              <For each={Array(4)}>
                {() => <div class="h-72 bg-base-300 rounded-box"></div>}
              </For>
            </div>
          </div>
        </Show>

        <Show when={notFound()}>
          <div class="text-center py-20 bg-base-200/50 rounded-box">
            <h2 class="text-2xl font-bold opacity-60">Collection Not Found</h2>
            <p class="mt-2 opacity-50">The collection you're looking for doesn't exist.</p>
            <A href="/explore" class="btn btn-primary mt-6">Go to Explore</A>
          </div>
        </Show>

        <Show when={collection()}>
          <div class="space-y-8">
            <header class="space-y-4 max-w-4xl">
              <h1 class="text-4xl font-bold">{collection()?.displayName}</h1>
              <Show when={collection()?.description}>
                <p class="text-lg opacity-80 leading-relaxed">{collection()?.description}</p>
              </Show>
            </header>

            <section>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold opacity-80">
                  {projects().length} {projects().length === 1 ? 'Project' : 'Projects'}
                </h2>
              </div>

              <Show when={projects().length === 0}>
                <div class="text-center py-12 bg-base-200/30 rounded-box border border-base-200">
                  <p class="opacity-60">This collection doesn't have any projects yet.</p>
                </div>
              </Show>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <For each={projects()}>
                  {project => <PublicProjectCard project={project} />}
                </For>
              </div>
            </section>
          </div>
        </Show>
      </div>
    </main>
  );
}
