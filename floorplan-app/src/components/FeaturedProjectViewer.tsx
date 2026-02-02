import { createMemo, Show } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../convex/_generated/api";
import { FloorplanEmbed } from "./FloorplanEmbed";
import { A } from "@solidjs/router";

export function FeaturedProjectViewer() {
  const featured = useQuery(api.explore.listFeatured, { limit: 1 });
  
  const project = createMemo(() => {
    const data = featured.data();
    return data?.projects?.[0];
  });

  return (
    <div class="relative w-full h-[600px] rounded-xl overflow-hidden shadow-2xl border border-base-content/10 bg-base-100">
      <Show
        when={!featured.isLoading()}
        fallback={
          <div class="absolute inset-0 flex items-center justify-center bg-base-200">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        }
      >
        <Show
          when={project()}
          fallback={
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-base-200 p-8 text-center">
              <h3 class="text-xl font-bold mb-2">No featured projects yet</h3>
              <p class="text-base-content/60">Check back later for inspiration.</p>
            </div>
          }
        >
          {(p) => (
            <>
              <FloorplanEmbed 
                dsl={p().content} 
                theme="light" 
                withUI={true}
                editable={false}
              />
              
              {/* Overlay CTA */}
              <div class="absolute bottom-6 right-6 z-10 pointer-events-none">
                <A 
                  href="/explore" 
                  class="btn btn-primary shadow-lg pointer-events-auto hover:scale-105 transition-transform"
                >
                  Explore More Projects
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </A>
              </div>

              {/* Project Info Badge */}
              <div class="absolute top-6 left-6 z-10 bg-base-100/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm border border-base-content/10 max-w-xs pointer-events-none">
                <div class="text-xs font-bold uppercase tracking-wider text-primary mb-1">Featured Project</div>
                <div class="font-bold truncate">{p().displayName}</div>
                <div class="text-xs text-base-content/60 truncate">by @{p().ownerName}</div>
              </div>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
