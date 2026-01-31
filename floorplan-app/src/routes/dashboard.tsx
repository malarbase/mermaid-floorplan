import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { Show, createMemo, createEffect, createSignal } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../convex/_generated/api";
import { useSession } from "~/lib/auth-client";
import { Header } from "~/components/Header";
import { TempUsernameNudge } from "~/components/TempUsernameNudge";
import { UsernameSelectionModal } from "~/components/UsernameSelectionModal";
import { ProjectList } from "~/components/ProjectList";
import { SharedProjectList } from "~/components/SharedProjectList";

/**
 * User dashboard - shows user's projects (protected route).
 * Route: /dashboard
 */
export default function Dashboard() {
  const sessionSignal = useSession();
  const navigate = useNavigate();
  const [showUsernameModal, setShowUsernameModal] = createSignal(false);
  
  const session = createMemo(() => sessionSignal());
  const isLoading = createMemo(() => session()?.isPending ?? true);
  const user = createMemo(() => session()?.data?.user);

  // Queries for stats using standard Convex hooks
  const projectsQuery = useQuery(api.projects.list, {});
  const sharedQuery = useQuery(api.sharing.getSharedWithMe, {});

  // Stats computed values
  const totalProjects = createMemo(() => {
    const data = projectsQuery.data() as unknown[] | undefined;
    return data?.length ?? 0;
  });

  const publicProjects = createMemo(() => {
    const data = projectsQuery.data() as { isPublic: boolean }[] | undefined;
    return data?.filter(p => p.isPublic).length ?? 0;
  });

  const sharedCount = createMemo(() => {
    const data = sharedQuery.data() as unknown[] | undefined;
    return data?.length ?? 0;
  });

  // Redirect to login if not authenticated
  createEffect(() => {
    if (!isLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  // Get username for project URLs (use user name or fallback)
  const username = createMemo(() => user()?.name ?? "me");

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

        {/* Page Header */}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 animate-fade-in">
          <div>
            <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-base-content">My Projects</h1>
            <p class="text-sm sm:text-base text-base-content/60 mt-1">
              Create and manage your floorplan designs
            </p>
          </div>
          <A href="/new" class="btn btn-primary gap-2 shadow-md w-full sm:w-auto">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </A>
        </div>

        {/* Stats Section */}
        <Show when={!isLoading()}>
          <div class="stats-grid animate-slide-up">
            <div class="stat-card">
              <div class="stat-card-icon primary">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{totalProjects()}</div>
                <div class="stat-card-label">Total Projects</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-icon secondary">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{publicProjects()}</div>
                <div class="stat-card-label">Public</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-icon accent">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{totalProjects() - publicProjects()}</div>
                <div class="stat-card-label">Private</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-icon info">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-value">{sharedCount()}</div>
                <div class="stat-card-label">Shared with me</div>
              </div>
            </div>
          </div>
        </Show>

        {/* Projects Grid */}
        <div class="animate-slide-up-delay-1">
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
              onCreateNew={() => navigate("/new")}
            />

            {/* Shared With Me Section */}
            <SharedProjectList class="shared-section" />
          </Show>
        </div>
      </div>
    </main>
  );
}
