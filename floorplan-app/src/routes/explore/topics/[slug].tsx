import { Title } from '@solidjs/meta';
import { A, useParams } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { Header } from '~/components/Header';
import { type PublicProject, PublicProjectCard } from '~/components/PublicProjectCard';
import { api } from '../../../../convex/_generated/api';

const TOPICS = [
  { id: 'houses', label: 'Houses', icon: '🏠' },
  { id: 'apartments', label: 'Apartments', icon: '🏢' },
  { id: 'offices', label: 'Offices', icon: '💼' },
  { id: 'kitchens', label: 'Kitchens', icon: '🍳' },
  { id: 'bathrooms', label: 'Bathrooms', icon: '🚿' },
  { id: 'landscape', label: 'Landscape', icon: '🌳' },
];

export default function TopicPage() {
  const params = useParams();
  const slug = createMemo(() => params.slug || '');
  const [limit, setLimit] = createSignal(24);

  const topicQuery = useQuery(api.explore.listByTopic, () => ({
    topicSlug: slug(),
    limit: limit(),
  }));

  const projects = createMemo(() => {
    const data = topicQuery.data();
    return (data?.projects as unknown as PublicProject[]) ?? [];
  });

  const isLoading = createMemo(() => topicQuery.isLoading());

  const topicInfo = createMemo(() => {
    const currentSlug = slug();
    const knownTopic = TOPICS.find((t) => t.id === currentSlug);
    if (knownTopic) return knownTopic;

    const label = currentSlug.charAt(0).toUpperCase() + currentSlug.slice(1).replace(/-/g, ' ');
    return { id: currentSlug, label, icon: '#' };
  });

  const loadMore = () => {
    setLimit((l) => l + 24);
  };

  return (
    <main class="min-h-screen bg-base-100">
      <Title>{topicInfo().label} Projects - Floorplan</Title>
      <Header />

      <div class="container-app py-8">
        <div class="mb-6">
          <A href="/explore" class="btn btn-ghost btn-sm gap-2 pl-0 hover:bg-transparent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Explore
          </A>
        </div>

        <div class="mb-10">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-4xl">{topicInfo().icon}</span>
            <h1 class="text-3xl font-bold">{topicInfo().label}</h1>
          </div>
          <p class="text-base-content/70">
            Browse the best {topicInfo().label.toLowerCase()} floor plans created by the community.
          </p>
        </div>

        <Show when={isLoading() && projects().length === 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <For each={Array(8)}>
              {() => (
                <div class="card bg-base-100 shadow-sm h-72 animate-pulse">
                  <div class="bg-base-300 h-40 w-full"></div>
                  <div class="p-4 space-y-3">
                    <div class="h-4 bg-base-300 w-3/4 rounded"></div>
                    <div class="h-3 bg-base-300 w-1/2 rounded"></div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={!isLoading() && projects().length === 0}>
          <div class="text-center py-20 bg-base-200/50 rounded-box">
            <svg
              class="w-16 h-16 mx-auto text-base-content/20 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 class="text-lg font-medium opacity-60">No projects found</h3>
            <p class="text-sm opacity-50 mt-1">
              There are no projects in the <strong>{topicInfo().label}</strong> topic yet.
            </p>
            <div class="mt-6">
              <A href="/explore" class="btn btn-primary btn-outline btn-sm">
                Explore other topics
              </A>
            </div>
          </div>
        </Show>

        <Show when={projects().length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <For each={projects()}>{(project) => <PublicProjectCard project={project} />}</For>
          </div>
        </Show>

        <Show when={projects().length >= limit()}>
          <div class="flex justify-center mt-12">
            <button class="btn btn-outline gap-2" onClick={loadMore} disabled={isLoading()}>
              <Show when={isLoading()} fallback="Load More">
                <span class="loading loading-spinner loading-xs"></span>
                Loading...
              </Show>
            </button>
          </div>
        </Show>
      </div>
    </main>
  );
}
