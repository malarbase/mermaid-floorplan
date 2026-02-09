/**
 * Shared layout component for project pages.
 * Provides consistent structure: header, optional info banner, content area.
 */

import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { type JSX, Show } from 'solid-js';
import type { ForkedFrom, Project } from '~/lib/project-types';

// Icons as components for reuse
export const ForkIcon = () => (
  <svg
    class="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0"
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
);

export const SettingsIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const LinkIcon = () => (
  <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
    />
  </svg>
);

interface InfoBannerProps {
  variant: 'info' | 'success';
  children: JSX.Element;
}

/**
 * Info banner shown below header (e.g., "Mutable URL" or "Permanent Link")
 * Uses base-content text on tinted backgrounds for readable contrast in both themes.
 */
export function InfoBanner(props: InfoBannerProps) {
  const variantClasses = () =>
    props.variant === 'success'
      ? 'bg-success/10 border-b border-success/30 text-base-content'
      : 'bg-info/10 border-b border-info/30 text-base-content';

  return (
    <div class={`px-4 py-1.5 text-sm ${variantClasses()}`}>
      <div class="flex items-center justify-center gap-2">{props.children}</div>
    </div>
  );
}

interface ForkedFromBadgeProps {
  forkedFrom: ForkedFrom;
  compact?: boolean;
}

/**
 * "Forked from" attribution badge
 */
export function ForkedFromBadge(props: ForkedFromBadgeProps) {
  return (
    <div class="text-xs sm:text-sm text-base-content/60 flex items-center gap-1">
      <ForkIcon />
      <span class={props.compact ? 'sm:hidden' : 'hidden sm:inline'}>forked from</span>
      <Show when={props.compact}>
        <span class="sm:hidden">from</span>
      </Show>
      <A
        href={`/u/${props.forkedFrom.owner.username}/${props.forkedFrom.project.slug}`}
        class="link link-hover font-medium truncate"
      >
        {props.forkedFrom.owner.username}/{props.forkedFrom.project.slug}
      </A>
    </div>
  );
}

interface ProjectBreadcrumbsProps {
  username: string;
  projectSlug: string;
  project: Project | undefined;
  forkedFrom: ForkedFrom | null | undefined;
  /** Title suffix shown after project name (e.g., "/ main" or "#abc123") */
  titleSuffix?: JSX.Element;
  /** Breadcrumb suffix (e.g., "v/main" or "s/abc123") */
  breadcrumbSuffix?: string;
  /** Whether to show compact layout for mobile */
  compact?: boolean;
}

/**
 * Project breadcrumbs and title for use as Header's centerContent.
 *
 * Single-line layout: breadcrumb trail + display name on the same row.
 * On small screens the display name is hidden (the slug in breadcrumbs is sufficient).
 * Overflow is truncated with ellipsis to prevent clipping into action buttons.
 */
export function ProjectBreadcrumbs(props: ProjectBreadcrumbsProps) {
  return (
    <div class="min-w-0 overflow-hidden">
      <div class="flex items-center gap-2 overflow-hidden">
        {/* Breadcrumb trail */}
        <div class="text-xs sm:text-sm breadcrumbs flex-shrink min-w-0">
          <ul>
            <li>
              <A href={`/u/${props.username}`}>{props.username}</A>
            </li>
            <li>
              <A href={`/u/${props.username}/${props.projectSlug}`}>{props.projectSlug}</A>
            </li>
            <Show when={props.breadcrumbSuffix}>
              <li>{props.breadcrumbSuffix}</li>
            </Show>
          </ul>
        </div>

        {/* Display name (hidden on small screens since slug is already visible) */}
        <Show when={props.project?.displayName}>
          <span class="hidden sm:inline text-base-content/40 flex-shrink-0">/</span>
          <h1 class="hidden sm:block text-sm md:text-base font-semibold truncate min-w-0">
            {props.project?.displayName}
            <Show when={props.titleSuffix}> {props.titleSuffix}</Show>
          </h1>
        </Show>
      </div>

      {/* Forked-from badge (below, compact) */}
      <Show when={props.forkedFrom}>
        <ForkedFromBadge forkedFrom={props.forkedFrom!} compact={props.compact} />
      </Show>
    </div>
  );
}

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

/**
 * Loading spinner (full screen by default)
 */
export function LoadingSpinner(props: LoadingSpinnerProps) {
  return (
    <div
      class={`flex justify-center items-center ${props.fullScreen !== false ? 'h-screen' : 'h-full'}`}
    >
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  );
}

interface NotFoundCardProps {
  title: string;
  message: string;
  actions?: JSX.Element;
}

/**
 * "Not found" card for missing projects/versions/snapshots
 */
export function NotFoundCard(props: NotFoundCardProps) {
  return (
    <div class="flex justify-center items-center h-screen">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body text-center">
          <h2 class="card-title">{props.title}</h2>
          <p>{props.message}</p>
          <Show when={props.actions}>
            <div class="flex gap-2 justify-center mt-4">{props.actions}</div>
          </Show>
        </div>
      </div>
    </div>
  );
}

interface ContentMissingCardProps {
  username: string;
  projectSlug: string;
  message?: string;
}

/**
 * Card shown when content is missing/corrupted
 */
export function ContentMissingCard(props: ContentMissingCardProps) {
  return (
    <div class="flex justify-center items-center h-full">
      <div class="card bg-error/10 border border-error">
        <div class="card-body text-center">
          <h2 class="card-title text-error">Content Not Available</h2>
          <p class="text-base-content/70">
            {props.message ?? 'This content has no data. It may be corrupted or missing.'}
          </p>
          <A
            href={`/u/${props.username}/${props.projectSlug}/history`}
            class="btn btn-outline btn-sm mt-4"
          >
            View History
          </A>
        </div>
      </div>
    </div>
  );
}

interface ProjectPageLayoutProps {
  /** Page title for browser tab */
  title: string;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Content to show when loaded */
  children: JSX.Element;
  /** Fallback when project/content not found */
  notFoundFallback?: JSX.Element;
  /** Whether to show the not found fallback */
  showNotFound?: boolean;
}

/**
 * Main layout wrapper for project pages.
 * Handles loading states and not-found fallbacks.
 */
export function ProjectPageLayout(props: ProjectPageLayoutProps) {
  return (
    <main class="h-screen flex flex-col bg-base-200">
      <Title>{props.title}</Title>
      <Show when={!props.isLoading} fallback={<LoadingSpinner />}>
        <Show
          when={!props.showNotFound}
          fallback={
            props.notFoundFallback ?? (
              <NotFoundCard title="Not Found" message="The requested content was not found." />
            )
          }
        >
          {props.children}
        </Show>
      </Show>
    </main>
  );
}
