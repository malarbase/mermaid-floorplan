import { Title } from '@solidjs/meta';
import { A, useLocation } from '@solidjs/router';
import { createMemo, type ParentComponent, Show } from 'solid-js';
import { AdminGuard } from '../components/AdminGuard';
import BanGate from '../components/BanGate';
import { useSession } from '../lib/auth-client';

const AdminLayout: ParentComponent = (props) => {
  const sessionSignal = useSession();
  const location = useLocation();

  const user = createMemo(() => sessionSignal().data?.user);

  const linkClass = (path: string) => {
    const isRoot = path === '/admin';
    const isActive = isRoot
      ? location.pathname === path || location.pathname === `${path}/`
      : location.pathname.startsWith(path);

    return `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-md mx-2 ${
      isActive
        ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm'
        : 'text-base-content/70 hover:bg-base-300 hover:text-base-content hover:pl-5'
    }`;
  };

  return (
    <BanGate>
      <AdminGuard>
        <Title>Admin Dashboard - Floorplan</Title>
        <div class="flex h-screen bg-base-100 overflow-hidden font-sans">
          <aside class="w-64 bg-base-200 border-r border-neutral flex flex-col flex-none z-20 shadow-lg">
            <div class="h-16 flex items-center px-6 border-b border-neutral bg-base-200/95 backdrop-blur-sm">
              <A
                href="/"
                class="text-xl tracking-wider font-display font-bold text-base-content hover:text-primary transition-colors flex items-center gap-2"
              >
                FLOORPLAN{' '}
                <span class="text-xs font-normal px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20 tracking-normal">
                  ADMIN
                </span>
              </A>
            </div>

            <nav class="flex-1 py-6 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
              <div class="px-6 mb-2 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                Main
              </div>

              <A href="/admin" class={linkClass('/admin')}>
                <svg
                  aria-hidden="true"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  ></path>
                </svg>
                Overview
              </A>

              <div class="px-6 mb-2 mt-6 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                Content
              </div>

              <A href="/admin/featured" class={linkClass('/admin/featured')}>
                <svg
                  aria-hidden="true"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  ></path>
                </svg>
                Featured Projects
              </A>

              <div class="px-6 mb-2 mt-6 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                System
              </div>

              <A href="/admin/users" class={linkClass('/admin/users')}>
                <svg
                  aria-hidden="true"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  ></path>
                </svg>
                <span>Users</span>
                <Show when={user()?.isAdmin}>
                  <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                    SUPER
                  </span>
                </Show>
              </A>
              <A href="/admin/audit" class={linkClass('/admin/audit')}>
                <svg
                  aria-hidden="true"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                Audit Log
              </A>
            </nav>

            <div class="p-4 border-t border-neutral bg-base-200/50">
              <A
                href="/dashboard"
                class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-base-content/70 hover:bg-base-300 hover:text-base-content rounded-md transition-colors w-full group"
              >
                <svg
                  aria-hidden="true"
                  class="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  ></path>
                </svg>
                Exit Admin
              </A>
            </div>
          </aside>

          <div class="flex-1 flex flex-col overflow-hidden relative">
            <header class="h-16 border-b border-neutral bg-base-100/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-bold tracking-wide">Admin Dashboard</h1>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right hidden sm:block">
                  <div class="text-sm font-bold text-base-content">{user()?.name}</div>
                  <div class="text-xs text-base-content/60">{user()?.email}</div>
                </div>
                <div class="w-10 h-10 rounded-full bg-base-300 overflow-hidden ring-2 ring-base-200 ring-offset-2 ring-offset-base-100">
                  <Show
                    when={user()?.image}
                    fallback={
                      <div class="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold">
                        {user()?.name?.charAt(0)}
                      </div>
                    }
                  >
                    <img
                      src={user()?.image ?? ''}
                      alt={user()?.name}
                      class="w-full h-full object-cover"
                    />
                  </Show>
                </div>
              </div>
            </header>

            <main class="flex-1 overflow-auto bg-base-100 p-6 md:p-8">
              <div class="max-w-7xl mx-auto w-full">{props.children}</div>
            </main>
          </div>
        </div>
      </AdminGuard>
    </BanGate>
  );
};

export default AdminLayout;
