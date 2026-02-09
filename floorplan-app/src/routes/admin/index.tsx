import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { createMemo, Show } from 'solid-js';
import { api } from '../../../convex/_generated/api';

export default function AdminOverview() {
  const statsQuery = useQuery(api.admin.getStats, {});

  const stats = createMemo(() => statsQuery.data());
  const isLoading = createMemo(() => statsQuery.isLoading());

  return (
    <div class="animate-fade-in space-y-8">
      <Title>Admin Overview - Floorplan</Title>

      <div>
        <h2 class="text-2xl font-bold text-base-content">Overview</h2>
        <p class="text-base-content/60 mt-1">Platform statistics and quick actions</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div class="stat-card bg-base-200/50 border border-base-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 class="font-medium text-base-content/70">Total Projects</h3>
          </div>
          <Show
            when={!isLoading()}
            fallback={<div class="h-8 w-16 bg-base-300 rounded animate-pulse" />}
          >
            <div class="text-3xl font-bold text-base-content">{stats()?.totalProjects ?? 0}</div>
          </Show>
        </div>

        <div class="stat-card bg-base-200/50 border border-base-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-warning/10 rounded-lg text-warning">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h3 class="font-medium text-base-content/70">Featured</h3>
          </div>
          <Show
            when={!isLoading()}
            fallback={<div class="h-8 w-16 bg-base-300 rounded animate-pulse" />}
          >
            <div class="text-3xl font-bold text-base-content">{stats()?.featuredProjects ?? 0}</div>
          </Show>
        </div>

        <div class="stat-card bg-base-200/50 border border-base-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-info/10 rounded-lg text-info">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 class="font-medium text-base-content/70">Total Users</h3>
          </div>
          <Show
            when={!isLoading()}
            fallback={<div class="h-8 w-16 bg-base-300 rounded animate-pulse" />}
          >
            <div class="text-3xl font-bold text-base-content">{stats()?.totalUsers ?? 0}</div>
          </Show>
        </div>

        <div class="stat-card bg-base-200/50 border border-base-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-error/10 rounded-lg text-error">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 class="font-medium text-base-content/70">Admins</h3>
          </div>
          <Show
            when={!isLoading()}
            fallback={<div class="h-8 w-16 bg-base-300 rounded animate-pulse" />}
          >
            <div class="text-3xl font-bold text-base-content">{stats()?.adminUsers ?? 0}</div>
          </Show>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-4">
          <h3 class="text-lg font-bold text-base-content">Quick Actions</h3>
          <div class="flex flex-col gap-3">
            <A href="/admin/featured" class="btn btn-outline justify-start gap-3 h-auto py-3">
              <span class="p-1 bg-warning/10 rounded text-warning">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </span>
              Feature a Project
            </A>
            <A href="/admin/users" class="btn btn-outline justify-start gap-3 h-auto py-3">
              <span class="p-1 bg-info/10 rounded text-info">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </span>
              Manage Users
            </A>
          </div>
        </div>

        <div class="lg:col-span-2">
          <div class="bg-base-200/30 border border-base-200 rounded-xl p-6 h-full">
            <h3 class="text-lg font-bold text-base-content mb-4">Recent Admin Activity</h3>
            <div class="flex flex-col items-center justify-center py-12 text-base-content/40 border-2 border-dashed border-base-300 rounded-lg">
              <svg
                class="w-12 h-12 mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Audit log implementation coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
