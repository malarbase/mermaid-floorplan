import { A } from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface PublicProject {
  _id: string;
  slug: string;
  displayName: string;
  description?: string;
  thumbnail?: string;
  userId: string;
  updatedAt: number;
  viewCount?: number;
  isPublic: boolean;
}

interface PublicProjectCardProps {
  project: PublicProject;
  class?: string;
}

export function PublicProjectCard(props: PublicProjectCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Fetch the owner of the project to build the link correctly
  const ownerQuery = useQuery(api.users.getById, () => ({ userId: props.project.userId as Id<"users"> }));
  
  const owner = createMemo(() => ownerQuery.data());
  const isLoadingOwner = createMemo(() => ownerQuery.isLoading());

  return (
    <div class={`card bg-base-100 shadow-sm hover:shadow-md transition-shadow duration-200 border border-base-200 ${props.class || ""}`}>
      {/* Link overlay */}
      <Show when={owner()}>
        <A 
          href={`/u/${owner()?.username}/${props.project.slug}`}
          class="absolute inset-0 z-10"
          aria-label={`View ${props.project.displayName}`}
        />
      </Show>

      <figure class="aspect-video bg-base-200 relative overflow-hidden">
        <Show when={props.project.thumbnail}>
          <img 
            src={props.project.thumbnail} 
            alt={props.project.displayName}
            class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </Show>
        <Show when={!props.project.thumbnail}>
          <div class="w-full h-full flex items-center justify-center text-base-content/20 bg-base-300">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 10h10M7 14h6" />
            </svg>
          </div>
        </Show>
      </figure>

      <div class="card-body p-4 gap-2">
        <h3 class="card-title text-base font-semibold truncate leading-tight" title={props.project.displayName}>
          {props.project.displayName}
        </h3>
        
        <div class="flex items-center text-xs text-base-content/60 gap-2 mb-1">
          <Show when={!isLoadingOwner()} fallback={<span class="loading loading-spinner loading-xs"></span>}>
            <span class="truncate max-w-[120px] font-medium">
              {owner()?.displayName || owner()?.username || "Unknown User"}
            </span>
          </Show>
          <span>•</span>
          <span>{formatDate(props.project.updatedAt)}</span>
        </div>

        <Show when={props.project.description}>
          <p class="text-sm text-base-content/70 line-clamp-2 min-h-[2.5em] leading-snug">
            {props.project.description}
          </p>
        </Show>

        <div class="card-actions justify-end items-center mt-2 text-xs text-base-content/50">
          <Show when={props.project.viewCount !== undefined}>
            <span class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded-full">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {props.project.viewCount}
            </span>
          </Show>
        </div>
      </div>
    </div>
  );
}
