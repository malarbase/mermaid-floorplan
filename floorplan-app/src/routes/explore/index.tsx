import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { Header } from '~/components/Header';
import { type PublicProject, PublicProjectCard } from '~/components/PublicProjectCard';
import { api } from '../../../convex/_generated/api';

// Hardcoded topics since API doesn't expose list yet
const TOPICS = [
  { id: 'houses', label: 'Houses', icon: '🏠' },
  { id: 'apartments', label: 'Apartments', icon: '🏢' },
  { id: 'offices', label: 'Offices', icon: '💼' },
  { id: 'kitchens', label: 'Kitchens', icon: '🍳' },
  { id: 'bathrooms', label: 'Bathrooms', icon: '🚿' },
  { id: 'landscape', label: 'Landscape', icon: '🌳' },
];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [limit, setLimit] = createSignal(24);

  // Computed topic from URL
  const activeTopic = createMemo(() => {
    const topic = searchParams.topic;
    return typeof topic === 'string' ? topic : null;
  });

  // Queries
  const trendingQuery = useQuery(api.explore.listTrending, () => ({ limit: limit() }));
  const featuredQuery = useQuery(api.explore.listFeatured, { limit: 6 });
  const collectionsQuery = useQuery(api.explore.listCollections, {});

  // Topic Query (only if topic selected)
  const topicQuery = useQuery(
    api.explore.listByTopic,
    () => ({ topicSlug: activeTopic() || '', limit: limit() }),
    () => ({ enabled: !!activeTopic() }),
  );

  const projects = createMemo(() => {
    if (activeTopic()) {
      return (topicQuery.data()?.projects as unknown as PublicProject[]) ?? [];
    }
    return (trendingQuery.data()?.projects as unknown as PublicProject[]) ?? [];
  });

  const featuredProjects = createMemo(() => {
    return (featuredQuery.data()?.projects as unknown as PublicProject[]) ?? [];
  });

  const collections = createMemo(() => {
    return (collectionsQuery.data()?.collections as unknown[]) ?? [];
  });

  const isLoading = createMemo(() => {
    if (activeTopic()) return topicQuery.isLoading();
    return trendingQuery.isLoading();
  });

  const handleTopicClick = (slug: string) => {
    if (activeTopic() === slug) {
      setSearchParams({ topic: undefined });
    } else {
      setSearchParams({ topic: slug });
    }
    setLimit(24); // Reset limit on topic change
  };

  const loadMore = () => {
    setLimit((l) => l + 24);
  };

  return (
    <main class="min-h-screen bg-base-100">
      <Title>Explore - Floorplan</Title>
      <Header />

      <div class="container-app py-6">
        <div class="flex flex-col md:flex-row gap-8">
          {/* Sidebar (Desktop) / Chips (Mobile) */}
          <aside class="w-full md:w-64 flex-shrink-0 space-y-6">
            <div class="sticky top-24">
              <h2 class="text-lg font-bold mb-4 px-1">Topics</h2>

              {/* Mobile: Horizontal Scroll */}
              <div class="md:hidden flex overflow-x-auto gap-2 pb-4 -mx-4 px-4 scrollbar-hide">
                <button
                  class={`btn btn-sm ${!activeTopic() ? 'btn-neutral' : 'btn-ghost'}`}
                  onClick={() => setSearchParams({ topic: undefined })}
                >
                  All
                </button>
                <For each={TOPICS}>
                  {(topic) => (
                    <button
                      class={`btn btn-sm whitespace-nowrap ${activeTopic() === topic.id ? 'btn-neutral' : 'btn-ghost'}`}
                      onClick={() => handleTopicClick(topic.id)}
                    >
                      <span>{topic.icon}</span>
                      {topic.label}
                    </button>
                  )}
                </For>
              </div>

              {/* Desktop: Vertical List */}
              <div class="hidden md:flex flex-col gap-1">
                <button
                  class={`btn btn-ghost justify-start gap-3 ${!activeTopic() ? 'bg-base-200' : ''}`}
                  onClick={() => setSearchParams({ topic: undefined })}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  Trending
                </button>
                <For each={TOPICS}>
                  {(topic) => (
                    <button
                      class={`btn btn-ghost justify-start gap-3 ${activeTopic() === topic.id ? 'bg-base-200' : ''}`}
                      onClick={() => handleTopicClick(topic.id)}
                    >
                      <span>{topic.icon}</span>
                      {topic.label}
                    </button>
                  )}
                </For>
              </div>

              {/* Featured Collections Link (Desktop) */}
              <Show when={collections().length > 0}>
                <div class="hidden md:block mt-8">
                  <h2 class="text-lg font-bold mb-4 px-1">Collections</h2>
                  <div class="flex flex-col gap-2">
                    <For each={collections() as { slug: string; displayName: string }[]}>
                      {(collection) => (
                        <A
                          href={`/explore/collection/${collection.slug}`}
                          class="link link-hover text-sm px-1 block py-1"
                        >
                          {collection.displayName}
                        </A>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </aside>

          {/* Main Content */}
          <div class="flex-1 min-w-0">
            {/* Featured Section (Only when no topic selected) */}
            <Show when={!activeTopic() && featuredProjects().length > 0}>
              <section class="mb-10">
                <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Featured Designs
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <For each={featuredProjects()}>
                    {(project) => <PublicProjectCard project={project} />}
                  </For>
                </div>
              </section>
            </Show>

            {/* Project Grid */}
            <section>
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold">
                  {activeTopic()
                    ? `${TOPICS.find((t) => t.id === activeTopic())?.label || activeTopic()} Projects`
                    : 'Trending Now'}
                </h2>
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
                  <p class="text-sm opacity-50 mt-1">Try selecting a different topic</p>
                </div>
              </Show>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <For each={projects()}>{(project) => <PublicProjectCard project={project} />}</For>
              </div>

              {/* Load More */}
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
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
